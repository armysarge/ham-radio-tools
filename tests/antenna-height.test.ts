import { afterEach, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { wireHeightReferences } from '../src/lib/antenna'
import Dipole from '../src/tools/Dipole.vue'
import InvertedV from '../src/tools/InvertedV.vue'
import Efhw from '../src/tools/Efhw.vue'
import { state } from '../src/core/store'
import { routeLocationKey } from 'vue-router'

const global = { stubs: { RouterLink: true }, provide: { [routeLocationKey as symbol]: { query: {} } } }
afterEach(() => { state.units = 'metric' })

it('uses free-space wavelength for height references, independent of the wire shortening factor', () => {
  expect(wireHeightReferences(7.1e6)).toMatchObject({ half: expect.closeTo(21.1121, 4), quarter: expect.closeTo(10.5561, 4) })
  expect(wireHeightReferences(14.2e6).half).toBeCloseTo(10.5561, 4)
  for (const bad of [0, -1, NaN, Infinity]) expect(() => wireHeightReferences(bad)).toThrow(/finite positive/)
})

it('updates the dipole SVG height reference with frequency and measurement units', async () => {
  state.units = 'metric'
  const w = mount(Dipole, { global })
  const figure = () => w.get('svg.antenna-drawing').text()
  expect(figure()).toContain('21.11 m')
  expect(w.get('[aria-label="Installation height guidance"]').text()).toContain('No single optimal height')
  await w.get('input[aria-label="Shortening factor"]').setValue('0.98')
  expect(figure()).toContain('21.11 m')
  await w.findAll('input[type="text"]')[0]!.setValue('14.2')
  await flushPromises()
  expect(figure()).toContain('10.56 m')
  state.units = 'imperial'; await flushPromises()
  expect(figure()).toContain('34 ft 7.6 in')
  await w.findAll('input[type="text"]')[0]!.setValue('')
  expect(figure()).not.toMatch(/NaN|Infinity/)
  expect(w.get('[aria-label="Installation height guidance"]').text()).toContain('Enter a valid design frequency')
  w.unmount()
})

it('labels the entered inverted-V apex separately from its wavelength height reference', () => {
  const w = mount(InvertedV, { global })
  expect(w.get('svg.antenna-drawing').text()).toContain('12.00 m')
  expect(w.get('svg.antenna-drawing').text()).toContain('21.11 m')
  expect(w.get('[aria-label="Installation height guidance"]').text()).toContain('apex')
  w.unmount()
})

it('limits EFHW height guidance to a horizontal wire on its fundamental band', () => {
  const w = mount(Efhw, { global })
  expect(w.get('svg.antenna-drawing').text()).toContain('21.11 m')
  expect(w.get('[aria-label="Installation height guidance"]').text()).toContain('fundamental')
  w.unmount()
})
