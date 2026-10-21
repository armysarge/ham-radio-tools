import { describe, it, expect } from 'vitest'
import { OP_MODES, bucketOf, buildReport, snrIn1Hz } from '../src/lib/propReport'

const base = { tx: { lat: -25.75, lon: 28.19 }, rx: { lat: 51.5, lon: -0.13 }, month: 6, ssn: 60, txPowerW: 100, noiseAt3MHz: 145, txGainDb: 0, rxGainDb: 0, longPath: false }
describe('propagation report', () => {
  it('converts thresholds to a 1 Hz bandwidth', () => {
    expect(snrIn1Hz(OP_MODES.find((m) => m.id === 'ssb')!)).toBeCloseTo(44.31, 2); expect(snrIn1Hz(OP_MODES.find((m) => m.id === 'cw')!)).toBeCloseTo(29.99, 2); expect(snrIn1Hz(OP_MODES.find((m) => m.id === 'ft8')!)).toBeCloseTo(15.98, 2)
  })
  it('buckets reliability like the colour key', () => { expect([0, 0.19, 0.2, 0.39, 0.4, 0.6, 0.79, 0.8, 1].map(bucketOf)).toEqual([0, 0, 1, 1, 2, 3, 3, 4, 4]) })
  it('builds an 8 band by 24 hour grid with sensible physics', () => {
    const r = buildReport({ ...base, txGainDb: 10, rxGainDb: 10, mode: OP_MODES.find((m) => m.id === 'ssb')! })
    expect(r.cells).toHaveLength(8); expect(r.cells.every((row) => row.length === 24)).toBe(true); expect(r.distanceKm).toBeGreaterThan(8000); expect(r.mufByHour).toHaveLength(24)
    const flat = r.cells.flat(); expect(flat.every((c) => c.reliability != null && c.reliability >= 0 && c.reliability <= 1)).toBe(true)
    // somewhere on this 9 000 km path a band must be open, and 10 m must not be open at all hours
    expect(Math.max(...flat.map((c) => c.reliability!))).toBeGreaterThan(0.5); expect(r.cells[0].filter((c) => c.reliability! > 0.5).length).toBeLessThan(24)
  })
  it('weaker modes, more power and more antenna gain all help', () => {
    const at = (modeId: string, power: number) => buildReport({ ...base, txPowerW: power, mode: OP_MODES.find((m) => m.id === modeId)! }).cells.flat().reduce((s, c) => s + c.reliability!, 0)
    expect(at('ft8', 100)).toBeGreaterThan(at('ssb', 100)); expect(at('ssb', 1000)).toBeGreaterThan(at('ssb', 10)); expect(buildReport({ ...base, txGainDb: 10, rxGainDb: 10, mode: OP_MODES[1] }).cells.flat().reduce((s, c) => s + c.reliability!, 0)).toBeGreaterThan(at('ssb', 100))
  })
  it('rejects nonsense', () => { expect(() => buildReport({ ...base, ssn: -1, mode: OP_MODES[0] })).toThrow(); expect(() => buildReport({ ...base, txPowerW: 0, mode: OP_MODES[0] })).toThrow() })
})
