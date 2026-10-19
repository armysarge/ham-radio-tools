// Saved-project file: designs + locations as plain JSON the user can back up, email or carry on a USB stick.
// Settings and favorites are deliberately NOT included: they are per-device preferences.
export const PROJECT_FORMAT = 'ham-radio-tools-project'
export const PROJECT_VERSION = 1
const MAX_BYTES = 5 * 1024 * 1024

export interface ProjLocation { id: string; name: string; lat: number; lon: number }
export interface ProjDesign { id: string; toolId: string; name: string; summary: string; params: Record<string, number | string>; saved: string }
export interface ProjectData { locations: ProjLocation[]; designs: ProjDesign[]; stationId: string | null }
export interface ImportReport { addedLocations: number; addedDesigns: number; skippedExisting: number; skippedInvalid: string[] }

export function exportProject(d: ProjectData, now = new Date()): string {
  return JSON.stringify({ format: PROJECT_FORMAT, version: PROJECT_VERSION, exported: now.toISOString(), ...clone(d) }, null, 2)
}
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v))
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.slice(0, max) : null)

/** Parse and validate a project file. Throws Error with a message fit to show the user. */
export function parseProject(text: string, knownTools: string[]): { data: ProjectData; invalid: string[] } {
  if (text.length > MAX_BYTES) throw new Error('This file is larger than 5 MB, so it is probably not a Ham Radio Tools project.')
  let raw: unknown
  try { raw = JSON.parse(text) } catch { throw new Error('This file is not valid JSON. Choose a file exported from Ham Radio Tools.') }
  if (!isObj(raw) || raw.format !== PROJECT_FORMAT) throw new Error('This is not a Ham Radio Tools project file (missing format marker).')
  if (typeof raw.version !== 'number' || raw.version > PROJECT_VERSION)
    throw new Error(`This project was made by a newer version of the app (file version ${String(raw.version)}, this app reads up to ${PROJECT_VERSION}). Update the app and try again.`)

  const invalid: string[] = []
  const locations: ProjLocation[] = []
  for (const [i, l] of (Array.isArray(raw.locations) ? raw.locations : []).entries()) {
    const id = isObj(l) ? str(l.id, 64) : null, name = isObj(l) ? str(l.name) : null
    if (!isObj(l) || !id || !name || typeof l.lat !== 'number' || typeof l.lon !== 'number' || !(Math.abs(l.lat) <= 90) || !(Math.abs(l.lon) <= 180)) {
      invalid.push(`location #${i + 1}${name ? ` “${name}”` : ''}: needs an id, a name, latitude −90…90 and longitude −180…180`); continue
    }
    locations.push({ id, name, lat: l.lat, lon: l.lon })
  }
  const designs: ProjDesign[] = []
  for (const [i, d] of (Array.isArray(raw.designs) ? raw.designs : []).entries()) {
    const id = isObj(d) ? str(d.id, 64) : null, toolId = isObj(d) ? str(d.toolId, 64) : null, name = isObj(d) ? str(d.name) : null
    if (!isObj(d) || !id || !toolId || !name || !isObj(d.params)) { invalid.push(`design #${i + 1}${name ? ` “${name}”` : ''}: needs an id, tool, name and parameters`); continue }
    if (!knownTools.includes(toolId)) { invalid.push(`design “${name}”: tool “${toolId}” is not in this version of the app`); continue }
    const params: Record<string, number | string> = {}
    for (const [k, v] of Object.entries(d.params)) if ((typeof v === 'number' && Number.isFinite(v)) || typeof v === 'string') params[k.slice(0, 64)] = typeof v === 'string' ? v.slice(0, 200) : v
    const saved = str(d.saved, 40)
    designs.push({ id, toolId, name, summary: str(d.summary, 300) ?? '', params, saved: saved && !Number.isNaN(Date.parse(saved)) ? saved : new Date(0).toISOString() })
  }
  const stationId = typeof raw.stationId === 'string' && locations.some((l) => l.id === raw.stationId) ? raw.stationId : null
  return { data: { locations, designs, stationId }, invalid }
}

/**
 * Combine an imported project with what is already stored.
 * merge: items whose id already exists are kept as they are (never overwritten); the file's station is used only if none is set.
 * replace: stored locations and designs are discarded first.
 */
export function applyImport(current: ProjectData, incoming: { data: ProjectData; invalid: string[] }, mode: 'merge' | 'replace'): { next: ProjectData; report: ImportReport } {
  const base: ProjectData = mode === 'replace' ? { locations: [], designs: [], stationId: null } : clone(current)
  const report: ImportReport = { addedLocations: 0, addedDesigns: 0, skippedExisting: 0, skippedInvalid: incoming.invalid }
  for (const l of incoming.data.locations) {
    if (base.locations.some((x) => x.id === l.id)) report.skippedExisting++
    else { base.locations.push(l); report.addedLocations++ }
  }
  for (const d of incoming.data.designs) {
    if (base.designs.some((x) => x.id === d.id)) report.skippedExisting++
    else { base.designs.push(d); report.addedDesigns++ }
  }
  if (!base.stationId && incoming.data.stationId) base.stationId = incoming.data.stationId
  return { next: base, report }
}
