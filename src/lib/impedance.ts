// Series and parallel combinations of resistors, inductors, capacitors and general complex impedances at one frequency.
// Convention: Z = R + jX with the e^(jωt) sign, so inductive reactance is positive and capacitive reactance is negative.
const need = (ok: boolean, msg: string) => { if (!ok) throw new RangeError(msg) }

export interface Cx { re: number; im: number }
export const cx = (re: number, im = 0): Cx => ({ re, im })
export const cAdd = (a: Cx, b: Cx): Cx => cx(a.re + b.re, a.im + b.im)
export const cAbs = (a: Cx) => Math.hypot(a.re, a.im)
export const cArg = (a: Cx) => Math.atan2(a.im, a.re)
export function cDiv(a: Cx, b: Cx): Cx {
  const d = b.re * b.re + b.im * b.im
  need(d > 0, 'Division by zero')
  return cx((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d)
}
export const cInv = (a: Cx) => cDiv(cx(1), a)

export type ElementKind = 'R' | 'L' | 'C' | 'Z'
export interface Element { kind: ElementKind; /** R: Ω, L: H, C: F, Z: resistance in Ω */ a: number; /** Z only: reactance in Ω */ b?: number }
export const KIND_NAME: Record<ElementKind, string> = { R: 'Resistor', L: 'Inductor', C: 'Capacitor', Z: 'Impedance' }

/** Impedance of one element at frequency fHz. */
export function elementImpedance(e: Element, fHz: number): Cx {
  need(Number.isFinite(fHz) && fHz > 0, 'Frequency must be finite and greater than 0')
  need(Number.isFinite(e.a), 'Enter a number for every element')
  switch (e.kind) {
    case 'R': need(e.a >= 0, 'Resistance must be 0 or more'); return cx(e.a)
    case 'L': need(e.a >= 0, 'Inductance must be 0 or more'); return cx(0, 2 * Math.PI * fHz * e.a)
    case 'C': need(e.a > 0, 'Capacitance must be greater than 0'); return cx(0, -1 / (2 * Math.PI * fHz * e.a))
    case 'Z': need(e.a >= 0, 'Resistance must be 0 or more'); need(Number.isFinite(e.b), 'Enter a number for every element'); return cx(e.a, e.b!)
  }
}

export interface Combined {
  /** Total impedance. Infinite parts mean an open circuit: re = im = Infinity. */
  z: Cx
  open: boolean
  short: boolean
}
const RELATIVE_ZERO = 1e-12

export function combine(elements: Element[], fHz: number, mode: 'series' | 'parallel'): Combined {
  need(elements.length >= 1, 'Add at least one element')
  const zs = elements.map((e) => elementImpedance(e, fHz))
  if (mode === 'series') {
    const z = zs.reduce(cAdd, cx(0))
    need(Number.isFinite(z.re) && Number.isFinite(z.im), 'Result exceeds the supported numeric range')
    return { z, open: false, short: z.re === 0 && z.im === 0 }
  }
  if (zs.some((z) => z.re === 0 && z.im === 0)) return { z: cx(0), open: false, short: true } // a short circuit wins
  const ys = zs.map(cInv)
  const y = ys.reduce(cAdd, cx(0))
  const scale = Math.max(...ys.map(cAbs))
  need(Number.isFinite(scale), 'Result exceeds the supported numeric range')
  if (cAbs(y) <= scale * RELATIVE_ZERO) return { z: cx(Infinity, Infinity), open: true, short: false } // ideal parallel resonance
  return { z: cInv(y), open: false, short: false }
}

export const admittance = (c: Combined): Cx => (c.open ? cx(0) : c.short ? cx(Infinity) : cInv(c.z))

export interface Match { gamma: number; swr: number; returnLossDb: number }
/** Reflection magnitude, SWR and return loss of a load against a real reference impedance z0. */
export function matchAgainst(c: Combined, z0: number): Match {
  need(Number.isFinite(z0) && z0 > 0, 'Reference impedance must be greater than 0')
  if (c.open) return { gamma: 1, swr: Infinity, returnLossDb: 0 }
  const g = cAbs(cDiv(cx(c.z.re - z0, c.z.im), cx(c.z.re + z0, c.z.im)))
  return { gamma: g, swr: g >= 1 ? Infinity : (1 + g) / (1 - g), returnLossDb: g === 0 ? Infinity : -20 * Math.log10(g) }
}

/** Equivalent series R plus an inductor or capacitor at fHz. Q is |X|/R (Infinity when R is 0 and X is not). */
export function seriesEquivalent(z: Cx, fHz: number) {
  need(Number.isFinite(z.re) && Number.isFinite(z.im), 'No finite series equivalent for an open circuit')
  const w = 2 * Math.PI * fHz
  const kind = z.im > 0 ? 'inductive' : z.im < 0 ? 'capacitive' : 'resistive'
  return {
    kind,
    resistance: z.re,
    inductance: z.im > 0 ? z.im / w : null,
    capacitance: z.im < 0 ? -1 / (w * z.im) : null,
    q: z.im === 0 ? 0 : z.re === 0 ? Infinity : Math.abs(z.im) / z.re,
  } as const
}
