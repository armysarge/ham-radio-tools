const { readFile, readdir } = require('node:fs/promises')
const path = require('node:path')
const { assetPath } = require('./policy.cjs')
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.xml': 'application/xml', '.txt': 'text/plain' }

async function createAssetHandler(root) {
  // A running renderer must keep the same hashed files even if Vite replaces dist/.
  const assets = new Map()
  async function collect(dir) {
    await Promise.all((await readdir(dir, { withFileTypes: true })).map(async entry => {
      const file = path.join(dir, entry.name)
      if (entry.isDirectory()) await collect(file)
      else if (entry.isFile()) assets.set(file, await readFile(file))
    }))
  }
  await collect(path.resolve(root))
  if (!assets.has(path.resolve(root, 'index.html'))) throw new Error('Application bundle is missing index.html. Build the application before launching Electron.')
  return async request => {
    const file = assetPath(request.url, root)
    if (!file || request.method !== 'GET') return new Response('Forbidden', { status: 403 })
    const content = assets.get(file)
    if (!content) return new Response('Not found', { status: 404 })
    return new Response(content, { headers: { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Content-Security-Policy': "frame-ancestors 'none'", 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' } })
  }
}

module.exports = { createAssetHandler }
