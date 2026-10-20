const path = require('node:path')

function isInternal(value) {
  try { const u = new URL(value); return u.protocol === 'hrt:' && u.host === 'app' && !u.username && !u.password } catch { return false }
}

function externalUrl(value) {
  try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) && !u.username && !u.password } catch { return false }
}

function assetPath(value, root) {
  if (!isInternal(value)) return null
  try {
    const name = decodeURIComponent(new URL(value).pathname)
    if (name.includes('\\') || name.includes(':') || name.includes('\0')) return null
    const target = path.resolve(root, '.' + (name === '/' ? '/index.html' : name))
    const relative = path.relative(root, target)
    return relative.startsWith('..') || path.isAbsolute(relative) ? null : target
  } catch { return null }
}

module.exports = { assetPath, isInternal, externalUrl }
