import { expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import VoltageDividerCalculator from '../src/components/VoltageDividerCalculator.vue'
import { divider } from '../src/lib/components'
it('handles ideal shorts, zero supply and finite-input boundaries', () => {
  expect(divider(5, 0, 1000).vout).toBe(5)
  expect(divider(5, 1000, 0).vout).toBe(0)
  expect(divider(0, 1000, 1000).current).toBe(0)
  for (const a of [[5, 0, 0], [5, -1, 1], [Infinity, 1, 1], [5, NaN, 1]]) expect(() => divider(...a as [number, number, number])).toThrow()
})
it('updates the circuit from engineering notation and clears invalid results', async () => {
  const w = mount(VoltageDividerCalculator)
  try {
    expect(w.get('svg').text()).toContain('2.5 V')
    const inputs = w.findAll('input')
    await inputs[0].setValue('12')
    await inputs[1].setValue('1k')
    await inputs[2].setValue('3k')
    expect(w.get('svg').text()).toContain('9 V')
    expect(w.get('.divider-results').text()).toContain('3')
    await inputs[1].setValue('0'); await inputs[2].setValue('0')
    expect(w.get('[role="alert"]').text()).toContain('cannot both be 0')
    expect(w.find('svg').exists()).toBe(false)
    await inputs[2].setValue('1k')
    expect(w.get('svg').text()).toContain('12 V')
  } finally { w.unmount() }
})
