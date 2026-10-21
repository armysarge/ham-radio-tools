// Band-reliability report between two points, built on the DVOACAP port in ./voacap.
import { predictCircuit, type FreqResult, type HourResult } from './voacap'

/** Bands shown in the report. 2-30 MHz is the range of VOACAP's ionospheric maps. */
export const REPORT_BANDS: { name: string; mhz: number }[] = [
  { name: '10 m', mhz: 28.0 }, { name: '12 m', mhz: 24.9 }, { name: '15 m', mhz: 21.0 }, { name: '17 m', mhz: 18.1 },
  { name: '20 m', mhz: 14.0 }, { name: '30 m', mhz: 10.1 }, { name: '40 m', mhz: 7.0 }, { name: '80 m', mhz: 3.5 },
]

export interface OpMode { id: string; name: string; bandwidthHz: number; snrDb: number; note: string }
/**
 * Practical thresholds: the signal-to-noise ratio in the mode's own bandwidth needed for a usable contact. These are rule-of-thumb values for
 * everyday operating, not receiver specifications; “Custom” lets you enter your own figure.
 */
export const OP_MODES: OpMode[] = [
  { id: 'cw', name: 'CW', bandwidthHz: 500, snrDb: 3, note: 'readable by ear in a 500 Hz filter' },
  { id: 'ssb', name: 'SSB', bandwidthHz: 2700, snrDb: 10, note: 'comfortable speech in 2.7 kHz' },
  { id: 'am', name: 'AM', bandwidthHz: 6000, snrDb: 20, note: 'intelligible AM voice in 6 kHz' },
  { id: 'rtty', name: 'RTTY', bandwidthHz: 250, snrDb: 12, note: 'few errors in 250 Hz' },
  { id: 'psk31', name: 'PSK31', bandwidthHz: 31.25, snrDb: 10, note: 'solid copy in 31 Hz' },
  { id: 'ft8', name: 'FT8', bandwidthHz: 2500, snrDb: -18, note: 'decodes near the decoder limit of about −21 dB in 2.5 kHz' },
]
/** Required SNR for the engine, which works in a 1 Hz bandwidth. */
export const snrIn1Hz = (m: { bandwidthHz: number; snrDb: number }) => m.snrDb + 10 * Math.log10(m.bandwidthHz)

export interface NoiseEnv { id: string; name: string; value: number }
/** Man-made noise at 3 MHz, from ITU-R P.372 (Fam at 1 MHz = 76.8, 72.5, 67.2, 53.6 dB for city, residential, rural, quiet rural) as VOACAP's 217.2 − c. */
export const NOISE_ENVS: NoiseEnv[] = [
  { id: 'city', name: 'City / business', value: 140 }, { id: 'residential', name: 'Residential', value: 145 },
  { id: 'rural', name: 'Rural', value: 150 }, { id: 'quiet', name: 'Quiet rural / remote', value: 164 },
]

export const RELIABILITY_BUCKETS = ['0–19 %', '20–39 %', '40–59 %', '60–79 %', '80–100 %']
export const bucketOf = (rel: number) => Math.min(4, Math.floor(Math.round(rel * 100) / 20))

export interface ReportInput {
  tx: { lat: number; lon: number }; rx: { lat: number; lon: number }
  month: number; ssn: number; txPowerW: number
  mode: OpMode | { bandwidthHz: number; snrDb: number }
  noiseAt3MHz: number; txGainDb: number; rxGainDb: number; longPath: boolean
}
export interface ReportCell { band: string; mhz: number; hour: number; result: FreqResult | null; reliability: number | null; marginDb: number | null }
export interface Report { hours: number[]; cells: ReportCell[][]; mufByHour: [number, number][]; distanceKm: number; bw: number }

export function buildReport(i: ReportInput): Report {
  if (!(i.ssn >= 0 && i.ssn <= 300)) throw new RangeError('Sunspot number must be 0 to 300')
  if (!(i.txPowerW > 0)) throw new RangeError('Power must be greater than 0')
  const hours = Array.from({ length: 24 }, (_, h) => h)
  const res: HourResult[] = predictCircuit({
    tx: i.tx, rx: i.rx, month: i.month, ssn: i.ssn, txPowerW: i.txPowerW, requiredSnrDb: snrIn1Hz(i.mode), manMadeNoiseAt3MHz: i.noiseAt3MHz,
    txGainDb: i.txGainDb, rxGainDb: i.rxGainDb, longPath: i.longPath, minAngleDeg: 3, hours: hours.map((h) => (h === 0 ? 24 : h)), freqsMHz: REPORT_BANDS.map((b) => b.mhz),
  })
  const bwDb = 10 * Math.log10(i.mode.bandwidthHz)
  const cells = REPORT_BANDS.map((b, bi) => hours.map((h, hi): ReportCell => {
    const r = res[hi].results[bi]
    const ok = r && Number.isFinite(r.reliability) && Number.isFinite(r.snrDb)
    return { band: b.name, mhz: b.mhz, hour: h, result: ok ? r : null, reliability: ok ? r.reliability : null, marginDb: ok ? r.snrDb - snrIn1Hz(i.mode) : null }
  }))
  return { hours, cells, mufByHour: res.map((r, hi) => [hours[hi], r.mufMHz] as [number, number]), distanceKm: res[0].distanceKm, bw: bwDb }
}
