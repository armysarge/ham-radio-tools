// Port of SinCos.pas, Sun.pas, MagFld.pas and PathGeom.pas from DVOACAP (MIT, Copyright (c) 2013-2025 Alex Shovkoplyas, VE3NEA).
import { EarthR, HALF_PI, MAX_NON_POLE_LAT, MIN_NON_POLE_COSLAT, MIN_RXTX_DIST, MIN_RXTX_DIST2, RinD, TWO_PI, clamp1, frac, sign, type ControlPoint, type GeoPoint } from './types'

// ---------- SinCos ----------
export interface SinCos { sn: number; cs: number }
export function makeSinCosArray(x: number, len: number): SinCos[] {
  const r: SinCos[] = Array.from({ length: len }, () => ({ sn: 0, cs: 0 }))
  r[0] = { sn: 0, cs: 1 }
  r[1] = { sn: Math.sin(x), cs: Math.cos(x) }
  for (let i = 2; i < len; i++) {
    r[i] = { sn: r[1].sn * r[i - 1].cs + r[1].cs * r[i - 1].sn, cs: r[1].cs * r[i - 1].cs - r[1].sn * r[i - 1].sn }
  }
  return r
}

// ---------- Sun ----------
const f = (d: number) => d * RinD
const SUN_LAT: [number, number][] = [ // [month-1] -> [first half, second half]
  [f(-23.05), f(-17.31)], [f(-17.30), f(-7.89)], [f(-7.88), f(4.21)], [f(4.26), f(14.8)], [f(14.84), f(21.93)], [f(21.93), f(23.45)],
  [f(23.15), f(18.23)], [f(18.20), f(8.68)], [f(8.55), f(-2.86)], [f(-2.90), f(-14.16)], [f(-14.20), f(-21.68)], [f(-21.66), f(-23.45)],
]
export function computeZenithAngle(p: GeoPoint, utc: number, month: number) {
  const sunLon = Math.PI - utc * TWO_PI
  const [a, b] = SUN_LAT[month - 1]
  const sunLat = Math.abs(p.lat - a) > Math.abs(p.lat - b) ? a : b
  const r = Math.sin(p.lat) * Math.sin(sunLat) + Math.cos(p.lat) * Math.cos(sunLat) * Math.cos(p.lon - sunLon)
  return Math.acos(Math.max(-1, Math.min(1, r)))
}
/** Local time as a fraction of a day; VOACAP uses 1 h to 24 h, never 0 h. */
export function computeLocalTime(utc: number, lon: number) {
  const r = frac(utc + 1 + lon / TWO_PI)
  return r < 1e-4 ? 1 : r
}

// ---------- Geomagnetic field ----------
const MAG_POLE: GeoPoint = { lat: 79.5 * RinD, lon: -69.0 * RinD }
const CT = [
  [0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0], [0.33333333, 0, 0, 0, 0, 0, 0], [0.26666667, 0.2, 0, 0, 0, 0, 0],
  [0.25714286, 0.22857142, 0.14285714, 0, 0, 0, 0], [0.25396825, 0.23809523, 0.19047619, 0.11111111, 0, 0, 0], [0.25252525, 0.24242424, 0.21212121, 0.16161616, 0.09090909, 0, 0],
]
const G = [
  [0, 0, 0, 0, 0, 0, 0], [0.304112, 0.021474, 0, 0, 0, 0, 0], [0.024035, -0.051253, -0.013381, 0, 0, 0, 0], [-0.031518, 0.06213, -0.024898, -0.006496, 0, 0, 0],
  [-0.041794, -0.045298, -0.021795, 0.007008, -0.002044, 0, 0], [0.016256, -0.034407, -0.019447, -0.000608, 0.002775, 0.000697, 0], [-0.019523, -0.004853, 0.003212, 0.021413, 0.001051, 0.000227, 0.001115],
]
const H = [
  [0, 0, 0, 0, 0, 0, 0], [0, -0.057989, 0, 0, 0, 0, 0], [0, 0.033124, -0.001579, 0, 0, 0, 0], [0, 0.01487, -0.004075, 0.00021, 0, 0, 0],
  [0, -0.011825, 0.010006, 0.00043, 0.001385, 0, 0], [0, -0.000796, -0.002, 0.004597, 0.002421, -0.001218, 0], [0, -0.005758, -0.008735, -0.003406, -0.000118, -0.001116, -0.000325],
]

