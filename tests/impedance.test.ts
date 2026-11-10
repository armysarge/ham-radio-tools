import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ComplexImpedance from '../src/tools/ComplexImpedance.vue'
import ImpedanceDiagram from '../src/components/ImpedanceDiagram.vue'
import * as z from '../src/lib/impedance'

const f = 7.1e6
const xl = (h: number) => 2 * Math.PI * f * h
const xc = (c: number) => -1 / (2 * Math.PI * f * c)

describe('impedance library', () => {
  it('converts elements to complex impedance', () => {
    expect(z.elementImpedance({ kind: 'R', a: 50 }, f)).toEqual({ re: 50, im: 0 })
    expect(z.elementImpedance({ kind: 'L', a: 1e-6 }, f).im).toBeCloseTo(44.6106, 3)
    expect(z.elementImpedance({ kind: 'C', a: 470e-12 }, f).im).toBeCloseTo(-47.6937, 3)
    expect(z.elementImpedance({ kind: 'Z', a: 10, b: -5 }, f)).toEqual({ re: 10, im: -5 })
  })
  it('adds series impedances', () => {
    const t = z.combine([{ kind: 'R', a: 25 }, { kind: 'L', a: 1e-6 }, { kind: 'C', a: 470e-12 }], f, 'series')
    expect(t.z.re).toBe(25)
    expect(t.z.im).toBeCloseTo(xl(1e-6) + xc(470e-12), 9)
    expect(t.open || t.short).toBe(false)
  })
  it('combines two equal resistors in parallel to half and matches the real parallel helper', () => {
    expect(z.combine([{ kind: 'R', a: 100 }, { kind: 'R', a: 100 }], f, 'parallel').z.re).toBeCloseTo(50, 9)
    const t = z.combine([{ kind: 'R', a: 30 }, { kind: 'R', a: 60 }], f, 'parallel')
    expect(t.z.re).toBeCloseTo(20, 9); expect(t.z.im).toBeCloseTo(0, 9)
  })
  it('combines R and L in parallel using admittances', () => {
    const t = z.combine([{ kind: 'R', a: 50 }, { kind: 'Z', a: 0, b: 50 }], f, 'parallel')
    expect(t.z.re).toBeCloseTo(25, 9); expect(t.z.im).toBeCloseTo(25, 9)
    expect(z.cAbs(t.z)).toBeCloseTo(35.3553, 4)
    expect(z.cArg(t.z) * 180 / Math.PI).toBeCloseTo(45, 9)
  })
  it('handles series resonance, parallel resonance and shorts', () => {
    const c = 1 / ((2 * Math.PI * f) ** 2 * 1e-6)
    const series = z.combine([{ kind: 'L', a: 1e-6 }, { kind: 'C', a: c }], f, 'series')
    expect(Math.abs(series.z.im)).toBeLessThan(1e-9)
    const par = z.combine([{ kind: 'L', a: 1e-6 }, { kind: 'C', a: c }], f, 'parallel')
    expect(par.open).toBe(true)
    expect(z.matchAgainst(par, 50)).toEqual({ gamma: 1, swr: Infinity, returnLossDb: 0 })
    expect(z.admittance(par)).toEqual({ re: 0, im: 0 })
    const short = z.combine([{ kind: 'R', a: 0 }, { kind: 'R', a: 100 }], f, 'parallel')
    expect(short).toMatchObject({ short: true, z: { re: 0, im: 0 } })
    expect(z.combine([{ kind: 'R', a: 0 }], f, 'series').short).toBe(true)
  })
  it('computes SWR and reflection against a real reference impedance', () => {
    const matched = z.matchAgainst(z.combine([{ kind: 'R', a: 50 }], f, 'series'), 50)
    expect(matched.gamma).toBe(0); expect(matched.swr).toBe(1); expect(matched.returnLossDb).toBe(Infinity)
    expect(z.matchAgainst(z.combine([{ kind: 'R', a: 100 }], f, 'series'), 50).swr).toBeCloseTo(2, 9)
    expect(z.matchAgainst(z.combine([{ kind: 'R', a: 25 }], f, 'series'), 50).swr).toBeCloseTo(2, 9)
    expect(z.matchAgainst(z.combine([{ kind: 'R', a: 0 }], f, 'series'), 50).swr).toBe(Infinity)
    expect(() => z.matchAgainst(z.combine([{ kind: 'R', a: 50 }], f, 'series'), 0)).toThrow()
  })
  it('finds the series equivalent and Q', () => {
    const ind = z.seriesEquivalent({ re: 10, im: 44.6106 }, f)
    expect(ind.kind).toBe('inductive'); expect(ind.inductance!).toBeCloseTo(1e-6, 9); expect(ind.q).toBeCloseTo(4.46106, 4)
    const cap = z.seriesEquivalent({ re: 5, im: xc(470e-12) }, f)
    expect(cap.capacitance!).toBeCloseTo(470e-12, 18)
    expect(z.seriesEquivalent({ re: 50, im: 0 }, f)).toMatchObject({ kind: 'resistive', q: 0 })
    expect(z.seriesEquivalent({ re: 0, im: 10 }, f).q).toBe(Infinity)
    expect(() => z.seriesEquivalent({ re: Infinity, im: Infinity }, f)).toThrow()
  })
  it('rejects invalid values', () => {
    expect(() => z.elementImpedance({ kind: 'C', a: 0 }, f)).toThrow(/capacitance/i)
    expect(() => z.elementImpedance({ kind: 'R', a: -1 }, f)).toThrow(/resistance/i)
    expect(() => z.elementImpedance({ kind: 'L', a: 1e-6 }, 0)).toThrow(/frequency/i)
    expect(() => z.elementImpedance({ kind: 'Z', a: 1 }, f)).toThrow()
    expect(() => z.combine([], f, 'series')).toThrow()
  })
})

