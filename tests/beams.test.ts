import { describe, it, expect } from 'vitest'
import * as b from '../src/lib/beams'

describe('Yagi starting design', () => {
  it('3 elements at 144.2 MHz', () => {
    const y = b.yagi(144.2e6, 3), l = 299792458 / 144.2e6
    expect(y.map((e) => e.role)).toEqual(['reflector', 'driven', 'director'])
    expect(y[1].length).toBeCloseTo(0.473 * l, 9); expect(y[0].length).toBeCloseTo(y[1].length * 1.05, 9); expect(y[2].length).toBeCloseTo(y[1].length * 0.95, 9)
    expect(y[1].position).toBeCloseTo(0.2 * l, 9); expect(y[2].position).toBeCloseTo(0.35 * l, 9)
    expect(y[0].length).toBeGreaterThan(y[1].length); expect(y[1].length).toBeGreaterThan(y[2].length)
  })
  it('more directors get shorter and further apart', () => {
    const y = b.yagi(432e6, 6), d = y.filter((e) => e.role === 'director')
    expect(d).toHaveLength(4); d.slice(1).forEach((e, i) => expect(e.length).toBeLessThan(d[i].length))
    expect(() => b.yagi(144e6, 1)).toThrow(); expect(() => b.yagi(0, 3)).toThrow()
  })
})
describe('quad', () => {
  it('uses 1005/f ft for the driven loop (14.2 MHz = 70.8 ft = 21.57 m)', () => {
    const q = b.quad(14.2e6, 2)
    expect(q[1].perimeter).toBeCloseTo((1005 / 14.2) * 0.3048, 9); expect(q[1].side).toBeCloseTo(q[1].perimeter / 4, 12)
    expect(q[0].perimeter).toBeGreaterThan(q[1].perimeter); expect(b.quad(14.2e6, 3)[2].perimeter).toBeLessThan(q[1].perimeter)
    expect(() => b.quad(14.2e6, 9)).toThrow()
  })
})
describe('radials', () => {
  it('quarter wave length and plans', () => {
    expect(b.radialLengthM(14.2e6, 1)).toBeCloseTo(5.278, 3)
    const big = b.radialPlan(14.2e6, 10, false); expect(big.full).toBe(true); expect(big.count).toBe(16); expect(big.totalWireM).toBeCloseTo(16 * 5.278, 2)
    const small = b.radialPlan(7.1e6, 5, false); expect(small.full).toBe(false); expect(small.lengthM).toBe(5); expect(small.count).toBeGreaterThanOrEqual(24)
    expect(b.radialPlan(14.2e6, 10, true).count).toBe(4); expect(() => b.radialPlan(14e6, 0, false)).toThrow()
  })
})
