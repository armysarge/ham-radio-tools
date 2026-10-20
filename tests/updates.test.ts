import { describe, expect, it } from 'vitest'
import { createRequire } from 'node:module'
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createHash } from 'node:crypto'
const require = createRequire(import.meta.url)
const { selectRelease, checksumFor, allowedDownloadUrl, checkRelease, downloadRelease, verifyFile } = require('../desktop/updates.cjs')
const root = 'https://github.com/armysarge/ham-radio-tools/releases/download/v0.4.0/'
const name = 'ham-radio-tools-0.4.0-win-x64.exe'
const release = { tag_name: 'v0.4.0', draft: false, prerelease: false, assets: [name, 'SHA256SUMS.txt'].map(name => ({ name, size: 100, browser_download_url: root + name })) }
describe('explicit release updates', () => {
  it('selects only a newer stable matching platform asset and checksum manifest', () => {
    expect(selectRelease(release, '0.3.0', 'win32', 'x64').asset.name).toBe(name)
    expect(selectRelease(release, '0.4.0', 'win32', 'x64')).toBeNull()
    expect(selectRelease(release, '0.5.0', 'win32', 'x64')).toBeNull()
    expect(() => selectRelease(release, '0.3.0', 'linux', 'arm64')).toThrow(/platform/)
    expect(() => selectRelease({ ...release, assets: release.assets.slice(0, 1) }, '0.3.0', 'win32', 'x64')).toThrow(/checksum/)
  })
  it('rejects drafts, prereleases, malformed versions and unrelated download URLs', () => {
    for (const patch of [{ draft: true }, { prerelease: true }, { tag_name: 'v0.4.0-beta' }, { tag_name: 'nonsense' }]) {
      expect(() => selectRelease({ ...release, ...patch }, '0.3.0', 'win32', 'x64')).toThrow()
    }
    const assets = release.assets.map(a => ({ ...a, browser_download_url: 'https://evil.test/' + a.name }))
    expect(() => selectRelease({ ...release, assets }, '0.3.0', 'win32', 'x64')).toThrow(/URL/)
    expect(allowedDownloadUrl('https://release-assets.githubusercontent.com/signed?token=abc')).toBe(true)
    for (const url of ['http://github.com/', 'https://github.com.evil.test/', 'https://user@github.com/', 'file:///test', 'https://github.com:444/test']) expect(allowedDownloadUrl(url)).toBe(false)
  })
  it('requires one exact filename checksum and rejects missing or duplicate entries', () => {
    const hash = 'a'.repeat(64)
    expect(checksumFor(`${hash}  ${name}\n`, name)).toBe(hash)
    expect(() => checksumFor(`${hash}  other.exe`, name)).toThrow()
    expect(() => checksumFor(`${hash}  ${name}\n${hash}  ${name}`, name)).toThrow()
    expect(() => checksumFor(`invalid  ${name}`, name)).toThrow()
  })
  it('verifies complete downloads, rejects tampering and cleans up checksum failures', async () => {
    const folder = await mkdtemp(path.join(tmpdir(), 'hrt-update-'))
    const bytes = Buffer.from('test installer bytes'), hash = createHash('sha256').update(bytes).digest('hex')
    const chosen = selectRelease(release, '0.3.0', 'win32', 'x64')
    chosen.asset.size = bytes.length
    const destination = path.join(folder, name)
    const fetchImpl = async (url: string) => new Response(url.endsWith('SHA256SUMS.txt') ? `${hash}  ${name}` : bytes)
    try {
      await downloadRelease(chosen, destination, { fetchImpl })
      expect(await readFile(destination, 'utf8')).toBe(bytes.toString())
      await verifyFile(destination, hash)
      await writeFile(destination, 'tampered')
      await expect(verifyFile(destination, hash)).rejects.toThrow(/changed/)
      const badFetch = async (url: string) => new Response(url.endsWith('SHA256SUMS.txt') ? `${'0'.repeat(64)}  ${name}` : bytes)
      await expect(downloadRelease(chosen, destination, { fetchImpl: badFetch })).rejects.toThrow(/checksum/)
      expect(await readFile(destination, 'utf8')).toBe('tampered')
      expect(await readdir(folder)).toEqual([name])
    } finally { await rm(folder, { recursive: true, force: true }) }
  })
  it('refuses external redirect targets and reports missing releases', async () => {
    await expect(checkRelease('0.3.0', 'win32', 'x64', async () => new Response(null, { status: 302, headers: { location: 'https://evil.test/file' } }))).rejects.toThrow(/Blocked/)
    await expect(checkRelease('0.3.0', 'win32', 'x64', async () => new Response(null, { status: 404 }))).rejects.toThrow(/No published release/)
  })
})
