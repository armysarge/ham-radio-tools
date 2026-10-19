// Passive-component helpers: colour codes, capacitor and SMD codes, preferred values, combinations. Pure functions, canonical units: ohms, farads (pF for codes), watts.
const need = (ok: boolean, msg: string) => { if (!ok) throw new RangeError(msg) }
const clean = (x: number) => Number(x.toPrecision(12)) // strips binary floating-point dust (4.7 * 1000 etc.)

// ---------- engineering-notation input ("4k7", "2.2k", "R47", "10M", "100n") ----------
const SUFFIX: Record<string, number> = { p: 1e-12, n: 1e-9, u: 1e-6, µ: 1e-6, m: 1e-3, k: 1e3, K: 1e3, M: 1e6, G: 1e9 }
/** Parse a component value. Case matters for m (milli) and M (mega). RKM style ("4k7", "4R7", "R47") is accepted. */
export function parseValue(input: string): number {
  const s = input.trim().replace(/\s+/g, '').replace(/(Ω|ohms?|F|farads?)$/i, '')
  need(s !== '', 'Enter a value, for example 4.7k, 4k7 or 220')
  let m = /^(\d+)([RkKMGmunpµ])(\d+)$/.exec(s)
  if (m) return clean(Number(`${m[1]}.${m[3]}`) * (m[2] === 'R' ? 1 : SUFFIX[m[2]]))
  m = /^R(\d+)$/.exec(s)
  if (m) return clean(Number(`0.${m[1]}`))
  m = /^(\d*\.?\d+)([pnuµmkKMG]?)$/.exec(s)
  need(!!m, `“${input.trim()}” is not a value. Use digits with an optional k, M, m, u, n or p, such as 4.7k or 4k7`)
  return clean(Number(m![1]) * (m![2] ? SUFFIX[m![2]] : 1))
}

/** 0.0047 → "4.7 mΩ", 4700 → "4.7 kΩ". `unit` is Ω or F. */
export function formatValue(v: number, unit = 'Ω'): string {
  if (!Number.isFinite(v)) return '—'
  if (v === 0) return `0 ${unit}`
  const steps: [number, string][] = [[1e9, 'G'], [1e6, 'M'], [1e3, 'k'], [1, ''], [1e-3, 'm'], [1e-6, 'µ'], [1e-9, 'n'], [1e-12, 'p']]
  const a = Math.abs(v), [f, p] = steps.find(([f]) => a >= f * 0.9999999) ?? steps[steps.length - 1]
  return `${Number(clean(v / f).toPrecision(4))} ${p}${unit}`
}

// ---------- resistor colour code (IEC 60062) ----------
export type Colour = 'black' | 'brown' | 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'violet' | 'grey' | 'white' | 'gold' | 'silver'
export const COLOURS: Record<Colour, { hex: string; digit?: number; mult: number; tol?: number; ppm?: number }> = {
  black: { hex: '#141414', digit: 0, mult: 1 }, brown: { hex: '#7a4a1d', digit: 1, mult: 10, tol: 1, ppm: 100 }, red: { hex: '#d32f2f', digit: 2, mult: 100, tol: 2, ppm: 50 },
  orange: { hex: '#f57c00', digit: 3, mult: 1e3, ppm: 15 }, yellow: { hex: '#fbc02d', digit: 4, mult: 1e4, ppm: 25 }, green: { hex: '#2e8b3d', digit: 5, mult: 1e5, tol: 0.5 },
  blue: { hex: '#1769c2', digit: 6, mult: 1e6, tol: 0.25, ppm: 10 }, violet: { hex: '#7b1fa2', digit: 7, mult: 1e7, tol: 0.1, ppm: 5 }, grey: { hex: '#9e9e9e', digit: 8, mult: 1e8, tol: 0.05 },
  white: { hex: '#f5f5f5', digit: 9, mult: 1e9 }, gold: { hex: '#d4af37', mult: 0.1, tol: 5 }, silver: { hex: '#c0c0c0', mult: 0.01, tol: 10 },
}
export const DIGIT_COLOURS: Colour[] = ['black', 'brown', 'red', 'orange', 'yellow', 'green', 'blue', 'violet', 'grey', 'white']
export const MULT_COLOURS: Colour[] = [...DIGIT_COLOURS, 'gold', 'silver']
export const TOL_COLOURS: Colour[] = ['brown', 'red', 'green', 'blue', 'violet', 'grey', 'gold', 'silver']
export const PPM_COLOURS: Colour[] = ['brown', 'red', 'orange', 'yellow', 'blue', 'violet']

