import { expect, it } from 'vitest'
import { radiatedPower, highPassParts, lowPassParts, filterG, filterAttenuationDb } from '../src/lib/station'

it('distinguishes isotropic and dipole references and includes feed-system loss', () => {
  const p = radiatedPower(100, 3, 6, 'dBi')
  expect(p.antennaW).toBeCloseTo(50.118723, 5)
  expect(p.eirpW).toBeCloseTo(199.526231, 5)
  expect(p.erpW).toBeCloseTo(121.618600, 5)
  expect(p.eirpDbm - p.erpDbm).toBeCloseTo(2.15, 12)
  expect(radiatedPower(100, 3, 3.85, 'dBd')).toEqual(p)
  expect(radiatedPower(1, 0, 0, 'dBi').eirpW).toBe(1)
  expect(radiatedPower(100, 0, -3, 'dBi').eirpW).toBeLessThan(100)
  for (const args of [[0, 0, 0], [1, -1, 0], [Infinity, 0, 0], [1, 0, NaN], [1, 4000, 0], [1, 0, 4000]]) {
    expect(() => radiatedPower(args[0], args[1], args[2], 'dBi')).toThrow()
  }
})

it('transforms the Butterworth prototype into high-pass pi and T ladders', () => {
  const g = filterG('butterworth', 3), w = 2 * Math.PI * 1e6
  const pi = highPassParts(g, 1e6, 50, 'pi')
  expect(pi.map(p => [p.kind, p.position])).toEqual([['L', 'shunt'], ['C', 'series'], ['L', 'shunt']])
  expect(pi[0].value).toBeCloseTo(50 / w, 14)
  expect(pi[1].value).toBeCloseTo(1 / (2 * 50 * w), 18)
  const t = highPassParts(g, 1e6, 50, 't')
  expect(t.map(p => [p.kind, p.position])).toEqual([['C', 'series'], ['L', 'shunt'], ['C', 'series']])
  expect(t[0].value).toBeCloseTo(1 / (50 * w), 18)
  expect(t[1].value).toBeCloseTo(50 / (2 * w), 14)
  expect(filterAttenuationDb('butterworth', 3, 1 / 0.5)).toBeCloseTo(18.1291, 4)
  for (const f of [0, -1, Infinity, NaN]) expect(() => highPassParts(g, f, 50, 'pi')).toThrow()
  expect(() => highPassParts([1, 0, 1], 1e6, 50, 't')).toThrow()
})

it('actual LC ladder transmission agrees with the plotted response in both directions', () => {
  // Independent ABCD cascade: A,D are real and B,C imaginary for this lossless ladder.
  for (const kind of ['butterworth', 'chebyshev'] as const) for (const n of [3, 5, 9]) {
    for (const topology of ['pi', 't'] as const) for (const hp of [false, true]) for (const ratio of [0.5, 1, 2]) {
      const parts = (hp ? highPassParts : lowPassParts)(filterG(kind, n, 0.1), 1e6, 50, topology)
      let a = 1, b = 0, c = 0, d = 1
      const omega = 2 * Math.PI * 1e6 * ratio
      for (const p of parts) {
        if (p.position === 'series') {
          const x = p.kind === 'L' ? omega * p.value : -1 / (omega * p.value)
          b += a * x; d -= c * x
        } else {
          const y = p.kind === 'C' ? omega * p.value : -1 / (omega * p.value)
          a -= b * y; c += d * y
        }
      }
      const attenuation = 10 * Math.log10(((a + d) ** 2 + (b / 50 + c * 50) ** 2) / 4)
      expect(attenuation).toBeCloseTo(filterAttenuationDb(kind, n, hp ? 1 / ratio : ratio, 0.1), 2)
    }
  }
})
