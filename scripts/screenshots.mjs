// Regenerates docs/screenshots/*.png from the built app (run `npm run build` first). Needs Edge or Chrome installed.
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, resolve } from 'node:path'
import { chromium } from 'playwright-core'

const dist = resolve('dist'), out = resolve('docs/screenshots')
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' }
const server = createServer(async (q, r) => {
  const p = q.url.split('?')[0]
  try { const b = await readFile(join(dist, p === '/' ? 'index.html' : p)); r.writeHead(200, { 'content-type': types[extname(p)] ?? 'text/html' }); r.end(b) } catch { r.writeHead(404); r.end() }
})
await new Promise((res) => server.listen(4174, '127.0.0.1', res))
let browser
for (const channel of ['msedge', 'chrome']) { try { browser = await chromium.launch({ channel }); break } catch { /* next */ } }
if (!browser) throw new Error('No Edge/Chrome found')
const base = 'http://127.0.0.1:4174/'
const shots = [
  ['dashboard', '', 1280, 800], ['dipole', '#/tool/dipole', 1280, 1000], ['maidenhead', '#/tool/maidenhead', 1280, 1100],
  ['swr', '#/tool/swr', 1280, 800],
]
for (const scheme of ['dark']) {
  for (const [name, hash, width, height] of shots) {
    const ctx = await browser.newContext({ viewport: { width, height }, colorScheme: scheme, deviceScaleFactor: width < 600 ? 2 : 1 })
    const page = await ctx.newPage()
    await page.goto(base + hash); await page.waitForTimeout(700)
    if (name === 'maidenhead') { await page.getByRole('button', { name: 'Fit both' }).click(); await page.waitForTimeout(200) }
    await page.screenshot({ path: join(out, `${name}.png`) })
    await ctx.close()
  }
}
await browser.close(); server.close(); console.log('screenshots written to docs/screenshots')
