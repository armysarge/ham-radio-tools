import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { predictCircuit } from '../src/lib/voacap'

const input = JSON.parse(readFileSync('tests/fixtures/dvoacap/input.json', 'utf8'))
const ref = JSON.parse(readFileSync('tests/fixtures/dvoacap/output.json', 'utf8')).predictions as Record<string, number | string>[]

// Tolerances are half a unit of the reference's printed precision (plus a few %), i.e. the engine agrees to the digit shown, except for exact rounding ties.
describe('DVOACAP port against the original engine (Tangier to Belgrade, June, SSN 100)', () => {
  it('reproduces the reference predictions', () => {
    const a = input.Arguments, p = input.Params
    const hours = Array.from({ length: a.Hours.Count }, (_, i) => a.Hours.Start + i * a.Hours.Step)
    const res = predictCircuit({
      tx: { lat: p.TxLoc.Lat, lon: p.TxLoc.Lon }, rx: { lat: a.RxLocations[0].Lat, lon: a.RxLocations[0].Lon }, month: p.Month, ssn: p.Ssn, txPowerW: p.TxPower,
      requiredSnrDb: p.RequiredSnr, requiredReliability: p.RequiredReliability, manMadeNoiseAt3MHz: p.ManMadeNoiseAt3MHz, minAngleDeg: p.MinAngle,
      multipathPowerTolerance: p.MultipathPowerTolerance, maxTolerableDelayMs: p.MaxTolerableDelay, hours, freqsMHz: a.Freqs, includeMuf: true,
    })
    const rows = res.flatMap((h) => h.results.map((r) => ({ h, r })))
    expect(rows).toHaveLength(ref.length)
    const miss: string[] = []
    const num = (name: string, got: number, want: number, tol: number, who: string) => { if (!(Math.abs(got - want) <= tol)) miss.push(`${who} ${name}: got ${got.toFixed(3)} want ${want}`) }
    rows.forEach(({ h, r }, i) => {
      const w = ref[i], who = `h${h.hour} ${r.freqMHz.toFixed(2)}`
      if (r.mode !== w.MODE) miss.push(`${who} MODE got ${r.mode} want ${w.MODE}`)
      num('TANGLE', r.takeOffDeg, w.TANGLE as number, 0.052, who); num('DELAY', r.delayMs, w.DELAY as number, 0.052, who); num('V_HITE', r.virtHeightKm, w.V_HITE as number, 0.52, who)
      num('MUFDAY', r.mufDay, w.MUFDAY as number, 0.0052, who); num('LOSS', r.lossDb, w.LOSS as number, 0.52, who); num('DBU', r.fieldDbuV, w.DBU as number, 0.52, who)
      num('S_DBW', r.signalDbw, w.S_DBW as number, 0.52, who); num('N_DBW', r.noiseDbw, w.N_DBW as number, 0.52, who); num('SNR', r.snrDb, w.SNR as number, 0.52, who)
      num('REL', r.reliability, w.REL as number, 0.0052, who); num('SPRB', r.serviceProb, w.SPRB as number, 0.0052, who); num('MPROB', r.multipathProb, w.MPROB as number, 0.0052, who)
      num('SIG_LW', r.signalLowerDb, w.SIG_LW as number, 0.052, who); num('SIG_UP', r.signalUpperDb, w.SIG_UP as number, 0.052, who)
      num('SNR_LW', r.snrLowerDb, w.SNR_LW as number, 0.052, who); num('SNR_UP', r.snrUpperDb, w.SNR_UP as number, 0.052, who); num('SNRXX', r.snrXX, w.SNRXX as number, 0.52, who)
    })

    expect(miss.length).toBe(0)
  })
})

