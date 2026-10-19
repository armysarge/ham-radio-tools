// Satellite pass prediction from a user-supplied two-line element set (TLE), using SGP4 from satellite.js (bundled, runs offline).
import * as sat from 'satellite.js'

export interface Tle { name: string; line1: string; line2: string }
const checksum = (l: string) => { let s = 0; for (const c of l.slice(0, 68)) s += c === '-' ? 1 : /\d/.test(c) ? Number(c) : 0; return s % 10 }

/** Accepts two lines, or three with a name line first. Lines are checked for length, number and checksum. */
export function parseTle(text: string): Tle {
  const ls = text.split(/\r?\n/).map((l) => l.trimEnd()).filter((l) => l.trim())
  const i = ls.findIndex((l) => l.startsWith('1 '))
  if (i < 0 || !ls[i + 1]?.startsWith('2 ')) throw new Error('A TLE has two lines, starting “1 ” and “2 ”. Paste both lines (a name line above them is fine).')
  const [l1, l2] = [ls[i], ls[i + 1]]
  for (const [n, l] of [[1, l1], [2, l2]] as const) {
    if (l.length !== 69) throw new Error(`Line ${n} should be 69 characters but is ${l.length}: check it was copied whole.`)
    if (checksum(l) !== Number(l[68])) throw new Error(`Line ${n} fails its checksum: a character was changed when it was copied.`)
  }
  return { name: i > 0 ? ls[i - 1].replace(/^0 /, '').trim() : 'Satellite', line1: l1, line2: l2 }
}
/** Epoch of the element set. */
export function tleEpoch(t: Tle): Date {
  const yy = Number(t.line1.slice(18, 20)), day = Number(t.line1.slice(20, 32))
  return new Date(Date.UTC(yy < 57 ? 2000 + yy : 1900 + yy, 0, 1) + (day - 1) * 86400000)
}
export const periodMin = (t: Tle) => (2 * Math.PI) / sat.twoline2satrec(t.line1, t.line2).no

export interface Observer { latDeg: number; lonDeg: number; altKm: number }
export interface Look { azDeg: number; elDeg: number; rangeKm: number }
export function look(t: Tle, o: Observer, at: Date): Look | null {
  const rec = sat.twoline2satrec(t.line1, t.line2), pv = sat.propagate(rec, at)
  if (!pv || typeof pv.position === 'boolean' || !pv.position) return null
  const la = sat.ecfToLookAngles({ latitude: sat.degreesToRadians(o.latDeg), longitude: sat.degreesToRadians(o.lonDeg), height: o.altKm }, sat.eciToEcf(pv.position, sat.gstime(at)))
  return { azDeg: sat.radiansToDegrees(la.azimuth), elDeg: sat.radiansToDegrees(la.elevation), rangeKm: la.rangeSat }
}
export interface Pass { aos: Date; los: Date; maxElDeg: number; tca: Date; aosAzDeg: number; losAzDeg: number }

/** Passes above `minElDeg` in the next `hours`: coarse scan every `stepSec`, then the edges refined to about a second. */
export function passes(t: Tle, o: Observer, from: Date, hours: number, minElDeg = 10, stepSec = 30): Pass[] {
  if (!(hours > 0 && hours <= 240)) throw new RangeError('Search 0 to 240 hours ahead')
  const rec = sat.twoline2satrec(t.line1, t.line2)
  if (rec.error) throw new Error('The orbital elements could not be used (they may be too old or damaged).')
  const el = (ms: number) => look(t, o, new Date(ms))?.elDeg ?? -90
  const refine = (a: number, b: number) => { // a below the threshold, b above, or vice versa; find the crossing
    const aBelow = el(a) < minElDeg
    for (let i = 0; i < 12; i++) { const m = (a + b) / 2; if ((el(m) < minElDeg) === aBelow) a = m; else b = m }
    return (a + b) / 2
  }
  const out: Pass[] = [], end = from.getTime() + hours * 3600000, step = stepSec * 1000
  let prev = from.getTime(), prevUp = el(prev) >= minElDeg, start = prevUp ? prev : 0, best = prevUp ? el(prev) : -90, bestT = prev
  for (let ms = prev + step; ms <= end + step; ms += step) {
    const e = el(ms), up = e >= minElDeg
    if (up && e > best) { best = e; bestT = ms }
    if (up && !prevUp) { start = refine(prev, ms); best = e; bestT = ms }
    if (!up && prevUp && start) {
      const stop = refine(prev, ms)
      out.push({ aos: new Date(start), los: new Date(stop), maxElDeg: best, tca: new Date(bestT), aosAzDeg: look(t, o, new Date(start))!.azDeg, losAzDeg: look(t, o, new Date(stop))!.azDeg })
      start = 0; best = -90
    }
    prev = ms; prevUp = up
  }
  return out
}
