// Exercises the actual Electron shell with a disposable profile; no edits to the user's saved data.
import { _electron } from 'playwright-core'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const profile = await mkdtemp(path.join(tmpdir(), 'hrt-desktop-test-'))
const executablePath = process.env.HRT_DESKTOP_EXEC || require('electron')
const args = process.env.HRT_DESKTOP_EXEC ? [] : ['.']
let desktop
try {
  const env = { ...process.env, HRT_TEST_PROFILE: profile }
  delete env.ELECTRON_RUN_AS_NODE
  desktop = await _electron.launch({ args, executablePath, env })
  const page = await desktop.firstWindow()
  const native = await desktop.evaluate(({ BrowserWindow, session }) => ({
    sandbox: BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences().sandbox,
    nodeIntegration: BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences().nodeIntegration,
    spellcheck: session.defaultSession.isSpellCheckerEnabled(),
  }))
  assert.equal(native.sandbox, true)
  assert.equal(native.nodeIntegration, false)
  assert.equal(native.spellcheck, false, 'spellchecking can download dictionaries on first launch')
  page.setDefaultTimeout(15000)
  const errors = []
  const externalRequests = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('request', (request) => { if (/^https?:/.test(request.url())) externalRequests.push(request.url()) })
  await page.getByRole('heading', { level: 1, name: 'Ham Radio Tools' }).waitFor()
  const initial = await desktop.evaluate(({ BrowserWindow, screen }) => ({ bounds: BrowserWindow.getAllWindows()[0].getBounds(), area: screen.getPrimaryDisplay().workArea }))
  assert(Math.abs(initial.bounds.x - (initial.area.x + (initial.area.width - initial.bounds.width) / 2)) <= 1, 'first launch is horizontally centred')
  assert(Math.abs(initial.bounds.y - (initial.area.y + (initial.area.height - initial.bounds.height) / 2)) <= 1, 'first launch is vertically centred')
  const layout = await page.evaluate(() => {
    const shell = document.querySelector('.shell')
    const close = document.querySelector('[aria-label="Close window"]')
    return { rootOverflow: getComputedStyle(document.documentElement).overflowY, scrollTop: shell.getBoundingClientRect().top, closeRight: close.getBoundingClientRect().right, width: innerWidth }
  })
  assert.equal(layout.rootOverflow, 'hidden', 'no root scrollbar beside the window controls')
  assert.equal(layout.scrollTop, 44, 'page scrolling begins below the title bar')
  assert.equal(layout.closeRight, layout.width, 'close button reaches the window edge')
  const base = 'hrt://app/'
  await page.goto(base + '#/tool/frequency-wavelength')
  await page.getByText('21.11', { exact: true }).waitFor()
  await page.goto(base + '#/tool/maidenhead')
  await page.locator('.map path.land').waitFor()
  assert((await page.locator('.map path.land').getAttribute('d')).length > 20000)
  await page.goto(base + '#/tool/dipole')
  await page.getByRole('button', { name: 'Save design' }).click()
  await page.reload()
  await page.goto(base + '#/saved')
  await page.getByText('Dipole 7.1 MHz').waitFor()
  assert.deepEqual(externalRequests, [], 'startup and core tools must not attempt external requests')
  const boundary = await page.evaluate(async () => ({
    nodeExposed: typeof window.require !== 'undefined',
    remoteBlocked: await fetch('https://example.com/').then(() => false, () => true),
    persistent: !!localStorage.getItem('hrt:v1'),
  }))
  assert.equal(boundary.nodeExposed, false)
  assert.equal(boundary.remoteBlocked, true)
  assert.equal(boundary.persistent, true)
  assert.deepEqual(errors, [])
  await desktop.evaluate(({ BrowserWindow }) => { const win = BrowserWindow.getAllWindows()[0]; win.show(); win.setBounds({ x: 40, y: 50, width: 1000, height: 700 }) })
  await page.getByRole('button', { name: 'Maximize window', exact: true }).click()
  await page.getByRole('button', { name: 'Restore window', exact: true }).waitFor()
  await page.getByRole('button', { name: 'Restore window', exact: true }).click()
  await page.getByRole('button', { name: 'Maximize window', exact: true }).waitFor()
  const bounds = await desktop.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].getBounds())
  await page.getByRole('button', { name: 'Minimize window', exact: true }).click()
  await desktop.evaluate(async ({ BrowserWindow }) => {
    const win = BrowserWindow.getAllWindows()[0]
    for (let i = 0; i < 30 && !win.isMinimized(); i++) await new Promise(resolve => setTimeout(resolve, 50))
    if (!win.isMinimized()) throw new Error('Minimize control failed')
    win.restore()
  })
  await desktop.close(); desktop = undefined
  desktop = await _electron.launch({ args, executablePath, env })
  const reopened = await desktop.firstWindow()
  await reopened.getByRole('heading', { level: 1, name: 'Ham Radio Tools' }).waitFor()
  await reopened.goto(base + '#/saved')
  await reopened.getByText('Dipole 7.1 MHz').waitFor()
  assert.deepEqual(await desktop.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].getBounds()), bounds, 'normal window bounds survive restart')
  await desktop.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].show())
  await reopened.getByRole('button', { name: 'Maximize window', exact: true }).click()
  await reopened.getByRole('button', { name: 'Restore window', exact: true }).waitFor()
  await desktop.close(); desktop = undefined
  desktop = await _electron.launch({ args, executablePath, env })
  const maximized = await desktop.firstWindow()
  await maximized.getByRole('button', { name: 'Restore window', exact: true }).waitFor()
  const closed = desktop.waitForEvent('close')
  await maximized.getByRole('button', { name: 'Close window', exact: true }).click()
  await closed; desktop = undefined
  console.log(`PASS: Electron on ${process.platform}: offline tools, saved data, window controls, position/size/maximized restoration, isolated renderer and blocked external fetch`)
} finally {
  await desktop?.close()
  await rm(profile, { recursive: true, force: true })
}
