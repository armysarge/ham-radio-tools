// Exercises the actual Electron shell with a disposable profile; no edits to the user's saved data.
import { _electron } from 'playwright-core'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
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
  async function checkContentScroll(page) {
    const result = await page.evaluate(() => {
      const header = document.querySelector('header.topbar')
      const main = document.querySelector('main')
      const before = header.getBoundingClientRect().bottom
      main.scrollTop = 100
      return { before, after: header.getBoundingClientRect().bottom, top: main.getBoundingClientRect().top, scrolled: main.scrollTop, overflow: getComputedStyle(main).overflowY }
    })
    assert.equal(result.top, result.before, 'content scrollbar starts below the header element')
    assert.equal(result.after, result.before, 'header stays fixed while content scrolls')
    assert.equal(result.overflow, 'auto')
    assert(result.scrolled > 0, 'content remains scrollable')
  }
  await checkContentScroll(page)
  await page.setViewportSize({ width: 375, height: 700 })
  await checkContentScroll(page)
  await page.setViewportSize({ width: initial.bounds.width, height: initial.bounds.height })
  const base = 'hrt://app/'
  await page.goto(base + '#/tool/frequency-wavelength')
  await page.getByText('21.11', { exact: true }).waitFor()
  const clipboardAvailable = await desktop.evaluate(async ({ clipboard, ClipboardItem }) => {
    const items = await Promise.all((await clipboard.read()).filter(item => item.types.length).map(async item => new ClipboardItem(Object.fromEntries(await Promise.all(item.types.map(async type => [type, await item.getType(type)]))))))
    globalThis.hrtClipboardFixture = { items, write: clipboard.writeText, copied: '' }
    await clipboard.writeText('hrt clipboard probe')
    const available = await clipboard.readText() === 'hrt clipboard probe'
    clipboard.writeText = async text => { globalThis.hrtClipboardFixture.copied = text; return globalThis.hrtClipboardFixture.write.call(clipboard, text) }
    return available
  })
  try {
    await desktop.evaluate(({ BrowserWindow }) => { const win = BrowserWindow.getAllWindows()[0]; win.show(); win.focus() })
    await page.getByRole('button', { name: /Copy.*21.11/ }).first().click()
    const copied = await desktop.evaluate(async () => {
      for (let i = 0; i < 30; i++) { if (globalThis.hrtClipboardFixture.copied) return globalThis.hrtClipboardFixture.copied; await new Promise(resolve => setTimeout(resolve, 50)) }
      return globalThis.hrtClipboardFixture.copied
    })
    assert.match(copied, /21\.11/)
    if (clipboardAvailable) assert.match(await desktop.evaluate(({ clipboard }) => clipboard.readText()), /21\.11/)
    else {
      console.warn('UNVERIFIED: native OS clipboard round trip failed its direct Electron probe in this environment; app bridge invocation passed.')
      assert.notEqual(process.env.HRT_REQUIRE_CLIPBOARD, '1', 'native clipboard must be available when explicitly required')
    }
  } finally { await desktop.evaluate(async ({ clipboard }) => { const fixture = globalThis.hrtClipboardFixture; clipboard.writeText = fixture.write; await clipboard.write(fixture.items); delete globalThis.hrtClipboardFixture }) }
  await page.goto(base + '#/tool/maidenhead')
  await page.locator('.map path.land').waitFor()
  assert((await page.locator('.map path.land').getAttribute('d')).length > 20000)
  // The propagation engine and its coefficient data load lazily from the bundle, with no network.
  await page.goto(base + '#/tool/propagation-report')
  await page.locator('td[role="gridcell"]').first().waitFor({ timeout: 30000 })
  assert.equal(await page.locator('td[role="gridcell"]').count(), 8 * 24, 'propagation report renders its band-by-hour grid')
  assert.doesNotMatch(await page.locator('table.heat').innerText(), /NaN/)
  await page.goto(base + '#/tool/dipole')
  await page.getByRole('button', { name: 'Save design' }).click()
  const pdf = await desktop.evaluate(async ({ BrowserWindow }) => {
    const bytes = await BrowserWindow.getAllWindows()[0].webContents.printToPDF({ printBackground: true })
    return { header: bytes.subarray(0, 5).toString(), length: bytes.length }
  })
  assert.equal(pdf.header, '%PDF-'); assert(pdf.length > 1000, 'dipole renders through the PDF print engine')
  await page.reload()
  await page.goto(base + '#/saved')
  await page.getByText('Dipole 7.1 MHz').waitFor()
  await page.goto(base + '#/settings')
  const exportPath = path.join(profile, 'project.json')
  await desktop.evaluate(({ dialog }, filePath) => { globalThis.hrtOriginalSaveDialog = dialog.showSaveDialog; dialog.showSaveDialog = async () => ({ canceled: false, filePath }) }, exportPath)
  await page.getByRole('button', { name: 'Export project file' }).click()
  await desktop.evaluate(async ({ app }) => { const fs = process.getBuiltinModule('fs/promises'); for (let i = 0; i < 50; i++) { try { await fs.access(process.getBuiltinModule('path').join(app.getPath('userData'), 'project.json')); return } catch {} await new Promise(r => setTimeout(r, 50)) } throw new Error('Export file was not written') })
  await desktop.evaluate(({ dialog }) => { dialog.showSaveDialog = globalThis.hrtOriginalSaveDialog; delete globalThis.hrtOriginalSaveDialog })
  await desktop.evaluate(({ dialog, app }) => { globalThis.hrtOriginalSaveDialog = dialog.showSaveDialog; dialog.showSaveDialog = async () => ({ canceled: false, filePath: process.getBuiltinModule('path').join(app.getPath('userData'), 'disallowed.cmd') }) })
  const rejectedExtension = await page.evaluate(async () => {
    try { await window.hrtDesktop.saveFile('project.json', new TextEncoder().encode('{}')); return false }
    catch (error) { return /extension unchanged/.test(error.message) }
  })
  assert.equal(rejectedExtension, true, 'export cannot change its extension to an executable')
  assert.equal(await desktop.evaluate(({ app }) => process.getBuiltinModule('fs').existsSync(process.getBuiltinModule('path').join(app.getPath('userData'), 'disallowed.cmd'))), false)
  await desktop.evaluate(({ dialog }) => { dialog.showSaveDialog = globalThis.hrtOriginalSaveDialog; delete globalThis.hrtOriginalSaveDialog })
  assert.equal(JSON.parse(await readFile(exportPath, 'utf8')).designs.length, 1)
  await page.goto(base + '#/saved')
  await page.getByRole('button', { name: 'Delete Dipole 7.1 MHz' }).click()
  await page.goto(base + '#/settings')
  await page.getByLabel('Import project file').setInputFiles(exportPath)
  await page.getByRole('button', { name: 'Import', exact: true }).click()
  await page.getByText(/Imported 0 location\(s\) and 1 design/).waitFor()
  // Main-process transport fixture: no live release or actual installer is used.
  await desktop.evaluate(({ app, dialog }) => {
    const bytes = Buffer.from('offline test installer, never executed')
    const hash = process.getBuiltinModule('crypto').createHash('sha256').update(bytes).digest('hex')
    const version = '999.0.0'
    const name = `ham-radio-tools-${version}-${process.platform === 'win32' ? 'win' : 'linux'}-${process.arch}.${process.platform === 'win32' ? 'exe' : 'AppImage'}`
    const prefix = `https://github.com/armysarge/ham-radio-tools/releases/download/v${version}/`
    globalThis.hrtUpdateFixture = { original: globalThis.fetch, dialog: dialog.showSaveDialog, calls: 0 }
    globalThis.fetch = async url => {
      globalThis.hrtUpdateFixture.calls++
      if (String(url).endsWith('/latest')) return new Response(JSON.stringify({ tag_name: `v${version}`, draft: false, prerelease: false, assets: [{ name, size: bytes.length, browser_download_url: prefix + name }, { name: 'SHA256SUMS.txt', size: 200, browser_download_url: prefix + 'SHA256SUMS.txt' }] }))
      if (String(url).endsWith('SHA256SUMS.txt')) return new Response(`${hash}  ${name}`)
      if (String(url).endsWith(name)) return new Response(bytes)
      throw new Error('Unexpected updater request')
    }
    dialog.showSaveDialog = async () => ({ canceled: false, filePath: process.getBuiltinModule('path').join(app.getPath('userData'), name) })
  })
  await page.reload()
  await page.getByRole('button', { name: 'Check for updates' }).waitFor()
  assert.equal(await desktop.evaluate(() => globalThis.hrtUpdateFixture.calls), 0, 'settings must not initiate update checks')
  await page.getByRole('button', { name: 'Check for updates' }).click()
  await page.getByText('Version 999.0.0 is available.', { exact: true }).waitFor()
  assert.equal(await desktop.evaluate(() => globalThis.hrtUpdateFixture.calls), 1, 'checking must not download the installer')
  await page.getByRole('button', { name: /^Download 999/ }).click()
  await page.getByText('Download complete. SHA-256 verified.', { exact: true }).waitFor()
  await page.goto(base + '#/tool/frequency-wavelength')
  await page.goto(base + '#/settings')
  await page.getByRole('button', { name: /Open update installer|Show downloaded AppImage/ }).waitFor()
  await desktop.evaluate(async ({ app }) => {
    const name = `ham-radio-tools-999.0.0-${process.platform === 'win32' ? 'win' : 'linux'}-${process.arch}.${process.platform === 'win32' ? 'exe' : 'AppImage'}`
    await process.getBuiltinModule('fs/promises').writeFile(process.getBuiltinModule('path').join(app.getPath('userData'), name), 'tampered fixture')
  })
  await page.getByRole('button', { name: /Open update installer|Show downloaded AppImage/ }).click()
  await page.getByRole('alert').filter({ hasText: 'The downloaded installer has changed' }).waitFor()
  await desktop.evaluate(({ dialog }) => {
    globalThis.fetch = globalThis.hrtUpdateFixture.original
    dialog.showSaveDialog = globalThis.hrtUpdateFixture.dialog
    delete globalThis.hrtUpdateFixture
  })
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
  await desktop.evaluate(({ BrowserWindow, screen }) => {
    const win = BrowserWindow.getAllWindows()[0], area = screen.getPrimaryDisplay().workArea
    const width = Math.min(1000, area.width), height = Math.min(700, area.height)
    // Keep the fixture on-screen: restoration correctly clamps bounds beyond the work area.
    win.show(); win.setBounds({ x: area.x + Math.floor((area.width - width) / 2), y: area.y + Math.floor((area.height - height) / 2), width, height })
  })
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
  console.log(`PASS: Electron on ${process.platform}: offline tools, clipboard bridge${clipboardAvailable ? ' and OS round trip' : ' (OS round trip unverified)'}, project export/import, explicit update check/download (mock transport), window controls/restoration, isolated renderer and blocked external fetch`)
} finally {
  await desktop?.close()
  await rm(profile, { recursive: true, force: true })
}
