// Regression: inspect the real window when Electron first makes it visible, not only after startup.
import { _electron } from 'playwright-core'
import { mkdtemp, cp, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import assert from 'node:assert/strict'
const require = createRequire(import.meta.url)
const profile = await mkdtemp(path.join(tmpdir(), 'hrt-startup-test-'))
const fixture = path.join(profile, 'app')
let desktop
try {
  for (const name of ['desktop', 'dist', 'package.json']) await cp(path.resolve(name), path.join(fixture, name), { recursive: true })
  const mainPath = path.join(fixture, 'desktop/main.cjs')
  let main = await readFile(mainPath, 'utf8')
  main = main.replace("win.once('ready-to-show', () => {", `win.once('ready-to-show', () => {
    globalThis.hrtFirstShowAt = Date.now()
    win.webContents.executeJavaScript("({ splash: !!document.getElementById('startup'), progress: document.querySelector('#startup-progress')?.value })").then(snapshot => { globalThis.hrtFirstShow = snapshot })
  `).replace('if (!process.env.HRT_TEST_PROFILE) win.show()', 'win.show()')
  await writeFile(mainPath, main)
  const splashPath = path.join(fixture, 'dist/startup.js')
  await writeFile(splashPath, (await readFile(splashPath, 'utf8')) + `
    new MutationObserver(() => {
      if (!document.getElementById('startup') && window.hrtSplashRemovedTime === undefined) window.hrtSplashRemovedTime = Date.now()
    }).observe(document.body, { childList: true })
  `)
  const env = { ...process.env, HRT_TEST_PROFILE: profile }
  delete env.ELECTRON_RUN_AS_NODE
  desktop = await _electron.launch({ args: [fixture], executablePath: require('electron'), env })
  const page = await desktop.firstWindow()
  await page.getByRole('heading', { name: 'Ham Radio Tools', exact: true }).waitFor()
  const firstShow = await desktop.evaluate(async () => {
    for (let i = 0; i < 100; i++) {
      if (globalThis.hrtFirstShow) return globalThis.hrtFirstShow
      await new Promise(resolve => setTimeout(resolve, 20))
    }
    throw new Error('Window never reported its first visible state')
  })
  assert.equal(firstShow.splash, true, `splash must exist at first window display: ${JSON.stringify(firstShow)}`)
  await page.locator('#startup').waitFor({ state: 'detached' })
  const showTime = await desktop.evaluate(() => globalThis.hrtFirstShowAt)
  const visibleMs = await page.evaluate(() => window.hrtSplashRemovedTime) - showTime
  assert(visibleMs >= 600, `desktop splash disappears too quickly to read (${Math.round(visibleMs)} ms)`)
  console.log(`PASS: Electron displays a readable splash (${Math.round(visibleMs)} ms after first show), then reveals the dashboard`)
} finally {
  await desktop?.close()
  const resolved = path.resolve(profile)
  assert(resolved.startsWith(path.resolve(tmpdir()) + path.sep) && path.basename(resolved).startsWith('hrt-startup-test-'))
  await rm(resolved, { recursive: true, force: true })
}