export interface ResistorValue { ohms: number; tolerancePct: number; min: number; max: number; ppm?: number }
/** bands: 3 (±20 %), 4, 5 or 6 bands, in reading order. */
export function decodeResistor(bands: Colour[]): ResistorValue {
  need([3, 4, 5, 6].includes(bands.length), 'A resistor has 3, 4, 5 or 6 colour bands')
  const nDigits = bands.length >= 5 ? 3 : 2
  const digits = bands.slice(0, nDigits).map((c) => COLOURS[c].digit)
  need(digits.every((d) => d !== undefined), 'The first bands must be digit colours (black to white)')
  const multBand = bands[nDigits]
  need(!!multBand, 'Missing the multiplier band')
  const tolBand = bands[nDigits + 1]
  const tol = tolBand === undefined ? 20 : COLOURS[tolBand].tol
  need(tol !== undefined, 'The tolerance band must be brown, red, green, blue, violet, grey, gold or silver')
  const ohms = clean(Number(digits.join('')) * COLOURS[multBand].mult)
  const ppmBand = bands[5]
  const ppm = ppmBand ? COLOURS[ppmBand].ppm : undefined
  need(ppmBand === undefined || ppm !== undefined, 'The temperature-coefficient band must be brown, red, orange, yellow, blue or violet')
  return { ohms, tolerancePct: tol!, min: clean(ohms * (1 - tol! / 100)), max: clean(ohms * (1 + tol! / 100)), ppm }
}

export interface ResistorBands { bands: Colour[]; ohms: number; exact: boolean }
/** Colours for a value with 2 or 3 significant digits plus multiplier (and the tolerance band you choose). */
export function encodeResistor(ohms: number, digits: 2 | 3, tolerance: Colour = 'gold'): ResistorBands {
  need(Number.isFinite(ohms) && ohms >= 0, 'Resistance must be 0 or more')
  need(TOL_COLOURS.includes(tolerance), 'Choose a tolerance colour')
  if (ohms === 0) return { bands: ['black'], ohms: 0, exact: true } // a zero-ohm link has a single black band
  let exp = Math.floor(Math.log10(ohms) + 1e-12)
  let d = Math.round(ohms / 10 ** (exp - (digits - 1)))
  if (d >= 10 ** digits) { d = Math.round(d / 10); exp++ }
  const m = exp - (digits - 1)
  need(m >= -2 && m <= 9, `${formatValue(ohms)} is outside what ${digits}-digit colour bands can show (0.01 Ω up to about 99 GΩ)`)
  const mult = (m === -1 ? 'gold' : m === -2 ? 'silver' : DIGIT_COLOURS[m]) as Colour
  const ds = String(d).padStart(digits, '0').split('').map((x) => DIGIT_COLOURS[Number(x)])
  const value = clean(d * 10 ** m)
  return { bands: [...ds, mult, tolerance], ohms: value, exact: Math.abs(value - ohms) <= ohms * 1e-9 }
}

// ---------- capacitor codes ----------
export const CAP_TOLERANCE: Record<string, string> = { B: '±0.1 pF', C: '±0.25 pF', D: '±0.5 pF', F: '±1 %', G: '±2 %', J: '±5 %', K: '±10 %', M: '±20 %', Z: '+80 % / −20 %' }
export const CAP_VOLTAGE: Record<string, number> = { '0G': 4, '0J': 6.3, '1A': 10, '1C': 16, '1E': 25, '1H': 50, '2A': 100, '2D': 200, '2E': 250, '2G': 400, '2J': 630 }
/** EIA capacitor marking → picofarads. "104" = 10 × 10⁴ pF, "4R7" = 4.7 pF, "22" = 22 pF; optional trailing tolerance letter. */
export function decodeCapacitor(code: string): { pF: number; tolerance?: string } {
  const s = code.trim().toUpperCase()
  const m = /^(\d{2,3}|\dR\d{1,2}|R\d{1,2})([BCDFGJKMZ])?$/.exec(s)
  need(!!m, `“${code.trim()}” is not a capacitor code. Examples: 104, 473J, 4R7, 22`)
  const body = m![1], tolerance = m![2] ? CAP_TOLERANCE[m![2]] : undefined
  if (body.includes('R')) return { pF: clean(Number(body.replace('R', '.'))), tolerance }
  if (body.length === 2) return { pF: Number(body), tolerance }
  const mult = Number(body[2])
  const factor = mult === 8 ? 0.01 : mult === 9 ? 0.1 : 10 ** mult
  return { pF: clean(Number(body.slice(0, 2)) * factor), tolerance }
}

