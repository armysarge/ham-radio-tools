import { describe, it, expect } from 'vitest'
import * as rf from '../src/lib/rf'
import * as mh from '../src/lib/maidenhead'
import * as geo from '../src/lib/geo'
import { dipoleLength, trimPerLeg, invertedV, vertical, loop } from '../src/lib/antenna'
import { fmt, feetInches } from '../src/lib/units'

describe('rf', () => {
  it('wavelength / period', () => {
    expect(rf.wavelength(14.2e6)).toBeCloseTo(21.1121, 3)
    expect(rf.wavelength(100e6, 0.66)).toBeCloseTo(1.9787, 3)
    expect(rf.period(1e6)).toBeCloseTo(1e-6, 12)
    expect(rf.frequencyFromWavelength(rf.wavelength(7.1e6))).toBeCloseTo(7.1e6, 3)
    expect(() => rf.wavelength(0)).toThrow(/greater than 0/)
    expect(() => rf.wavelength(-5)).toThrow()
    expect(() => rf.wavelength(NaN)).toThrow()
  })
  it('dBm / watts', () => {
    expect(rf.wattsToDbm(1e-3)).toBeCloseTo(0, 12)
    expect(rf.wattsToDbm(1)).toBeCloseTo(30, 12)
    expect(rf.wattsToDbm(50)).toBeCloseTo(46.9897, 4)
    expect(rf.dbmToWatts(-30)).toBeCloseTo(1e-6, 15)
    expect(rf.vrmsFromWatts(100, 50)).toBeCloseTo(70.7107, 4)
    expect(() => rf.wattsToDbm(0)).toThrow()
  })
  it('dB ratios', () => {
    expect(rf.powerRatioToDb(2)).toBeCloseTo(3.0103, 4)
    expect(rf.voltageRatioToDb(2)).toBeCloseTo(6.0206, 4)
    expect(rf.dbToPowerRatio(10)).toBeCloseTo(10, 12)
  })
  it('ohm', () => {
    expect(rf.ohm('v', 12, 'r', 6)).toEqual({ v: 12, r: 6, i: 2, p: 24 })
    const a = rf.ohm('v', 120, 'p', 60)
    expect(a.i).toBeCloseTo(0.5); expect(a.r).toBeCloseTo(240)
    const b = rf.ohm('p', 100, 'r', 4)
    expect(b.v).toBeCloseTo(20); expect(b.i).toBeCloseTo(5)
    expect(() => rf.ohm('v', 5, 'v', 5)).toThrow()
    expect(() => rf.ohm('v', 5, 'r', 0)).toThrow()
    expect(() => rf.ohm('v', -1, 'r', 5)).toThrow()
  })
  it('swr family', () => {
    const m = rf.fromSwr(2)
    expect(m.gamma).toBeCloseTo(1 / 3, 12)
    expect(m.returnLossDb).toBeCloseTo(9.5424, 4)
    expect(m.mismatchLossDb).toBeCloseTo(0.5115, 4)
    expect(m.reflectedPct).toBeCloseTo(11.111, 3)
    expect(rf.fromSwr(1).returnLossDb).toBe(Infinity)
    expect(rf.fromSwr(1).mismatchLossDb).toBeCloseTo(0, 12)
    expect(rf.fromReturnLoss(20).swr).toBeCloseTo(1.2222, 4)
    expect(rf.fromLoad(100, 50).swr).toBeCloseTo(2, 12)
    expect(rf.fromLoad(25, 50).swr).toBeCloseTo(2, 12)
    expect(rf.fromLoad(0, 50).swr).toBe(Infinity)
    expect(() => rf.fromSwr(0.9)).toThrow(/1 or greater/)
    expect(() => rf.fromGamma(1.1)).toThrow()
  })
  it('reactance / feedline', () => {
    expect(rf.resonantFreq(1e-6, 1e-9)).toBeCloseTo(5.0329e6, -2)
    expect(rf.capacitiveReactance(1e6, 159.155e-12)).toBeCloseTo(1000, 1)
    expect(rf.physicalLengthForDegrees(14e6, 0.66, 90)).toBeCloseTo(3.5333, 3)
    expect(() => rf.physicalLengthForDegrees(14e6, 1.2, 90)).toThrow()
  })
})

