const R_KM = 6371.0088 // mean Earth radius; spherical model, up to ~0.5% distance error vs. the ellipsoid
const rad = (d: number) => (d * Math.PI) / 180
const deg = (r: number) => (r * 180) / Math.PI
export const KM_PER_MILE = 1.609344
export const KM_PER_NM = 1.852

export interface Path { shortKm: number; longKm: number; shortBearing: number | null; longBearing: number | null }

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2
  return 2 * R_KM * Math.asin(Math.min(1, Math.sqrt(a)))
}

/** Initial bearing 0..360 clockwise from true north; null when undefined (same point or exact antipodes). */
export function initialBearing(lat1: number, lon1: number, lat2: number, lon2: number): number | null {
  if (Math.abs(lat1) >= 90 - 1e-9) return lat1 > 0 ? 180 : 0 // at a pole every direction is south (north pole) / north (south pole)
  const d = haversineKm(lat1, lon1, lat2, lon2)
  if (d < 1e-6 || Math.abs(d - Math.PI * R_KM) < 1e-3) return null
  const φ1 = rad(lat1), φ2 = rad(lat2), dλ = rad(lon2 - lon1)
  const y = Math.sin(dλ) * Math.cos(φ2)
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(dλ)
  return (deg(Math.atan2(y, x)) + 360) % 360
}

export function path(lat1: number, lon1: number, lat2: number, lon2: number): Path {
  const shortKm = haversineKm(lat1, lon1, lat2, lon2)
  const sb = initialBearing(lat1, lon1, lat2, lon2)
  return { shortKm, longKm: 2 * Math.PI * R_KM - shortKm, shortBearing: sb, longBearing: sb == null ? null : (sb + 180) % 360 }
}

/** Short-path great-circle points as [lat, lon]. Caller must split the line where lon jumps across ±180. */
export function greatCircle(lat1: number, lon1: number, lat2: number, lon2: number, n = 128): [number, number][] {
  const φ1 = rad(lat1), λ1 = rad(lon1), φ2 = rad(lat2), λ2 = rad(lon2)
  const d = haversineKm(lat1, lon1, lat2, lon2) / R_KM
  if (d < 1e-9 || Math.abs(d - Math.PI) < 1e-9) return [[lat1, lon1], [lat2, lon2]]
  const out: [number, number][] = []
  for (let k = 0; k <= n; k++) {
    const f = k / n, a = Math.sin((1 - f) * d) / Math.sin(d), b = Math.sin(f * d) / Math.sin(d)
    const x = a * Math.cos(φ1) * Math.cos(λ1) + b * Math.cos(φ2) * Math.cos(λ2)
    const y = a * Math.cos(φ1) * Math.sin(λ1) + b * Math.cos(φ2) * Math.sin(λ2)
    const z = a * Math.sin(φ1) + b * Math.sin(φ2)
    out.push([deg(Math.atan2(z, Math.hypot(x, y))), deg(Math.atan2(y, x))])
  }
  return out
}
