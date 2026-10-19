export type Precision = 2 | 4 | 6 | 8
export interface Cell { locator: string; south: number; north: number; west: number; east: number; centerLat: number; centerLon: number }

const A = 'ABCDEFGHIJKLMNOPQRSTUVWX'
// Smallest (8-char) cell is 30" x 15" = 1/120 deg lon, 1/240 deg lat. Maths runs on integer cell indices.
const LON_N = 120, LAT_N = 240, EPS = 1e-9, N = 43200 // 18*10*24*10 cells per axis

export const normalizeLon = (lon: number) => ((((lon + 180) % 360) + 360) % 360) - 180

export function encode(lat: number, lon: number, chars: Precision = 6): string {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) throw new RangeError('Latitude and longitude must be numbers')
  if (lat < -90 || lat > 90) throw new RangeError('Latitude must be between -90 and 90')
  const ix = Math.min(N - 1, Math.floor((normalizeLon(lon) + 180) * LON_N + EPS)) // lon 180 wraps to -180
  const iy = Math.min(N - 1, Math.floor((lat + 90) * LAT_N + EPS)) // lat 90 belongs to the northernmost row
  const p = [A[Math.floor(ix / 2400)], A[Math.floor(iy / 2400)]]
  if (chars >= 4) p.push(String(Math.floor(ix / 240) % 10), String(Math.floor(iy / 240) % 10))
  if (chars >= 6) p.push(A[Math.floor(ix / 10) % 24].toLowerCase(), A[Math.floor(iy / 10) % 24].toLowerCase())
  if (chars >= 8) p.push(String(ix % 10), String(iy % 10))
  return p.join('')
}

const RE = /^[A-R]{2}(\d{2}([A-X]{2}(\d{2})?)?)?$/i
export const isValid = (loc: string) => RE.test(loc.trim())

export function decode(input: string): Cell {
  const loc = input.trim()
  if (!RE.test(loc)) throw new RangeError('Locator must look like JN58, JN58td or JN58td21 (letters A–R, digits, then letters A–X)')
  const u = loc.toUpperCase()
  let w = (u.charCodeAt(0) - 65) * 2400, h = (u.charCodeAt(1) - 65) * 2400, size = 2400
  if (u.length >= 4) { w += +u[2] * 240; h += +u[3] * 240; size = 240 }
  if (u.length >= 6) { w += (u.charCodeAt(4) - 65) * 10; h += (u.charCodeAt(5) - 65) * 10; size = 10 }
  if (u.length >= 8) { w += +u[6]; h += +u[7]; size = 1 }
  const west = w / LON_N - 180, south = h / LAT_N - 90
  const east = west + size / LON_N, north = south + size / LAT_N
  const canon = u.slice(0, 4) + u.slice(4, 6).toLowerCase() + u.slice(6)
  return { locator: canon, south, north, west, east, centerLat: (south + north) / 2, centerLon: (west + east) / 2 }
}

const PREC = {
  2: { name: 'field', lonDeg: 20, latDeg: 10 },
  4: { name: 'square', lonDeg: 2, latDeg: 1 },
  6: { name: 'subsquare', lonDeg: 5 / 60, latDeg: 2.5 / 60 },
  8: { name: 'extended square', lonDeg: 0.5 / 60, latDeg: 0.25 / 60 },
} as const
/** What a locator length means on the ground (north–south extent is constant; east–west shrinks with latitude). */
export const precisionInfo = (chars: Precision) => ({ ...PREC[chars], nsKm: PREC[chars].latDeg * 111.195 })
