import { describe, it, expect } from 'vitest'
import * as s from '../src/lib/station'

describe('feedline loss', () => {
  it('scales with length and the square root of frequency', () => {
    expect(s.matchedLossDb(5, 100e6, 100e6, 30.48)).toBeCloseTo(5, 9)
    expect(s.matchedLossDb(5, 100e6, 400e6, 30.48)).toBeCloseTo(10, 9)
    expect(s.matchedLossDb(5, 100e6, 100e6, 15.24)).toBeCloseTo(2.5, 9)
    expect(s.matchedLossDb(5, 100e6, 7e6, 0)).toBe(0)
    expect(() => s.matchedLossDb(0, 100e6, 7e6, 10)).toThrow(); expect(() => s.matchedLossDb(5, 100e6, 7e6, -1)).toThrow()
  })
  it('mismatch adds loss (ARRL formula: 1 dB line at 3:1 is about 1.5 dB)', () => {
    expect(s.lossWithSwr(1, 3)).toBeCloseTo(1.504, 2); expect(s.lossWithSwr(1, 1)).toBeCloseTo(1, 12); expect(s.lossWithSwr(0, 5)).toBeCloseTo(0, 9)
    expect(s.lossWithSwr(3, 10)).toBeGreaterThan(s.lossWithSwr(3, 2)); expect(() => s.lossWithSwr(1, 0.5)).toThrow()
    expect(s.dbToFraction(3.0103)).toBeCloseTo(0.5, 4)
  })
})

describe('link budget and path', () => {
  it('free-space loss reference values', () => {
    expect(s.fspl(1, 100)).toBeCloseTo(72.44, 2); expect(s.fspl(10, 144)).toBeCloseTo(95.61, 2); expect(s.fspl(2, 100) - s.fspl(1, 100)).toBeCloseTo(6.02, 2) // doubling distance = +6 dB
    expect(() => s.fspl(0, 100)).toThrow()
  })
  it('noise floor, budget and margin', () => {
    expect(s.minDetectableDbm(2400, 10, 10)).toBeCloseTo(-120.2, 1)
    const b = s.linkBudget({ txW: 5, txGainDbi: 2.15, txLossDb: 1, dKm: 20, fMHz: 145, rxGainDbi: 2.15, rxLossDb: 1, otherLossDb: 0, rxSensDbm: -120 })
    expect(b.eirpDbm).toBeCloseTo(36.99 + 1.15, 1); expect(b.pathLossDb).toBeCloseTo(s.fspl(20, 145), 9); expect(b.marginDb).toBeCloseTo(b.rxDbm + 120, 9)
    expect(b.marginDb).toBeGreaterThan(0)
  })
  it('radio horizon and Fresnel zone', () => {
    expect(s.radioHorizonKm(30, 2)).toBeCloseTo(28.4, 1); expect(s.radioHorizonKm(0, 0)).toBe(0)
    expect(s.fresnelRadius(5, 10, 1)).toBeCloseTo(27.38, 1); expect(s.fresnelRadius(5, 10, 2)).toBeLessThan(s.fresnelRadius(5, 10, 1))
    expect(() => s.fresnelRadius(0, 10, 1)).toThrow(); expect(() => s.fresnelRadius(11, 10, 1)).toThrow()
  })
})

describe('L-network', () => {
  it('50 to 200 ohms at 14 MHz', () => {
    const n = s.lNetwork(50, 200, 14e6)
    expect(n.q).toBeCloseTo(Math.sqrt(3), 12); expect(n.xSeries).toBeCloseTo(86.6, 1); expect(n.xShunt).toBeCloseTo(115.47, 1); expect(n.shuntAcross).toBe('load')
    expect(n.lowPass.L * 1e6).toBeCloseTo(0.9845, 3); expect(n.lowPass.C * 1e12).toBeCloseTo(98.46, 1)
    expect(n.highPass.L * 1e6).toBeCloseTo(1.3128, 3); expect(n.highPass.C * 1e12).toBeCloseTo(131.3, 0)
    expect(s.lNetwork(200, 50, 14e6).shuntAcross).toBe('source')
  })
  it('refuses equal resistances and nonsense', () => { expect(() => s.lNetwork(50, 50, 14e6)).toThrow(/already equal/); expect(() => s.lNetwork(0, 50, 14e6)).toThrow() })
})

