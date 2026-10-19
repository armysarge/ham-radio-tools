import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import NumField from '../src/components/NumField.vue'
import Swr from '../src/tools/Swr.vue'
import OhmsLaw from '../src/tools/OhmsLaw.vue'
import Dipole from '../src/tools/Dipole.vue'
import Maidenhead from '../src/tools/Maidenhead.vue'
import { state, toggleFavorite } from '../src/core/store'
import { searchTools } from '../src/core/registry'
import { FREQ_UNITS } from '../src/lib/units'

const global = { stubs: { RouterLink: true }, mocks: { $route: { query: {} } } }

beforeEach(() => { localStorage.clear(); state.favorites = []; state.locations = []; state.designs = []; state.stationId = null })
const type = async (w: ReturnType<typeof mount>, sel: string, v: string) => { const i = w.find(sel); await i.setValue(v); await flushPromises() }

describe('NumField', () => {
  it('shows specific validation messages and emits canonical values', async () => {
    const w = mount(NumField, { props: { label: 'Frequency', modelValue: 7e6, units: FREQ_UNITS, unit: 'MHz', min: 0, minExclusive: true } })
    await w.find('input').setValue('abc')
    expect(w.text()).toContain('is not a number')
    await w.find('input').setValue('-3')
    expect(w.text()).toContain('greater than 0')
    await w.find('input').setValue('14.2')
    expect(w.emitted('update:modelValue')!.at(-1)).toEqual([14.2e6])
    await w.find('input').setValue('')
    expect(w.text()).toContain('Enter a value')
  })
})

describe('tools', () => {
  it('SWR: 2:1 gives 9.54 dB return loss and rejects SWR < 1', async () => {
    const w = mount(Swr, { global })
    await type(w, 'input[type=text]', '2')
    expect(w.text()).toContain('9.542')
    expect(w.text()).toContain('0.5115')
    await type(w, 'input[type=text]', '0.5')
    expect(w.text()).toContain('at least 1')
  })
  it("Ohm's law: 12 V and 6 Ω give 2 A and 24 W", async () => {
    const w = mount(OhmsLaw, { global })
    const inputs = w.findAll('input[type=text]')
    await inputs[0].setValue('12'); await inputs[2].setValue('6'); await flushPromises()
    expect(w.text()).toMatch(/Current\s*calculated\s*2\s*A/)
    expect(w.text()).toMatch(/Power\s*calculated\s*24\s*W/)
  })
  it('Dipole: slider and saving a design persist locally', async () => {
    const w = mount(Dipole, { global })
    expect(w.text()).toContain('20.06 m')
    await w.find('input[type=range]').setValue('0.97')
    expect(w.text()).toContain('20.48 m')
    await w.find('button.primary').trigger('click')
    expect(state.designs).toHaveLength(1)
    await flushPromises()
    expect(JSON.parse(localStorage.getItem('hrt:v1')!).designs[0].toolId).toBe('dipole')
  })
  it('Maidenhead: default example is JN58td, typing a locator moves the point', async () => {
    const w = mount(Maidenhead, { global })
    expect(w.text()).toContain('JN58td')
    const loc = w.findAll('input.mono')[0]
    await loc.trigger('focus'); await loc.setValue('FN31pr'); await flushPromises()
    expect(w.text()).toContain('FN31pr')
    await loc.setValue('ZZ99'); await flushPromises()
    expect(w.text()).toContain('Not a valid locator')
  })
})

describe('registry & store', () => {
  it('search matches keywords', () => {
    expect(searchTools('vswr').map((t) => t.id)).toEqual(['swr'])
    expect(searchTools('qth grid').map((t) => t.id)).toContain('maidenhead')
    expect(searchTools('zzzz')).toEqual([])
  })
  it('favorites persist', async () => {
    toggleFavorite('swr'); await flushPromises()
    expect(JSON.parse(localStorage.getItem('hrt:v1')!).favorites).toEqual(['swr'])
  })
})
