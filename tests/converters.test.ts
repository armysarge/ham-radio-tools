import { describe, expect, it } from 'vitest'
import { parseCoordinate, formatCoordinate } from '../src/lib/coordinates'
import { convertUnit, QUANTITIES } from '../src/lib/conversions'

describe('coordinate formats', () => {
  it('reads decimal, decimal minutes and DMS with explicit hemispheres', () => {
    expect(parseCoordinate('-25.75', 'lat')).toBe(-25.75)
    expect(parseCoordinate('25° 45′ S', 'lat')).toBe(-25.75)
    expect(parseCoordinate('S 25 45 00', 'lat')).toBe(-25.75)
    expect(parseCoordinate('028:15:30 E', 'lon')).toBeCloseTo(28.258333333333, 10)
    expect(parseCoordinate('40°30′00″N', 'lat')).toBe(40.5)
    expect(Object.is(parseCoordinate('0 S', 'lat'), -0)).toBe(true)
  })
  it('rejects ambiguous signs, wrong axes, malformed numbers and bounds', () => {
    for (const text of ['', '40 north', '1e3', '-25 N', '+25 S', 'N25S', '25 E', '90 0 1 N', '25 60 N', '25 1 60 N', '25.5 10 N', '25 1.5 3 N', 'NaN', 'Infinity', '40::30', '40′ 30°', '40°°30', '40″', '90 0.000000000001 N']) {
      expect(() => parseCoordinate(text, 'lat'), text).toThrow()
    }
    expect(() => parseCoordinate('180 0 0.01 E', 'lon')).toThrow()
    expect(() => parseCoordinate('181', 'lon')).toThrow()
    expect(parseCoordinate('90 N', 'lat')).toBe(90)
    expect(parseCoordinate('180 W', 'lon')).toBe(-180)
  })
  it('rounds through minute/degree boundaries and keeps hemispheres', () => {
    expect(formatCoordinate(12 + 59 / 60 + 59.9999 / 3600, 'lat', 'dms')).toBe('13° 00′ 00.00″ N')
    expect(formatCoordinate(-0, 'lat', 'dms')).toBe('0° 00′ 00.00″ S')
    expect(formatCoordinate(-73.5, 'lon', 'ddm')).toBe('73° 30.0000′ W')
    for (const axis of ['lat', 'lon'] as const) for (const n of [-89.99999, -25.75, 0, 40.5, 89.99999]) {
      expect(parseCoordinate(formatCoordinate(n, axis, 'dms'), axis)).toBeCloseTo(n, 5)
    }
  })
})

describe('station unit conversions', () => {
  it('uses exact international length, area and time definitions', () => {
    expect(convertUnit(1, 'length', 'ft', 'm')).toBe(.3048)
    expect(convertUnit(1, 'length', 'in', 'mm')).toBe(25.4)
    expect(convertUnit(1, 'length', 'nmi', 'm')).toBe(1852)
    expect(convertUnit(1, 'length', 'mi', 'm')).toBe(1609.344)
    expect(convertUnit(1, 'area', 'acre', 'm2')).toBeCloseTo(4046.8564224, 8)
    expect(convertUnit(1, 'time', 'h', 's')).toBe(3600)
    expect(convertUnit(1, 'energy', 'Wh', 'J')).toBe(3600)
  })
  it('handles temperature offsets and absolute zero', () => {
    expect(convertUnit(32, 'temperature', 'F', 'C')).toBeCloseTo(0, 10)
    expect(convertUnit(-40, 'temperature', 'C', 'F')).toBeCloseTo(-40, 10)
    expect(convertUnit(100, 'temperature', 'C', 'F')).toBeCloseTo(212, 10)
    expect(convertUnit(-459.67, 'temperature', 'F', 'K')).toBeCloseTo(0, 10)
    expect(() => convertUnit(-.01, 'temperature', 'K', 'C')).toThrow(/absolute zero/)
  })
  it('round-trips every supported unit and refuses incompatible or non-finite values', () => {
    for (const quantity of QUANTITIES) for (const unit of quantity.units) {
      const v = quantity.id === 'temperature' ? 300 : 2.5
      const converted = convertUnit(v, quantity.id, quantity.units[0].id, unit.id)
      expect(convertUnit(converted, quantity.id, unit.id, quantity.units[0].id)).toBeCloseTo(v, 9)
    }
    expect(convertUnit(1000, 'capacitance', 'pF', 'nF')).toBeCloseTo(1, 12)
    expect(() => convertUnit(1, 'length', 'm', 'W')).toThrow(/unit/)
    for (const n of [NaN, Infinity, -Infinity]) expect(() => convertUnit(n, 'length', 'm', 'ft')).toThrow()
    expect(() => convertUnit(Number.MAX_VALUE, 'length', 'mi', 'mm')).toThrow(/range/)
    expect(() => convertUnit(Number.MIN_VALUE, 'length', 'm', 'mi')).toThrow(/range/)
  })
})
