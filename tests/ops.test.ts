import { describe, it, expect } from 'vitest'
import * as L from '../src/lib/log'
import * as T from '../src/lib/trainer'
import * as K from '../src/lib/timers'

const q = (o: Partial<L.Qso> = {}): L.Qso => ({ id: 'a', call: 'zs6shz', date: '2026-10-19', time: '14:05', freqMHz: 14.2, mode: 'SSB', rstSent: '59', rstRcvd: '57', name: 'Jos\u00e9', grid: 'kg33', comment: 'caf\u00e9, 73', ...o })

describe('ADIF', () => {
  it('band from frequency', () => { expect(L.bandOf(14.2)).toBe('20m'); expect(L.bandOf(145.5)).toBe('2m'); expect(L.bandOf(5.3)).toBe('60m'); expect(L.bandOf(13)).toBe(''); expect(L.bandOf(null)).toBe('') })
  it('writes length-prefixed ASCII fields', () => {
    const a = L.toAdif([q()], 'zs6shz', '0.2.0')
    expect(a).toContain('<CALL:6>ZS6SHZ'); expect(a).toContain('<QSO_DATE:8>20261019'); expect(a).toContain('<TIME_ON:6>140500'); expect(a).toContain('<BAND:3>20m')
    expect(a).toContain('<GRIDSQUARE:4>KG33'); expect(a).toContain('<NAME:4>Jose'); expect(a).toContain('<COMMENT:8>cafe, 73'); expect(a).toContain('<EOH>'); expect(a.trim().endsWith('<EOR>')).toBe(true)
    expect(a).not.toMatch(/[^\x00-\x7f]/)
  })
  it('round-trips and tolerates other programs’ files', () => {
    const recs = L.parseAdif(L.toAdif([q(), q({ call: 'DL1ABC' })], 'zs6shz', '0.2.0'))
    expect(recs).toHaveLength(2); const back = L.fromAdif(recs[1], 'x')!
    expect(back).toMatchObject({ call: 'DL1ABC', date: '2026-10-19', time: '14:05', freqMHz: 14.2, mode: 'SSB', grid: 'KG33' })
    const other = L.parseAdif('hdr <adif_ver:5>3.1.0 <eoh>\n<call:5:s>K1ABC<qso_date:8:d>20200101 <time_on:4>0930 <freq:6>7.0740 <mode:3>FT8<eor>')
    expect(other).toEqual([{ CALL: 'K1ABC', QSO_DATE: '20200101', TIME_ON: '0930', FREQ: '7.0740', MODE: 'FT8' }]); expect(L.fromAdif(other[0], 'y')!.time).toBe('09:30')
    expect(L.fromAdif({ CALL: 'X' }, 'z')).toBeNull(); expect(L.parseAdif('')).toEqual([])
  })
  it('flags duplicates by call, band, mode and day', () => {
    const log = [q({ call: 'DL1ABC' })]
    expect(L.isDuplicate(log, { call: 'dl1abc', date: '2026-10-19', freqMHz: 14.25, mode: 'SSB' })).toBe(true)
    expect(L.isDuplicate(log, { call: 'DL1ABC', date: '2026-10-19', freqMHz: 7.1, mode: 'SSB' })).toBe(false); expect(L.isDuplicate(log, { call: 'DL1ABC', date: '2026-10-20', freqMHz: 14.2, mode: 'SSB' })).toBe(false)
  })
})
describe('Koch trainer', () => {
  it('order and groups', () => {
    expect(T.KOCH_ORDER).toHaveLength(41); expect(new Set(T.KOCH_ORDER).size).toBe(41); expect(T.kochChars(2)).toEqual(['K', 'M']); expect(() => T.kochChars(1)).toThrow(); expect(() => T.kochChars(42)).toThrow()
    let i = 0; const rng = () => [0, 0.99][i++ % 2]
    expect(T.randomGroups(['A', 'B'], 3, 2, rng)).toBe('ABA BAB'); expect(() => T.randomGroups([], 3, 2)).toThrow()
  })
  it('accuracy counts edits, not shifts', () => {
    expect(T.copyAccuracy('ABC DEF', 'abcdef')).toBe(100); expect(T.copyAccuracy('ABCDEF', 'ABDEF')).toBeCloseTo(83.33, 1); expect(T.copyAccuracy('ABCD', '')).toBe(0)
    expect(T.readyForNext(90)).toBe(true); expect(T.readyForNext(89.9)).toBe(false); expect(T.editDistance('KITTEN', 'SITTING')).toBe(3)
  })
})
describe('clock and timers', () => {
  it('formats and parses', () => {
    expect(K.formatHms(3661000)).toBe('01:01:01'); expect(K.formatHms(90061000)).toBe('1d 01:01:01'); expect(K.formatHms(-5)).toBe('00:00:00')
    expect(K.parseUtc('2026-10-19T14:05')).toBe(Date.UTC(2026, 9, 19, 14, 5)); expect(K.parseUtc('nonsense')).toBeNull(); expect(K.parseUtc('2026-13-40T99:00')).toBeNull()
    expect(K.idRemainingMs(1000, 10, 1000 + 9 * 60000)).toBe(60000); expect(K.idRemainingMs(0, 10, 11 * 60000)).toBe(-60000)
  })
  it('shows a zone and rejects a bad one', () => {
    const c = K.clockIn('Africa/Johannesburg', Date.UTC(2026, 9, 19, 12, 0, 0))!
    expect(c.time).toBe('14:00:00'); expect(c.date).toContain('2026-10-19'); expect(K.clockIn('Not/AZone', 0)).toBeNull()
  })
})
