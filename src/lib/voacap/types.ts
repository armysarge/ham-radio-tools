// Port of VoaTypes.pas from DVOACAP (https://github.com/VE3NEA/DVOACAP), Copyright (c) 2013-2025 Alex Shovkoplyas, VE3NEA, MIT licence.
// See LICENSE-DVOACAP.txt in this folder. Translated to TypeScript for this project; numerics are Double where the original used Single.

export const TWO_PI = 2 * Math.PI
export const HALF_PI = Math.PI / 2
export const RinD = Math.PI / 180 // radians in a degree
export const DinR = 1 / RinD
export const EarthR = 6370 // km
export const VofL = 299.79246 // velocity of light, km/ms
export const DBinNP = 4.34294
export const NPinDB = 1 / DBinNP

export const MIN_RXTX_DIST = 0.03 * RinD
export const MIN_RXTX_DIST2 = 0.000001
export const MAX_NON_POLE_LAT = 89.9 * RinD
export const MIN_NON_POLE_COSLAT = 1e-7
export const MAX_ELEV_ANGLE = 89.99 * RinD
export const JUST_BELOW_MAX_ELEV = 89.9 * RinD

export const Rad_1000Km = 1000 / EarthR
export const Rad_2000Km = 2000 / EarthR
export const Rad_2000Km_01 = 2000.01 / EarthR
export const Rad_2500Km = 2500 / EarthR
export const Rad_4000Km = 4000 / EarthR
export const Rad_7000Km = 7000 / EarthR
export const Rad_10000Km = 10000 / EarthR

/** Percentage points of the normal distribution: 50, 45, … 5 %. */
export const TME = [0, 0.1257, 0.2533, 0.3853, 0.5244, 0.6745, 0.8416, 1.0364, 1.2815, 1.6449]
export const NORM_DECILE = 1.28

/** Take-off angle table, 1-based (index 0 unused). */
export const Angles: number[] = [0, ...[0, 0.5, 1, 2, 3, 4, 5, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48, 50, 52, 54, 56, 60, 65, 70, 75, 80, 85].map((d) => Math.fround(d * RinD)), MAX_ELEV_ANGLE]

/** Gaussian integration nodes and weights. */
export const TWDIV = 0.5
export const XT = [0.0387724175, 0.1160840707, 0.1926975807, 0.2681521850, 0.3419940908, 0.4137792043, 0.4830758017, 0.5494671251, 0.6125538897, 0.6719566846,
  0.7273182552, 0.7783056514, 0.8246122308, 0.8659595032, 0.9020988070, 0.9328128083, 0.9579168192, 0.9772599500, 0.9907262387, 0.9982377097]
export const WT = [0.0775059480, 0.0770398182, 0.0761103619, 0.0747231691, 0.0728865824, 0.0706116474, 0.0679120458, 0.0648040135, 0.0613062425, 0.0574397691,
  0.0532278470, 0.0486958076, 0.0438709082, 0.0387821680, 0.0334601953, 0.0279370070, 0.0222458492, 0.0164210584, 0.0104982845, 0.0045212771]

export const HTLOSS = 88.0
export const XNUZ = 63.07
export const HNU = 4.39

export interface GeoPoint { lat: number; lon: number }
export interface LayerInfo { fo: number; hm: number; ym: number }
export const newLayer = (): LayerInfo => ({ fo: 0, hm: 0, ym: 0 })

/** Ionospheric layers in the order of the original enumeration: E = 0, F1 = 1, F2 = 2. */
export type Layer = 0 | 1 | 2
export const LR_E: Layer = 0, LR_F1: Layer = 1, LR_F2: Layer = 2
export const LAYER_NAME = ['E', 'F1', 'F2']

export interface ControlPoint {
  loc: GeoPoint; eastLon: number; localTime: number; zenAngle: number; zenMax: number
  magLat: number; gyroFreq: number; magDip: number; gndSig: number; gndEps: number
  E: LayerInfo; F1: LayerInfo; F2: LayerInfo; Es: LayerInfo
  esFoLo: number; esFoHi: number; absorp: number; f2m3: number; hpF2: number; rat: number
}
export const newControlPoint = (loc: GeoPoint): ControlPoint => ({
  loc, eastLon: 0, localTime: 0, zenAngle: 0, zenMax: 0, magLat: 0, gyroFreq: 0, magDip: 0, gndSig: 0, gndEps: 0,
  E: newLayer(), F1: newLayer(), F2: newLayer(), Es: newLayer(), esFoLo: 0, esFoHi: 0, absorp: 0, f2m3: 0, hpF2: 0, rat: 0,
})

