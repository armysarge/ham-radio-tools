// Sizing maths for parts built from everyday materials. SI units unless named. Results are starting values: home-made parts
// vary with how neatly they are built, so every one of them is meant to be measured and trimmed.
import { airCoilTurns } from './station'

const need = (ok: boolean, msg: string) => { if (!ok) throw new RangeError(msg) }
export const EPS0 = 8.8541878128e-12 // F/m
const M_PER_IN = 0.0254

// ---- capacitors ----
export interface Dielectric { name: string; er: number; note: string }
/** Typical relative permittivities at HF. Plastic film values vary by maker, so treat them as ±15 %. */
export const DIELECTRICS: Dielectric[] = [
  { name: 'Air', er: 1.0006, note: 'Spacers keep the gap. Best for anything that sees RF power: no loss, no breakdown puncture.' },
  { name: 'Polyethylene (freezer bag, cling film)', er: 2.3, note: 'Very thin and stretchy: thickness is the big unknown, so measure it. Low loss.' },
  { name: 'PET / Mylar (laminating pouch, drinks bottle sheet)', er: 3.2, note: 'Thickness is steady and the film is strong, but loss is higher than polyethylene.' },
  { name: 'PTFE (plumber’s tape, layered)', er: 2.1, note: 'Excellent loss, but tape is tiny and compresses; best as spacer sheet.' },
  { name: 'Glass (microscope slide, picture-frame glass)', er: 6, note: 'Rigid, stable and high permittivity; permittivity of ordinary glass spans about 4–7.' },
]
/** Capacitance of stacked plates: gaps = (number of foil sheets − 1). Ignores fringing, which makes the real value somewhat higher. */
export function plateCapacitance(areaM2: number, gapM: number, er: number, gaps = 1) {
  need(areaM2 > 0 && gapM > 0 && er >= 1 && gaps >= 1, 'Area, gap and permittivity must be greater than 0 and at least one gap is needed')
  return (EPS0 * er * areaM2 * gaps) / gapM
}
/** Area of each foil sheet for a target capacitance. */
export function plateAreaFor(cF: number, gapM: number, er: number, gaps = 1) {
  need(cF > 0 && gapM > 0 && er >= 1 && gaps >= 1, 'Capacitance, gap and permittivity must be greater than 0')
  return (cF * gapM) / (EPS0 * er * gaps)
}
/** Rotary air capacitor from semicircular plates: each gap between neighbouring plates holds π(R²−r²)/2 of overlap when fully meshed. */
export function airVariable(cMaxF: number, rOuterM: number, rInnerM: number, gapM: number) {
  need(cMaxF > 0 && gapM > 0 && rInnerM >= 0 && rOuterM > rInnerM, 'Outer radius must be larger than the inner radius, and values greater than 0')
  const overlap = (Math.PI * (rOuterM ** 2 - rInnerM ** 2)) / 2
  const gaps = Math.max(1, Math.ceil((cMaxF * gapM) / (EPS0 * 1.0006 * overlap) - 1e-9))
  return { overlapM2: overlap, gaps, plates: gaps + 1, cMax: plateCapacitance(overlap, gapM, 1.0006, gaps) }
}
/** Air gap at which dry air breaks down, about 3 kV/mm for smooth surfaces. Real, dusty, pointed plates arc much sooner: use a fifth or less. */
export const airSafeVolts = (gapM: number) => { need(gapM > 0, 'Gap must be greater than 0'); return (3e6 * gapM) / 5 }

// ---- coils ----
/** Air-core coil on a former: turns from Wheeler's formula, and wire needed. `spacing` 1 = close wound, 2 = one wire-width gap between turns. */
export function airCoilBuild(targetUh: number, formerDiaM: number, wireDiaM: number, spacing = 1) {
  need(targetUh > 0 && formerDiaM > 0 && wireDiaM > 0 && spacing >= 1, 'Values must be greater than 0 and spacing at least 1')
  const dIn = formerDiaM / M_PER_IN, pitchIn = (wireDiaM * spacing) / M_PER_IN
  const turns = airCoilTurns(targetUh, dIn, pitchIn)
  const lengthM = turns * wireDiaM * spacing
  return { turns, lengthM, wireM: turns * Math.PI * (formerDiaM + wireDiaM), lengthToDiameter: lengthM / formerDiaM }
}

// ---- toroids ----
export interface CoreSize { odIn: number; idIn: number; hIn: number }
/** Wire for one turn through a toroid: round the cross-section (height + radial width) plus a little slack. */
export function toroidTurnLengthM(c: CoreSize) { need(c.odIn > c.idIn && c.idIn > 0 && c.hIn > 0, 'Core dimensions must be positive with OD > ID'); return (2 * (c.hIn + (c.odIn - c.idIn) / 2) + 0.1) * M_PER_IN }
/** Most turns of wire of diameter wireDiaM that fit in one layer inside the hole (conservative: leaves room for the wire to pass). */
export function maxSingleLayerTurns(idIn: number, wireDiaM: number) {
  need(idIn > 0 && wireDiaM > 0, 'Values must be greater than 0')
  return Math.max(0, Math.floor((Math.PI * (idIn * M_PER_IN - 2 * wireDiaM)) / wireDiaM))
}

// ---- dummy loads ----
export interface LoadOption { series: number; parallel: number; count: number; ohms: number; swr: number; ratedW: number; sustainedW: number }
/**
 * Series/parallel arrays of identical resistors that come close to the target resistance. `sustainedW` is half the combined rating, the usual
 * allowance for carbon resistors in still air without a heat sink. Resistors must be non-inductive (carbon film or composition, not wirewound).
 */
export function dummyLoadOptions(rOhm: number, ratingW: number, target = 50, tolerance = 0.06, maxCount = 24): LoadOption[] {
  need(rOhm > 0 && ratingW > 0 && target > 0 && tolerance >= 0, 'Resistance, rating and target must be greater than 0')
  const out: LoadOption[] = []
  for (let s = 1; s <= maxCount; s++) for (let p = 1; p * s <= maxCount; p++) {
    const ohms = (s * rOhm) / p
    if (Math.abs(ohms - target) / target > tolerance) continue
    const count = s * p, rated = count * ratingW
    out.push({ series: s, parallel: p, count, ohms, swr: Math.max(ohms, target) / Math.min(ohms, target), ratedW: rated, sustainedW: rated / 2 })
  }
  return out.sort((a, b) => (Math.abs(a.ohms - target) - Math.abs(b.ohms - target)) || a.count - b.count)
}
