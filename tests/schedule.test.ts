import { describe, it, expect } from 'vitest'
import { parseDays, parseScheduleText } from '../src/lib/scheduleImport'
import { onAirAt, parsePack, runsOnDay } from '../src/lib/packs'
import { TIME_STATIONS } from '../src/data/timeStations'

const EIBI = [
  'kHz;Time(UTC);Days;ITU;Station;Lng;Target;Remarks;P;Start;Stop',
  '5950;0000-0100;;USA;Radio Example;E;NAm;;1;;',
  '6070;2200-0200;1234567;CAN;CFRX;E;NAm;test;;;',
  '7200;0500-0600;MoWeFr;D;DW;G;Eu;;;;',
  '9500;0700-0800;irr;F;Test FR;F;Afr;;;;',
  '9999;2500-0100;;X;Bad time;E;;;;;',
  'abc;0000-0100;;X;Bad freq;E;;;;;',
].join('\n')

describe('schedule text import', () => {
  it('parses the semicolon layout, skipping bad lines with a reason', () => {
    const r = parseScheduleText(EIBI)
    expect(r.layout).toBe('eibi'); expect(r.entries).toHaveLength(4); expect(r.skipped).toHaveLength(2)
    expect(r.entries[0]).toMatchObject({ freqKhz: 5950, startUtc: '0000', endUtc: '0100', days: 'daily', station: 'Radio Example', language: 'E', target: 'NAm', country: 'USA' })
    expect(r.entries[1]).toMatchObject({ days: '1234567', startUtc: '2200', endUtc: '0200', note: 'test' })
    expect(r.entries[2].days).toBe('135')
    expect(r.entries[3]).toMatchObject({ days: 'daily', note: 'days: irr' })
    expect(r.skipped[0]).toMatch(/line 6/)
  })
  it('parses our CSV layout and accepts 2400 as midnight', () => {
    const r = parseScheduleText('freq_khz,start_utc,end_utc,days,station,language,target,country,note\n3330,0000,2400,daily,CHU,English,Canada,CAN,"time signal"\n')
    expect(r.layout).toBe('csv'); expect(r.entries[0]).toMatchObject({ freqKhz: 3330, endUtc: '0000', station: 'CHU', note: 'time signal' })
  })
  it('refuses unknown layouts and empty files with a helpful message', () => {
    expect(() => parseScheduleText('')).toThrow(/empty/)
    expect(() => parseScheduleText('a,b,c\n1,2,3')).toThrow(/Unrecognised layout/)
    expect(() => parseScheduleText('kHz;Time(UTC);Days;ITU;Station\nx;y;;;')).toThrow(/No usable/)
    expect(() => parseScheduleText('kHz;Foo;Station')).toThrow(/Unrecognised|missing/)
  })
  it('day parsing', () => {
    expect(parseDays('')).toBe('daily'); expect(parseDays('31')).toBe('13'); expect(parseDays('MoTu')).toBe('12'); expect(parseDays('Sa')).toBe('6'); expect(parseDays('Mo-Fr')).toBe('daily')
  })
  it('converted entries pass pack validation and drive the on-air test', () => {
    const { entries } = parseScheduleText(EIBI)
    const pack = parsePack(JSON.stringify({ format: 'ham-radio-tools-pack', version: 1, kind: 'broadcast-schedule', id: 'eibi-test', title: 'Test', source: 'unit test', license: 'n/a', revision: '2026-10-01', data: { entries } }))
    expect(pack.rows).toBe(4)
    const e = entries[1] // 2200–0200 daily
    expect(onAirAt(e.startUtc, e.endUtc, 2330) && runsOnDay(e.days, 7)).toBe(true)
    expect(onAirAt(e.startUtc, e.endUtc, 300)).toBe(false)
  })
})

describe('bundled time stations', () => {
  it('are continuous, valid and cover the best-known services', () => {
    const f = (name: string) => TIME_STATIONS.filter((s) => s.station.startsWith(name)).map((s) => s.freqKhz)
    expect(f('WWV (')).toEqual([2500, 5000, 10000, 15000, 20000]); expect(f('WWVH')).toEqual([2500, 5000, 10000, 15000]); expect(f('CHU')).toEqual([3330, 7850, 14670]); expect(f('RWM')).toEqual([4996, 9996, 14996])
    for (const s of TIME_STATIONS) { expect(s.freqKhz).toBeGreaterThan(0); expect(onAirAt(s.startUtc, s.endUtc, 1234)).toBe(true) }
  })
})

import { mount, flushPromises } from '@vue/test-utils'
import BroadcastSchedules from '../src/tools/BroadcastSchedules.vue'
describe('broadcast schedule tool', () => {
  const global = { stubs: { RouterLink: true } }
  it('lists bundled time stations at any hour, filters by frequency and text, and explains empty results', async () => {
    const w = mount(BroadcastSchedules, { global }); await flushPromises()
    expect(w.text()).toContain('WWV (Fort Collins'); expect(w.text()).toContain('CHU (Ottawa)')
    const inputs = w.findAll('input[type=text]')
    await inputs[0].setValue('chu'); await flushPromises()
    expect(w.text()).toContain('CHU (Ottawa)'); expect(w.text()).not.toContain('WWV (Fort Collins')
    await inputs[0].setValue(''); await inputs[1].setValue('9000'); await inputs[2].setValue('11000'); await flushPromises()
    expect(w.text()).toContain('10000'); expect(w.text()).not.toContain('14670')
    await inputs[1].setValue('1'); await inputs[2].setValue('2'); await flushPromises()
    expect(w.text()).toContain('Nothing matches')
  })
  it('shows the data revision and a manual-time error', async () => {
    const w = mount(BroadcastSchedules, { global })
    expect(w.text()).toContain('revision 2026-10-19')
    await w.find('input[type=checkbox]').setValue(false)
    await w.find('input.mono').setValue('9999'); await flushPromises()
    expect(w.text()).toContain('four digits, 24-hour UTC')
  })
})
