// American Wire Gauge (AWG) geometry, copper resistance, voltage drop and skin depth.
// Solid round copper wire. Gauge numbers are integers: 0 = "0", -1 = "00", -2 = "000", -3 = "0000".

const need = (ok: boolean, msg: string) => { if (!ok) throw new RangeError(msg) }

export const AWG_MIN = -3
export const AWG_MAX = 40
/** Copper resistivity at 20 °C: annealed copper, 100 % IACS, 1.7241e-8 Ω·m. */
export const COPPER_RHO_20C = 1.7241e-8
/** Temperature coefficient of resistance of copper near 20 °C, per °C. */
export const COPPER_TEMPCO = 0.00393
export const COPPER_DENSITY = 8960 // kg/m³
export const MU0 = 4e-7 * Math.PI

export const awgGauges = (): number[] => Array.from({ length: AWG_MAX - AWG_MIN + 1 }, (_, i) => AWG_MIN + i)

/** "0000" … "0", "1" … "40". */
export function awgLabel(n: number): string {
  need(Number.isInteger(n) && n >= AWG_MIN && n <= AWG_MAX, 'Gauge must be a whole number from 0000 to 40')
  return n <= 0 ? '0'.repeat(1 - n) : String(n)
}
/** Alternative "4/0" style label for the large sizes. */
export const awgAltLabel = (n: number): string | null => (n <= 0 && n >= AWG_MIN ? `${1 - n}/0` : null)

/** Defined diameter, in metres: 0.127 mm × 92^((36 − n)/39). */
export function awgDiameter(n: number): number {
  awgLabel(n)
  return 0.127e-3 * 92 ** ((36 - n) / 39)
}
export const areaFromDiameter = (d: number) => { need(Number.isFinite(d) && d > 0, 'Diameter must be greater than 0'); return Math.PI * d * d / 4 }
export const diameterFromArea = (a: number) => { need(Number.isFinite(a) && a > 0, 'Area must be greater than 0'); return Math.sqrt(4 * a / Math.PI) }
/** Circular mils: the square of the diameter in thousandths of an inch. */
export const circularMils = (d: number) => (d / 25.4e-6) ** 2

/** Exact (fractional) gauge number for a diameter in metres. */
export function awgFromDiameter(d: number): number {
  need(Number.isFinite(d) && d > 0, 'Diameter must be greater than 0')
  return 36 - 39 * Math.log(d / 0.127e-3) / Math.log(92)
}
/** Nearest standard gauge, with the diameter difference as a percentage of the standard size. */
export function nearestAwg(d: number) {
  const exact = awgFromDiameter(d)
  need(exact >= AWG_MIN - 0.5 && exact <= AWG_MAX + 0.5, 'Size is outside the 0000 to 40 AWG range')
  const gauge = Math.min(AWG_MAX, Math.max(AWG_MIN, Math.round(exact)))
  return { gauge, exact, diameterErrorPct: (d / awgDiameter(gauge) - 1) * 100 }
}

export function copperResistivity(tempC: number): number {
  need(Number.isFinite(tempC) && tempC >= -100 && tempC <= 250, 'Temperature must be between −100 and 250 °C')
  return COPPER_RHO_20C * (1 + COPPER_TEMPCO * (tempC - 20))
}
/** DC resistance per metre of solid copper wire of diameter d (m), in Ω/m. */
export const resistancePerMetre = (d: number, tempC = 20) => copperResistivity(tempC) / areaFromDiameter(d)
export const massPerMetre = (d: number) => COPPER_DENSITY * areaFromDiameter(d)

/** Skin depth in copper (m) at a frequency, from √(ρ / (π f μ0)). Non-magnetic conductor. */
export function skinDepth(fHz: number, tempC = 20): number {
  need(Number.isFinite(fHz) && fHz > 0, 'Frequency must be finite and greater than 0')
  return Math.sqrt(copperResistivity(tempC) / (Math.PI * fHz * MU0))
}
/** Approximate AC/DC resistance ratio of an isolated solid round wire: d/(4δ) once the wire is well over a skin depth thick, else 1. */
export const acResistanceRatio = (d: number, delta: number) => Math.max(1, d / (4 * delta))

export interface DropInput { diameter: number; currentA: number; oneWayLengthM: number; supplyV: number; tempC?: number; roundTrip?: boolean }
/** Voltage drop and power loss along a copper run. Round trip doubles the conductor length (out and back). */
export function voltageDrop(i: DropInput) {
  need(Number.isFinite(i.currentA) && i.currentA >= 0, 'Current must be 0 or more')
  need(Number.isFinite(i.oneWayLengthM) && i.oneWayLengthM >= 0, 'Length must be 0 or more')
  need(Number.isFinite(i.supplyV) && i.supplyV > 0, 'Supply voltage must be greater than 0')
  const conductorM = i.oneWayLengthM * (i.roundTrip === false ? 1 : 2)
  const resistance = resistancePerMetre(i.diameter, i.tempC ?? 20) * conductorM
  const dropV = i.currentA * resistance
  return { conductorM, resistance, dropV, dropPct: dropV / i.supplyV * 100, lossW: i.currentA * dropV }
}
/** Thinnest standard gauge (highest number) whose drop stays within maxPct of the supply, or null if even 0000 AWG is too thin. */
export function thinnestGaugeForDrop(i: Omit<DropInput, 'diameter'>, maxPct: number): number | null {
  need(Number.isFinite(maxPct) && maxPct > 0, 'Allowed drop must be greater than 0')
  for (let n = AWG_MAX; n >= AWG_MIN; n--) if (voltageDrop({ ...i, diameter: awgDiameter(n) }).dropPct <= maxPct) return n
  return null
}