describe('maidenhead', () => {
  it('known locators', () => {
    expect(mh.encode(48.14666, 11.60833, 6)).toBe('JN58td')
    expect(mh.encode(41.714775, -72.727260, 6)).toBe('FN31pr')
    expect(mh.encode(48.14666, 11.60833, 4)).toBe('JN58')
    expect(mh.encode(48.14666, 11.60833, 8)).toBe('JN58td25')
    expect(mh.encode(0, 0, 6)).toBe('JJ00aa')
  })
  it('boundaries and edges', () => {
    expect(mh.encode(-90, -180, 8)).toBe('AA00aa00')
    expect(mh.encode(90, 180, 6)).toBe(mh.encode(90, -180, 6)) // 180 wraps to -180
    expect(mh.encode(90, 0, 4)).toBe('JR09')
    expect(mh.encode(0, 180, 4)).toBe(mh.encode(0, -180, 4))
    expect(mh.encode(10, 2, 4)).toBe('JK10') // lat/lon exactly on a boundary belongs to the north-east cell
    expect(mh.encode(0, 5 / 60, 6).slice(4, 5)).toBe('b') // floating-point boundary: 5 arc-minutes
    expect(mh.encode(0, 540, 4)).toBe(mh.encode(0, 180, 4)) // longitude wraps
    expect(() => mh.encode(91, 0)).toThrow(/Latitude/)
    expect(() => mh.encode(NaN, 0)).toThrow()
  })
  it('decode precision and validation', () => {
    const c = mh.decode('jn58TD')
    expect(c.locator).toBe('JN58td')
    expect(c.west).toBeCloseTo(11.58333, 4); expect(c.east).toBeCloseTo(11.66667, 4)
    expect(c.south).toBeCloseTo(48.125, 4); expect(c.north).toBeCloseTo(48.16667, 4)
    expect(mh.decode('JN58').east - mh.decode('JN58').west).toBeCloseTo(2, 12)
    expect(mh.decode('JN58td52').north - mh.decode('JN58td52').south).toBeCloseTo(0.25 / 60, 12)
    for (const bad of ['', 'J', 'JN5', 'SN58', 'JN58ty', 'JN58td5', 'JN58td5x', '1234'])
      expect(() => mh.decode(bad), bad).toThrow()
  })
  it('round trips', () => {
    for (const len of [4, 6, 8] as const)
      for (let i = 0; i < 2000; i++) {
        const lat = Math.random() * 180 - 90, lon = Math.random() * 360 - 180
        const loc = mh.encode(lat, lon, len)
        const cell = mh.decode(loc)
        expect(mh.encode(cell.centerLat, cell.centerLon, len)).toBe(loc)
        expect(lat).toBeGreaterThanOrEqual(cell.south - 1e-9); expect(lat).toBeLessThanOrEqual(cell.north + 1e-9)
        expect(lon).toBeGreaterThanOrEqual(cell.west - 1e-9); expect(lon).toBeLessThanOrEqual(cell.east + 1e-9)
      }
  })
})

describe('geo', () => {
  it('known paths', () => {
    const p = geo.path(51.5074, -0.1278, 40.7128, -74.006)
    expect(p.shortKm).toBeGreaterThan(5550); expect(p.shortKm).toBeLessThan(5590)
    expect(p.shortBearing!).toBeGreaterThan(287); expect(p.shortBearing!).toBeLessThan(289.5)
    expect(p.longBearing!).toBeCloseTo((p.shortBearing! + 180) % 360, 9)
    expect(p.shortKm + p.longKm).toBeCloseTo(2 * Math.PI * 6371.0088, 6)
    const q = geo.path(0, 0, 0, 90)
    expect(q.shortKm).toBeCloseTo(10007.54, 1); expect(q.shortBearing).toBeCloseTo(90, 9); expect(q.longBearing).toBeCloseTo(270, 9)
  })
  it('edge cases', () => {
    expect(geo.path(10, 20, 10, 20).shortBearing).toBeNull()
    expect(geo.path(10, 20, -10, -160).shortBearing).toBeNull() // antipodes: every direction is equally short
    expect(geo.path(90, 33, 0, 0).shortBearing).toBe(180)
    expect(geo.path(-90, 33, 0, 0).shortBearing).toBe(0)
    // across the antimeridian: 179E -> 179W is 2 degrees of longitude, heading east
    const p = geo.path(0, 179, 0, -179)
    expect(p.shortKm).toBeCloseTo(222.39, 1); expect(p.shortBearing).toBeCloseTo(90, 9)
  })
  it('great circle endpoints', () => {
    const g = geo.greatCircle(10, 20, 50, 100)
    expect(g[0][0]).toBeCloseTo(10, 6); expect(g[g.length - 1][1]).toBeCloseTo(100, 6)
  })
})

