// Offline acceptance check. Serves dist/ from localhost, blocks EVERY other host, and drives the real app
// in a system browser (Edge or Chrome; no browser download). Fails if any external request is attempted.
// Run: npm run build && npm run check:offline
import { createServer } from 'node:http'
import { readFile, readdir } from 'node:fs/promises'
import { extname, join, resolve } from 'node:path'
import { chromium } from 'playwright-core'

const dist = resolve('dist')
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' }
const fail = (m) => { console.error('FAIL:', m); process.exitCode = 1 }
const ok = (m) => console.log('ok  :', m)

// 1. Static scan: no external URLs in shipped files (XML namespace URIs are identifiers, not requests).
async function* walk(d) { for (const e of await readdir(d, { withFileTypes: true })) e.isDirectory() ? yield* walk(join(d, e.name)) : yield join(d, e.name) }
const allowed = /^https?:\/\/(www\.w3\.org\/|localhost|vuejs\.org|github\.com\/vuejs|vue-router|router\.vuejs\.org)/
let found = 0
for await (const f of walk(dist)) {
  const t = await readFile(f, 'utf8').catch(() => '')
  for (const u of t.match(/https?:\/\/[^\s"'`)<>\\]+/g) ?? []) if (!allowed.test(u)) { found++; console.log('  external URL in', f.replace(dist, ''), u) }
}
found ? fail(`${found} external URL(s) referenced in dist (review above)`) : ok('no external URLs in dist')

// 2. Serve dist
const server = createServer(async (q, r) => {
  const p = q.url.split('?')[0]
  try { const b = await readFile(join(dist, p === '/' ? 'index.html' : p)); r.writeHead(200, { 'content-type': types[extname(p || '.html')] ?? 'text/html' }); r.end(b) }
  catch { r.writeHead(404); r.end() }
})
await new Promise((res) => server.listen(4173, '127.0.0.1', res))
const base = 'http://127.0.0.1:4173/'

let browser
for (const channel of ['msedge', 'chrome']) { try { browser = await chromium.launch({ channel }); ok(`browser: ${channel}`); break } catch { /* try next */ } }
if (!browser) { fail('no Edge/Chrome found for playwright-core'); server.close(); process.exit(1) }

const blocked = []
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
await ctx.route('**/*', (route) => { const u = new URL(route.request().url()); if (u.hostname === '127.0.0.1' || u.protocol === 'data:' || u.protocol === 'blob:') return route.continue(); blocked.push(route.request().url()); return route.abort() })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))

const step = async (name, fn) => { try { await fn(); ok(name) } catch (e) { fail(`${name}: ${e.message.split('\n')[0]}`) } }
const expectText = async (sel, re) => { const t = await page.locator(sel).first().innerText(); if (!re.test(t)) throw new Error(`"${t.slice(0, 80)}" !~ ${re}`) }

await step('app starts', async () => { await page.goto(base); await page.getByRole('heading', { name: 'Ham Radio Tools' }).waitFor() })
await step('search filters tools', async () => { await page.getByLabel('Search tools').fill('swr'); await page.getByRole('heading', { name: 'SWR & Return Loss' }).waitFor(); await page.getByLabel('Search tools').fill('') })
await step('frequency converter: 14.2 MHz = 21.11 m', async () => { await page.goto(base + '#/tool/frequency-wavelength'); await page.getByText('21.11').first().waitFor() })
await step('SWR 2 -> 9.542 dB', async () => { await page.goto(base + '#/tool/swr'); await page.getByLabel('SWR', { exact: true }).fill('2'); await page.getByText('9.542').first().waitFor() })
await step('dBm: 100 W = 50 dBm', async () => { await page.goto(base + '#/tool/dbm-watts'); await page.getByText('50', { exact: true }).first().waitFor() })
await step('dipole 7.1 MHz = 20.06 m; save design', async () => {
  await page.goto(base + '#/tool/dipole'); await page.getByText('20.06 m').first().waitFor()
  await page.getByRole('button', { name: 'Save design' }).click(); await page.getByText('Saved —').waitFor()
})
await step('map renders land + grid and locator converts', async () => {
  await page.goto(base + '#/tool/maidenhead'); await page.getByText('JN58td').first().waitFor()
  const len = await page.locator('.map path.land').getAttribute('d'); if (!len || len.length < 20000) throw new Error('basemap path too short')
  await page.locator('input.mono').first().fill('FN31pr'); await page.getByText('FN31pr').first().waitFor()
})
await step('saved design + favorite persist across reload', async () => {
  await page.goto(base + '#/tool/swr'); await page.getByRole('button', { name: /Add to favorites/ }).click(); await page.reload()
  await page.getByRole('button', { name: /Remove from favorites/ }).waitFor()
  await page.goto(base + '#/saved'); await page.getByText('Dipole 7.1 MHz').waitFor()
})
await step('project export, delete, re-import restores the saved design', async () => {
  await page.goto(base + '#/settings')
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export project file' }).click()])
  const path = await dl.path()
  const { readFile: rf } = await import('node:fs/promises')
  const json = JSON.parse(await rf(path, 'utf8'))
  if (json.format !== 'ham-radio-tools-project' || !json.designs.length) throw new Error('export missing designs')
  await page.goto(base + '#/saved'); await page.getByRole('button', { name: /Delete Dipole 7.1 MHz/ }).click(); await page.getByText('No saved designs yet').waitFor()
  await page.goto(base + '#/settings'); await page.getByLabel('Import project file').setInputFiles(path)
  await page.getByRole('button', { name: 'Import', exact: true }).click(); await page.getByText(/Imported 0 location\(s\) and 1 design/).waitFor()
  await page.goto(base + '#/saved'); await page.getByText('Dipole 7.1 MHz').waitFor()
})
await step('content pack: import a band plan into IndexedDB, survives reload, drives the lookup', async () => {
  const { writeFile } = await import('node:fs/promises'); const { tmpdir } = await import('node:os')
  const file = join(tmpdir(), 'hrt-test-pack.json')
  await writeFile(file, JSON.stringify({ format: 'ham-radio-tools-pack', version: 1, kind: 'band-plan', id: 'test-land', title: 'Testland plan', jurisdiction: 'Testland', source: 'Offline check', license: 'CC0', revision: '2026-10-01',
    data: { segments: [{ band: '20 m', fromHz: 14000000, toHz: 14070000, use: 'CW and narrow digital', modes: 'CW, RTTY' }, { band: '20 m', fromHz: 14070000, toHz: 14350000, use: 'All modes' }] } }))
  await page.goto(base + '#/settings'); await page.getByLabel('Import content pack').setInputFiles(file)
  await page.getByRole('button', { name: 'Install pack' }).click(); await page.getByText('Installed “Testland plan”').waitFor()
  await page.reload(); await page.getByText('Testland plan').first().waitFor()
  await page.goto(base + '#/tool/band-plans'); await page.getByLabel('Band plan').selectOption('test-land')
  await page.getByText('CW and narrow digital').first().waitFor()
  await page.goto(base + '#/settings'); await page.getByRole('button', { name: 'Remove Testland plan' }).click(); await page.getByText('Import a pack file below').waitFor()
})
await step('schedule: convert a text file to a pack, install it, find it in Broadcast Schedules', async () => {
  const { writeFile } = await import('node:fs/promises'); const { tmpdir } = await import('node:os')
  const file = join(tmpdir(), 'hrt-test-schedule.txt')
  await writeFile(file, ['kHz;Time(UTC);Days;ITU;Station;Lng;Target;Remarks;P;Start;Stop', '5950;0000-2400;;USA;Radio Offline Check;E;NAm;;;;', '6070;2200-0200;1234567;CAN;CFRX;E;NAm;;;;'].join("\n"))
  await page.goto(base + '#/settings')
  await page.getByText('Convert a shortwave schedule text file into a pack').click()
  await page.getByLabel('Choose schedule text file').setInputFiles(file)
  await page.getByText('2 transmissions').waitFor()
  await page.getByLabel('Schedule date (YYYY-MM-DD)').fill('2026-01-01'); await page.getByLabel('Licence / terms of use').fill('offline check')
  await page.getByRole('button', { name: 'Install on this device' }).click(); await page.getByText(/Installed “EiBi shortwave schedule”/).waitFor()
  await page.goto(base + '#/tool/broadcast-schedules'); await page.locator('main select').first().selectOption('eibi-shortwave-schedule')
  await page.getByRole('button', { name: 'Everything' }).click(); await page.getByText('Radio Offline Check').waitFor()
  await page.getByRole('status').getByText(/more than 45 days old/).waitFor() // revision 2026-01-01 is well over 45 days old
  await page.goto(base + '#/settings'); await page.getByRole('button', { name: /Remove EiBi shortwave schedule/ }).click()
})
await step('no uncaught errors', async () => { if (errors.length) throw new Error(errors.join(' | ')) })
await step('phone width (375px): no horizontal overflow on any page, menu drawer opens', async () => {
  const m = await ctx.newPage(); await m.setViewportSize({ width: 375, height: 812 })
  const routes = ['', 'tool/frequency-wavelength', 'tool/ohms-law', 'tool/dbm-watts', 'tool/swr', 'tool/reactance-resonance', 'tool/feedline-length', 'tool/dipole', 'tool/inverted-v', 'tool/efhw', 'tool/vertical', 'tool/loop', 'tool/maidenhead', 'tool/q-codes', 'tool/band-plans', 'tool/itu-regulations', 'tool/ctcss', 'tool/abbreviations', 'tool/constants', 'tool/cw', 'tool/callsign', 'tool/qrm-hunting', 'tool/broadcast-schedules', 'tool/phonetic', 'settings', 'saved']
  const bad = []
  for (const r of routes) { await m.goto(base + '#/' + r); await m.waitForTimeout(400); const w = await m.evaluate(() => [document.documentElement.scrollWidth, innerWidth]); if (w[0] > w[1]) bad.push(r + ' ' + w.join('>')) }
  if (bad.length) throw new Error('overflow: ' + bad.join(', '))
  await m.goto(base); await m.getByRole('button', { name: 'Toggle navigation menu' }).click(); await m.locator('aside').getByRole('link', { name: 'SWR & Return Loss' }).first().click(); await m.waitForURL(/tool\/swr/); await m.getByRole('heading', { level: 1, name: 'SWR & Return Loss' }).waitFor()
  await m.close()
})
blocked.length ? fail(`attempted external requests: ${blocked.join(', ')}`) : ok('zero external requests attempted (all non-localhost blocked)')

await browser.close(); server.close()
console.log(process.exitCode ? '\nOFFLINE CHECK FAILED' : '\nOFFLINE CHECK PASSED')
