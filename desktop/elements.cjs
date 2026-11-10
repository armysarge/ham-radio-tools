// Explicit, user-triggered download of CelesTrak's amateur-radio element sets (TLEs). Runs in the main process only.
// Follows CelesTrak's usage policy: the documented URL only, no request more often than the two-hour refresh,
// and stop and report on any non-200 response.
const ELEMENTS_URL = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=amateur&FORMAT=tle'
const MIN_INTERVAL_MS = 2 * 3600 * 1000
const MAX_BYTES = 2 * 1024 * 1024

async function fetchAmateurElements({ fetchImpl = fetch, now = Date.now, state, userAgent = 'Ham-Radio-Tools' } = {}) {
  if (!state) throw new Error('Missing request state.')
  const wait = state.lastAttempt + MIN_INTERVAL_MS - now()
  if (wait > 0) throw new Error(`CelesTrak refreshes its data every 2 hours. Try again in about ${Math.ceil(wait / 60000)} minutes.`)
  state.lastAttempt = now() // failures count too, so a broken connection is not retried in a loop
  const response = await fetchImpl(ELEMENTS_URL, { redirect: 'manual', signal: AbortSignal.timeout(30000), headers: { 'User-Agent': userAgent, Accept: 'text/plain' } })
  if (response.status !== 200) {
    await response.body?.cancel()
    throw new Error(`CelesTrak answered HTTP ${response.status}, so the update was stopped. Try again later, or import a downloaded file instead.`)
  }
  let bytes = 0
  const chunks = []
  for await (const chunk of response.body) {
    bytes += chunk.length
    if (bytes > MAX_BYTES) throw new Error('The element file is larger than expected, so it was discarded.')
    chunks.push(Buffer.from(chunk))
  }
  const text = Buffer.concat(chunks).toString('utf8')
  if (!/^1 /m.test(text) || !/^2 /m.test(text)) throw new Error('CelesTrak did not return element sets, so nothing was saved.')
  return { text, retrievedAt: new Date(now()).toISOString() }
}
module.exports = { ELEMENTS_URL, MIN_INTERVAL_MS, fetchAmateurElements }