// DVOACAP's second sample (native VOACAP text format, 24.73N 46.79E to 12.60N 100.88E, 5 818 km, five control points). The input file is not
// published with it; the parameters below (November, SSN 59, 398.1 W = 26 dBW, 73 dB, 145 noise) were recovered by matching its 24 MUF values and
// every other row then agrees with the engine to the printed digit.
describe('DVOACAP port against the original native-format sample (Riyadh to Bangkok)', () => {
  const rows = readFileSync('tests/fixtures/dvoacap/riyadh-bangkok.txt', 'utf8').split(/\r?\n/)
  type Block = Record<string, string[]>
  const blocks: Block[] = []
  let cur: Block | null = null
  for (const l of rows) {
    const m = /^(.*?)\s+(FREQ|MODE|TANGLE|DELAY|V HITE|MUFday|LOSS|DBU|S DBW|N DBW|SNR|RPWRG|REL|MPROB|S PRB|SIG LW|SIG UP|SNR LW|SNR UP|SNRxx)\s*$/.exec(l)
    if (!m) continue
    if (m[2] === 'FREQ') { cur = {}; blocks.push(cur) }
    cur![m[2]] = m[1].trim().split(/\s+/)
  }
  it('has 24 hourly blocks', () => expect(blocks).toHaveLength(24))
  it('reproduces mode, MUF, loss, SNR, reliability and the decile spreads', () => {
    const hours = blocks.map((b) => Number(b.FREQ[0])), freqs = [2, 3, 4, 5, 6, 7, 8, 9, 10]
    const res = predictCircuit({ tx: { lat: 24.73, lon: 46.79 }, rx: { lat: 12.6, lon: 100.88 }, month: 11, ssn: 59, txPowerW: 398.1, requiredSnrDb: 73, manMadeNoiseAt3MHz: 145, minAngleDeg: 0.1, hours, freqsMHz: freqs })
    const fields: [string, (r: (typeof res)[0]['results'][0]) => number, number][] = [['TANGLE', (r) => r.takeOffDeg, 0.06], ['DELAY', (r) => r.delayMs, 0.06], ['V HITE', (r) => r.virtHeightKm, 0.6], ['MUFday', (r) => r.mufDay, 0.006],
      ['LOSS', (r) => r.lossDb, 0.6], ['DBU', (r) => r.fieldDbuV, 0.6], ['S DBW', (r) => r.signalDbw, 0.6], ['N DBW', (r) => r.noiseDbw, 0.6], ['SNR', (r) => r.snrDb, 0.6], ['RPWRG', (r) => r.requiredPowerGainDb, 0.6],
      ['REL', (r) => r.reliability, 0.006], ['MPROB', (r) => r.multipathProb, 0.006], ['S PRB', (r) => r.serviceProb, 0.006], ['SIG LW', (r) => r.signalLowerDb, 0.06], ['SIG UP', (r) => r.signalUpperDb, 0.06],
      ['SNR LW', (r) => r.snrLowerDb, 0.06], ['SNR UP', (r) => r.snrUpperDb, 0.06], ['SNRxx', (r) => r.snrXX, 0.6]]
    const miss: string[] = []
    blocks.forEach((b, hi) => {
      if (Math.abs(res[hi].mufMHz - Number(b.FREQ[1])) > 0.06) miss.push(`h${hours[hi]} MUF ${res[hi].mufMHz.toFixed(2)} vs ${b.FREQ[1]}`)
      freqs.forEach((f, fi) => {
        const got = res[hi].results[fi]
        if (got.mode !== b.MODE[fi + 1]) miss.push(`h${hours[hi]} ${f} MODE ${got.mode} vs ${b.MODE[fi + 1]}`)
        for (const [name, get, tol] of fields) { const want = Number(b[name]?.[fi + 1]); if (!Number.isNaN(want) && Math.abs(get(got) - want) > tol) miss.push(`h${hours[hi]} ${f} ${name} ${get(got).toFixed(2)} vs ${want}`) }
      })
    })
    expect(miss).toEqual([])
  })
})

describe('robustness over the whole globe', () => {
  it('gives finite, in-range answers for 400 random circuits, including long and polar paths', { timeout: 120000 }, () => {
    let seed = 12345
    const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296 }
    const bad: string[] = []
    for (let i = 0; i < 400; i++) {
      const tx = { lat: -90 + 180 * rnd(), lon: -180 + 360 * rnd() }, rx = { lat: -90 + 180 * rnd(), lon: -180 + 360 * rnd() }
      const month = 1 + Math.floor(12 * rnd()), ssn = Math.round(200 * rnd())
      const res = predictCircuit({ tx, rx, month, ssn, txPowerW: 100, requiredSnrDb: 44, hours: [Math.floor(24 * rnd())], freqsMHz: [3.5, 7, 14, 21, 28], longPath: rnd() < 0.1 })
      for (const h of res) for (const r of h.results) {
        const ok = [r.reliability, r.serviceProb, r.mufDay].every((v) => Number.isFinite(v) && v >= 0 && v <= 1.0000001) && [r.snrDb, r.lossDb, r.noiseDbw, r.signalDbw, r.takeOffDeg, r.delayMs].every(Number.isFinite) && Number.isFinite(h.mufMHz) && h.mufMHz > 0
        if (!ok) bad.push(`${JSON.stringify({ tx, rx, month, ssn })}: ${JSON.stringify(r)}`)
      }
    }
    expect(bad.slice(0, 3)).toEqual([])
  })
})
