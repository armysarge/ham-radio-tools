const { app, BrowserWindow, dialog, protocol, session, shell } = require('electron')
const { readFile } = require('node:fs/promises')
const path = require('node:path')
const { assetPath, isInternal, externalUrl } = require('./policy.cjs')

protocol.registerSchemesAsPrivileged([{ scheme: 'hrt', privileges: { standard: true, secure: true, supportFetchAPI: true } }])
app.setName('Ham Radio Tools')
// A fixed origin and profile directory keep saved designs available when the version changes.
app.setPath('userData', process.env.HRT_TEST_PROFILE || path.join(app.getPath('appData'), 'ham-radio-tools'))
app.commandLine.appendSwitch('disable-background-networking')
app.commandLine.appendSwitch('disable-component-update')

const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.xml': 'application/xml', '.txt': 'text/plain' }
let mainWindow

async function openLink(url) {
  if (!externalUrl(url)) return
  const { response } = await dialog.showMessageBox(mainWindow, { type: 'question', title: 'Open in your browser?', message: 'This link opens the web.', detail: url, buttons: ['Cancel', 'Open browser'], defaultId: 0, cancelId: 0 })
  if (response === 1) await shell.openExternal(url)
}

function createWindow() {
  mainWindow = new BrowserWindow({ width: 1280, height: 850, minWidth: 375, minHeight: 500, show: !process.env.HRT_TEST_PROFILE,
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true, webviewTag: false, webSecurity: true, spellcheck: false } })
  mainWindow.setMenuBarVisibility(false)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => { void openLink(url); return { action: 'deny' } })
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!isInternal(url)) { event.preventDefault(); void openLink(url) }
  })
  mainWindow.webContents.on('will-attach-webview', (event) => event.preventDefault())
  void mainWindow.loadURL('hrt://app/')
}

app.whenReady().then(() => {
  const root = path.join(app.getAppPath(), 'dist')
  // Electron otherwise downloads Hunspell dictionaries for a fresh profile.
  session.defaultSession.setSpellCheckerEnabled(false)
  protocol.handle('hrt', async (request) => {
    const file = assetPath(request.url, root)
    if (!file || request.method !== 'GET') return new Response('Forbidden', { status: 403 })
    try {
      const content = await readFile(file)
      return new Response(content, { headers: { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Content-Security-Policy': "frame-ancestors 'none'", 'X-Content-Type-Options': 'nosniff' } })
    } catch { return new Response('Not found', { status: 404 }) }
  })
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    callback({ cancel: !isInternal(details.url) && !details.url.startsWith('blob:hrt://app/') && !details.url.startsWith('data:') && !details.url.startsWith('devtools:') })
  })
  session.defaultSession.setPermissionCheckHandler((_contents, permission, origin) => permission === 'media' && isInternal(origin))
  session.defaultSession.setPermissionRequestHandler(async (contents, permission, callback, details) => {
    if (!isInternal(contents.getURL()) || permission !== 'media' || details.mediaTypes?.some((type) => type !== 'audio')) return callback(false)
    const { response } = await dialog.showMessageBox(mainWindow, { type: 'question', title: 'Microphone access', message: 'Allow the CW listener to use your microphone?', detail: 'Audio is processed on this computer.', buttons: ['Deny', 'Allow'], defaultId: 0, cancelId: 0 })
    callback(response === 1)
  })
  createWindow()
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow() })
}).catch((error) => { console.error(error); app.exit(1) })
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
