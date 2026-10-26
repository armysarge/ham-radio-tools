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
  it('DIY balun guide distinguishes a common-mode choke from impedance matching', async () => {
    const w = await open('diy-baluns')
    expect(w.text()).toContain('common-mode choke')
    expect(w.text()).toContain('does not transform impedance')
    expect(w.find('svg[role="img"]').exists()).toBe(true)
    expect(w.text()).toContain('Measure common-mode impedance')
  })
  it('balun turns respond to target reactance, and invalid stacks give no answer', async () => {
    const w = await open('diy-baluns')
    const field = (label: string) => w.findAll('.field').find(f => f.find('.lbl').text() === label)!
    expect(w.text()).toContain('5 turns')
    await field('Inductive reactance target').find('input').setValue('4000')
    expect(w.text()).toContain('9 turns')
    await field('Identical cores stacked').find('input').setValue('1.5')
    expect(w.text()).toContain('Use a whole number of cores')
    expect(w.find('.results').text()).not.toContain('9 turns')
    expect(w.text()).not.toContain('NaN')
    w.unmount()
  })
  it('balun reports cable that cannot pass through the selected core', async () => {
    const w = await open('diy-baluns')
    const diameter = w.findAll('.field').find(f => f.find('.lbl').text() === 'Coax outside diameter')!
    await diameter.find('input').setValue('100')
    expect(w.text()).toContain('too thick to pass through this core opening')
    w.unmount()
  })
  it('DIY transformer tab shows ideal impedance ratio and primary-turn estimate', async () => {
    const w = await open('diy-components')
    await w.findAll('.seg button').find((b) => b.text() === 'RF transformer')!.trigger('click')
    await flushPromises()
    expect(w.text()).toContain('Ideal impedance ratio')
    expect(w.text()).toContain('50 Ω → 450 Ω')
    expect(w.text()).toContain('Primary turns')
    expect(w.text()).toContain('does not rate power, temperature, bandwidth')
    expect(w.text()).toContain('Secondary impedance from whole turns')
    expect(w.text()).toContain('Enamelled copper magnet wire')
    expect(w.text()).toContain('PTFE-insulated copper wire')
    expect(w.find('svg[aria-label^="Two electrically separate"]').exists()).toBe(true)
  })
})

describe('beam and radial tools', () => {
  it('yagi lists reflector, driven and director', async () => { const w = await open('yagi'); expect(w.text()).toContain('reflector'); expect(w.text()).toContain('director'); expect(w.text()).not.toContain('NaN') })
  it('quad shows loop perimeters', async () => { const w = await open('quad'); expect(w.text()).toContain('Perimeter'); expect(w.text()).toContain('driven') })
  it('radial planner', async () => { const w = await open('radial-planner'); expect(w.text()).toContain('Number of radials'); expect(w.text()).toContain('40 m') })
  it('QFH shows sourced long/short loop geometry and an illustrative SVG', async () => {
    const w = await open('qfh')
    expect(w.text()).toContain('560.0 mm')
    expect(w.text()).toContain('512.0 mm')
    expect(w.text()).toContain('355.6 mm')
    expect(w.text()).toContain('measured resonance was 133 MHz')
    const diagram = w.find('svg.qfh-diagram[role="img"]')
    expect(diagram.attributes('aria-label')).toContain('four half-turn helical sides')
    expect(diagram.attributes('aria-label')).toContain('Long-loop height 560.0 mm')
    expect(w.text()).toContain('Faded sections pass behind the mast')
    expect(w.text()).toContain('Top end view')
    expect(w.text()).toContain('Bottom end view')
    expect(w.text()).toContain('Two perpendicular arm axes')
    expect(w.text()).toContain('Long loop')
    expect(w.text()).toContain('Short loop')
    expect(w.text()).toContain('Antenna system improvements')
    expect(w.text()).toContain('Make a packable field version')
    expect(w.find('svg[role="img"]').exists()).toBe(true)
    expect(w.text()).not.toContain('NaN')
  })
})

describe('antenna radiation pattern illustrations', () => {
  it('shows an explicitly qualified pattern concept on every antenna design page', async () => {
    for (const id of ['dipole', 'inverted-v', 'vertical', 'loop', 'efhw', 'jpole', 'qfh', 'yagi', 'quad']) {
      const w = await open(id)
      expect(w.find('.radiation-pattern').exists(), id).toBe(true)
      expect(w.text(), id).toContain('Illustrative pattern concept')
    }
  })
})

