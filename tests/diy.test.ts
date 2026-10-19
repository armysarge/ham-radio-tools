import { describe, it, expect } from 'vitest'
import * as d from '../src/lib/diy'
import { airCoilInductanceUh } from '../src/lib/station'
import { CORES } from '../src/data/cores'

describe('capacitors', () => {
  it('parallel plates: 10 cm square foil, 0.1 mm polyethylene = 2.04 nF', () => {
    expect(d.plateCapacitance(0.01, 1e-4, 2.3)).toBeCloseTo(2.0364e-9, 12)
    expect(d.plateCapacitance(0.01, 1e-4, 2.3, 3)).toBeCloseTo(3 * 2.0364e-9, 12)
    expect(d.plateAreaFor(d.plateCapacitance(0.01, 1e-4, 2.3), 1e-4, 2.3)).toBeCloseTo(0.01, 12)
    expect(() => d.plateCapacitance(0, 1e-4, 2.3)).toThrow(); expect(() => d.plateAreaFor(1e-9, 1e-4, 0.5)).toThrow()
  })
  it('air variable: R 30 mm, r 10 mm, 1 mm gap needs 10 plates for 100 pF', () => {
    const v = d.airVariable(100e-12, 0.03, 0.01, 0.001)
    expect(v.overlapM2).toBeCloseTo(1.2566e-3, 6); expect(v.gaps).toBe(9); expect(v.plates).toBe(10); expect(v.cMax).toBeCloseTo(100.2e-12, 13)
    expect(d.airVariable(1e-12, 0.03, 0.01, 0.001).plates).toBe(2); expect(() => d.airVariable(1e-10, 0.01, 0.02, 0.001)).toThrow()
  })
  it('air gap voltage allowance is a fifth of 3 kV/mm', () => { expect(d.airSafeVolts(1e-3)).toBeCloseTo(600, 6); expect(() => d.airSafeVolts(0)).toThrow() })
})
describe('coils and cores', () => {
  it('air coil: turns reproduce the inductance and wire length follows the turns', () => {
    const b = d.airCoilBuild(10, 0.0254, 0.0005, 1)
    expect(airCoilInductanceUh(1, b.lengthM / 0.0254, b.turns)).toBeCloseTo(10, 6)
    expect(b.wireM).toBeCloseTo(b.turns * Math.PI * (0.0254 + 0.0005), 9); expect(b.lengthM).toBeCloseTo(b.turns * 0.0005, 12)
    expect(d.airCoilBuild(10, 0.0254, 0.0005, 2).lengthM).toBeCloseTo(2 * d.airCoilBuild(10, 0.0254, 0.0005, 2).turns * 0.0005, 12)
    expect(() => d.airCoilBuild(10, 0.0254, 0.0005, 0.5)).toThrow()
  })
  it('toroid turn length and single-layer limit', () => {
    expect(d.toroidTurnLengthM({ odIn: 0.5, idIn: 0.303, hIn: 0.19 })).toBeCloseTo(0.0254 * (2 * (0.19 + 0.0985) + 0.1), 9)
    expect(d.maxSingleLayerTurns(0.303, 0.0005)).toBe(Math.floor((Math.PI * (0.303 * 0.0254 - 0.001)) / 0.0005))
    expect(d.maxSingleLayerTurns(0.01, 0.01)).toBe(0); expect(() => d.toroidTurnLengthM({ odIn: 0.2, idIn: 0.3, hIn: 0.1 })).toThrow()
  })
  it('every core in the table has plausible dimensions', () => {
    for (const c of CORES) { expect(c.odIn, c.name).toBeGreaterThan(c.idIn); expect(c.idIn, c.name).toBeGreaterThan(0); expect(c.hIn, c.name).toBeGreaterThan(0.1) }
    const t50 = CORES.find((c) => c.name === 'T50-2')!; expect([t50.odIn, t50.idIn, t50.hIn]).toEqual([0.5, 0.303, 0.19])
  })
})
describe('dummy load', () => {
  it('finds arrays near 50 ohms, best first, and derates', () => {
    const o = d.dummyLoadOptions(100, 2)
    expect(o[0]).toMatchObject({ series: 1, parallel: 2, ohms: 50, swr: 1, ratedW: 4, sustainedW: 2 })
    expect(d.dummyLoadOptions(150, 1)[0]).toMatchObject({ series: 1, parallel: 3, count: 3 })
    expect(d.dummyLoadOptions(47, 1)[0]).toMatchObject({ count: 1 }); expect(d.dummyLoadOptions(47, 1)[0].swr).toBeCloseTo(1.0638, 4)
    expect(d.dummyLoadOptions(1000, 1).every((x) => Math.abs(x.ohms - 50) / 50 <= 0.06)).toBe(true)
    expect(d.dummyLoadOptions(3300, 0.25, 50, 0.01, 4)).toEqual([]); expect(() => d.dummyLoadOptions(0, 1)).toThrow()
  })
})