function computeXYZ(pnt: ControlPoint) {
  const EARTH_R = 6371200, HEIGHT = 300000, AR = EARTH_R / (EARTH_R + HEIGHT)
  let lat: number, lon: number
  if (pnt.loc.lat > MAX_NON_POLE_LAT) { lat = MAX_NON_POLE_LAT; lon = 0 }
  else if (pnt.loc.lat < -MAX_NON_POLE_LAT) { lat = -MAX_NON_POLE_LAT; lon = 0 }
  else { lat = pnt.loc.lat; lon = pnt.eastLon }

  const C = Math.sin(lat), S = Math.cos(lat)
  const W = makeSinCosArray(lon, 7)
  const P = Array.from({ length: 7 }, () => new Array(7).fill(0)), DP = Array.from({ length: 7 }, () => new Array(7).fill(0))
  let pwrAR = AR * AR
  P[0][0] = 1; DP[0][0] = 0
  let X = 0, Y = 0, Z = 0
  for (let n = 1; n <= 6; n++) {
    let sumZ = 0, sumY = 0, sumX = 0
    for (let m = 0; m <= n; m++) {
      if (m === n) { P[n][n] = S * P[n - 1][n - 1]; DP[n][n] = S * DP[n - 1][n - 1] + C * P[n - 1][n - 1] }
      else if (n === 1) { P[1][0] = C; DP[1][0] = -S }
      else { P[n][m] = C * P[n - 1][m] - CT[n][m] * P[n - 2][m]; DP[n][m] = C * DP[n - 1][m] - S * P[n - 1][m] - CT[n][m] * DP[n - 2][m] }
      const temp = G[n][m] * W[m].cs + H[n][m] * W[m].sn
      sumZ += P[n][m] * temp
      sumY += DP[n][m] * temp
      sumX += m * P[n][m] * (-G[n][m] * W[m].sn + H[n][m] * W[m].cs)
    }
    pwrAR *= AR
    Z -= pwrAR * (n + 1) * sumZ
    Y -= pwrAR * sumY
    X += pwrAR * sumX
  }
  X /= S
  return { X, Y, Z }
}

/** Fills magLat, gyroFreq and magDip of the control point. */
export function computeMagField(pnt: ControlPoint) {
  const { X, Y, Z } = computeXYZ(pnt)
  const mag2 = Math.sqrt(X * X + Y * Y), mag3 = Math.sqrt(X * X + Y * Y + Z * Z)
  const qcos = clamp1(Math.sin(MAG_POLE.lat) * Math.sin(pnt.loc.lat) + Math.cos(MAG_POLE.lat) * Math.cos(pnt.loc.lat) * Math.cos(pnt.loc.lon - MAG_POLE.lon))
  pnt.magLat = HALF_PI - Math.acos(qcos)
  pnt.gyroFreq = 2.8 * mag3
  const gob = Math.max(0.000001, Math.cos(pnt.loc.lat))
  pnt.magDip = Math.atan(Math.atan(-Z / mag2) / Math.sqrt(gob))
}

// ---------- Path geometry ----------
export class PathGeometry {
  tx: GeoPoint = { lat: 0, lon: 0 }
  rx: GeoPoint = { lat: 0, lon: 0 }
  dist = 0
  azimTR = 0
  azimRT = 0
  longPath = false
  private dLon = 0