// ---------- SMD resistor codes ----------
export const E96 = [100, 102, 105, 107, 110, 113, 115, 118, 121, 124, 127, 130, 133, 137, 140, 143, 147, 150, 154, 158, 162, 165, 169, 174, 178, 182, 187, 191, 196, 200, 205, 210, 215, 221, 226, 232, 237, 243, 249, 255, 261, 267, 274, 280, 287, 294, 301, 309, 316, 324, 332, 340, 348, 357, 365, 374, 383, 392, 402, 412, 422, 432, 442, 453, 464, 475, 487, 499, 511, 523, 536, 549, 562, 576, 590, 604, 619, 634, 649, 665, 681, 698, 715, 732, 750, 768, 787, 806, 825, 845, 866, 887, 909, 931, 953, 976]
export const E24 = [10, 11, 12, 13, 15, 16, 18, 20, 22, 24, 27, 30, 33, 36, 39, 43, 47, 51, 56, 62, 68, 75, 82, 91]
export const E12 = [10, 12, 15, 18, 22, 27, 33, 39, 47, 56, 68, 82]
export const E6 = [10, 15, 22, 33, 47, 68]
const EIA96_MULT: Record<string, number> = { Z: 0.001, Y: 0.01, X: 0.1, S: 0.1, A: 1, B: 10, H: 10, C: 100, D: 1e3, E: 1e4, F: 1e5 } // “R” is not used: nnR means n ohms
/** SMD resistor marking → ohms: 3-digit (472), 4-digit (4701), R-decimal (4R7), jumper (000), or EIA-96 (68X). */
export function decodeSmd(code: string): { ohms: number; scheme: string } {
  const s = code.trim().toUpperCase()
  need(s !== '', 'Enter the code printed on the resistor, for example 472, 4701, 4R7 or 68X')
  let m = /^(\d{2})([A-QS-Z])$/.exec(s)
  if (m) { // EIA-96: two digits pick a value from the E96 table, the letter is the multiplier
    const i = Number(m[1]), f = EIA96_MULT[m[2]]
    need(i >= 1 && i <= 96 && f !== undefined, `“${s}” is not an EIA-96 code (digits 01–96, then one of Z Y X S A B H C D E F)`)
    return { ohms: clean(E96[i - 1] * f), scheme: 'EIA-96 (1 %)' }
  }
  if (/^0+$/.test(s)) return { ohms: 0, scheme: 'zero-ohm link' }
  m = /^(\d{1,3})R$/.exec(s)
  if (m) return { ohms: Number(m[1]), scheme: 'R = ohms' }
  m = /^(\d{0,3})R(\d{1,3})$/.exec(s)
  if (m) return { ohms: clean(Number(`${m[1] || '0'}.${m[2]}`)), scheme: 'R = decimal point' }
  m = /^(\d{2})(\d)$/.exec(s)
  if (m) return { ohms: clean(Number(m[1]) * 10 ** Number(m[2])), scheme: '3 digits: 2 digits × 10ⁿ' }
  m = /^(\d{3})(\d)$/.exec(s)
  if (m) return { ohms: clean(Number(m[1]) * 10 ** Number(m[2])), scheme: '4 digits: 3 digits × 10ⁿ (1 %)' }
  throw new RangeError(`“${code.trim()}” is not a recognised SMD resistor code (try 472, 4701, 4R7, 000 or 68X)`)
}

// ---------- preferred values ----------
export const SERIES = { E6: { values: E6, tolerance: 20 }, E12: { values: E12, tolerance: 10 }, E24: { values: E24, tolerance: 5 }, E96: { values: E96.map((v) => v / 10), tolerance: 1 } } as const
export type SeriesName = keyof typeof SERIES
/** Nearest value in a preferred series (log scale), plus the neighbours either side. */
export function nearestPreferred(value: number, series: SeriesName) {
  need(Number.isFinite(value) && value > 0, 'Value must be greater than 0')
  const base = SERIES[series].values
  const dec = Math.floor(Math.log10(value) + 1e-12)
  const all: number[] = []
  for (let d = dec - 1; d <= dec + 1; d++) for (const b of base) all.push(clean(b * 10 ** (d - 1)))
  all.sort((a, b) => a - b)
  let best = 0
  all.forEach((v, i) => { if (Math.abs(Math.log(v / value)) < Math.abs(Math.log(all[best] / value))) best = i })
  const v = all[best]
  return { value: v, errorPct: ((v - value) / value) * 100, below: all.filter((x) => x < value).at(-1) ?? null, above: all.find((x) => x > value) ?? null, tolerancePct: SERIES[series].tolerance }
}

// ---------- combinations ----------
export const seriesSum = (v: number[]) => { need(v.length > 0 && v.every((x) => x >= 0), 'Enter one or more values of 0 or more'); return clean(v.reduce((a, b) => a + b, 0)) }
export const parallel = (v: number[]) => {
  need(v.length > 0 && v.every((x) => x >= 0), 'Enter one or more values of 0 or more')
  if (v.some((x) => x === 0)) return 0 // a short circuit wins
  return clean(1 / v.reduce((a, b) => a + 1 / b, 0))
}
export function divider(vin: number, r1: number, r2: number) {
  need(r1 >= 0 && r2 >= 0 && r1 + r2 > 0, 'R1 and R2 cannot both be 0')
  const vout = (vin * r2) / (r1 + r2)
  return { vout, current: vin / (r1 + r2), ratio: r2 / (r1 + r2), thevenin: parallel([r1, r2]) }
}
/** Series resistor for an LED: R = (Vs − Vf) / I. Returns the exact value, the next E24 value at or above it, and the power in it. */
export function ledResistor(vs: number, vf: number, amps: number) {
  need(vs > vf, `The supply (${vs} V) must be higher than the LED's forward voltage (${vf} V)`)
  need(amps > 0, 'Current must be greater than 0')
  const r = (vs - vf) / amps
  const e24 = nearestPreferred(r, 'E24')
  const nextUp = e24.value >= r - 1e-9 ? e24.value : (e24.above as number)
  const actual = (vs - vf) / nextUp
  return { r, e24Up: nextUp, actualAmps: actual, watts: actual * actual * nextUp, supplyWatts: actual * vs }
}
