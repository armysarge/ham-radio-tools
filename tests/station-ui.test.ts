import { describe, it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { tools } from '../src/core/registry'

const global = { stubs: { RouterLink: true }, mocks: { $route: { query: {} } } }
const open = async (id: string) => { const m = (await tools.find((t) => t.id === id)!.component()) as any; const c = m.default ?? m; const w = mount(c, { global }); await flushPromises(); return w }

describe('station tools render with their defaults', () => {
  it('feedline loss: 20 m of RG-58 at 14.2 MHz, SWR 1.5', async () => { const w = await open('feedline-loss'); expect(w.text()).toContain('Total feedline loss'); expect(w.text()).not.toContain('NaN') })
  it('link budget gives a positive margin for 5 W over 20 km on 145 MHz', async () => { const w = await open('link-budget'); expect(w.text()).toContain('Link margin'); expect(w.text()).toContain('Radio horizon') })
  it('L-network 50 to 200 ohms', async () => { const w = await open('l-network'); expect(w.text()).toContain('0.9706'); expect(w.text()).toContain('97.06') })
  it('low-pass filter shows five parts', async () => { const w = await open('low-pass-filter'); expect(w.text()).toContain('C1 (shunt)'); expect(w.text()).toContain('C5 (shunt)') })
  it('coils: toroid turns', async () => { const w = await open('coils'); expect(w.text()).toContain('45.18') })
  it('power planner', async () => { const w = await open('power-planner'); expect(w.text()).toContain('Solar panel needed') })
})

describe('beam and radial tools', () => {
  it('yagi lists reflector, driven and director', async () => { const w = await open('yagi'); expect(w.text()).toContain('reflector'); expect(w.text()).toContain('director'); expect(w.text()).not.toContain('NaN') })
  it('quad shows loop perimeters', async () => { const w = await open('quad'); expect(w.text()).toContain('Perimeter'); expect(w.text()).toContain('driven') })
  it('radial planner', async () => { const w = await open('radial-planner'); expect(w.text()).toContain('Number of radials'); expect(w.text()).toContain('40 m') })
})

describe('logbook, clock and trainer', () => {
  it('clock shows UTC and rejects a bad zone', async () => {
    const w = await open('clock'); expect(w.text()).toContain('UTC'); await w.find('input[placeholder^="e.g."]').setValue('Nowhere/Land'); await w.findAll('button').find((b) => b.text() === 'Add')!.trigger('click')
    expect(w.text()).toContain('not a time zone name')
  })
  it('trainer shows the lesson characters', async () => { const w = await open('morse-trainer'); expect(w.text()).toContain('K M'); expect(w.text()).toContain('Play') })
  it('logbook validates a call, logs it, warns on a duplicate and can delete', async () => {
    localStorage.removeItem('hrt:log'); const w = await open('logbook')
    await w.findAll('button').find((b) => b.text() === 'Log contact')!.trigger('click'); expect(w.text()).toContain('Enter a call sign')
    await w.find('input[autocapitalize="characters"]').setValue('dl1abc'); await w.findAll('button').find((b) => b.text() === 'Log contact')!.trigger('click'); await flushPromises()
    expect(w.text()).toContain('1 contact'); expect(w.text()).toContain('DL1ABC')
    await w.find('input[autocapitalize="characters"]').setValue('DL1ABC'); expect(w.text()).toContain('already have this call')
    await w.find('button[aria-label="Delete DL1ABC"]').trigger('click'); expect(w.text()).toContain('No contacts yet')
  })
})

describe('propagation and satellites', () => {
  it('propagation opens on the band table and switches to MUF', async () => {
    const w = await open('propagation'); expect(w.text()).toContain('Usually best'); await w.findAll('button').find((b) => b.text() === 'MUF estimate')!.trigger('click'); await flushPromises()
    expect(w.text()).toContain('Maximum usable frequency')
  })
  it('sun tab gives sunrise and a day part', async () => {
    const w = await open('propagation'); await w.findAll('button').find((b) => b.text().startsWith('Sun'))!.trigger('click'); await flushPromises()
    expect(w.text()).toContain('Sunrise'); expect(w.text()).toMatch(/day|night|grey line/)
  })
  it('satellite tool lists passes for the sample and explains a bad TLE', async () => {
    const w = await open('satellite-passes'); expect(w.text()).toContain('Paste an element set')
    await w.find('textarea').setValue('1 garbage'); await flushPromises(); expect(w.text()).toContain('two lines')
    await w.findAll('button').find((b) => b.text().startsWith('Insert'))!.trigger('click'); await flushPromises(); expect(w.text()).toContain('ISS (ZARYA)'); expect(w.text()).toContain('days away')
  })
})
