import { describe, it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { CONSTANTS, CTCSS, ITU_BANDS } from '../src/data/reference'
import BandPlans from '../src/tools/BandPlans.vue'
import RefLists from '../src/tools/RefLists.vue'

const global = { stubs: { RouterLink: true } }
const c = (sym: string) => CONSTANTS.find((x) => x.symbol === sym)!.value

describe('reference data sanity', () => {
  it('CTCSS: 50 unique ascending tones, 38 of them standard EIA', () => {
    const hz = CTCSS.map((t) => t[0])
    expect(hz).toHaveLength(50)
    expect(new Set(hz).size).toBe(50)
    expect([...hz].sort((a, b) => a - b)).toEqual(hz)
    expect(CTCSS.filter((t) => t[1])).toHaveLength(38)
    expect(hz[0]).toBe(67.0); expect(hz.at(-1)).toBe(254.1)
  })
  it('constants are mutually consistent', () => {
    expect(c('ε₀') * c('μ₀') * c('c') ** 2).toBeCloseTo(1, 8)
    expect(c('μ₀') * c('c')).toBeCloseTo(c('Z₀'), 5)
    expect(10 * Math.log10((c('k') * c('T₀')) / 1e-3)).toBeCloseTo(c('kT₀'), 2)
    expect(20 * Math.log10(Math.E)).toBeCloseTo(c('Np'), 8)
    expect(c('300/f')).toBeCloseTo(c('c') / 1e6, 5)
    expect((c('468/f') * 0.3048) / ((0.95 * c('c')) / 2 / 1e6)).toBeCloseTo(1, 2) // the 468 ft rule is k = 0.95 within 0.2%
  })
  it('ITU bands are well-formed and cover every region', () => {
    for (const b of ITU_BANDS) { expect(b.fromHz).toBeLessThan(b.toHz); expect([1, 2, 3]).toContain(b.region) }
    for (const r of [1, 2, 3]) expect(ITU_BANDS.filter((b) => b.region === r).map((b) => b.band)).toContain('20 m')
    const r1 = ITU_BANDS.find((b) => b.band === '40 m' && b.region === 1)!, r2 = ITU_BANDS.find((b) => b.band === '40 m' && b.region === 2)!
    expect(r1.toHz).toBe(7.2e6); expect(r2.toHz).toBe(7.3e6)
  })
})

describe('reference tools', () => {
  it('band plan lookup finds 20 m at 14.2 MHz and reports a gap at 13 MHz', async () => {
    const w = mount(BandPlans, { global })
    await flushPromises()
    expect(w.text()).toContain('20 m · 14–14.35 MHz')
    await w.find('input[type=text]').setValue('13'); await flushPromises()
    expect(w.text()).toContain('Not inside any amateur allocation')
  })
  it('region matters: 7.25 MHz is inside Region 2 but outside Region 1', async () => {
    const w = mount(BandPlans, { global })
    await w.find('input[type=text]').setValue('7.25')
    expect(w.text()).toContain('Not inside any amateur allocation') // default Region 1
    await w.findAll('button').find((b) => b.text() === 'Region 2')!.trigger('click')
    expect(w.text()).toContain('40 m · 7–7.3 MHz')
  })
  it('CTCSS, abbreviation and constant filters work and show empty states', async () => {
    const t = mount(RefLists, { props: { which: 'ctcss' }, global })
    expect(t.text()).toContain('88.5')
    await t.find('input[type=text]').setValue('extended'); expect(t.text()).toContain('69.3'); expect(t.text()).not.toContain('88.5')
    await t.find('input[type=text]').setValue('zzz'); expect(t.text()).toContain('No tone matches')
    const a = mount(RefLists, { props: { which: 'abbreviations' }, global })
    await a.find('input[type=text]').setValue('fine business'); expect(a.text()).toContain('FB')
    const k = mount(RefLists, { props: { which: 'constants' }, global })
    await k.find('input[type=text]').setValue('boltzmann'); expect(k.text()).toContain('1.380 649')
  })
})

import Cw from '../src/tools/Cw.vue'
describe('CW tool', () => {
  const tab = (w: ReturnType<typeof mount>, name: string) => w.findAll('[role=tab]').find((b) => b.text().startsWith(name))!.trigger('click')
  it('shows the Morse pattern and duration, and flags unsendable characters', async () => {
    const w = mount(Cw, { global })
    expect(w.text()).toContain('▬ • ▬ •') // C
    expect(w.text()).toMatch(/Takes \d+\.\d s/)
    await w.find('textarea').setValue('A~'); await flushPromises()
    expect(w.text()).toContain('Cannot be sent in Morse')
  })
  it('rejects a character speed below the overall speed', async () => {
    const w = mount(Cw, { global })
    await w.findAll('input[type=text]')[1].setValue('10'); await w.findAll('input[type=text]')[0].setValue('20'); await flushPromises()
    expect(w.text()).toContain('Character speed must be at least')
  })
  it('decodes typed symbols and shows a helpful empty listening state', async () => {
    const w = mount(Cw, { global })
    await tab(w, 'Decode'); await flushPromises()
    expect(w.text()).toContain('CQ DX')
    await tab(w, 'Listen'); await flushPromises()
    expect(w.text()).toContain('Experimental')
    await w.findAll('button').find((b) => b.text().includes('Start listening'))!.trigger('click'); await flushPromises()
    expect(w.text()).toMatch(/cannot access a microphone|refused or no microphone/) // jsdom has no microphone: a readable error, not a crash
  })
})

import CallsignLookup from '../src/tools/CallsignLookup.vue'
describe('callsign tool', () => {
  it('shows the issuing country, operating country and notes, and handles bad input', async () => {
    const w = mount(CallsignLookup, { global })
    expect(w.text()).toContain('South Africa'); expect(w.text()).toContain('Germany'); expect(w.text()).toContain('portable')
    await w.find('input[type=text]').setValue('kh6abc'); await flushPromises()
    expect(w.text()).toContain('United States'); expect(w.text()).toContain('Hawaii')
    await w.find('input[type=text]').setValue('QA1ABC'); await flushPromises()
    expect(w.text()).toContain('not in any allocated')
    await w.find('input[type=text]').setValue('W1AW!'); await flushPromises()
    expect(w.text()).toContain('only letters, digits')
  })
})

import { MODS, modsFor, type AntennaId } from '../src/data/antennaMods'
import ModsPanel from '../src/components/ModsPanel.vue'
describe('antenna mods', () => {
  it('data is complete, unique, and never promises dB gains', () => {
    expect(new Set(MODS.map((m) => m.id)).size).toBe(MODS.length)
    for (const m of MODS) {
      for (const k of ['title', 'what', 'effect', 'caveat', 'basis'] as const) expect(m[k].length, `${m.id}.${k}`).toBeGreaterThan(k === 'title' ? 5 : 15)
      expect(`${m.what} ${m.effect} ${m.caveat}`, m.id).not.toMatch(/\d+(\.\d+)?\s?dB/)
    }
  })
  it('every antenna has proven mods and warns about unproven ones', () => {
    for (const a of ['dipole', 'inverted-v', 'vertical', 'loop'] as AntennaId[]) {
      expect(modsFor(a).filter((m) => m.evidence === 'proven').length, a).toBeGreaterThan(2)
      expect(modsFor(a).filter((m) => m.evidence === 'unproven').length, a).toBeGreaterThan(0)
    }
  })
  it('panel filters by evidence', async () => {
    const w = mount(ModsPanel, { props: { antenna: 'vertical' } })
    expect(w.text()).toContain('More radials'); expect(w.text()).toContain('A single ground rod')
    await w.findAll('button').find((b) => b.text().startsWith('Unproven'))!.trigger('click')
    expect(w.text()).toContain('A single ground rod'); expect(w.text()).not.toContain('Elevate the radials')
  })
})
