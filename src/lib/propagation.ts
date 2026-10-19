// Sun position (NOAA general solar position formulae, accurate to about a minute) and a single-hop MUF estimate. Degrees unless named.
const RAD = Math.PI / 180
const need = (ok: boolean, msg: string) => { if (!ok) throw new RangeError(msg) }

export interface Sun { declinationDeg: number; eqTimeMin: number; subLat: number; subLon: number }
export function sunAt(d: Date): Sun {
  const start = Date.UTC(d.getUTCFullYear(), 0, 1), dayOfYear = Math.floor((d.getTime() - start) / 86400000) + 1
  const hours = d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600
  const g = ((2 * Math.PI) / 365) * (dayOfYear - 1 + (hours - 12) / 24) // fractional year, radians
  const eq = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g))
  const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g)
  let lon = -15 * (hours - 12 + eq / 60); lon = ((lon + 540) % 360) - 180
  return { declinationDeg: decl / RAD, eqTimeMin: eq, subLat: decl / RAD, subLon: lon }
}
/** Sun elevation above the horizon (degrees, no refraction) at a place and time. */
export function sunElevation(latDeg: number, lonDeg: number, d: Date) {
  need(Math.abs(latDeg) <= 90 && Math.abs(lonDeg) <= 180, 'Latitude must be within ±90 and longitude within ±180')
  const s = sunAt(d), h = (lonDeg - s.subLon) * RAD, p = latDeg * RAD, dl = s.subLat * RAD
  return Math.asin(Math.sin(p) * Math.sin(dl) + Math.cos(p) * Math.cos(dl) * Math.cos(h)) / RAD
}
/** Sunrise and sunset (UTC, as Date) on the UTC date of `d`, or the reason there are none (polar day or night). */
export function sunriseSunset(latDeg: number, lonDeg: number, d: Date): { rise: Date; set: Date } | { none: 'polar day' | 'polar night' } {
  need(Math.abs(latDeg) <= 90 && Math.abs(lonDeg) <= 180, 'Latitude must be within ±90 and longitude within ±180')
  const noon = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12))
  const s = sunAt(noon), p = latDeg * RAD, dl = s.declinationDeg * RAD
  const cosH = Math.cos(90.833 * RAD) / (Math.cos(p) * Math.cos(dl)) - Math.tan(p) * Math.tan(dl)
  if (cosH > 1) return { none: 'polar night' }
  if (cosH < -1) return { none: 'polar day' }
  const ha = Math.acos(cosH) / RAD, midnight = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  const at = (minutes: number) => new Date(midnight + minutes * 60000)
  return { rise: at(720 - 4 * (lonDeg + ha) - s.eqTimeMin), set: at(720 - 4 * (lonDeg - ha) - s.eqTimeMin) }
}
/** Day/night boundary as [lat, lon] points, west to east. */
export function terminator(d: Date, steps = 180): [number, number][] {
  const s = sunAt(d), dl = s.subLat * RAD
  const t = Math.abs(Math.tan(dl)) < 1e-6 ? 1e-6 : Math.tan(dl)
  return Array.from({ length: steps + 1 }, (_, i) => {
    const lon = -180 + (360 * i) / steps
    return [Math.atan(-Math.cos((lon - s.subLon) * RAD) / t) / RAD, lon] as [number, number]
  })
}
export type DayPart = 'day' | 'grey line' | 'night'
/** “Grey line” = sun within 6° of the horizon (twilight), where HF paths often peak. */
export const dayPart = (elevationDeg: number): DayPart => (Math.abs(elevationDeg) <= 6 ? 'grey line' : elevationDeg > 0 ? 'day' : 'night')

/**
 * Single-hop MUF = foF2 × sec(θ), θ the angle of incidence at a reflecting layer of height `hKm`, on a spherical Earth.
 * foF2 is the critical frequency of the F2 layer in MHz, which must come from a measurement or forecast (ionosonde, space-weather service).
 */
export function mufMHz(foF2MHz: number, distanceKm: number, layerKm = 300) {
  need(foF2MHz > 0 && distanceKm > 0 && layerKm > 0, 'Critical frequency, distance and layer height must be greater than 0')
  const R = 6371, half = distanceKm / R / 2
  need(half < Math.PI / 2, 'Distance is too long for one hop')
  const theta = Math.atan((R * Math.sin(half)) / (layerKm + R * (1 - Math.cos(half))))
  return { secant: 1 / Math.cos(theta), muf: foF2MHz / Math.cos(theta), incidenceDeg: theta / RAD }
}
/** Longest single F2 hop for a layer height (take-off at the horizon), in km. */
export const maxHopKm = (layerKm = 300) => { const R = 6371; return 2 * R * Math.acos(R / (R + layerKm)) }
