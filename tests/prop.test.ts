import { describe, it, expect } from 'vitest'
import * as P from '../src/lib/propagation'
import * as S from '../src/lib/sat'

const L1 = '1 25544U 98067A   08264.51782528 -.00002182  00000-0 -11606-4 0  2927'
const L2 = '2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.72125391563537'
const SAMPLE = `ISS (ZARYA)\n${L1}\n${L2}\n`
const minutes = (d: Date) => d.getUTCHours() * 60 + d.getUTCMinutes()

describe('sun and grey line', () => {
  it('London sunrise and sunset at the June solstice (about 03:43 and 20:21 UTC)', () => {
    const r = P.sunriseSunset(51.5, -0.12, new Date(Date.UTC(2026, 5, 21, 8))) as { rise: Date; set: Date }
    expect(Math.abs(minutes(r.rise) - (3 * 60 + 43))).toBeLessThanOrEqual(3); expect(Math.abs(minutes(r.set) - (20 * 60 + 21))).toBeLessThanOrEqual(3)
  })
  it('equator at the March equinox rises near 06:00 UTC on the prime meridian', () => {
    const r = P.sunriseSunset(0, 0, new Date(Date.UTC(2026, 2, 20, 12))) as { rise: Date }; expect(minutes(r.rise)).toBeGreaterThan(5 * 60 + 55); expect(minutes(r.rise)).toBeLessThan(6 * 60 + 15)
  })
  it('polar day and night', () => {
    expect(P.sunriseSunset(80, 0, new Date(Date.UTC(2026, 5, 21)))).toEqual({ none: 'polar day' }); expect(P.sunriseSunset(80, 0, new Date(Date.UTC(2026, 11, 21)))).toEqual({ none: 'polar night' })
  })
  it('declination swings ±23.4° and the sun is overhead at the sub-solar point', () => {
    expect(P.sunAt(new Date(Date.UTC(2026, 5, 21, 12))).declinationDeg).toBeCloseTo(23.43, 0); expect(P.sunAt(new Date(Date.UTC(2026, 11, 21, 12))).declinationDeg).toBeCloseTo(-23.43, 0)
    const d = new Date(Date.UTC(2026, 9, 19, 9, 30)), s = P.sunAt(d); expect(P.sunElevation(s.subLat, s.subLon, d)).toBeCloseTo(90, 0)
  })
  it('terminator points are at sunrise/sunset elevation', () => {
    const d = new Date(Date.UTC(2026, 9, 19, 9, 30)); P.terminator(d, 36).forEach(([lat, lon]) => expect(Math.abs(P.sunElevation(lat, lon, d))).toBeLessThan(0.5))
  })
  it('day parts', () => { expect(P.dayPart(30)).toBe('day'); expect(P.dayPart(-3)).toBe('grey line'); expect(P.dayPart(-20)).toBe('night') })
})
describe('MUF', () => {
  it('secant law on a spherical Earth', () => {
    const m = P.mufMHz(7, 1000, 300); expect(m.secant).toBeCloseTo(1.855, 2); expect(m.muf).toBeCloseTo(12.99, 1); expect(P.mufMHz(7, 100, 300).muf).toBeLessThan(7.3)
    expect(P.mufMHz(7, 3000).muf).toBeGreaterThan(m.muf); expect(P.maxHopKm(300)).toBeGreaterThan(3700); expect(P.maxHopKm(300)).toBeLessThan(3950)
    expect(() => P.mufMHz(0, 1000)).toThrow(); expect(() => P.mufMHz(7, 30000)).toThrow()
  })
})
describe('satellite passes', () => {
  it('parses and validates a TLE', () => {
    const t = S.parseTle(SAMPLE); expect(t.name).toBe('ISS (ZARYA)'); expect(S.periodMin(t)).toBeCloseTo(91.6, 1)
    expect(S.tleEpoch(t).toISOString().slice(0, 10)).toBe('2008-09-20')
    expect(() => S.parseTle('nonsense')).toThrow(/two lines/); expect(() => S.parseTle(L1 + '\n' + L2.replace('51.6416', '51.6417'))).toThrow(/checksum/); expect(() => S.parseTle(L1 + '\n' + L2.slice(0, 60))).toThrow(/69/)
    expect(S.parseTle(`${L1}\n${L2}`).name).toBe('Satellite')
  })
  it('finds consistent passes over 24 h from the epoch', () => {
    const t = S.parseTle(SAMPLE), o = { latDeg: 40, lonDeg: -95, altKm: 0.37 }, from = new Date(Date.UTC(2008, 8, 20, 12, 25, 40))
    const ps = S.passes(t, o, from, 24, 10)
    expect(ps.length).toBeGreaterThanOrEqual(3); expect(ps.length).toBeLessThanOrEqual(8)
    ps.forEach((p) => {
      expect(p.los.getTime()).toBeGreaterThan(p.aos.getTime()); expect((p.los.getTime() - p.aos.getTime()) / 60000).toBeLessThan(20); expect(p.maxElDeg).toBeGreaterThanOrEqual(10)
      expect(S.look(t, o, p.aos)!.elDeg).toBeCloseTo(10, 0); expect(S.look(t, o, p.los)!.elDeg).toBeCloseTo(10, 0)
      expect(p.tca.getTime()).toBeGreaterThanOrEqual(p.aos.getTime()); expect(p.tca.getTime()).toBeLessThanOrEqual(p.los.getTime())
    })
    for (let i = 1; i < ps.length; i++) expect(ps[i].aos.getTime()).toBeGreaterThan(ps[i - 1].los.getTime())
    expect(() => S.passes(t, o, from, 0)).toThrow()
  })
})
