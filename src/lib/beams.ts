// Starting dimensions for wire/rod Yagi and quad beams, and radial planning. Pure functions, metres.
// These are rule-of-thumb STARTING designs from widely published proportions, not optimised: no gain or pattern is claimed.
// Build, measure with an analyser, then trim. Boom-through elements need an end-effect correction (see the notes in the tool).
import { C } from './rf'

const need = (ok: boolean, msg: string) => { if (!ok) throw new RangeError(msg) }
const lambda = (fHz: number) => { need(fHz > 0, 'Frequency must be greater than 0'); return C / fHz }

export interface BeamElement { role: 'reflector' | 'driven' | 'director'; length: number; position: number } // position: metres from the reflector (or the driven element if none)

/**
 * Yagi: driven element ≈ 0.473 λ (half wave with ~5 % end-effect shortening), reflector 5 % longer, first director 5 % shorter and
 * each further director 3 % shorter again. Spacing: reflector 0.2 λ behind, first director 0.15 λ, later directors 0.25 λ apart.
 */
export function yagi(fHz: number, elements: number): BeamElement[] {
  need(Number.isInteger(elements) && elements >= 2 && elements <= 8, 'Use 2 to 8 elements')
  const l = lambda(fHz), driven = 0.473 * l
  const out: BeamElement[] = [{ role: 'reflector', length: driven * 1.05, position: 0 }, { role: 'driven', length: driven, position: 0.2 * l }]
  let pos = 0.2 * l, len = driven * 0.95
  for (let i = 0; i < elements - 2; i++) {
    pos += i === 0 ? 0.15 * l : 0.25 * l
    out.push({ role: 'director', length: len, position: pos })
    len *= 0.97
  }
  return out
}
export interface QuadLoop { role: 'reflector' | 'driven' | 'director'; perimeter: number; side: number; position: number }
/** Square quad loops (ARRL-type proportions): driven 1005/f ft, reflector 1030/f ft, directors 975/f ft, spaced 0.2 λ. */
export function quad(fHz: number, elements: number): QuadLoop[] {
  need(Number.isInteger(elements) && elements >= 2 && elements <= 5, 'Use 2 to 5 elements')
  const l = lambda(fHz), fMHz = fHz / 1e6, ftm = 0.3048
  const per = (k: number) => (k / fMHz) * ftm
  const mk = (role: QuadLoop['role'], k: number, i: number): QuadLoop => ({ role, perimeter: per(k), side: per(k) / 4, position: i * 0.2 * l })
  const out: QuadLoop[] = [mk('reflector', 1030, 0), mk('driven', 1005, 1)]
  for (let i = 2; i < elements; i++) out.push(mk('director', 975, i))
  return out
}

export const radialLengthM = (fHz: number, factor = 0.97) => { need(factor > 0 && factor <= 1, 'Factor must be between 0 and 1'); return 0.25 * lambda(fHz) * factor }
export interface RadialPlan { lengthM: number; full: boolean; count: number; totalWireM: number; fraction: number; advice: string }
/**
 * Radials for a quarter-wave vertical. Elevated: a few resonant radials. Ground-mounted: many, laid on or just under the ground; where the
 * garden is too small, shorten them and use more (a published rule of thumb, e.g. Rudge/ARRL: 16 or more is a good start, 30 or more is better).
 */
export function radialPlan(fHz: number, availableRadiusM: number, elevated: boolean): RadialPlan {
  need(availableRadiusM > 0, 'Available radius must be greater than 0')
  const ideal = radialLengthM(fHz, elevated ? 0.97 : 1), length = Math.min(ideal, availableRadiusM), full = availableRadiusM >= ideal
  const fraction = length / ideal
  const count = elevated ? 4 : full ? 16 : fraction >= 0.5 ? 24 : 32
  const advice = elevated
    ? 'Four resonant radials drooping at about 45° or sloped away from the base give a good match near 50 Ω.'
    : full ? 'Sixteen radials at full length is a sound start; more is better, with diminishing returns beyond about 60.'
      : 'The garden is shorter than a quarter wave: use shorter radials and more of them (30 or more). Expect some loss; a ground-mounted vertical with short radials is a compromise.'
  return { lengthM: length, full, count, totalWireM: length * count, fraction, advice }
}
