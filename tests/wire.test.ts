import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AwgWire from '../src/tools/AwgWire.vue'
import * as w from '../src/lib/wire'

describe('AWG library', () => {
  it('matches the standard diameters', () => {
    expect(w.awgDiameter(36) * 1000).toBeCloseTo(0.127, 6)
    expect(w.awgDiameter(14) * 1000).toBeCloseTo(1.628, 3)
    expect(w.awgDiameter(0) * 1000).toBeCloseTo(8.251, 3)
    expect(w.awgDiameter(-3) * 1000).toBeCloseTo(11.684, 3)
    expect(w.awgDiameter(40) * 1000).toBeCloseTo(0.0799, 4)
  })
  it('gives the standard 14 AWG area, circular mils and resistance', () => {
    const d = w.awgDiameter(14)
    expect(w.areaFromDiameter(d) * 1e6).toBeCloseTo(2.08, 2)
    expect(w.circularMils(d)).toBeCloseTo(4107, -1)
    expect(w.resistancePerMetre(d) * 1000).toBeCloseTo(8.286, 2)
  })
  it('halves the diameter every six gauges and labels the large sizes', () => {
    expect(w.awgDiameter(14) / w.awgDiameter(20)).toBeCloseTo(2, 1)
    expect([-3, -2, -1, 0, 1].map(w.awgLabel)).toEqual(['0000', '000', '00', '0', '1'])
    expect(w.awgAltLabel(-3)).toBe('4/0')
    expect(w.awgAltLabel(10)).toBeNull()
    expect(() => w.awgLabel(41)).toThrow(/gauge/i)
    expect(() => w.awgLabel(1.5)).toThrow(/gauge/i)
  })
  it('finds the nearest gauge from a diameter and rejects sizes outside the table', () => {
    expect(w.nearestAwg(1.628e-3).gauge).toBe(14)
    expect(w.nearestAwg(1.6e-3).gauge).toBe(14)
    expect(w.nearestAwg(1.6e-3).diameterErrorPct).toBeLessThan(0)
    expect(w.nearestAwg(w.diameterFromArea(2e-6)).gauge).toBe(14)
    expect(() => w.nearestAwg(0.02)).toThrow(/outside/i)
    expect(() => w.nearestAwg(1e-5)).toThrow(/outside/i)
    expect(() => w.nearestAwg(0)).toThrow()
    expect(() => w.nearestAwg(NaN)).toThrow()
  })
  it('scales resistance with temperature', () => {
    const d = w.awgDiameter(14)
    expect(w.resistancePerMetre(d, 70) / w.resistancePerMetre(d, 20)).toBeCloseTo(1 + 0.00393 * 50, 6)
    expect(() => w.copperResistivity(500)).toThrow(/temperature/i)
  })
  it('calculates voltage drop for out-and-back and single runs', () => {
    const base = { diameter: w.awgDiameter(14), currentA: 10, oneWayLengthM: 5, supplyV: 12 }
    const both = w.voltageDrop(base)
    expect(both.conductorM).toBe(10)
    expect(both.dropV).toBeCloseTo(10 * 10 * 8.286e-3, 2)
    expect(both.lossW).toBeCloseTo(both.dropV * 10, 9)
    expect(w.voltageDrop({ ...base, roundTrip: false }).dropV).toBeCloseTo(both.dropV / 2, 9)
    expect(w.voltageDrop({ ...base, currentA: 0 }).dropV).toBe(0)
    expect(() => w.voltageDrop({ ...base, supplyV: 0 })).toThrow()
    expect(() => w.voltageDrop({ ...base, currentA: -1 })).toThrow()
  })
  it('suggests the thinnest gauge within a drop limit', () => {
    const run = { currentA: 20, oneWayLengthM: 3, supplyV: 13.8 }
    const n = w.thinnestGaugeForDrop(run, 3)!
    expect(w.voltageDrop({ ...run, diameter: w.awgDiameter(n) }).dropPct).toBeLessThanOrEqual(3)
    expect(w.voltageDrop({ ...run, diameter: w.awgDiameter(n + 1) }).dropPct).toBeGreaterThan(3)
    expect(w.thinnestGaugeForDrop({ currentA: 0, oneWayLengthM: 3, supplyV: 12 }, 3)).toBe(w.AWG_MAX)
    expect(w.thinnestGaugeForDrop({ currentA: 5000, oneWayLengthM: 500, supplyV: 12 }, 1)).toBeNull()
  })
  it('computes copper skin depth', () => {
    expect(w.skinDepth(14.2e6) * 1e6).toBeCloseTo(17.5, 0)
    expect(w.acResistanceRatio(w.awgDiameter(14), w.skinDepth(14.2e6))).toBeGreaterThan(20)
    expect(w.acResistanceRatio(w.awgDiameter(14), w.skinDepth(10))).toBe(1)
    expect(() => w.skinDepth(0)).toThrow()
  })
})

describe('AWG Wire Gauge page', () => {
  it('shows 14 AWG results, switches to diameter input and reports out-of-range sizes', async () => {
    const wrapper = mount(AwgWire, { global: { stubs: { ToolLayout: { template: '<div><slot /><slot name="explain" /></div>' } } } })
    try {
      expect(wrapper.text()).toContain('14 AWG')
      expect(wrapper.find('[aria-current="true"]').text()).toContain('14')
      await wrapper.findAll('.seg button').find((b) => b.text() === 'Diameter')!.trigger('click')
      const input = wrapper.get('input')
      await input.setValue('0.0001')
      expect(wrapper.get('[role="alert"]').text()).toMatch(/outside/i)
      await input.setValue('2.053')
      expect(wrapper.text()).toContain('12 AWG')
    } finally { wrapper.unmount() }
  })
})