describe('antenna & formatting', () => {
  it('dipole', () => {
    expect(dipoleLength(14.2e6, 0.95)).toBeCloseTo(10.0283, 3)
    expect(dipoleLength(7.1e6, 0.9517) / 0.3048).toBeCloseTo(468 / 7.1, 1)
    expect(() => dipoleLength(0)).toThrow()
    expect(() => dipoleLength(7e6, 0.5)).toThrow()
  })
  it('trim', () => {
    expect(trimPerLeg(20, 7.1e6, 7.0e6)).toBeCloseTo(0.1408, 3) // resonates low -> cut
    expect(trimPerLeg(20, 7.1e6, 7.2e6)).toBeLessThan(0) // resonates high -> add
  })
  it('inverted-V geometry', () => {
    const v = invertedV(7.1e6, 0.95, 0.97, 120, 12)
    expect(v.total).toBeCloseTo(dipoleLength(7.1e6, 0.95) * 0.97, 9)
    expect(v.span).toBeCloseTo(2 * v.leg * Math.sin(Math.PI / 3), 9)
    expect(v.drop).toBeCloseTo(v.leg / 2, 9) // cos 60 deg
    expect(v.endHeight).toBeCloseTo(12 - v.leg / 2, 9)
    expect(invertedV(7.1e6, 0.95, 1, 180, 10).span).toBeCloseTo(dipoleLength(7.1e6, 0.95), 9) // 180 deg = flat dipole
    expect(invertedV(7.1e6, 0.95, 1, 180, 10).drop).toBeCloseTo(0, 9)
    expect(invertedV(7.1e6, 0.95, 0.97, 90, 5).endHeight).toBeLessThan(0) // ends would be underground: caller must warn
    expect(() => invertedV(7.1e6, 0.95, 0.97, 30)).toThrow(/Included angle/)
    expect(() => invertedV(7.1e6, 0.95, 0.97, 120, 0)).toThrow(/Apex height/)
    expect(() => invertedV(0)).toThrow()
  })
  it('vertical', () => {
    expect(vertical(7.1e6).radiator).toBeCloseTo(10.0283 / 1, 3)
    expect(vertical(7.1e6, 0.9517).radiator / 0.3048).toBeCloseTo(234 / 7.1, 1) // 234/f ft rule
    const v = vertical(14.2e6, 0.95, 45)
    expect(v.radialReach).toBeCloseTo(v.radial * Math.SQRT1_2, 9); expect(v.radialDrop).toBeCloseTo(v.radial * Math.SQRT1_2, 9)
    expect(() => vertical(14.2e6, 0.95, 80)).toThrow()
  })
  it('loop', () => {
    expect(loop(14.2e6).perimeter / 0.3048).toBeCloseTo(1005 / 14.2, 1) // 1005/f ft rule
    expect(loop(14.2e6, 1.0218, 'square').side * 4).toBeCloseTo(loop(14.2e6).perimeter, 9)
    expect(loop(14.2e6, 1.0218, 'circle').diameter * Math.PI).toBeCloseTo(loop(14.2e6).perimeter, 9)
    expect(loop(14.2e6, 1.0218, 'triangle').height).toBeCloseTo(loop(14.2e6).perimeter / 3 * Math.sqrt(3) / 2, 9)
    expect(() => loop(14.2e6, 0.9)).toThrow()
  })
  it('fmt', () => {
    expect(fmt(21.11212)).toBe('21.11'); expect(fmt(Infinity)).toBe('∞'); expect(fmt(null)).toBe('—'); expect(fmt(0)).toBe('0')
    expect(feetInches(0.3048 * 16 + 0.0254 * 7.4)).toBe('16 ft 7.4 in')
    expect(feetInches(0.3048 * 16 + 0.0254 * 11.97)).toBe('17 ft 0.0 in')
  })
})