describe('complex impedance page', () => {
  const mountPage = () => mount(ComplexImpedance, { global: { stubs: { ToolLayout: { template: '<div><slot /><slot name="explain" /></div>' } } } })
  it('shows the default series result, switches to parallel and edits the element list', async () => {
    const w = mountPage()
    try {
      expect(w.text()).toContain(`25 − j${(-(xl(1e-6) + xc(470e-12))).toPrecision(5)}`)
      expect(w.find('svg.impedance-diagram').exists()).toBe(true)
      await w.findAll('.seg button').find((b) => b.text() === 'Parallel')!.trigger('click')
      expect(w.get('svg').attributes('aria-label')).toContain('Parallel circuit')
      const adds = w.findAll('button').filter((b) => b.text().startsWith('+'))
      expect(adds).toHaveLength(4)
      for (let i = 0; i < 2; i++) await adds[0].trigger('click')
      expect(w.findAll('fieldset')).toHaveLength(5)
      expect(w.text()).toContain('calculator takes up to 5')
      await w.findAll('button').find((b) => b.attributes('aria-label') === 'Remove R2')!.trigger('click')
      expect(w.findAll('fieldset')).toHaveLength(4)
    } finally { w.unmount() }
  })
  it('reports invalid input without a stale result', async () => {
    const w = mountPage()
    try {
      const freq = w.findAll('input')[0]
      await freq.setValue('0')
      expect(w.text()).not.toContain('25 −')
      expect(w.findAll('[role="alert"]').length).toBeGreaterThan(0)
    } finally { w.unmount() }
  })
})

describe('impedance diagram', () => {
  it('names repeated element types and draws one branch per parallel element', () => {
    const els: z.Element[] = [{ kind: 'R', a: 100 }, { kind: 'R', a: 200 }, { kind: 'Z', a: 5, b: -12 }]
    const w = mount(ImpedanceDiagram, { props: { elements: els, mode: 'parallel' } })
    expect(w.get('svg').attributes('aria-label')).toContain('R1 100 Ω, R2 200 Ω, Z1 5 − j12 Ω')
    expect(w.text()).toContain('R2')
    w.unmount()
  })
})
