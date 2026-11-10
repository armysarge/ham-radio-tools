import { describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import SatellitePasses from '../src/tools/SatellitePasses.vue'
import { dopplerFrequencies, look, parseTle, passes, rangeRateMps, trackPass } from '../src/lib/sat'
import { C, dopplerShift } from '../src/lib/rf'

const TLE = `ISS (ZARYA)\n1 25544U 98067A   08264.51782528 -.00002182  00000-0 -11606-4 0  2927\n2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.72125391563537`
const tle = parseTle(TLE)
const obs = { latDeg: -25.75, lonDeg: 28.2, altKm: 0 }
const pass = passes(tle, obs, new Date('2008-09-20T12:30:00Z'), 24, 10)[0]

describe('Doppler along a pass', () => {
  it('has a range rate that goes from approaching to receding within orbital speed', () => {
    const track = trackPass(tle, obs, pass, 30)
    expect(track[0].marker).toBe('AOS'); expect(track.at(-1)!.marker).toBe('LOS')
    expect(track.filter((p) => p.marker === 'TCA')).toHaveLength(1)
    expect(track[0].rangeRateMps).toBeLessThan(-3000)
    expect(track.at(-1)!.rangeRateMps).toBeGreaterThan(3000)
    for (const p of track) expect(Math.abs(p.rangeRateMps)).toBeLessThan(8000)
    for (let i = 1; i < track.length; i++) expect(track[i].time.getTime()).toBeGreaterThan(track[i - 1].time.getTime())
    expect(track.length).toBeGreaterThan(8)
  })
  it('agrees with a wider finite difference of the range', () => {
    const at = new Date(pass.tca.getTime() - 120_000)
    const wide = (look(tle, obs, new Date(at.getTime() + 5000))!.rangeKm - look(tle, obs, new Date(at.getTime() - 5000))!.rangeKm) * 100
    expect(rangeRateMps(tle, obs, at)!).toBeCloseTo(wide, -1)
  })
  it('raises the downlink on approach, lowers it on recession and lowers the uplink to compensate', () => {
    const near = dopplerFrequencies(145.8e6, 437.8e6, -6000)
    expect(near.shiftHz).toBeGreaterThan(0); expect(near.downlinkHz).toBeGreaterThan(145.8e6); expect(near.uplinkHz!).toBeLessThan(437.8e6)
    const far = dopplerFrequencies(145.8e6, 437.8e6, 6000)
    expect(far.shiftHz).toBeLessThan(0); expect(far.downlinkHz).toBeLessThan(145.8e6); expect(far.uplinkHz!).toBeGreaterThan(437.8e6)
    expect(dopplerFrequencies(145.8e6, null, 6000).uplinkHz).toBeNull()
    expect(dopplerFrequencies(145.8e6, 437.8e6, 0)).toEqual({ downlinkHz: 145.8e6, shiftHz: 0, uplinkHz: 437.8e6 })
  })
  it('makes the satellite receive the nominal uplink', () => {
    for (const rr of [-7000, -1234, 0, 800, 7200]) {
      const { uplinkHz } = dopplerFrequencies(145.8e6, 435.2e6, rr)
      expect(dopplerShift(uplinkHz!, rr).receivedHz).toBeCloseTo(435.2e6, 3)
    }
    expect(dopplerFrequencies(145.8e6, null, -7500).shiftHz).toBeCloseTo(145.8e6 * 7500 / C, 6)
  })
  it('rejects invalid frequencies, rates and step sizes', () => {
    expect(() => dopplerFrequencies(0, null, 0)).toThrow(/frequency/i)
    expect(() => dopplerFrequencies(145.8e6, -1, 0)).toThrow(/frequency/i)
    expect(() => dopplerFrequencies(145.8e6, null, 3e6)).toThrow(/range rate/i)
    expect(() => trackPass(tle, obs, pass, 0)).toThrow(/step/i)
    expect(() => trackPass(tle, obs, pass, 301)).toThrow(/step/i)
  })
})

describe('Satellite page Doppler table', () => {
  const mountPage = () => mount(SatellitePasses, { global: { stubs: { ToolLayout: { template: '<div><slot /><slot name="explain" /></div>' }, RouterLink: { template: '<a><slot /></a>' } } } })
  const input = (w: ReturnType<typeof mountPage>, label: string) => w.get(`#${w.findAll('label').find((l) => l.text().startsWith(label))!.attributes('for')}`)
  it('shows corrected frequencies for the selected pass once a downlink is entered', async () => {
    const w = mountPage()
    try {
      await w.findAll('button').find((b) => b.text().startsWith('Insert an old ISS sample'))!.trigger('click')
      await flushPromises()
      expect(w.text()).toContain('Satellite downlink frequency')
      expect(w.text()).toContain('Doppler for the selected pass')
      expect(w.text()).not.toContain('Transmit uplink')
      expect(w.findAll('th').some((h) => h.text() === 'Tune downlink (MHz)')).toBe(true)
      const first = w.findAll('tbody tr').find((r) => r.text().includes('AOS'))!
      expect(first.text()).toMatch(/\+\d+\.\d\d/)
      expect(first.text()).toContain('145.80')
      await input(w, 'Satellite uplink').setValue('437.8')
      expect(w.text()).toContain('Transmit uplink (MHz)')
      await input(w, 'Satellite downlink').setValue('0')
      expect(w.text()).not.toContain('Doppler for the selected pass')
    } finally { w.unmount() }
  })
  it('does not show Doppler without a downlink frequency', async () => {
    const w = mountPage()
    try {
      await w.get('textarea').setValue(TLE)
      await w.get('input[type="datetime-local"]').setValue('2008-09-20T12:30')
      expect(w.text()).not.toContain('Doppler for the selected pass')
    } finally { w.unmount() }
  })
})

import { SAT_FREQUENCIES, SAT_FREQ_META, centreHz, satFrequencyAgeDays } from '../src/data/satelliteFrequencies'

describe('bundled satellite frequencies', () => {
  it('is attributed, dated and internally consistent', () => {
    expect(SAT_FREQ_META).toMatchObject({ source: 'SatNOGS DB', license: 'CC BY-SA 4.0', retrieved: '2026-11-10' })
    expect(new Set(SAT_FREQUENCIES.map((e) => e.norad)).size).toBe(SAT_FREQUENCIES.length)
    for (const e of SAT_FREQUENCIES) {
      expect(new Set(e.links.map((l) => l.id)).size).toBe(e.links.length)
      for (const l of e.links) {
        for (const r of [l.downHz, l.upHz].filter(Boolean) as [number, number][]) { expect(r[0]).toBeLessThanOrEqual(r[1]); expect(r[0]).toBeGreaterThan(28e6); expect(r[1]).toBeLessThan(440e6) }
        expect(l.upHz, `${e.name} ${l.id} needs an uplink for voice/linear use`).toBeDefined()
        expect(l.linear).toBe(l.downHz[0] !== l.downHz[1])
      }
    }
  })
  it('pins the frequencies checked against the source', () => {
    const f = (norad: number, id: string) => SAT_FREQUENCIES.find((e) => e.norad === norad)!.links.find((l) => l.id === id)!
    expect(f(25544, 'fm-repeater')).toMatchObject({ upHz: [145_990_000, 145_990_000], downHz: [437_800_000, 437_800_000] })
    expect(f(27607, 'fm-voice')).toMatchObject({ upHz: [145_850_000, 145_850_000], downHz: [436_795_000, 436_795_000] })
    expect(f(43017, 'fm-voice')).toMatchObject({ upHz: [435_250_000, 435_250_000], downHz: [145_960_000, 145_960_000] })
    expect(f(39444, 'linear')).toMatchObject({ upHz: [435_130_000, 435_150_000], downHz: [145_950_000, 145_970_000] })
    expect(f(44909, 'linear')).toMatchObject({ upHz: [145_935_000, 145_995_000], downHz: [435_610_000, 435_670_000] })
    expect(f(7530, 'mode-a')).toMatchObject({ upHz: [145_850_000, 145_950_000], downHz: [29_400_000, 29_500_000] })
    expect(f(7530, 'mode-b')).toMatchObject({ upHz: [432_125_000, 432_175_000], downHz: [145_925_000, 145_975_000] })
    expect(f(61781, 'fm-voice')).toMatchObject({ upHz: [145_850_000, 145_850_000], downHz: [435_400_000, 435_400_000] })
    expect(f(24278, 'linear')).toMatchObject({ upHz: [145_900_000, 146_000_000], downHz: [435_800_000, 435_900_000] })
    expect(f(43803, 'linear')).toMatchObject({ upHz: [435_100_000, 435_120_000], downHz: [145_855_000, 145_875_000] })
    expect(f(67291, 'fm-voice')).toMatchObject({ upHz: [145_920_000, 145_920_000], downHz: [436_950_000, 436_950_000] })
  })
  it('uses the passband centre and measures the snapshot age', () => {
    expect(centreHz([145_935_000, 145_995_000])).toBe(145_965_000)
    expect(centreHz([437_800_000, 437_800_000])).toBe(437_800_000)
    expect(satFrequencyAgeDays(new Date('2026-11-10T12:00:00Z'))).toBe(0)
    expect(satFrequencyAgeDays(new Date('2027-02-08T00:00:00Z'))).toBe(90)
  })
})

describe('satellite page frequency list', () => {
  const mountPage = () => mount(SatellitePasses, { global: { stubs: { ToolLayout: { template: '<div><slot /><slot name="explain" /></div>' }, RouterLink: { template: '<a><slot /></a>' } } } })
  const input = (w: ReturnType<typeof mountPage>, label: string) => w.get(`#${w.findAll('label').find((l) => l.text().startsWith(label))!.attributes('for')}`)
  const select = (w: ReturnType<typeof mountPage>, label: string) => w.findAll('label').find((l) => l.text().startsWith(label))!.get('select')
  it('fills downlink and uplink from a chosen satellite and link', async () => {
    const w = mountPage()
    try {
      expect(w.text()).toContain('SatNOGS DB')
      await select(w, 'Bundled frequency list').setValue('25544')
      expect((input(w, 'Satellite downlink').element as HTMLInputElement).value).toBe('437.8')
      expect((input(w, 'Satellite uplink').element as HTMLInputElement).value).toBe('145.99')
      await select(w, 'Bundled frequency list').setValue('7530')
      expect((input(w, 'Satellite downlink').element as HTMLInputElement).value).toBe('145.95')
      await select(w, 'Link').setValue('mode-a')
      expect((input(w, 'Satellite downlink').element as HTMLInputElement).value).toBe('29.45')
      expect((input(w, 'Satellite uplink').element as HTMLInputElement).value).toBe('145.9')
      expect(w.text()).toContain('Linear transponder')
    } finally { w.unmount() }
  })
  it('points to the matching list entry when a known satellite is pasted', async () => {
    const w = mountPage()
    try {
      await w.get('textarea').setValue(TLE)
      expect(w.text()).toContain('ISS (ZARYA) is in the list below')
      await select(w, 'Bundled frequency list').setValue('25544')
      expect(w.text()).not.toContain('is in the list below')
    } finally { w.unmount() }
  })
  it('offers recent reports for manual frequencies and the applicable operator link for a preset', async () => {
    const w = mountPage()
    const amsat = 'a[href="https://status.amsat.org/"]'
    const ariss = 'a[href="https://www.ariss.org/current-status-of-iss-stations.html"]'
    const jarl = 'a[href="https://www.jarl.org/Japanese/3_Fuji/fuji3-202210.htm"]'
    try {
      expect(w.find(amsat).exists()).toBe(true)
      expect(w.text()).toContain('Current activity is unknown in this app')
      expect(w.find(ariss).exists()).toBe(false)
      await w.get('textarea').setValue(TLE)
      expect(w.find(ariss).exists()).toBe(true)
      await select(w, 'Bundled frequency list').setValue('24278')
      expect(w.find(ariss).exists()).toBe(false)
      expect(w.find(jarl).exists()).toBe(true)
      expect(w.text()).toContain('Current activity is unknown in this app')
    } finally { w.unmount() }
  })
})
