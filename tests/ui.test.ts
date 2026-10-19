import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import NumField from '../src/components/NumField.vue'
import Swr from '../src/tools/Swr.vue'
import OhmsLaw from '../src/tools/OhmsLaw.vue'
import Dipole from '../src/tools/Dipole.vue'
import Feedline from '../src/tools/Feedline.vue'
import Reactance from '../src/tools/Reactance.vue'
import InvertedV from '../src/tools/InvertedV.vue'
import Vertical from '../src/tools/Vertical.vue'
import Loop from '../src/tools/Loop.vue'
import Settings from '../src/views/Settings.vue'
import { platform } from '../src/platform'
import { saveDesign, saveLocation } from '../src/core/store'
import Maidenhead from '../src/tools/Maidenhead.vue'
import { state, toggleFavorite } from '../src/core/store'
import { searchTools } from '../src/core/registry'
import { FREQ_UNITS } from '../src/lib/units'

const global = { stubs: { RouterLink: true }, mocks: { $route: { query: {} } } }

beforeEach(() => { localStorage.clear(); state.favorites = []; state.locations = []; state.designs = []; state.stationId = null; state.units = 'metric' })
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
  it('Feedline: quarter wave of 0.66 VF coax at 14.2 MHz is 3.48 m', async () => {
    const w = mount(Feedline, { global })
    expect(w.text()).toContain('3.484')
  })
  it('Reactance: 10 uH + 100 pF resonates at 5.033 MHz', async () => {
    const w = mount(Reactance, { global })
    expect(w.text()).toContain('5.033')
  })
  it('Inverted-V: 7.1 MHz, 120 deg, 12 m apex; warns when the ends get low', async () => {
    const w = mount(InvertedV, { global })
    expect(w.text()).toContain('19.45 m')
    expect(w.text()).not.toContain('underground')
    const h = w.findAll('input[type=text]')[1]
    await h.setValue('6'); await flushPromises() // end height 6 - 4.86 = 1.14 m
    expect(w.text()).toContain('out of reach')
    await h.setValue('3'); await flushPromises()
    expect(w.text()).toContain('underground')
  })
  it('Vertical: 14.2 MHz quarter wave is 5.01 m; ground mode suggests 16+ radials', async () => {
    const w = mount(Vertical, { global })
    expect(w.text()).toContain('5.01 m')
    await w.findAll('button').find((b) => b.text().includes('On or in the ground'))!.trigger('click')
    expect(w.text()).toContain('16 or more')
  })
  it('Loop: 14.2 MHz square loop is 21.57 m of wire; saving a design works', async () => {
    const w = mount(Loop, { global })
    expect(w.text()).toContain('21.57 m')
    expect(w.text()).toContain('5.39 m') // side
    await w.find('button.primary').trigger('click')
    expect(state.designs[0].toolId).toBe('loop')
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

describe('measurement system', () => {
  it('defaults to metric and switches distances and lengths to imperial', async () => {
    expect(state.units).toBe('metric')
    const m = mount(Maidenhead, { global })
    expect(m.text()).toMatch(/Short path\s*[\d.]+\s*km/)
    const d = mount(Dipole, { global })
    expect(d.text()).toContain('20.06 m')
    state.units = 'imperial'; await flushPromises()
    expect(m.text()).toMatch(/Short path\s*[\d.]+\s*miles/)
    expect(d.text()).toContain('65 ft')
    expect(d.text()).toMatch(/Each leg\s*32 ft/) // leading figure is now imperial (metric shown only as the secondary row)
  })
})

describe('project backup', () => {
  const pick = async (w: ReturnType<typeof mount>, text: string) => {
    const input = w.find('input[type=file]')
    const file = new File([text], 'p.json', { type: 'application/json' })
    Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
    await input.trigger('change'); await new Promise((r) => setTimeout(r, 20)); await flushPromises()
  }
  it('exports saved designs and locations, then restores them after deletion', async () => {
    saveLocation('Home', 48.1, 11.6, true)
    saveDesign({ toolId: 'dipole', name: '40 m', summary: 's', params: { f: 7.1e6, k: 0.95 } })
    const spy = vi.spyOn(platform, 'saveFile').mockImplementation(() => {})
    const w = mount(Settings, { global })
    await w.findAll('button').find((b) => b.text().includes('Export project file'))!.trigger('click')
    const [name, data] = spy.mock.calls[0] as [string, string]
    expect(name).toMatch(/^ham-radio-tools-project-\d{4}-\d{2}-\d{2}\.json$/)
    state.locations = []; state.designs = []; state.stationId = null
    await pick(w, data)
    expect(w.text()).toContain('contains 1 location(s) and 1 design(s)')
    await w.findAll('button').find((b) => b.text() === 'Import')!.trigger('click')
    expect(state.locations.map((l) => l.name)).toEqual(['Home'])
    expect(state.designs[0].params).toEqual({ f: 7.1e6, k: 0.95 })
    expect(state.stationId).toBe(state.locations[0].id)
    expect(w.text()).toContain('Imported 1 location(s) and 1 design(s)')
    spy.mockRestore()
  })
  it('shows a readable error for a wrong file and requires confirmation to replace', async () => {
    saveLocation('Keep me', 1, 2)
    const w = mount(Settings, { global })
    await pick(w, '{"hello":1}')
    expect(w.text()).toContain('not a Ham Radio Tools project')
    await pick(w, JSON.stringify({ format: 'ham-radio-tools-project', version: 1, locations: [], designs: [] }))
    await w.findAll('button').find((b) => b.text() === 'Replace what I have')!.trigger('click')
    const go = w.findAll('button').find((b) => b.text() === 'Import')!
    expect(go.attributes('disabled')).toBeDefined()
    expect(state.locations).toHaveLength(1)
    await w.find('input[type=checkbox]').setValue(true)
    await go.trigger('click')
    expect(state.locations).toHaveLength(0)
  })
})
