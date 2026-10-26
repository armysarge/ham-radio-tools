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
// Allowed: XML namespace identifiers, framework doc strings, the repository link, and the "official source" links of the
// bundled band-plan packs (hosts taken from scripts/pack-data/sources.json). Those are plain data shown as links the user may
// click (they open in a new tab); the app itself never requests them.
const hostsFromSources = JSON.parse(await readFile('scripts/pack-data/sources.json', 'utf8')).sources.flatMap((x) => [x.officialUrl, ...x.check.map((c) => c.url)]).map((u) => new URL(u.replace(/\{[a-zA-Z]+\}/g, 'x')).hostname)
const esc = (h) => h.replace(/\./g, '\\.')
const repo = /REPO_URL = '([^']+)'/.exec(await readFile('src/core/meta.ts', 'utf8'))[1].replace(/^https?:\/\//, '')
const allowed = new RegExp('^https?://(www\\.w3\\.org/|www\\.sitemaps\\.org/|schema\\.org|opensource\\.org|hamradiotools\\.armysarge\\.co\\.za|github\\.com/armysarge|www\\.yaesu\\.com|www\\.edn\\.com|noaasis\\.noaa\\.gov|www\\.arrl\\.org|fair-rite\\.com|rsgb\\.org|amphenolprocom\\.com|farside\\.ph\\.utexas\\.edu|www\\.cv\\.nrao\\.edu|localhost|vuejs\\.org|github\\.com/vuejs|vue-router|router\\.vuejs\\.org|' + [...new Set(hostsFromSources)].map(esc).join('|') + '|' + esc(repo) + ')')
const balunSource = /^https:\/\/vk6ysf\.com\/(?:balun_choke_balun_hf|balun_guanella_current_1-[14]|balun_4-1|unun_9-1)\.htm$/
let found = 0
for await (const f of walk(dist)) {
  if (/[\\/](frame-guard\.js|_headers)$/.test(f)) continue // lists the sites allowed to embed the app: configuration, never requested
  const t = await readFile(f, 'utf8').catch(() => '')
  for (const u of t.match(/https?:\/\/[^\s"'`)<>\\]+/g) ?? []) if (!allowed.test(u) && !balunSource.test(u)) { found++; console.log('  external URL in', f.replace(dist, ''), u) }
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
await step('tool categories start collapsed and remember changes across restart', async () => {
  const groups = page.locator('aside.sidebar nav details')
  if (await groups.count() === 0 || !(await groups.evaluateAll(els => els.every(el => !el.open)))) throw new Error('a category was expanded on first launch')
  await groups.first().locator('summary').click(); await page.waitForFunction(() => JSON.parse(localStorage.getItem('hrt:v1') || '{}').navExpanded?.length === 1); await page.reload(); await page.getByRole('heading', { name: 'Ham Radio Tools' }).waitFor()
  if (!(await page.locator('aside.sidebar nav details').first().evaluate(el => el.open))) throw new Error('expanded category did not persist')
  await page.locator('aside.sidebar nav details').first().locator('summary').click(); await page.waitForFunction(() => JSON.parse(localStorage.getItem('hrt:v1') || '{}').navExpanded?.length === 0); await page.reload(); await page.getByRole('heading', { name: 'Ham Radio Tools' }).waitFor()
  if (await page.locator('aside.sidebar nav details').first().evaluate(el => el.open)) throw new Error('collapsed category did not persist')
})
await step('sidebar labels keep the same wrapping on hover and selection', async () => {
  const navPage = await ctx.newPage()
  try {
    for (const width of [1280, 375]) {
      await navPage.setViewportSize({ width, height: 900 })
      await navPage.goto(base)
      await navPage.getByRole('heading', { name: 'Ham Radio Tools', exact: true }).waitFor()
      async function openDrawer() {
        const toggle = navPage.getByRole('button', { name: 'Toggle navigation menu' })
        if (await toggle.isVisible() && await toggle.getAttribute('aria-expanded') === 'false') await toggle.click()
      }
      await openDrawer()
      const expand = navPage.getByRole('button', { name: 'Expand all tool categories', exact: true })
      if (await expand.isVisible()) await expand.click()
      const measure = link => link.evaluate(a => {
        const walker = document.createTreeWalker(a, NodeFilter.SHOW_TEXT)
        let node, lines = 0
        while ((node = walker.nextNode())) {
          if (!node.textContent.trim()) continue
          const range = document.createRange(); range.selectNodeContents(node)
          lines += range.getClientRects().length
        }
        return { height: a.getBoundingClientRect().height, lines }
      })
      for (const id of ['efhw', 'maidenhead', 'frequency-wavelength', 'inverted-v']) {
        await openDrawer()
        const link = navPage.locator(`aside details a[href="#/tool/${id}"]`)
        await navPage.mouse.move(width - 10, 850)
        const before = await measure(link)
        await link.hover()
        await navPage.waitForTimeout(200) // Include the end of any hover transition.
        const hovered = await measure(link)
        await link.click()
        await navPage.waitForURL(new RegExp(`#/tool/${id}$`))
        await openDrawer()
        await link.waitFor({ state: 'visible' })
        const active = await measure(link)
        if (JSON.stringify(before) !== JSON.stringify(hovered) || JSON.stringify(before) !== JSON.stringify(active)) {
          throw new Error(`${width}px ${id} changed layout: ${JSON.stringify({ before, hovered, active })}`)
        }
      }
      await navPage.getByRole('button', { name: 'Collapse all tool categories', exact: true }).click()
    }
  } finally { await navPage.close() }
})
await step('sidebar and header remain responsive after repeated navigation', async () => {
  const groups = page.locator('aside.sidebar nav details'), count = await groups.count()
  for (let i = 0; i < 5; i++) {
    await groups.nth(i % count).locator('summary').click()
    await page.getByRole('button', { name: /Theme:/ }).click()
    await page.getByLabel('Measurement system').selectOption(i % 2 ? 'metric' : 'imperial')
    await page.goto(base + (i % 2 ? '#/tool/ctcss' : '#/tool/dcs'))
    await page.getByRole('heading', { name: i % 2 ? 'CTCSS Tones' : 'DCS Codes' }).waitFor()
  }
  await page.goto(base + '#/tool/propagation-report')
  await page.getByRole('heading', { name: 'Propagation Report' }).waitFor()
  const theme = await page.getByRole('button', { name: /Theme:/ }).getAttribute('aria-label')
  await page.getByRole('button', { name: /Theme:/ }).click()
  if (await page.getByRole('button', { name: /Theme:/ }).getAttribute('aria-label') === theme) throw new Error('header theme control stopped responding after propagation report render')
  await page.goto(base)
  await page.getByRole('heading', { name: 'Ham Radio Tools' }).waitFor()
  await page.getByLabel('Search tools').fill('dipole')
  await page.getByRole('heading', { name: 'Results for “dipole”' }).waitFor()
  await page.getByLabel('Search tools').fill('')
  await page.getByRole('heading', { name: 'Ham Radio Tools' }).waitFor()
  await page.getByLabel('Measurement system').selectOption('metric')
})
await step('search filters tools', async () => { await page.getByLabel('Search tools').fill('swr'); await page.getByRole('heading', { name: 'SWR & Return Loss' }).waitFor(); await page.getByLabel('Search tools').fill('') })
await step('frequency converter: 14.2 MHz = 21.11 m', async () => { await page.goto(base + '#/tool/frequency-wavelength'); await page.getByText('21.11').first().waitFor() })
await step('SWR 2 -> 9.542 dB', async () => { await page.goto(base + '#/tool/swr'); await page.getByLabel('SWR', { exact: true }).fill('2'); await page.getByText('9.542').first().waitFor() })
await step('dBm: 100 W = 50 dBm', async () => { await page.goto(base + '#/tool/dbm-watts'); await page.getByText('50', { exact: true }).first().waitFor() })
await step('dipole 7.1 MHz = 20.06 m; save design', async () => {
  await page.goto(base + '#/tool/dipole'); await page.getByText('20.06 m').first().waitFor()
  if (!(await page.locator('svg.antenna-drawing').textContent())?.includes('21.11 m')) throw new Error('dipole half-wave height reference is missing')
  await page.getByRole('button', { name: 'Save design' }).click(); await page.getByText('Saved —').waitFor()
})
await step('old RF transformer link opens the merged DIY Components tab offline', async () => {
  await page.goto(base + '#/tool/diy-transformers')
  await page.waitForURL(/#\/tool\/diy-components\?part=transformer$/)
  await page.getByRole('heading', { level: 1, name: 'DIY Components' }).waitFor()
  await page.locator('svg[aria-label^="Two electrically separate"]').waitFor()
  await page.getByText('50 Ω → 450 Ω', { exact: false }).waitFor()
  await page.getByRole('button', { name: 'Toroid inductor', exact: true }).click()
  await page.getByText('Most turns that fit in one layer', { exact: true }).waitFor()
})
await step('balun and unun templates update their winding diagrams offline on laptop and phone', async () => {
  await page.goto(base + '#/tool/diy-baluns')
  for (const width of [1280, 375]) {
    await page.setViewportSize({ width, height: 900 })
    for (const [name, label, count] of [
      ['1:1 coax current choke', 'Longitudinal and end sections', 1],
      ['1:1 paired-wire current', '1:1 paired-wire current balun', 2],
      ['4:1 Guanella current', '4:1 Guanella', 4],
      ['4:1 Ruthroff voltage', '4:1 Ruthroff voltage balun', 2],
      ['9:1 voltage unun', '9:1 unun', 3],
    ]) {
      await page.getByRole('button', { name, exact: true }).click()
      await page.locator(`svg[aria-label^="${label}"]`).waitFor()
      if (await page.locator('.winding-route').count() !== count) throw new Error(`${name}: incorrect pictured conductor count`)
      if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw new Error(`${name}: horizontal overflow at ${width}px`)
    }
    await page.getByText('50 Ω → 450 Ω', { exact: true }).waitFor()
  }
  await page.setViewportSize({ width: 1280, height: 900 })
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
  await page.goto(base + '#/tool/band-plans'); await page.getByLabel('Band plan').selectOption('i:test-land')
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
await step('downloads, clean tool headers, band filtering and non-selectable map labels', async () => {
  await page.goto(base + '#/downloads')
  await page.getByRole('heading', { name: 'Download Ham Radio Tools' }).waitFor()
  const win = await page.getByRole('link', { name: 'Download Windows', exact: true }).getAttribute('href')
  if (!/github\.com\/armysarge\/ham-radio-tools\/releases\/download\/v[\d.]+\/ham-radio-tools-[\d.]+-win-x64\.exe$/.test(win)) throw new Error('incorrect Windows release link')
  await page.goto(base + '#/tool/band-plans')
  await page.getByLabel('Filter by band').selectOption('6 m')
  const table = await page.locator('.band-table').innerText()
  if (!table.includes('50–52') || table.includes('14–14.35')) throw new Error('band filter did not isolate Region 1 six metres')
  if (await page.locator('.tool-head .kind, .badge-offline').count()) throw new Error('classification or offline badge remains')
  const favorite = page.locator('.tool-head button[aria-pressed]')
  if (!/^[★☆]$/.test((await favorite.innerText()).trim())) throw new Error('favorite should be icon only')
  await page.goto(base + '#/tool/maidenhead')
  await page.locator('.map svg text').first().waitFor()
  if (await page.locator('.map svg text').first().evaluate(el => getComputedStyle(el).userSelect) !== 'none') throw new Error('map labels can still be selected')
  await page.locator('.map svg').focus()
  await page.keyboard.press('ArrowRight')
})
await step('no uncaught errors', async () => { if (errors.length) throw new Error(errors.join(' | ')) })
await step('phone width (375px): no horizontal overflow on any page, menu drawer opens', async () => {
  const m = await ctx.newPage(); await m.setViewportSize({ width: 375, height: 812 })
  const routes = ['', 'downloads', 'tool/frequency-wavelength', 'tool/ohms-law', 'tool/components', 'tool/dbm-watts', 'tool/swr', 'tool/reactance-resonance', 'tool/feedline-length', 'tool/dipole', 'tool/inverted-v', 'tool/efhw', 'tool/jpole', 'tool/vertical', 'tool/loop', 'tool/qfh', 'tool/maidenhead', 'tool/q-codes', 'tool/band-plans', 'tool/itu-regulations', 'tool/ctcss', 'tool/dcs', 'tool/abbreviations', 'tool/constants', 'tool/cw', 'tool/callsign', 'tool/qrm-hunting', 'tool/broadcast-schedules', 'tool/phonetic', 'tool/feedline-loss', 'tool/link-budget', 'tool/l-network', 'tool/low-pass-filter', 'tool/coils', 'tool/power-planner', 'tool/yagi', 'tool/quad', 'tool/radial-planner', 'tool/logbook', 'tool/clock', 'tool/morse-trainer', 'tool/propagation', 'tool/propagation-report', 'tool/satellite-passes', 'tool/diy-components', 'tool/diy-baluns', 'tool/diy-transformers', 'settings', 'saved']
  const bad = []
  for (const r of routes) { await m.goto(base + '#/' + r); await m.waitForTimeout(400); const w = await m.evaluate(() => [document.documentElement.scrollWidth, innerWidth]); if (w[0] > w[1]) bad.push(r + ' ' + w.join('>')) }
  if (bad.length) throw new Error('overflow: ' + bad.join(', '))
  await m.goto(base); await m.getByRole('button', { name: 'Toggle navigation menu' }).click(); await m.locator('aside').getByRole('link', { name: 'SWR & Return Loss' }).first().click(); await m.waitForURL(/tool\/swr/); await m.getByRole('heading', { level: 1, name: 'SWR & Return Loss' }).waitFor()
  await m.close()
})
blocked.length ? fail(`attempted external requests: ${blocked.join(', ')}`) : ok('zero external requests attempted (all non-localhost blocked)')

await browser.close(); server.close()
console.log(process.exitCode ? '\nOFFLINE CHECK FAILED' : '\nOFFLINE CHECK PASSED')
