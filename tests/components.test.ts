import { mount, flushPromises } from '@vue/test-utils'
import ComponentCodes from '../src/tools/ComponentCodes.vue'
import { describe, it, expect } from 'vitest'
import { E96, decodeCapacitor, decodeResistor, decodeSmd, divider, encodeResistor, formatValue, ledResistor, nearestPreferred, parallel, parseValue, seriesSum, type Colour } from '../src/lib/components'

const dec = (...c: Colour[]) => decodeResistor(c)

describe('value parsing and formatting', () => {
  it('reads engineering and RKM notation', () => {
    expect(parseValue('4.7k')).toBe(4700); expect(parseValue('4k7')).toBe(4700); expect(parseValue('2M2')).toBe(2.2e6); expect(parseValue('4R7')).toBe(4.7)
    expect(parseValue('R47')).toBe(0.47); expect(parseValue('100n')).toBeCloseTo(1e-7, 20); expect(parseValue('10 kΩ')).toBe(10000); expect(parseValue('5m')).toBe(0.005); expect(parseValue('5M')).toBe(5e6)
    expect(parseValue('470')).toBe(470); expect(parseValue('.5')).toBe(0.5); expect(parseValue('22µ')).toBeCloseTo(22e-6, 15)
  })
  it('rejects nonsense with a specific message', () => {
    for (const bad of ['', 'abc', '4.7.k', '-5', '1e3', 'k7']) expect(() => parseValue(bad), bad).toThrow(/value|Enter/)
  })
  it('formats with the right prefix', () => {
    expect(formatValue(4700)).toBe('4.7 kΩ'); expect(formatValue(0.0047)).toBe('4.7 mΩ'); expect(formatValue(2.2e6)).toBe('2.2 MΩ'); expect(formatValue(47)).toBe('47 Ω')
    expect(formatValue(0)).toBe('0 Ω'); expect(formatValue(1e-7, 'F')).toBe('100 nF'); expect(formatValue(NaN)).toBe('—')
  })
})

describe('resistor colour code', () => {
  it('decodes 3, 4, 5 and 6 band resistors', () => {
    expect(dec('brown', 'black', 'red', 'gold')).toMatchObject({ ohms: 1000, tolerancePct: 5, min: 950, max: 1050 })
    expect(dec('yellow', 'violet', 'orange', 'silver')).toMatchObject({ ohms: 47000, tolerancePct: 10 })
    expect(dec('brown', 'black', 'black', 'red', 'brown')).toMatchObject({ ohms: 10000 + 0, tolerancePct: 1 }) // 100 × 100 = 10 kΩ
    expect(dec('green', 'blue', 'black', 'black', 'brown', 'red').ppm).toBe(50)
    expect(dec('brown', 'black', 'orange')).toMatchObject({ ohms: 10000, tolerancePct: 20 }) // three bands: ±20 %
    expect(dec('brown', 'black', 'silver', 'gold').ohms).toBeCloseTo(0.1, 12)
    expect(dec('orange', 'orange', 'gold', 'gold').ohms).toBeCloseTo(3.3, 12)
    expect(dec('white', 'white', 'white', 'grey').tolerancePct).toBe(0.05)
  })
  it('rejects colours in the wrong position and wrong band counts', () => {
    expect(() => decodeResistor(['gold', 'black', 'red', 'gold'])).toThrow(/digit colours/)
    expect(() => decodeResistor(['brown', 'black', 'red', 'orange'])).toThrow(/tolerance band/)
    expect(() => decodeResistor(['brown', 'black', 'red', 'gold', 'brown', 'green'])).toThrow(/temperature/)
    expect(() => decodeResistor(['brown', 'black'])).toThrow(/3, 4, 5 or 6/)
  })
  it('encodes values and flags the ones that need more digits', () => {
    expect(encodeResistor(4700, 2).bands).toEqual(['yellow', 'violet', 'red', 'gold'])
    expect(encodeResistor(4.7, 2).bands).toEqual(['yellow', 'violet', 'gold', 'gold']) // 47 × 0.1
    expect(encodeResistor(0.22, 2, 'silver').bands).toEqual(['red', 'red', 'silver', 'silver'])
    expect(encodeResistor(100, 3, 'brown').bands).toEqual(['brown', 'black', 'black', 'black', 'brown'])
    expect(encodeResistor(1.5e6, 2).bands.slice(0, 3)).toEqual(['brown', 'green', 'green'])
    expect(encodeResistor(0, 2).bands).toEqual(['black'])
    expect(encodeResistor(4710, 2)).toMatchObject({ ohms: 4700, exact: false }) // 4.71 k needs three digits
    expect(encodeResistor(4710, 3).exact).toBe(true)
    expect(encodeResistor(99.6, 2).bands.slice(0, 3)).toEqual(['brown', 'black', 'brown']) // rounds up across a decade
    expect(() => encodeResistor(1e-4, 2)).toThrow(/outside/); expect(() => encodeResistor(-1, 2)).toThrow()
  })
  it('round-trips every E24 value in every decade', () => {
    for (const base of [10, 11, 12, 13, 15, 16, 18, 20, 22, 24, 27, 30, 33, 36, 39, 43, 47, 51, 56, 62, 68, 75, 82, 91])
      for (let d = -1; d <= 7; d++) {
        const v = Number((base * 10 ** d / 10).toPrecision(12))
        if (v < 0.1) continue
        const e = encodeResistor(v, 2); expect(e.exact, String(v)).toBe(true)
        expect(decodeResistor(e.bands).ohms, String(v)).toBeCloseTo(v, 9)
      }
  })
})

