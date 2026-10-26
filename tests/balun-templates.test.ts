import { expect, it } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import DiyMagnetic from '../src/tools/DiyMagnetic.vue'

const open = () => mount(DiyMagnetic, { props: { kind: 'balun' }, global: { stubs: { RouterLink: true } } })
const field = (w: ReturnType<typeof open>, label: string) => w.findAll('.field').find(f => f.find('.lbl').text() === label)!
const choose = async (w: ReturnType<typeof open>, name: string) => {
  await w.findAll('[aria-label="Balun templates"] button').find(b => b.text() === name)!.trigger('click')
  await flushPromises()
}

it('offers distinct current and voltage constructions rather than only changing a ratio label', async () => {
  const w = open()
  expect(w.get('[aria-label="Balun templates"]').text()).toContain('4:1 Guanella current')
  await choose(w, '4:1 Guanella current')
  expect(w.text()).toContain('50 Ω → 200 Ω')
  expect(w.text()).toContain('100 Ω')
  expect(w.text()).toContain('Two independent core sections')
  expect(w.text()).toContain('equal turns')
  expect(w.findAll('[aria-label="Selected balun template"] a').some(a => a.attributes('href')?.includes('balun_guanella_current_1-4'))).toBe(true)
  await choose(w, '4:1 Ruthroff voltage')
  expect(w.text()).toContain('50 Ω → 200 Ω')
  expect(w.text()).toContain('A2 + B1')
  expect(w.text()).toContain('does not force equal antenna currents')
  w.unmount()
})

it('counts all conductors and sections in wire allowance and keeps the ratio when turns change', async () => {
  const w = open()
  await choose(w, '1:1 paired-wire current')
  const oneSection = w.findAll('.result').find(r => r.text().includes('Total winding-wire allowance'))!.text()
  expect(w.text()).toContain('50 Ω → 50 Ω')
  await choose(w, '4:1 Guanella current')
  const twoSections = w.findAll('.result').find(r => r.text().includes('Total winding-wire allowance'))!.text()
  expect(twoSections).not.toBe(oneSection)
  await field(w, 'Inductive reactance target').find('input').setValue('4000')
  expect(w.text()).toContain('50 Ω → 200 Ω')
  expect(w.text()).toContain('9 turns')
  await field(w, 'Identical cores stacked per section').find('input').setValue('1.5')
  expect(w.text()).toContain('Use a whole number of cores')
  expect(w.find('.results').text()).not.toContain('9 turns')
  expect(w.text()).not.toContain('NaN')
  w.unmount()
})

it('provides a trifilar 9:1 unun with a shared return rather than a balanced output', async () => {
  const w = open()
  await choose(w, '9:1 voltage unun')
  expect(w.text()).toContain('50 Ω → 450 Ω')
  expect(w.text()).toContain('unbalanced on both sides')
  expect(w.text()).toContain('A2 + B1')
  expect(w.text()).toContain('B2 + C1')
  expect(w.text()).toContain('C2')
  expect(w.text()).toContain('3 equal pieces in total')
  expect(w.text()).not.toContain('Transmission-line impedance target')
  expect(w.text()).toContain('tuner')
  w.unmount()
})
