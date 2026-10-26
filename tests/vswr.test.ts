import { expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { fromVoltageExtrema, standingWaveEnvelope } from '../src/lib/rf'
import Swr from '../src/tools/Swr.vue'

it('calculates VSWR from voltage extrema with equal, zero-minimum and invalid boundaries', () => {
  const m = fromVoltageExtrema(3, 1)
  expect(m.swr).toBeCloseTo(3, 12)
  expect(m.gamma).toBeCloseTo(0.5, 12)
  expect(m.reflectedPct).toBeCloseTo(25, 12)
  expect(m.returnLossDb).toBeCloseTo(6.020599913, 8)
  expect(fromVoltageExtrema(2, 2).swr).toBe(1)
  expect(fromVoltageExtrema(2, 2).returnLossDb).toBe(Infinity)
  expect(fromVoltageExtrema(2, 0).swr).toBe(Infinity)
  expect(fromVoltageExtrema(2, 0).reflectedPct).toBe(100)
  expect(fromVoltageExtrema(1e308, 1e308).swr).toBe(1)
  expect(Number.isFinite(fromVoltageExtrema(1, 1e-20).mismatchLossDb)).toBe(true)
  for (const [max, min] of [[0, 0], [1, 2], [-1, 0], [1, -1], [Infinity, 1], [2, NaN]]) {
    expect(() => fromVoltageExtrema(max, min)).toThrow()
  }
})

it('draws a normalised voltage envelope with half-wavelength periodicity', () => {
  for (const g of [0, 0.5, 1]) {
    expect(standingWaveEnvelope(g, 0)).toBeCloseTo(1, 12)
    expect(standingWaveEnvelope(g, 0.5)).toBeCloseTo(1, 12)
    expect(standingWaveEnvelope(g, 0.25)).toBeCloseTo((1 - g) / (1 + g), 12)
  }
  expect(() => standingWaveEnvelope(1.1, 0)).toThrow()
  expect(() => standingWaveEnvelope(0.5, NaN)).toThrow()
})

it('updates VSWR and the envelope, rejects reversed extrema and recovers', async () => {
  const w = mount(Swr)
  await w.findAll('button').find(b => b.text() === 'Voltage maxima/minima')!.trigger('click')
  const inputs = w.findAll('input')
  expect(w.text()).toContain('25')
  expect(w.find('[aria-label="Normalised standing-wave voltage envelope"]').exists()).toBe(true)
  await inputs[1].setValue('4')
  expect(w.get('[role="alert"]').text()).toContain('Minimum voltage cannot exceed maximum voltage')
  expect(w.find('[aria-label="Normalised standing-wave voltage envelope"]').exists()).toBe(false)
  await inputs[1].setValue('0')
  expect(w.text()).toContain('∞')
  expect(w.find('[aria-label="Normalised standing-wave voltage envelope"]').exists()).toBe(true)
  await inputs[0].setValue('')
  expect(w.find('[aria-label="Normalised standing-wave voltage envelope"]').exists()).toBe(false)
  w.unmount()
})
