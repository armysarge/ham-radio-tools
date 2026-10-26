import { mount, flushPromises } from '@vue/test-utils'
import { beforeEach, expect, it } from 'vitest'
import CoordinateConverter from '../src/tools/CoordinateConverter.vue'
import UnitConverter from '../src/tools/UnitConverter.vue'
import { state } from '../src/core/store'
const global = { stubs: { RouterLink: true, WorldMap: true } }
beforeEach(() => { state.units = 'metric'; state.locations = []; state.stationId = null })

it('converts pasted DMS, rejects conflicting coordinates and saves only valid positions', async () => {
  const w = mount(CoordinateConverter, { global })
  await w.get('input[aria-label="Latitude to convert"]').setValue('25°45′00″S')
  await w.get('input[aria-label="Longitude to convert"]').setValue('28 15 00 E')
  expect(w.text()).toContain('-25.750000, 28.250000')
  await w.get('input[aria-label="Location name"]').setValue('Field site')
  await w.findAll('button').find(b => b.text() === 'Save location')!.trigger('click')
  expect(state.locations.at(-1)).toMatchObject({ name: 'Field site', lat: -25.75, lon: 28.25 })
  await w.get('input[aria-label="Latitude to convert"]').setValue('-25 N')
  expect(w.text()).toContain('sign and hemisphere disagree')
  expect(w.findAll('button').find(b => b.text() === 'Save location')!.attributes()).toHaveProperty('disabled')
  expect(w.text()).not.toContain('-25.750000, 28.250000')
  w.getComponent({ name: 'WorldMap' }).vm.$emit('pick', -26, 28)
  await flushPromises()
  expect(w.text()).toContain('-26.000000, 28.000000')
  expect(w.get('input[aria-label="Latitude to convert"]').attributes('aria-invalid')).toBe('false')
  w.unmount()
})

it('shows a locator centre explicitly rather than treating it as an exact station location', async () => {
  const w = mount(CoordinateConverter, { global })
  await w.get('input[aria-label="Locator to convert"]').setValue('FN31pr')
  await w.findAll('button').find(b => b.text() === 'Use locator centre')!.trigger('click')
  expect(w.text()).toContain('centre of FN31pr')
  expect(w.text()).toContain('41.729167')
  await w.get('input[aria-label="Locator to convert"]').setValue('XX99')
  expect(w.findAll('button').find(b => b.text() === 'Use locator centre')!.attributes()).toHaveProperty('disabled')
  w.unmount()
})

it('converts units, swaps without changing the quantity and rejects below-absolute-zero temperature', async () => {
  const w = mount(UnitConverter, { global })
  await w.get('select[aria-label="From unit"]').setValue('ft')
  await w.get('select[aria-label="To unit"]').setValue('m')
  expect(w.get('.conversion-result').text()).toContain('0.3048')
  await w.findAll('button').find(b => b.text() === 'Swap units')!.trigger('click')
  await flushPromises()
  expect(w.get('select[aria-label="From unit"]').element).toHaveProperty('value', 'm')
  expect(w.get('.conversion-result').text()).toContain('1')
  await w.get('select[aria-label="Quantity"]').setValue('temperature')
  const input = w.get('.field input')
  await input.setValue('-274')
  expect(w.text()).toContain('absolute zero')
  expect(w.get('.conversion-result .val').text()).toBe('—')
  await input.setValue('0')
  expect(w.get('.conversion-result .val').text()).toBe('32')
  w.unmount()
})
