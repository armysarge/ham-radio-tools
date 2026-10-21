// Public interface of the DVOACAP port: a circuit prediction between two points for a set of UTC hours and frequencies.
import { VoacapEngine } from './engine'
import { DinR, RinD, defaultParams, type Prediction } from './types'

export interface CircuitRequest {
  /** Degrees; north and east positive. */
  tx: { lat: number; lon: number }
  rx: { lat: number; lon: number }
  month: number
  /** Smoothed sunspot number (R12). */
  ssn: number
  txPowerW: number
  /** Required signal-to-noise ratio in dB in a 1 Hz bandwidth. */
  requiredSnrDb: number
  requiredReliability?: number
  /** Man-made noise at 3 MHz as a positive number of dB below 1 W in 1 Hz (145 = residential). */
  manMadeNoiseAt3MHz?: number
  minAngleDeg?: number
  longPath?: boolean
  txGainDb?: number
  rxGainDb?: number
  multipathPowerTolerance?: number
  maxTolerableDelayMs?: number
  /** UTC hours (0-24, fractions allowed). */
  hours: number[]
  freqsMHz: number[]
  includeMuf?: boolean
}

export interface FreqResult {
  freqMHz: number; isMuf: boolean; mode: string
  takeOffDeg: number; delayMs: number; virtHeightKm: number; mufDay: number
  lossDb: number; fieldDbuV: number; signalDbw: number; noiseDbw: number; snrDb: number; requiredPowerGainDb: number
  reliability: number; multipathProb: number; serviceProb: number
  signalLowerDb: number; signalUpperDb: number; snrLowerDb: number; snrUpperDb: number; snrXX: number
}
export interface HourResult { hour: number; mufMHz: number; distanceKm: number; results: FreqResult[] }

const flat = (p: Prediction, name: string, freq: number, isMuf: boolean): FreqResult => ({
  freqMHz: freq, isMuf, mode: name, takeOffDeg: p.txElevation * DinR, delayMs: p.sig.delayMs, virtHeightKm: p.virtHeight, mufDay: p.sig.mufDay,
  lossDb: p.sig.totalLossDb, fieldDbuV: p.sig.fieldDbuV, signalDbw: p.sig.powerDbw, noiseDbw: p.noiseDbw, snrDb: p.sig.snrDb, requiredPowerGainDb: p.requiredPower,
  reliability: p.sig.reliability, multipathProb: p.multiPathProb, serviceProb: p.serviceProb,
  signalLowerDb: p.sig.power10, signalUpperDb: p.sig.power90, snrLowerDb: p.sig.snr10, snrUpperDb: p.sig.snr90, snrXX: p.snrXX,
})

/** Runs the engine for every hour. Pure computation, no I/O. */
export function predictCircuit(req: CircuitRequest): HourResult[] {
  if (req.month < 1 || req.month > 12) throw new RangeError('Month must be 1 to 12')
  if (!(req.freqsMHz.length > 0)) throw new RangeError('At least one frequency is needed')
  const eng = new VoacapEngine()
  const pm = defaultParams()
  Object.assign(pm, {
    ssn: req.ssn, month: Math.trunc(req.month), txLoc: { lat: req.tx.lat * RinD, lon: req.tx.lon * RinD }, txPowerW: req.txPowerW,
    minAngle: (req.minAngleDeg ?? 3) * RinD, manMadeNoiseAt3MHz: req.manMadeNoiseAt3MHz ?? 145, longPath: !!req.longPath, requiredSnr: req.requiredSnrDb,
    requiredReliability: req.requiredReliability ?? 0.9, multipathPowerTolerance: req.multipathPowerTolerance ?? 3, maxTolerableDelay: req.maxTolerableDelayMs ?? 0.1,
    txGainDb: req.txGainDb ?? 0, rxGainDb: req.rxGainDb ?? 0,
  })
  const out: HourResult[] = []
  for (const hour of req.hours) {
    eng.pm = { ...pm, txLoc: { ...pm.txLoc } }
    eng.rxLoc = { lat: req.rx.lat * RinD, lon: req.rx.lon * RinD }
    eng.utcTime = hour / 24
    eng.freqs = [...req.freqsMHz, ...(req.includeMuf ? [0] : [])]
    eng.predict()
    const n = req.freqsMHz.length
    out.push({
      hour, mufMHz: eng.muf, distanceKm: eng.path.dist * 6370,
      results: eng.results.map((p, i) => flat(p, eng.modeName(p), eng.freqs[i], i >= n)),
    })
  }
  return out
}