describe('capacitor and SMD codes', () => {
  it('decodes EIA capacitor codes', () => {
    expect(decodeCapacitor('104')).toEqual({ pF: 100000, tolerance: undefined }); expect(decodeCapacitor('473J')).toEqual({ pF: 47000, tolerance: '±5 %' })
    expect(decodeCapacitor('4R7').pF).toBe(4.7); expect(decodeCapacitor('22').pF).toBe(22); expect(decodeCapacitor('101K').pF).toBe(100); expect(decodeCapacitor('109').pF).toBe(1)
    expect(decodeCapacitor('229').pF).toBeCloseTo(2.2, 12); expect(decodeCapacitor('105M').tolerance).toBe('±20 %'); expect(decodeCapacitor('104z').tolerance).toBe('+80 % / −20 %')
    expect(() => decodeCapacitor('1')).toThrow(/capacitor code/); expect(() => decodeCapacitor('10X4')).toThrow()
  })
  it('decodes SMD resistor codes', () => {
    expect(decodeSmd('472').ohms).toBe(4700); expect(decodeSmd('4701').ohms).toBe(4700); expect(decodeSmd('4R7').ohms).toBe(4.7); expect(decodeSmd('R47').ohms).toBe(0.47)
    expect(decodeSmd('000').ohms).toBe(0); expect(decodeSmd('47R').ohms).toBe(47); expect(decodeSmd('100').ohms).toBe(10); expect(decodeSmd('102').ohms).toBe(1000)
    expect(decodeSmd('01A').ohms).toBe(100); expect(decodeSmd('68X').ohms).toBeCloseTo(49.9, 9); expect(decodeSmd('96C').ohms).toBe(97600); expect(decodeSmd('01Z').ohms).toBeCloseTo(0.1, 12)
    expect(() => decodeSmd('97A')).toThrow(/EIA-96/); expect(() => decodeSmd('')).toThrow(); expect(() => decodeSmd('4-7')).toThrow(/not a recognised/)
  })
  it('E96 table is the standard one', () => {
    expect(E96).toHaveLength(96); expect(new Set(E96).size).toBe(96); expect([...E96].sort((a, b) => a - b)).toEqual(E96)
    expect(E96[0]).toBe(100); expect(E96[95]).toBe(976); expect(E96[67]).toBe(499) // 68X = 49.9
  })
})

describe('preferred values and circuits', () => {
  it('finds the nearest value in each series', () => {
    expect(nearestPreferred(4800, 'E24')).toMatchObject({ value: 4700, below: 4700, above: 5100 })
    expect(nearestPreferred(4800, 'E12').value).toBe(4700); expect(nearestPreferred(5000, 'E96').value).toBe(4990); expect(nearestPreferred(0.33, 'E6').value).toBeCloseTo(0.33, 12)
    expect(nearestPreferred(9.9, 'E12').value).toBe(10); expect(nearestPreferred(95000, 'E24').value).toBe(91000); expect(nearestPreferred(97000, 'E24').value).toBe(100000)
    expect(nearestPreferred(4700, 'E24').errorPct).toBeCloseTo(0, 9); expect(() => nearestPreferred(0, 'E24')).toThrow()
  })
  it('series, parallel and divider', () => {
    expect(seriesSum([100, 220, 330])).toBe(650); expect(parallel([100, 100])).toBe(50); expect(parallel([1000, 2000, 3000])).toBeCloseTo(545.4545, 3)
    expect(parallel([100, 0])).toBe(0); expect(() => parallel([])).toThrow(); expect(() => seriesSum([-1])).toThrow()
    const d = divider(5, 10000, 10000); expect(d.vout).toBe(2.5); expect(d.thevenin).toBe(5000); expect(divider(12, 1000, 3000).vout).toBe(9); expect(() => divider(5, 0, 0)).toThrow()
  })
  it('LED series resistor', () => {
    const r = ledResistor(5, 2, 0.02); expect(r.r).toBeCloseTo(150, 9); expect(r.e24Up).toBe(150); expect(r.watts).toBeCloseTo(0.06, 9)
    const s = ledResistor(5, 3.2, 0.02); expect(s.r).toBeCloseTo(90, 9); expect(s.e24Up).toBe(91); expect(s.actualAmps).toBeLessThan(0.02) // next value UP, so the current stays at or below the target
    expect(() => ledResistor(3, 3.2, 0.01)).toThrow(/higher than/); expect(() => ledResistor(5, 2, 0)).toThrow()
  })
})

describe('components page', () => {
  const global = { stubs: { RouterLink: true } }
  it('reads the default resistor and finds bands for a value', async () => {
    const w = mount(ComponentCodes, { global })
    expect(w.text()).toContain('1 kΩ'); expect(w.text()).toContain('±5 %')
    await w.findAll('button').find((b) => b.text() === 'Value → colours')!.trigger('click'); await flushPromises()
    expect(w.text()).toContain('Yellow'); expect(w.text()).toContain('Violet')
    await w.find('input[type=text]').setValue('4x7'); await flushPromises()
    expect(w.text()).toContain('is not a value')
  })
  it('decodes capacitor and SMD codes and shows errors', async () => {
    const w = mount(ComponentCodes, { global })
    await w.findAll('[role=tab]').find((b) => b.text().startsWith('Capacitor'))!.trigger('click'); await flushPromises()
    expect(w.text()).toContain('100 nF'); expect(w.text()).toContain('±10 %'); expect(w.text()).toContain('4.7 kΩ')
    await w.findAll('input[type=text]')[1].setValue('9Q'); await flushPromises()
    expect(w.text()).toContain('not a recognised SMD resistor code')
  })
})
