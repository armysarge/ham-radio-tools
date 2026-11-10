// Saved library of satellite element sets (TLEs): parsing multi-satellite files and keeping the newest set per satellite.
import { parseTle, tleEpoch, type Tle } from './sat'
import { MAX_SETS, type SavedElement } from './elementStore'

export { MAX_SETS, type SavedElement }
export const MAX_FILE_BYTES = 2 * 1024 * 1024
/** CelesTrak refreshes each group about every two hours; asking sooner gains nothing. */
export const CELESTRAK_INTERVAL_MS = 2 * 3600 * 1000

export const toTle = (e: SavedElement): Tle => ({ name: e.name, line1: e.line1, line2: e.line2 })
export const formatTle = (e: SavedElement) => `${e.name}\n${e.line1}\n${e.line2}`
export const elementAgeDays = (e: SavedElement, at: Date) => (at.getTime() - Date.parse(e.epoch)) / 86400000

/** Every valid element set in a file of two- or three-line sets. Sets that fail length, checksum or catalogue-number checks are counted, not stored. */
export function parseElementFile(text: string): { sets: Tle[]; rejected: number } {
  if (text.length > MAX_FILE_BYTES) throw new Error('This file is larger than 2 MB, so it is probably not an element-set file.')
  const lines = text.split(/\r?\n/).map((l) => l.trimEnd()).filter((l) => l.trim())
  const sets: Tle[] = []
  let rejected = 0
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].startsWith('1 ') || !lines[i + 1]?.startsWith('2 ')) continue
    const prev = i > 0 && !/^[12] /.test(lines[i - 1]) ? lines[i - 1] : ''
    try {
      const t = parseTle(`${prev}\n${lines[i]}\n${lines[i + 1]}`)
      if (t.line1.slice(2, 7) !== t.line2.slice(2, 7)) throw new Error('catalogue numbers differ')
      sets.push(t)
    } catch { rejected++ }
    i++
  }
  return { sets, rejected }
}

export interface MergeReport { added: number; updated: number; unchanged: number; older: number; skipped: number }
/** Add new satellites and replace a stored set only when the incoming epoch is newer. Result is sorted by name. */
export function mergeElements(current: SavedElement[], incoming: Tle[], now = new Date()): { next: SavedElement[]; report: MergeReport } {
  const map = new Map(current.map((e) => [e.norad, e]))
  const report: MergeReport = { added: 0, updated: 0, unchanged: 0, older: 0, skipped: 0 }
  for (const t of incoming) {
    const norad = Number(t.line1.slice(2, 7)), epoch = tleEpoch(t).toISOString(), existing = map.get(norad)
    const entry: SavedElement = { norad, name: t.name, line1: t.line1, line2: t.line2, epoch, saved: now.toISOString() }
    if (!existing) { if (map.size >= MAX_SETS) { report.skipped++; continue } map.set(norad, entry); report.added++ }
    else if (Date.parse(epoch) > Date.parse(existing.epoch)) { map.set(norad, entry); report.updated++ }
    else if (epoch === existing.epoch) report.unchanged++
    else report.older++
  }
  return { next: [...map.values()].sort((a, b) => a.name.localeCompare(b.name) || a.norad - b.norad), report }
}

export function describeMerge(r: MergeReport, rejected: number): string {
  const parts = [`${r.added} added`, `${r.updated} updated`]
  if (r.unchanged) parts.push(`${r.unchanged} already up to date`)
  if (r.older) parts.push(`${r.older} older than the saved set and ignored`)
  if (r.skipped) parts.push(`${r.skipped} skipped because the library is full (${MAX_SETS})`)
  if (rejected) parts.push(`${rejected} rejected as damaged`)
  return parts.join(', ') + '.'
}
