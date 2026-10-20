const { createHash } = require('node:crypto')
const { open, rename, rm } = require('node:fs/promises')
const { createReadStream } = require('node:fs')
const REPO = 'https://github.com/armysarge/ham-radio-tools'
const API = 'https://api.github.com/repos/armysarge/ham-radio-tools/releases/latest'
const MAX_DOWNLOAD = 400 * 1024 * 1024
function allowedDownloadUrl(value) {
  try {
    const u = new URL(value)
    return u.protocol === 'https:' && !u.username && !u.password && !u.port && ['github.com', 'api.github.com', 'release-assets.githubusercontent.com', 'objects.githubusercontent.com'].includes(u.hostname)
  } catch { return false }
}
function versionParts(value) {
  if (typeof value !== 'string' || !/^v?\d+\.\d+\.\d+$/.test(value)) throw new Error('Release version is not a stable semantic version.')
  const parts = value.replace(/^v/, '').split('.').map(Number)
  if (!parts.every(Number.isSafeInteger)) throw new Error('Invalid release version.')
  return parts
}
function selectRelease(raw, current, platform, arch) {
  if (!raw || raw.draft !== false || raw.prerelease !== false) throw new Error('Only published stable releases can be installed.')
  const next = versionParts(raw.tag_name), installed = versionParts(current)
  const newer = next.findIndex((v, i) => v !== installed[i])
  if (newer === -1 || next[newer] < installed[newer]) return null
  const version = next.join('.')
  const suffix = platform === 'win32' ? `win-${arch}.exe` : platform === 'linux' ? `linux-${arch}.AppImage` : null
  const name = `ham-radio-tools-${version}-${suffix}`
  const prefix = `${REPO}/releases/download/${raw.tag_name}/`
  const get = name => {
    const matches = Array.isArray(raw.assets) ? raw.assets.filter(a => a.name === name) : []
    if (matches.length !== 1) throw new Error(name === 'SHA256SUMS.txt' ? 'Release checksum file is missing or ambiguous.' : 'No installer for this platform and architecture.')
    const a = matches[0]
    if (a.browser_download_url !== prefix + name || !Number.isSafeInteger(a.size) || a.size <= 0 || a.size > MAX_DOWNLOAD) throw new Error('Invalid release asset URL or size.')
    return { name, url: a.browser_download_url, size: a.size }
  }
  if (!suffix) throw new Error('Updates are unavailable for this platform.')
  return { version, asset: get(name), checksums: get('SHA256SUMS.txt') }
}
function checksumFor(text, name) {
  const matches = text.split(/\r?\n/).map(line => /^([a-f0-9]{64}) [ *](.+)$/i.exec(line)).filter(m => m && m[2] === name)
  if (matches.length !== 1) throw new Error('Missing or ambiguous installer SHA-256 checksum.')
  return matches[0][1].toLowerCase()
}
async function request(url, { fetchImpl = fetch, signal, redirects = 0 } = {}) {
  if (!allowedDownloadUrl(url) || redirects > 5) throw new Error('Blocked update URL or redirect.')
  const response = await fetchImpl(url, { redirect: 'manual', signal, headers: { 'User-Agent': 'Ham-Radio-Tools', Accept: 'application/vnd.github+json' } })
  if ([301, 302, 303, 307, 308].includes(response.status)) {
    const target = new URL(response.headers.get('location'), url).href
    await response.body?.cancel()
    return request(target, { fetchImpl, signal, redirects: redirects + 1 })
  }
  if (!response.ok) { await response.body?.cancel(); throw new Error(response.status === 404 ? 'No published release is available yet.' : `GitHub returned HTTP ${response.status}. Try again later.`) }
  return response
}
async function smallText(url, options) {
  const response = await request(url, options)
  let bytes = 0
  const chunks = []
  for await (const chunk of response.body) {
    bytes += chunk.length
    if (bytes > 1024 * 1024) throw new Error('Update metadata is too large.')
    chunks.push(Buffer.from(chunk))
  }
  return Buffer.concat(chunks).toString('utf8')
}
async function checkRelease(version, platform, arch, fetchImpl) {
  return selectRelease(JSON.parse(await smallText(API, { fetchImpl, signal: AbortSignal.timeout(30000) })), version, platform, arch)
}
async function downloadRelease(release, destination, { fetchImpl, progress = () => {} } = {}) {
  const signal = AbortSignal.timeout(10 * 60 * 1000)
  const hash = checksumFor(await smallText(release.checksums.url, { fetchImpl, signal }), release.asset.name)
  const temporary = destination + '.' + require('node:crypto').randomUUID() + '.part'
  let file
  try {
    const response = await request(release.asset.url, { fetchImpl, signal })
    file = await open(temporary, 'wx')
    const digest = createHash('sha256')
    let bytes = 0
    for await (const chunk of response.body) {
      bytes += chunk.length
      if (bytes > release.asset.size || bytes > MAX_DOWNLOAD) throw new Error('Installer exceeds its declared size.')
      digest.update(chunk); await file.writeFile(chunk)
      progress(Math.round(bytes / release.asset.size * 100))
    }
    if (bytes !== release.asset.size || digest.digest('hex') !== hash) throw new Error('Installer checksum or size does not match. Nothing was installed.')
    await file.close(); file = null
    await rename(temporary, destination)
    return { path: destination, hash }
  } finally { await file?.close(); await rm(temporary, { force: true }) }
}
async function verifyFile(file, hash) {
  const digest = createHash('sha256')
  for await (const chunk of createReadStream(file)) digest.update(chunk)
  if (digest.digest('hex') !== hash) throw new Error('The downloaded installer has changed. Download it again.')
}
module.exports = { allowedDownloadUrl, selectRelease, checksumFor, checkRelease, downloadRelease, verifyFile }
