export const C = 299_792_458 // m/s, exact

const need = (ok: boolean, msg: string) => { if (!ok) throw new RangeError(msg) }

export const wavelength = (fHz: number, vf = 1) => { need(fHz > 0, 'Frequency must be greater than 0'); return (C * vf) / fHz }
export const frequencyFromWavelength = (m: number, vf = 1) => { need(m > 0, 'Wavelength must be greater than 0'); return (C * vf) / m }
export const period = (fHz: number) => { need(fHz > 0, 'Frequency must be greater than 0'); return 1 / fHz }

// ---- dB / dBm ----
export const wattsToDbm = (w: number) => { need(w > 0, 'Power must be greater than 0'); return 10 * Math.log10(w / 1e-3) }
export const dbmToWatts = (dbm: number) => 1e-3 * 10 ** (dbm / 10)
export const powerRatioToDb = (r: number) => { need(r > 0, 'Ratio must be greater than 0'); return 10 * Math.log10(r) }
export const dbToPowerRatio = (db: number) => 10 ** (db / 10)
/** Voltage ratio -> dB. Equals the power dB only when both voltages are across the same impedance. */
export const voltageRatioToDb = (r: number) => { need(r > 0, 'Ratio must be greater than 0'); return 20 * Math.log10(r) }
export const dbToVoltageRatio = (db: number) => 10 ** (db / 20)
export const vrmsFromWatts = (w: number, ohms: number) => { need(ohms > 0, 'Impedance must be greater than 0'); return Math.sqrt(w * ohms) }

// ---- Ohm's law ----
export interface Ohm { v: number; i: number; r: number; p: number }
export type OhmKey = keyof Ohm
/** Solve all four quantities from any two known ones. */
export function ohm(a: OhmKey, x: number, b: OhmKey, y: number): Ohm {
  need(a !== b, 'Enter two different quantities')
  need(Number.isFinite(x) && Number.isFinite(y) && x >= 0 && y >= 0, 'Values must be zero or greater')
  const k: Partial<Ohm> = { [a]: x, [b]: y }
  const has = (q: OhmKey) => k[q] !== undefined
  let { v, i, r, p } = k
  if (has('v') && has('i')) { need(i! > 0, 'Current must be greater than 0 to find resistance'); r = v! / i!; p = v! * i! }
  else if (has('v') && has('r')) { need(r! > 0, 'Resistance must be greater than 0'); i = v! / r!; p = (v! * v!) / r! }
  else if (has('i') && has('r')) { v = i! * r!; p = i! * i! * r! }
  else if (has('v') && has('p')) { need(v! > 0, 'Voltage must be greater than 0 to use power'); i = p! / v!; r = (v! * v!) / p! }
  else if (has('i') && has('p')) { need(i! > 0, 'Current must be greater than 0 to use power'); v = p! / i!; r = p! / (i! * i!) }
  else { need(r! > 0 && p! > 0, 'Resistance and power must be greater than 0'); v = Math.sqrt(p! * r!); i = Math.sqrt(p! / r!) }
  return { v: v!, i: i!, r: r!, p: p! }
}

// ---- SWR / reflection ----
export interface Match { gamma: number; swr: number; returnLossDb: number; mismatchLossDb: number; reflectedPct: number }
export function fromGamma(g: number): Match {
  need(g >= 0 && g <= 1, '|Γ| must be between 0 and 1')
  return {
    gamma: g,
    swr: g >= 1 ? Infinity : (1 + g) / (1 - g),
    returnLossDb: g === 0 ? Infinity : -20 * Math.log10(g),
    mismatchLossDb: g >= 1 ? Infinity : -10 * Math.log10(1 - g * g),
    reflectedPct: g * g * 100,
  }
}
export const fromSwr = (s: number) => { need(s >= 1, 'SWR must be 1 or greater'); return fromGamma((s - 1) / (s + 1)) }
export const fromReturnLoss = (rl: number) => { need(rl >= 0, 'Return loss must be 0 dB or greater'); return fromGamma(10 ** (-rl / 20)) }
/** Purely resistive load on a line of characteristic impedance z0. */
export function fromLoad(rLoad: number, z0: number) {
  need(z0 > 0, 'Line impedance must be greater than 0')
  need(rLoad >= 0, 'Load resistance must be 0 or greater')
  return fromGamma(Math.abs((rLoad - z0) / (rLoad + z0)))
}

// ---- Reactance / resonance ----
export const inductiveReactance = (fHz: number, henries: number) => 2 * Math.PI * fHz * henries
export const capacitiveReactance = (fHz: number, farads: number) => { need(fHz > 0 && farads > 0, 'Values must be greater than 0'); return 1 / (2 * Math.PI * fHz * farads) }
export const resonantFreq = (h: number, f: number) => { need(h > 0 && f > 0, 'Values must be greater than 0'); return 1 / (2 * Math.PI * Math.sqrt(h * f)) }

// ---- Feedline electrical length ----
export function physicalLengthForDegrees(fHz: number, vf: number, degrees: number) {
  need(vf > 0 && vf <= 1, 'Velocity factor must be between 0 and 1')
  return (degrees / 360) * wavelength(fHz, vf)
}
