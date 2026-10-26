import { describe, expect, it } from 'vitest'
import { chokeTurns, rfTransformer, windingMaterial, balunWindingMaterial } from '../src/lib/magnetics'

describe('magnetic winding estimates', () => {
  it('counts four separate conductors and two independent stacks for a two-section balun', () => {
    const core = { odIn: 2.4, idIn: 1.4, hIn: .5 }
    const one = windingMaterial(core, 8, .001, .15, 2)
    const pair = balunWindingMaterial(core, 8, .001, .15, 2, 2)
    expect(pair.lengthM).toBeCloseTo(4 * one.lengthM, 10)
    expect(pair.perConductorM).toBeCloseTo(one.lengthM, 10)
    expect(pair.coreCount).toBe(4)
    expect(pair.singleLayerTurns).toBeLessThan(one.singleLayerTurns)
    expect(balunWindingMaterial(core, 8, .001, .15, 2, 1, 3).lengthM).toBeCloseTo(3 * one.lengthM, 10)
    expect(() => balunWindingMaterial(core, 8, .02, .15)).toThrow(/bundle is too wide/)
    expect(() => balunWindingMaterial(core, 8, .001, .15, 1, 3)).toThrow()
    expect(() => balunWindingMaterial(core, 8, .001, .15, 1, 1, 4)).toThrow()
  })
  it('rounds a 100 µH target on a 1000 nH core up to ten turns', () => {
    const result = chokeTurns(1e6, 200 * Math.PI, 1000)
    expect(result.turns).toBe(10)
    expect(result.inductance).toBeCloseTo(100e-6, 12)
    expect(result.reactance).toBeCloseTo(200 * Math.PI, 9)
    expect(chokeTurns(1e6, 200 * Math.PI, 1000, 4).turns).toBe(5)
  })
  it('shows the impedance reached by integer transformer turns', () => {
    const result = rfTransformer(50, 450, 3.5e6, 557, 4)
    expect(result.turns).toBe(5)
    expect(result.secondaryTurns).toBe(15)
    expect(result.roundedImpedance).toBeCloseTo(450)
    const rounded = rfTransformer(50, 200, 3.5e6, 557, 4)
    expect(rounded.secondaryTurns).toBe(10)
    expect(rounded.roundedImpedance).toBeCloseTo(200)
    const stepDown = rfTransformer(450, 50, 3.5e6, 557, 4)
    expect(stepDown.secondaryTurns).toBeGreaterThanOrEqual(1)
    expect(stepDown.secondaryTurns).toBeLessThan(stepDown.turns)
  })
  it('estimates winding material including both leads and stack height', () => {
    const core = { odIn: 2.4, idIn: 1.4, hIn: .5 }
    const result = windingMaterial(core, 10, .005, .15)
    const perTurn = 2.1 * .0254 + Math.PI * .005
    expect(result.lengthM).toBeCloseTo(10 * perTurn * 1.15 + .3, 10)
    expect(windingMaterial(core, 10, .005, .15, 2).lengthM).toBeGreaterThan(result.lengthM)
    expect(result.singleLayerTurns).toBeGreaterThan(0)
  })
  it('rejects invalid, non-finite, fractional stack and impossible threading inputs', () => {
    for (const v of [0, -1, NaN, Infinity]) {
      expect(() => chokeTurns(v, 500, 1240)).toThrow()
      expect(() => rfTransformer(50, v, 3.5e6, 557, 4)).toThrow()
    }
    expect(() => chokeTurns(7e6, 500, 1240, 1.5)).toThrow()
    expect(() => chokeTurns(7e6, 500, 1240, 0)).toThrow()
    expect(() => windingMaterial({ odIn: 1, idIn: .5, hIn: .25 }, 5, .02, .1)).toThrow(/too thick/)
  })
})