export interface Triple { mdn: number; lo: number; hi: number }
export interface Distribution { value: Triple; error: Triple }
export const newDistribution = (): Distribution => ({ value: { mdn: 0, lo: 0, hi: 0 }, error: { mdn: 0, lo: 0, hi: 0 } })

export interface Reflection { elevation: number; trueHeight: number; virtHeight: number; vertFreq: number; devLoss: number }
export const newRef = (): Reflection => ({ elevation: 0, trueHeight: 0, virtHeight: 0, vertFreq: 0, devLoss: 0 })

export interface MufInfo { ref: Reflection; hopCount: number; fot: number; hpf: number; muf: number; sigLo: number; sigHi: number }
export const newMufInfo = (): MufInfo => ({ ref: newRef(), hopCount: 0, fot: 0, hpf: 0, muf: 0, sigLo: 0, sigHi: 0 })

export interface SignalInfo {
  delayMs: number; txGainDb: number; rxGainDb: number; mufDay: number; totalLossDb: number; power10: number; power90: number
  fieldDbuV: number; powerDbw: number; snrDb: number; snr10: number; snr90: number; reliability: number
}
export const newSignal = (): SignalInfo => ({ delayMs: 0, txGainDb: 0, rxGainDb: 0, mufDay: 0, totalLossDb: 0, power10: 0, power90: 0, fieldDbuV: 0, powerDbw: 0, snrDb: 0, snr10: 0, snr90: 0, reliability: 0 })

export interface ModeInfo {
  ref: Reflection; sig: SignalInfo; hopDist: number; hopCnt: number; layer: Layer
  freeSpaceLoss: number; absorptionLoss: number; obscuration: number; deviationTerm: number; groundLoss: number
}
export const newMode = (): ModeInfo => ({ ref: newRef(), sig: newSignal(), hopDist: 0, hopCnt: 0, layer: 0, freeSpaceLoss: 0, absorptionLoss: 0, obscuration: 0, deviationTerm: 0, groundLoss: 0 })
export const cloneMode = (m: ModeInfo): ModeInfo => ({ ...m, ref: { ...m.ref }, sig: { ...m.sig } })

export type Method = 'short' | 'long' | 'smooth'
export interface Prediction {
  method: Method; modeT: Layer; modeR: Layer; hopCnt: number
  txElevation: number; rxElevation: number; virtHeight: number
  sig: SignalInfo; noiseDbw: number; requiredPower: number; multiPathProb: number; serviceProb: number; snrXX: number
}
export const newPrediction = (): Prediction => ({ method: 'short', modeT: 0, modeR: 0, hopCnt: 0, txElevation: 0, rxElevation: 0, virtHeight: 0, sig: newSignal(), noiseDbw: 0, requiredPower: 0, multiPathProb: 0, serviceProb: 0, snrXX: 0 })

export interface VoaParams {
  ssn: number; month: number; txLoc: GeoPoint; txPowerW: number; minAngle: number; manMadeNoiseAt3MHz: number; longPath: boolean
  requiredSnr: number; requiredReliability: number; multipathPowerTolerance: number; maxTolerableDelay: number
  /** Constant antenna gains in dB (the original has an isotropic model only, so these are the extra gain over isotropic). */
  txGainDb: number; rxGainDb: number
}
export const defaultParams = (): VoaParams => ({
  ssn: 100, month: 1, txLoc: { lat: 0, lon: 0 }, txPowerW: 1500, minAngle: 3 * RinD, manMadeNoiseAt3MHz: 145, longPath: false,
  requiredSnr: 73, requiredReliability: 0.9, multipathPowerTolerance: 3, maxTolerableDelay: 0.1, txGainDb: 0, rxGainDb: 0,
})

// ---- helpers ----
export const sign = (x: number) => (x >= 0 ? 1 : -1)
export const toDb = (x: number) => 10 * Math.log10(x)
export const fromDb = (x: number) => (x > 375 ? 3e37 : 10 ** (0.1 * x))
export const clamp1 = (q: number) => (Math.abs(q) > 1 ? sign(q) : q)
export function cumulativeNormal(x: number) {
  const C = [0.196854, 0.115194, 0.000344, 0.019527]
  const y = Math.min(5, Math.abs(x))
  let r = 1 + y * (C[0] + y * (C[1] + y * (C[2] + y * C[3])))
  r = r * r * r * r
  r = 0.5 * (1 / r)
  return x > 0 ? 1 - r : r
}
export const frac = (x: number) => x - Math.trunc(x)
/** Delphi's Round(): halves go to the even neighbour. */
export function delphiRound(x: number) {
  const f = Math.floor(x), d = x - f
  if (d < 0.5) return f
  if (d > 0.5) return f + 1
  return f % 2 === 0 ? f : f + 1
}