describe('low-pass filters', () => {
  it('prototype values match the published tables', () => {
    expect(s.filterG('butterworth', 3)).toEqual([1, 2, 1])
    s.filterG('butterworth', 5).forEach((v, i) => expect(v).toBeCloseTo([0.618, 1.618, 2, 1.618, 0.618][i], 3))
    s.filterG('chebyshev', 3, 0.1).forEach((v, i) => expect(v).toBeCloseTo([1.0316, 1.1474, 1.0316][i], 3))
    s.filterG('chebyshev', 3, 0.5).forEach((v, i) => expect(v).toBeCloseTo([1.5963, 1.0967, 1.5963][i], 3))
    s.filterG('chebyshev', 5, 0.1).forEach((v, i) => expect(v).toBeCloseTo([1.1468, 1.3712, 1.975, 1.3712, 1.1468][i], 3))
    expect(() => s.filterG('butterworth', 4)).toThrow(/odd order/); expect(() => s.filterG('chebyshev', 5, 0)).toThrow(/Ripple/)
  })
  it('scales to 30 MHz / 50 ohms and alternates parts', () => {
    const p = s.lowPassParts(s.filterG('butterworth', 5), 30e6, 50, 'pi')
    expect(p.map((x) => x.kind)).toEqual(['C', 'L', 'C', 'L', 'C']); expect(p[0].value * 1e12).toBeCloseTo(65.6, 0); expect(p[1].value * 1e9).toBeCloseTo(429, 0)
    expect(s.lowPassParts(s.filterG('butterworth', 5), 30e6, 50, 't').map((x) => x.kind)).toEqual(['L', 'C', 'L', 'C', 'L'])
  })
  it('attenuation: Butterworth 5th order is 30 dB at twice the cutoff; Chebyshev equals its ripple at the edge', () => {
    expect(s.filterAttenuationDb('butterworth', 5, 2)).toBeCloseTo(30.1, 1); expect(s.filterAttenuationDb('butterworth', 5, 1)).toBeCloseTo(3.01, 2)
    expect(s.filterAttenuationDb('chebyshev', 5, 1, 0.1)).toBeCloseTo(0.1, 6); expect(s.filterAttenuationDb('chebyshev', 5, 2, 0.1)).toBeCloseTo(34.85, 1)
    expect(s.filterAttenuationDb('butterworth', 5, 0.5)).toBeLessThan(0.01); expect(() => s.filterAttenuationDb('butterworth', 5, 0)).toThrow()
  })
})

describe('coils', () => {
  it('toroid turns and inductance round-trip', () => {
    expect(s.toroidTurns(10e-6, 4.9)).toBeCloseTo(45.17, 1); expect(s.toroidInductance(s.toroidTurns(10e-6, 4.9), 4.9)).toBeCloseTo(10e-6, 12)
    expect(() => s.toroidTurns(0, 4.9)).toThrow()
  })
  it('Wheeler air-core coil', () => {
    expect(s.airCoilInductanceUh(1, 1, 10)).toBeCloseTo(1.724, 3)
    const n = s.airCoilTurns(1.724, 1, 0.1); expect(n).toBeCloseTo(10, 1)
    expect(s.airCoilInductanceUh(1, n * 0.1, n)).toBeCloseTo(1.724, 3)
    expect(s.inductiveReactanceOf(1e-6, 7e6)).toBeCloseTo(43.98, 1)
  })
})

describe('battery and solar', () => {
  it('daily energy, runtime and panel size', () => {
    const d = s.dailyEnergy([{ amps: 20, hoursPerDay: 1 }, { amps: 1, hoursPerDay: 5 }, { amps: 0.2, hoursPerDay: 18 }], 12)
    expect(d.ahPerDay).toBeCloseTo(28.6, 9); expect(d.whPerDay).toBeCloseTo(343.2, 9); expect(d.avgAmps).toBeCloseTo(1.1917, 4)
    expect(s.runtimeHours(100, 0.8, 2)).toBe(40)
    const sol = s.solarSizing(343.2, 5, 0.7, 2, 0.8, 12)
    expect(sol.panelW).toBeCloseTo(98.06, 1); expect(sol.batteryWh).toBeCloseTo(858, 0); expect(sol.batteryAh).toBeCloseTo(71.5, 1)
    expect(() => s.dailyEnergy([{ amps: 1, hoursPerDay: 25 }], 12)).toThrow(); expect(() => s.runtimeHours(100, 1.2, 1)).toThrow(); expect(() => s.solarSizing(100, 5, 0, 1, 0.8, 12)).toThrow()
  })
})
