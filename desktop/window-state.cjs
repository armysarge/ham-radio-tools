const fs = require('node:fs')
function restoreWindowState(value, areas, primary) {
  let b = value?.bounds
  const valid = !!b && ['x', 'y', 'width', 'height'].every(k => Number.isFinite(b[k])) && b.width > 0 && b.height > 0
  if (!valid) b = { width: 1280, height: 850 }
  const overlap = a => valid ? Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y)) : 0
  const area = areas.reduce((best, a) => overlap(a) > overlap(best) ? a : best, primary)
  const width = Math.round(Math.min(area.width, Math.max(375, b.width)))
  const height = Math.round(Math.min(area.height, Math.max(500, b.height)))
  const clamp = (v, lo, hi) => Math.round(Math.max(lo, Math.min(hi, v)))
  const visible = overlap(area) > 0
  return { bounds: { x: clamp(visible ? b.x : area.x + (area.width - width) / 2, area.x, area.x + area.width - width), y: clamp(visible ? b.y : area.y + (area.height - height) / 2, area.y, area.y + area.height - height), width, height }, maximized: valid && value.maximized === true }
}
function readState(file) { try { return JSON.parse(fs.readFileSync(file, 'utf8')) } catch { return null } }
function writeState(file, value) {
  try { fs.writeFileSync(file + '.tmp', JSON.stringify(value)); fs.renameSync(file + '.tmp', file) }
  catch (error) { console.warn('Could not save window position:', error.message) }
}
module.exports = { restoreWindowState, readState, writeState }
