import { mount } from '@vue/test-utils'
import { expect, it } from 'vitest'
import RadiatedPower from '../src/tools/RadiatedPower.vue'
import FilterDesigner from '../src/tools/LowPassFilter.vue'
import FilterCircuit from '../src/components/FilterCircuit.vue'
import LineChart from '../src/components/LineChart.vue'

it('updates radiated power for gain reference and clears results on invalid input', async () => {
  const w = mount(RadiatedPower)
  expect(w.text()).toContain('199.5')
  await w.get('select:not([aria-label])').setValue('dBd')
  expect(w.text()).toContain('327.3')
  await w.findAll('input')[0].setValue('0')
  expect(w.text()).not.toContain('327.3')
  expect(w.get('[role="alert"]').text()).toContain('greater than')
  expect(w.find('.power-chain').exists()).toBe(false)
  w.unmount()
})

it('shows the high-pass circuit, changes topology, and invalidates an empty ripple', async () => {
  const w = mount(FilterDesigner, { props: { highPass: true } })
  expect(w.get('h1').text()).toContain('High-pass')
  expect(w.getComponent(FilterCircuit).props('parts')[0]).toMatchObject({ kind: 'L', position: 'shunt' })
  const points = w.getComponent(LineChart).props('points') as [number, number][]
  expect(points[0][1]).toBeGreaterThan(points.at(-1)![1])
  await w.findAll('button').find(b => b.text() === 'T (C-L-C…)')!.trigger('click')
  expect(w.getComponent(FilterCircuit).props('parts')[0]).toMatchObject({ kind: 'C', position: 'series' })
  await w.findAll('input').at(-1)!.setValue('')
  expect(w.findComponent(FilterCircuit).exists()).toBe(false)
  expect(w.findComponent(LineChart).exists()).toBe(false)
  await w.findAll('button').find(b => b.text() === 'Butterworth (flat)')!.trigger('click')
  expect(w.findComponent(FilterCircuit).exists()).toBe(true)
  w.unmount()
})

it('retains the low-pass route and shows the opposite frequency response', async () => {
  const w = mount(FilterDesigner)
  expect(w.get('h1').text()).toContain('Low-pass')
  expect(w.getComponent(FilterCircuit).props('parts')[0]).toMatchObject({ kind: 'C', position: 'shunt' })
  const points = w.getComponent(LineChart).props('points') as [number, number][]
  expect(points[0][1]).toBeLessThan(points.at(-1)![1])
  await w.findAll('input')[0].setValue('-1')
  expect(w.findComponent(FilterCircuit).exists()).toBe(false)
  w.unmount()
})
