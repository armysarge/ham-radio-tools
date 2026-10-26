import { toroidInductance, toroidTurns } from './station'
import { maxSingleLayerTurns, toroidTurnLengthM, type CoreSize } from './diy'

function positive(...values: number[]) {
  if (values.some(v => !Number.isFinite(v) || v <= 0)) throw new RangeError('Enter finite values greater than zero.')
}
function coreCount(count: number) {
  if (!Number.isInteger(count) || count < 1 || count > 10) throw new RangeError('Use 1 to 10 identical stacked cores.')
}

/** Low-frequency AL model only: this is not the complex RF impedance of a ferrite choke. */
export function chokeTurns(fHz: number, targetX: number, alNh: number, stack = 1) {
  positive(fHz, targetX, alNh); coreCount(stack)
  const targetL = targetX / (2 * Math.PI * fHz)
  const fractionalTurns = toroidTurns(targetL, alNh * stack)
  const turns = Math.max(1, Math.ceil(fractionalTurns - 1e-12))
  const inductance = toroidInductance(turns, alNh * stack)
  const reactance = 2 * Math.PI * fHz * inductance
  if (![targetL, fractionalTurns, inductance, reactance].every(Number.isFinite)) throw new RangeError('Values exceed the supported calculation range.')
  return { targetL, fractionalTurns, turns, inductance, reactance }
}

/** Conventional two-winding transformer, not a transmission-line balun or tapped autotransformer. */
export function rfTransformer(zp: number, zs: number, fHz: number, alNh: number, factor: number) {
  positive(zp, zs, fHz, alNh, factor)
  const primary = chokeTurns(fHz, factor * zp, alNh)
  const turnsRatio = Math.sqrt(zs / zp)
  const secondaryTurns = Math.max(1, Math.round(primary.turns * turnsRatio))
  const roundedImpedance = zp * (secondaryTurns / primary.turns) ** 2
  if (![turnsRatio, secondaryTurns, roundedImpedance].every(Number.isFinite)) throw new RangeError('Values exceed the supported calculation range.')
  return { ...primary, turnsRatio, secondaryTurns, roundedImpedance }
}

/** Rough material allowance: core-section perimeter, cable thickness, 15% winding slack, and two leads. */
export function windingMaterial(core: CoreSize, turns: number, diameterM: number, leadEachM: number, stack = 1) {
  positive(core.odIn, core.idIn, core.hIn, turns, diameterM); coreCount(stack)
  if (!Number.isFinite(leadEachM) || leadEachM < 0) throw new RangeError('Lead length must be zero or greater.')
  if (!Number.isInteger(turns)) throw new RangeError('Use a whole number of turns.')
  if (diameterM >= core.idIn * .0254) throw new RangeError('The conductor is too thick to pass through this core opening.')
  const perTurn = toroidTurnLengthM({ ...core, hIn: core.hIn * stack }) + Math.PI * diameterM
  return { lengthM: turns * perTurn * 1.15 + 2 * leadEachM, singleLayerTurns: maxSingleLayerTurns(core.idIn, diameterM) }
}

/** Equal conductors per section; separate sections are not one thicker shared core stack. */
export function balunWindingMaterial(core: CoreSize, turns: number, diameterM: number, leadEachM: number, stack = 1, sections = 1, conductors = 2) {
  if (![1, 2].includes(sections)) throw new RangeError('Use one or two independent sections.')
  if (![2, 3].includes(conductors)) throw new RangeError('Use two or three conductors per section.')
  const single = windingMaterial(core, turns, diameterM, leadEachM, stack)
  if (conductors * diameterM >= core.idIn * .0254) throw new RangeError('The insulated wire bundle is too wide for this core opening.')
  return { lengthM: conductors * sections * single.lengthM, perConductorM: single.lengthM,
    singleLayerTurns: maxSingleLayerTurns(core.idIn, conductors * diameterM), coreCount: stack * sections }
}