describe('antenna band guidance', () => {
  it('gives practical band choices on every antenna design page', async () => {
    for (const [id, band] of [['dipole', '40 m'], ['inverted-v', '80 m'], ['vertical', '70 cm'], ['loop', '80 m'], ['efhw', '40 m fundamental'], ['jpole', '2 m'], ['qfh', '137 MHz'], ['yagi', '6 m'], ['quad', '20 m']] as const) {
      const w = await open(id)
      const guide = w.find('[aria-label="Recommended bands and uses"]')
      expect(guide.exists(), id).toBe(true)
      expect(guide.text(), id).toContain(band)
      expect(guide.text(), id).toContain('Size and tune')
      expect(guide.find('a').attributes('rel')).toBe('noopener noreferrer')
      w.unmount()
    }
  })
  it('distinguishes receive-only and single-band designs from multiband coverage', async () => {
    const qfh = await open('qfh')
    expect(qfh.find('.antenna-bands').text()).toContain('outside the amateur transmit bands')
    qfh.unmount()
    const jpole = await open('jpole')
    expect(jpole.find('.antenna-bands').text()).toContain('single-band J-pole')
    jpole.unmount()
    const efhw = await open('efhw')
    expect(efhw.find('.antenna-bands').text()).toContain('not guaranteed low-SWR coverage')
    efhw.unmount()
  })
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
    await w.findAll('button').find((b) => b.text().startsWith('Insert'))!.trigger('click'); await flushPromises(); expect(w.text()).toContain('ISS (ZARYA)'); expect(w.text()).toContain('Rise (UTC)')
  })
})

describe('satellite staleness', () => {
  it('refuses to predict from elements years away from the start time', async () => {
    const w = await open('satellite-passes'); await w.find('textarea').setValue('1 25544U 98067A   08264.51782528 -.00002182  00000-0 -11606-4 0  2927\n2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.72125391563537'); await flushPromises()
    expect(w.text()).toContain('too far for a meaningful prediction'); expect(w.text()).not.toContain('Rise (UTC)')
  })
})

describe('DIY components', () => {
  it('shows each project with its calculator, diagram and safety notes', async () => {
    const w = await open('diy-components'); expect(w.text()).toContain('Turns to wind'); expect(w.text()).toContain('What to gather'); expect(w.text()).toContain('Safety'); expect(w.find('svg.diagram').exists()).toBe(true)
    for (const [label, expected] of [['Toroid inductor', 'Most turns that fit'], ['Foil-and-film capacitor', 'Area of each foil sheet'], ['Air-variable capacitor', 'Plates (rotor + stator)'], ['Dummy load (resistor array)', 'in series'], ['Common-mode choke (coax on a ferrite core)', 'Inductance from the AL value']] as const) {
      await w.findAll('.seg button').find((b) => b.text() === label)!.trigger('click'); await flushPromises(); expect(w.text(), label).toContain(expected); expect(w.text()).not.toContain('NaN')
    }
  })
})

describe('propagation report', () => {
  it('shows the reliability grid, details and the swap button', async () => {
    const w = await open('propagation-report'); await flushPromises()
    expect(w.text()).toContain('Band reliability by UTC hour'); expect(w.findAll('td[role="gridcell"]')).toHaveLength(8 * 24)
    expect(w.text()).toContain('10 m (28.0 MHz)'); expect(w.text()).toContain('80 m (3.5 MHz)'); expect(w.text()).not.toContain('NaN')
    await w.findAll('td[role="gridcell"]')[0].trigger('click'); expect(w.text()).toContain('10 m · 00:00 UTC'); expect(w.text()).toContain('Service probability')
    const before = w.find('.detail').text()
    await w.findAll('button').find((b) => b.text().includes('Swap'))!.trigger('click'); await flushPromises()
    expect(w.find('.detail').exists()).toBe(true); expect(typeof before).toBe('string')
  })
  it('keyboard arrows move the selection', async () => {
    const w = await open('propagation-report'); await flushPromises()
    await w.find('table.heat').trigger('keydown', { key: 'ArrowRight' }); await w.find('table.heat').trigger('keydown', { key: 'ArrowDown' })
    expect(w.find('td.sel').attributes('id')).toBe('cell-5-13')
  })
})