  setTxRx(aTx: GeoPoint, aRx: GeoPoint) {
    this.tx = { ...aTx }
    this.rx = { ...aRx }
    const { tx, rx } = this
    // move Rx away from Tx a little bit
    if (Math.max(Math.abs(rx.lat - tx.lat), Math.abs(rx.lon - tx.lon)) <= MIN_RXTX_DIST) rx.lat = rx.lat - sign(rx.lat) * MIN_RXTX_DIST
    // at poles force longitude 0
    if (Math.abs(rx.lat) > MAX_NON_POLE_LAT) rx.lon = 0
    if (Math.abs(tx.lat) > MAX_NON_POLE_LAT) tx.lon = 0

    this.dLon = tx.lon - rx.lon
    if (Math.abs(this.dLon) > Math.PI) this.dLon = this.dLon - sign(this.dLon) * TWO_PI
    if (this.longPath) this.dLon = this.dLon - sign(this.dLon) * TWO_PI

    let q = clamp1(Math.sin(tx.lat) * Math.sin(rx.lat) + Math.cos(tx.lat) * Math.cos(rx.lat) * Math.cos(this.dLon))
    this.dist = Math.max(MIN_RXTX_DIST2, Math.acos(q))
    if (this.longPath) this.dist = TWO_PI - this.dist

    if (Math.cos(tx.lat) <= MIN_NON_POLE_COSLAT) this.azimTR = tx.lat <= 0 ? 0 : Math.PI
    else { q = clamp1((Math.sin(rx.lat) - Math.sin(tx.lat) * Math.cos(this.dist)) / (Math.cos(tx.lat) * Math.sin(this.dist))); this.azimTR = Math.acos(q) }
    if (this.dLon > 0) this.azimTR = TWO_PI - this.azimTR

    if (Math.cos(rx.lat) <= MIN_NON_POLE_COSLAT) this.azimRT = rx.lat <= 0 ? 0 : Math.PI
    else { q = clamp1((Math.sin(tx.lat) - Math.sin(rx.lat) * Math.cos(this.dist)) / (Math.cos(rx.lat) * Math.sin(this.dist))); this.azimRT = Math.acos(q) }
    if (this.dLon < 0) this.azimRT = TWO_PI - this.azimRT
  }

  getPointAtDist(aDist: number): GeoPoint {
    const { tx, rx } = this
    if (Math.cos(tx.lat) < MIN_NON_POLE_COSLAT) {
      let lat = tx.lat - sign(tx.lat) * Math.abs(aDist)
      if (Math.abs(lat) > HALF_PI) lat = sign(lat) * HALF_PI
      return { lat, lon: rx.lon }
    }
    let q = clamp1(Math.cos(aDist) * Math.sin(tx.lat) + Math.sin(aDist) * Math.cos(tx.lat) * Math.cos(this.azimTR))
    const lat = HALF_PI - Math.acos(q)
    if (Math.cos(lat) <= MIN_NON_POLE_COSLAT) return { lat, lon: tx.lon }
    q = clamp1((Math.cos(aDist) - Math.sin(lat) * Math.sin(tx.lat)) / (Math.cos(lat) * Math.cos(tx.lat)))
    let lon = Math.acos(q)
    if (aDist > Math.PI) lon = TWO_PI - lon
    lon = tx.lon - sign(this.dLon) * Math.abs(lon)
    if (Math.abs(lon) > Math.PI) lon = lon - sign(lon) * TWO_PI
    return { lat, lon }
  }

  hopCount(elev: number, height: number) { return 1 + Math.trunc(this.dist / hopDistance(elev, height)) }
}

export function hopDistance(elev: number, height: number) { return 2 * (Math.acos((Math.cos(elev) * EarthR) / (EarthR + height)) - elev) }
export function hopLength3D(elev: number, hopDist: number, virtHeight: number) { return (2 * (virtHeight + EarthR * (1 - Math.cos(0.5 * hopDist)))) / Math.sin(0.5 * hopDist + elev) }
export function calcElevationAngle(hopDist: number, height: number) { const half = 0.5 * hopDist; return Math.atan((Math.cos(half) - EarthR / (EarthR + height)) / Math.sin(half)) }
export const sinOfIncidence = (elev: number, height: number) => (EarthR * Math.cos(elev)) / (EarthR + height)
export const cosOfIncidence = (elev: number, height: number) => Math.sqrt(Math.max(1e-6, 1 - sinOfIncidence(elev, height) ** 2))
