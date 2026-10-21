// Port of VoaCapEng.pas from DVOACAP (https://github.com/VE3NEA/DVOACAP, MIT, Copyright (c) 2013-2025 Alex Shovkoplyas, VE3NEA):
// the prediction engine. Comments in capitals are VOACAP's own and are kept where they explain the physics.
// Differences from the original: antennas are isotropic with an optional constant gain; sporadic E is not modelled (also true of DVOACAP).
import {
  Angles, EarthR, HNU, HTLOSS, NORM_DECILE, Rad_1000Km, Rad_10000Km, Rad_2000Km, Rad_2000Km_01, Rad_2500Km, Rad_4000Km, Rad_7000Km, RinD, TME, TWO_PI, VofL, XNUZ,
  LAYER_NAME, cumulativeNormal, defaultParams, delphiRound, fromDb, newControlPoint, newDistribution, newMode, newPrediction, toDb,
  type ControlPoint, type Distribution, type GeoPoint, type Layer, type ModeInfo, type Prediction, type SignalInfo, type Triple, type VoaParams,
} from './types'
import { PathGeometry, calcElevationAngle, computeLocalTime, computeMagField, computeZenithAngle, cosOfIncidence, hopDistance, hopLength3D } from './geo'
import { FixedMap, FourierMaps } from './maps'
import { IonoProfile, computeIonoParams, interpolateTable } from './iono'
import { CircuitMuf, calcMufProb, selectProfile } from './muf'
import { Reflectrix } from './reflectrix'
import { NoiseModel } from './noise'

// long path model constants
const GMIN = 3, DELOPT = 3 * RinD, YMIN = 0.1

export class VoacapEngine {
  private map = new FourierMaps()
  private noise = new NoiseModel()
  private refl!: Reflectrix

  // computed in SIGDIS and used in the performance calculations
  private absorptionIndex = 0
  private adjDELoss = 0
  private adjCCIR252A = 0; private adjCCIR252B = 0
  private adjSignal10 = 0; private adjSignal90 = 0
  private adjAuroral = 0

  private freq = 0
  private currProf!: IonoProfile
  private ctrlPts: ControlPoint[] = []
  private profiles: IonoProfile[] = []
  private modes: ModeInfo[] = []
  private avgLoss: Distribution = newDistribution()
  private bestMode!: ModeInfo

  path = new PathGeometry()
  mufCalc = new CircuitMuf()
  pm: VoaParams = defaultParams()
  rxLoc: GeoPoint = { lat: 0, lon: 0 }
  /** UTC as a fraction of a day (hour / 24). */
  utcTime = 0
  freqs: number[] = []
  results: Prediction[] = []

  constructor() {
    this.noise.map = this.map
    this.mufCalc.path = this.path
    this.mufCalc.map = this.map
  }

  private get txPowerDbw() { return toDb(this.pm.txPowerW) }

  predict() {
    this.mufCalc.minAngle = this.pm.minAngle
    this.results = new Array(this.freqs.length)
    this.map.setMonthSsnUtc(this.pm.month, this.pm.ssn, this.utcTime)

    this.path.longPath = this.pm.longPath
    this.path.setTxRx(this.pm.txLoc, this.rxLoc)
    this.rxLoc = this.path.rx
    this.pm.txLoc = this.path.tx

    this.computeControlPoints()
    for (const p of this.ctrlPts) this.computeGeoParams(p)
    for (const p of this.ctrlPts) computeIonoParams(p, this.map)

    this.noise.manMadeNoiseAt3MHz = this.pm.manMadeNoiseAt3MHz
    this.noise.computeNoiseAt1Mhz(this.rxLoc, computeLocalTime(this.utcTime, this.rxLoc.lon))

    this.createIonoProfiles()
    this.mufCalc.computeCircuitMuf(this.profiles)
    if (this.freqs[this.freqs.length - 1] === 0) this.freqs[this.freqs.length - 1] = this.mufCalc.muf

    this.currProf = selectProfile(this.profiles)
    this.currProf.computeIonogram()
    this.currProf.computeObliqueFreqs(this.angleCount())
    this.currProf.computeDeviativeLoss(this.mufCalc.mufInfo)
    this.adjustSignalDistributionTables(this.currProf)

    if (this.path.dist >= Rad_7000Km) {
      for (const p of [this.profiles[0], this.profiles[this.profiles.length - 1]]) {
        p.computeIonogram(); p.computeObliqueFreqs(this.angleCount()); p.computeDeviativeLoss(this.mufCalc.mufInfo)
      }
    }

    for (let f = 0; f < this.freqs.length; f++) {
      this.freq = this.freqs[f]
      this.noise.computeDistribution(this.freq, this.profiles[this.profiles.length - 1].F2.fo)
      this.refl = new Reflectrix(this.pm.minAngle, this.freq, this.currProf)
      this.results[f] = this.evaluateShortModel()
      if (this.path.dist >= Rad_7000Km) this.results[f] = this.combineShortAndLong(this.results[f], this.evaluateLongModel())
    }
  }

  /** Circuit MUF of the last prediction, MHz. */
  get muf() { return this.mufCalc.muf }

  modeName(p: Prediction) {
    return this.path.dist < Rad_7000Km ? `${p.hopCnt}${LAYER_NAME[p.modeT]}` : `${LAYER_NAME[p.modeT]}${LAYER_NAME[p.modeR]}`
  }

  // ---------------- geometry and ionosphere set-up ----------------
  private computeControlPoints() {
    const P = this.path, d = P.dist
    const at = (x: number) => newControlPoint(P.getPointAtDist(x))
    if (d <= Rad_2000Km_01) this.ctrlPts = [at(0.5 * d)]
    else if (d <= Rad_4000Km) this.ctrlPts = [at(Rad_1000Km), at(0.5 * d), at(d - Rad_1000Km)]
    else this.ctrlPts = [at(Rad_1000Km), at(Rad_2000Km), at(0.5 * d), at(d - Rad_2000Km), at(d - Rad_1000Km)]
  }

  private computeGeoParams(pnt: ControlPoint) {
    pnt.eastLon = pnt.loc.lon >= 0 ? pnt.loc.lon : TWO_PI + pnt.loc.lon
    computeMagField(pnt)
    if (this.map.computeFixedMap(FixedMap.LandMass, pnt.loc.lat, pnt.eastLon) >= 0) { pnt.gndSig = 0.001; pnt.gndEps = 4 } // land
    else { pnt.gndSig = 5; pnt.gndEps = 80 } // sea
    pnt.zenAngle = computeZenithAngle(pnt.loc, this.utcTime, this.pm.month)
    pnt.localTime = computeLocalTime(this.utcTime, pnt.loc.lon)
  }

  private createIonoProfiles() {
    const C = this.ctrlPts
    const n = 1 + (C.length >> 1)
    this.profiles = Array.from({ length: n }, () => new IonoProfile())
    const P = this.profiles
    const put = (p: IonoProfile, e: ControlPoint, f1: ControlPoint, f2: ControlPoint) => { p.E = { ...e.E }; p.F1 = { ...f1.F1 }; p.F2 = { ...f2.F2 } }
    const info = (p: IonoProfile, lat: ControlPoint, mag: ControlPoint, te: ControlPoint, tf2: ControlPoint) => {
      p.lat = lat.loc.lat; p.magLat = mag.magLat; p.localTimeE = te.localTime; p.localTimeF2 = tf2.localTime; p.gyroFreq = mag.gyroFreq
    }
    if (n === 1) { put(P[0], C[0], C[0], C[0]); info(P[0], C[0], C[0], C[0], C[0]) }
    else if (n === 2) {
      put(P[0], C[0], C[0], C[1]); put(P[1], C[2], C[2], C[1])
      info(P[0], C[1], C[0], C[0], C[1]); info(P[1], C[1], C[2], C[2], C[1])
    } else {
      put(P[0], C[0], C[0], C[1]); put(P[1], C[2], C[2], C[2]); put(P[2], C[4], C[4], C[3])
      info(P[0], C[1], C[0], C[0], C[1]); info(P[1], C[2], C[2], C[2], C[2]); info(P[2], C[3], C[4], C[4], C[3])
    }
    // consistency of the ionospheric parameters
    for (const p of P) {
      if (p.F1.fo > 0) {
        if (p.F1.fo <= p.E.fo + 0.2) p.F1.fo = 0
        else if (p.F2.fo <= p.F1.fo + 0.2) p.F1.fo = 0
        else p.F1.hm = Math.min(p.F1.hm, p.F2.hm)
      }
      p.F2.ym = Math.min(p.F2.ym, p.F2.hm - p.E.hm - 2)
    }
  }

  private angleCount() {
    const NANGX = [40, 34, 29, 24, 19, 14, 12, 9]
    let result = NANGX[Math.min(7, Math.trunc(this.path.dist / Rad_2000Km))]
    if (this.pm.minAngle > 0 && Angles[result] < this.pm.minAngle + 10 * RinD) {
      for (let i = 1; i < Angles.length; i++) if (Angles[i] >= this.pm.minAngle + 8.5 * RinD) { result = i; break }
    }
    return result
  }

  // SIGDIS/SYSSY
  private adjustSignalDistributionTables(prof: IonoProfile) {
    let avgFoE = 0, avgMagLat = 0
    this.absorptionIndex = 0
    const avg = newDistribution()
    for (const p of this.profiles) {
      avgFoE += p.E.fo
      avgMagLat += Math.abs(p.magLat)
      p.absorptionIndex = Math.max(0.1, -0.04 + Math.exp(-2.937 + 0.8445 * p.E.fo))
      this.absorptionIndex += p.absorptionIndex
      p.excessiveSystemLoss = this.map.computeExcessiveSystemLoss(p.magLat, p.localTimeE, this.path.dist > Rad_2500Km)
      const e = p.excessiveSystemLoss
      avg.value.mdn += e.value.mdn; avg.value.lo += e.value.lo; avg.value.hi += e.value.hi
      avg.error.mdn += e.error.mdn
      avg.error.lo = avg.error.hi + e.error.lo // sic: the original adds to Error.Hi here, kept for fidelity
      avg.error.hi += e.error.hi
    }
    const n = this.profiles.length
    avgFoE /= n; avgMagLat /= n; this.absorptionIndex /= n
    avg.value.mdn /= n; avg.value.lo /= n; avg.value.hi /= n
    avg.error.mdn /= n; avg.error.lo /= n; avg.error.hi /= n
    this.avgLoss = avg

    // D-E region loss adjustment factor
    this.adjDELoss = interpolateTable(90, prof.igramTrueHeight!, prof.igramVertFreq!) / prof.E.fo

    // adjustment to CCIR 252 (Haydon, Lucas) loss equation for E modes
    if (avgFoE > 2) { this.adjCCIR252A = 1.359; this.adjCCIR252B = 8.617 }
    else if (avgFoE > 0.5) { this.adjCCIR252A = (1.359 * (avgFoE - 0.5)) / 1.5; this.adjCCIR252B = (8.617 * (avgFoE - 0.5)) / 1.5 }
    else { this.adjCCIR252A = 0; this.adjCCIR252B = 0 }

    // use FOT, F2 layer
    const f2 = this.mufCalc.mufInfo[2]
    let ftab: number
    if (avgMagLat <= 40 * RinD) ftab = f2.fot
    else if (avgMagLat <= 50 * RinD) ftab = f2.fot - ((avgMagLat - 40 * RinD) * (f2.fot - 10)) / (10 * RinD)
    else ftab = 10 // near the poles

    const eslsm = 0
    let pf2 = Math.max(0.1, calcMufProb(ftab, f2.muf, f2.muf, f2.sigLo, f2.sigHi))
    const f2lsm = -toDb(pf2)
    this.adjAuroral = Math.max(0, avg.value.mdn - eslsm - f2lsm)

    const pes = 0
    pf2 = Math.max(0.1, calcMufProb(ftab, f2.hpf, f2.hpf, f2.sigLo, f2.sigHi))
    this.adjSignal90 = Math.max(0.5, NORM_DECILE * avg.value.lo - toDb(1 - pes) - eslsm - toDb(pf2) - f2lsm)
    pf2 = Math.max(0.1, calcMufProb(ftab, f2.fot, f2.fot, f2.sigLo, f2.sigHi))
    this.adjSignal10 = Math.max(1, NORM_DECILE * avg.value.hi + toDb(1 - pes) + eslsm + toDb(pf2) + f2lsm)
  }

  // ---------------- losses ----------------
  private groundReflectionLoss(idx: number, elev: number, freq: number) {
    if (elev < 1e-8) return 6
    const c = this.ctrlPts[idx]
    const x = (18000 * c.gndSig) / freq
    const t = Math.cos(elev), q = Math.sin(elev), r = q * q, s = r * r
    const ert = c.gndEps - t * t
    const rho = Math.sqrt(ert * ert + x * x)
    const a = -Math.atan(x / ert)
    const u = c.gndEps * c.gndEps + x * x
    const v = Math.sqrt(u)
    const asxv = Math.asin(x / v)
    const cv = Math.sqrt(rho * rho + u * u * s - 2 * rho * u * r * Math.cos(a + 2 * asxv)) / (rho + u * r + 2 * Math.sqrt(rho) * v * q * Math.cos(0.5 * a + asxv))
    const ch = Math.sqrt(rho * rho + s - 2 * rho * r * Math.cos(a)) / (rho + r + 2 * Math.sqrt(rho) * q * Math.cos(0.5 * a))
    return Math.abs(4.3429 * Math.log(0.5 * (ch * ch + cv * cv)))
  }

  private meanGroundLoss(elev: number, freq: number) {
    let g = 0
    for (let p = 0; p < this.ctrlPts.length; p++) g += this.groundReflectionLoss(p, elev, freq)
    return g / this.ctrlPts.length
  }

  // REGMOD
  private computeSignal(m: ModeInfo) {
    const M = this.mufCalc.mufInfo[m.layer]
    const freq = this.freq, prof = this.currProf
    const AC = 677.2 * this.absorptionIndex
    const BC = (freq + prof.gyroFreq) ** 1.98
    const hopCnt = Math.trunc(this.path.dist / m.hopDist + 0.01)
    const hopCnt2 = Math.min(2, hopCnt)
    const pathLen = hopCnt * hopLength3D(m.ref.elevation, m.hopDist, m.ref.virtHeight)

    m.sig.delayMs = pathLen / VofL
    m.freeSpaceLoss = 32.45 + 2 * toDb(pathLen * freq)

    let nSqr: number, hEff: number, adx: number
    if (m.ref.vertFreq <= prof.E.fo) { // D-E mode
      nSqr = m.ref.trueHeight >= HTLOSS ? 10.2 : XNUZ * Math.exp((-2 * (1 + (3 * (m.ref.trueHeight - 70)) / 18)) / HNU)
      hEff = Math.min(100, m.ref.trueHeight)
      adx = this.adjCCIR252A + this.adjCCIR252B * Math.log(Math.max(m.ref.vertFreq / prof.E.fo, this.adjDELoss))
    } else { nSqr = 10.2; hEff = 100; adx = 0 } // F layer modes
    m.absorptionLoss = AC / (BC + nSqr) / cosOfIncidence(m.ref.elevation, hEff)
    m.groundLoss = this.meanGroundLoss(m.ref.elevation, freq)

    m.deviationTerm = (m.ref.devLoss / (BC + nSqr)) * ((m.ref.vertFreq + prof.gyroFreq) ** 1.98 + nSqr) / cosOfIncidence(m.ref.elevation, m.ref.virtHeight) + adx

    m.obscuration = 0
    const obscur10 = 0, obscur90 = 0

    m.sig.txGainDb = this.pm.txGainDb
    m.sig.rxGainDb = this.pm.rxGainDb

    m.sig.totalLossDb = m.freeSpaceLoss + hopCnt * (m.absorptionLoss + m.deviationTerm) + m.groundLoss * (hopCnt - 1) + hopCnt2 * m.obscuration + this.adjAuroral - m.sig.rxGainDb - m.sig.txGainDb

    // MUF for this hop distance
    const modeMufElev = calcElevationAngle(m.hopDist, M.ref.virtHeight)
    const modeMuf = M.ref.vertFreq / cosOfIncidence(modeMufElev, M.ref.trueHeight)
    m.sig.mufDay = calcMufProb(freq, modeMuf, M.muf, M.sigLo, M.sigHi)
    if (m.sig.mufDay < 1e-4) m.sig.totalLossDb -= Math.max(-24, 8 * Math.log10(m.sig.mufDay) + 32)

    const sec = 1 / cosOfIncidence(m.ref.elevation, m.ref.trueHeight)
    const xmuf = M.ref.vertFreq * sec
    let xls = calcMufProb(freq, xmuf, M.muf, M.sigLo, M.sigHi)
    xls = -toDb(Math.max(1e-6, xls)) * sec
    m.sig.totalLossDb += hopCnt * xls

    const cpr = M.ref.vertFreq / M.muf
    let xlsLo = calcMufProb(freq, M.fot * sec * cpr, M.fot, M.sigLo, M.sigHi)
    xlsLo = -toDb(Math.max(1e-6, xlsLo)) * sec
    let xlsHi = calcMufProb(freq, M.hpf * sec * cpr, M.hpf, M.sigLo, M.sigHi)
    xlsHi = -toDb(Math.max(1e-6, xlsHi)) * sec

    m.sig.power10 = Math.min(25, this.adjSignal10 + hopCnt2 * (obscur10 - m.obscuration) + hopCnt * (xlsLo - xls))
    m.sig.power90 = Math.min(25, this.adjSignal90 + hopCnt2 * (m.obscuration - obscur90) + hopCnt * (xls - xlsHi))

    m.sig.fieldDbuV = 107.2 + this.txPowerDbw + 2 * toDb(freq) - m.sig.totalLossDb - m.sig.rxGainDb
    m.sig.powerDbw = this.txPowerDbw - m.sig.totalLossDb
    m.sig.snrDb = m.sig.powerDbw - this.noise.combined
  }

  // ---------------- short path model ----------------
  private evaluateShortModel(): Prediction {
    this.modes = []
    const M = this.mufCalc.mufInfo
    let minHops = Math.min(M[0].hopCount, M[2].hopCount)
    if (this.currProf.F1.fo > 0) minHops = Math.min(minHops, M[1].hopCount)

    let hopsB: number, hopsE: number
    if (this.refl.maxDistance <= 0) { hopsB = minHops; hopsE = minHops } // only one over-the-MUF mode
    else {
      hopsB = Math.trunc(this.path.dist / this.refl.maxDistance) + 1
      hopsB = Math.max(minHops, hopsB)
      let maxHops = Math.trunc(this.path.dist / this.refl.skipDistance)
      maxHops = Math.max(hopsB, maxHops)
      hopsE = Math.min(maxHops, hopsB + 2)
      if (hopsB > minHops) hopsB = Math.max(minHops, hopsE - 2)
    }

    for (let h = hopsB; h <= hopsE; h++) {
      this.refl.findModes(this.path.dist / h, h)
      this.refl.addOverTheMufAndVertModes(this.path.dist / h, h, this.mufCalc)
      for (const m of this.refl.modes) this.modes.push(m)
    }
    for (const m of this.modes) this.computeSignal(m)

    const r = this.analyzeReliability()
    r.serviceProb = this.calcServiceProb()
    r.multiPathProb = this.calcMultiPathProb()
    r.method = 'short'
    r.modeR = r.modeT
    r.rxElevation = r.txElevation
    return r
  }

  private calcReliability(sig: SignalInfo, clamp = false) {
    const nz = this.noise.combinedNoise
    sig.snr10 = Math.sqrt(nz.value.hi ** 2 + sig.power10 ** 2)
    sig.snr90 = Math.sqrt(nz.value.lo ** 2 + sig.power90 ** 2)
    if (clamp) { sig.snr10 = Math.max(0.2, sig.snr10); sig.snr90 = Math.min(30, sig.snr90) }
    let z = this.pm.requiredSnr - sig.snrDb
    z = z <= 0 ? z / (sig.snr10 / NORM_DECILE) : z / (sig.snr90 / NORM_DECILE)
    sig.reliability = 1 - cumulativeNormal(z)
  }

  private findBestMode(): ModeInfo {
    let best = this.modes[0]
    for (let m = 1; m < this.modes.length; m++) {
      const c = this.modes[m]
      // select by reliability first; if close, by fewer hops; if equal hops, by median SNR
      if (c.sig.reliability > best.sig.reliability + 0.05) best = c
      else if (c.sig.reliability < best.sig.reliability - 0.05) continue
      else if (c.hopCnt < best.hopCnt) best = c
      else if (c.hopCnt > best.hopCnt) continue
      else if (c.sig.snrDb > best.sig.snrDb) best = c
    }
    return best
  }

  private analyzeReliability(): Prediction {
    const r = newPrediction()
    if (this.modes.length === 0) return r
    for (const m of this.modes) {
      if (m.ref.virtHeight <= 70) m.sig.reliability = 0.001 // power10/90 is left undefined in the original
      else this.calcReliability(m.sig)
    }
    this.bestMode = this.findBestMode()
    const b = this.bestMode
    r.txElevation = b.ref.elevation
    r.virtHeight = b.ref.virtHeight
    r.hopCnt = b.hopCnt
    r.sig = { ...b.sig }
    r.noiseDbw = this.noise.combinedNoise.value.mdn
    r.modeT = b.layer

    // add the signals' random phase, i.e. add the powers in watts
    if (this.modes.length > 1) {
      this.calcSumOfModes(r)
      r.sig.snrDb = b.sig.snrDb + r.sig.powerDbw - b.sig.powerDbw
      this.calcReliability(r.sig, true)
    }
    r.requiredPower = this.calcRequiredPower(r.sig)
    r.snrXX = this.pm.requiredSnr - r.requiredPower
    return r
  }

  private reliabilityIndex() { return Math.min(TME.length - 1, Math.trunc(Math.abs(delphiRound(this.pm.requiredReliability * 100) - 50) / 5)) }

  private calcRequiredPower(sig: SignalInfo) {
    const idx = this.reliabilityIndex()
    return this.pm.requiredReliability < 0.5
      ? this.pm.requiredSnr - sig.snrDb - (TME[idx] / TME[8]) * sig.snr90
      : this.pm.requiredSnr - sig.snrDb + (TME[idx] / TME[8]) * sig.snr10
  }

  private calcSumOfModes(r: Prediction) {
    let maxPwr = -1000, maxLo = -1000, maxHi = -1000, maxFld = -1000
    for (const m of this.modes) {
      maxPwr = Math.max(maxPwr, m.sig.powerDbw)
      maxLo = Math.max(maxLo, m.sig.powerDbw - m.sig.power10)
      maxHi = Math.max(maxHi, m.sig.powerDbw + m.sig.power90)
      maxFld = Math.max(maxFld, m.sig.fieldDbuV)
    }
    let sumPwr = 0, sumLo = 0, sumHi = 0, sumFld = 0
    for (const { sig: s } of this.modes) {
      let x = s.powerDbw - s.power10 - maxLo; if (x > -100) sumLo += fromDb(x)
      x = s.powerDbw - maxPwr; if (x > -100) sumPwr += fromDb(x)
      x = s.powerDbw + s.power90 - maxHi; if (x > -100) sumHi += fromDb(x)
      x = s.fieldDbuV - maxFld; if (x > -100) sumFld += fromDb(x)
    }
    r.sig.powerDbw = sumPwr > 0 ? maxPwr + toDb(sumPwr) : -500
    r.sig.power10 = sumLo > 0 ? Math.abs(r.sig.powerDbw - toDb(sumLo) - maxLo) : 0
    r.sig.power10 = Math.max(0.2, Math.min(30, r.sig.power10))
    r.sig.power90 = sumHi > 0 ? Math.abs(maxHi + toDb(sumHi) - r.sig.powerDbw) : 0
    r.sig.power90 = Math.max(0.2, Math.min(30, r.sig.power90))
    r.sig.fieldDbuV = sumFld > 0 ? maxFld + toDb(sumFld) : -500
  }

  private calcServiceProb() {
    const DR = 2 // prediction error in the required SNR
    const nz = this.noise.combinedNoise, pm = this.pm
    let result = 0.001
    const idx = this.reliabilityIndex(), tmx = TME[idx]
    let noisePwr: number, signalErr: number, noiseErr: number, sgn: number
    if (pm.requiredReliability >= 0.5) { noisePwr = (tmx * nz.value.hi) / NORM_DECILE; signalErr = tmx * this.avgLoss.error.hi; noiseErr = (tmx * nz.error.hi) / NORM_DECILE; sgn = -1 }
    else { noisePwr = (tmx * nz.value.lo) / NORM_DECILE; signalErr = tmx * this.avgLoss.error.lo; noiseErr = (tmx * nz.error.lo) / NORM_DECILE; sgn = 1 }
    for (const m of this.modes) {
      if (m.ref.virtHeight <= 70) continue
      const signalPwr = pm.requiredReliability >= 0.5 ? (TME[idx] * m.sig.power10) / NORM_DECILE : (TME[idx] * m.sig.power90) / NORM_DECILE
      let pwr50 = Math.sqrt(signalPwr ** 2 + noisePwr ** 2)
      const pwr10 = pwr50 + Math.sqrt(nz.error.mdn ** 2 + this.avgLoss.error.mdn ** 2 + noiseErr ** 2 + signalErr ** 2 + DR ** 2)
      pwr50 = m.sig.snrDb + sgn * pwr50
      const z = (pm.requiredSnr - pwr50) / pwr10
      result = Math.max(result, 1 - cumulativeNormal(z))
    }
    return result
  }

  private calcMultiPathProb() {
    let result = 0.001
    if (this.path.dist > Rad_7000Km || this.modes.length === 0) return result
    const limit = this.bestMode.sig.powerDbw - this.pm.multipathPowerTolerance
    for (const m of this.modes) {
      if (Math.abs(m.sig.delayMs - this.bestMode.sig.delayMs) > this.pm.maxTolerableDelay && m.sig.powerDbw > limit) result = Math.max(result, m.sig.reliability)
    }
    return result
  }

  // ---------------- long path model (7000 km and more) ----------------
  private evaluateLongModel(): Prediction {
    const P = this.profiles
    const txRefl = P[0] === this.currProf ? this.refl : new Reflectrix(this.pm.minAngle, this.freq, P[0])
    const rxRefl = P[P.length - 1] === this.currProf ? this.refl : new Reflectrix(this.pm.minAngle, this.freq, P[P.length - 1])
    return this.doEvaluateLongModel(txRefl, rxRefl)
  }

  private combineShortAndLong(sh: Prediction, lg: Prediction): Prediction {
    const shortPwr10 = sh.sig.powerDbw - Math.abs(sh.sig.power10)
    const longPwr10 = lg.sig.powerDbw - Math.abs(lg.sig.power10)
    if (this.path.dist < Rad_7000Km) return sh
    if (shortPwr10 > longPwr10) return sh
    if (this.path.dist >= Rad_10000Km) return lg
    // long path/short path smoothing from the VOA memo of 15 Jan 1991
    const r: Prediction = { ...lg, sig: { ...lg.sig }, method: 'smooth' }
    const q = (this.path.dist - Rad_7000Km) / (Rad_10000Km - Rad_7000Km)
    const pwr = shortPwr10 + toDb(q * (fromDb(longPwr10 - shortPwr10) - 1) + 1)
    r.sig.powerDbw = pwr + lg.sig.power10
    r.sig.totalLossDb = this.txPowerDbw - r.sig.powerDbw
    r.sig.snrDb = r.sig.powerDbw - this.noise.combined
    r.sig.fieldDbuV = 107.2 + this.txPowerDbw + 2 * toDb(this.freq) - r.sig.totalLossDb - r.sig.rxGainDb
    this.calcReliability(r.sig, true)
    r.requiredPower = this.calcRequiredPower(r.sig)
    r.snrXX = this.pm.requiredSnr - r.requiredPower
    const m = newMode()
    m.ref.virtHeight = r.virtHeight
    m.sig = { ...r.sig }
    this.modes = [m]
    r.serviceProb = this.calcServiceProb()
    return r
  }

  private calcDeciles(freq: number, layer: Layer): Triple {
    const m = this.mufCalc.mufInfo[layer]
    const logProbMuf = -toDb(calcMufProb(freq, m.muf, m.muf, m.sigLo, m.sigHi))
    const logProbFot = -toDb(calcMufProb(freq, m.fot, m.fot, m.sigLo, m.sigHi))
    const logProbHpf = -toDb(calcMufProb(freq, m.hpf, m.hpf, m.sigLo, m.sigHi))
    const cs = m.ref.vertFreq / m.muf
    return { mdn: 0, lo: (logProbFot - logProbMuf) / cs, hi: (logProbMuf - logProbHpf) / cs }
  }

  private doEvaluateLongModel(txRefl: Reflectrix, rxRefl: Reflectrix): Prediction {
    const md = newMode()
    this.modes = [md]
    const txModes = this.listModes(txRefl), rxModes = this.listModes(rxRefl)
    const bestTx = this.selectOptimumAngle(txModes), bestRx = this.selectOptimumAngle(rxModes)

    const avgElevation = 0.5 * (bestTx.ref.elevation + bestRx.ref.elevation)
    md.ref.virtHeight = 0.5 * (bestTx.ref.virtHeight + bestRx.ref.virtHeight)

    // path structure: 0.5*ramp + straight + 0.5*ramp
    const hopDist = hopDistance(avgElevation, md.ref.virtHeight)
    const ramp = hopLength3D(avgElevation, hopDist, md.ref.virtHeight)
    const pathLen = ramp + (EarthR + md.ref.virtHeight) * Math.max(0.001, this.path.dist - hopDist)

    let convFact = ((pathLen / EarthR) * Math.cos(avgElevation)) / Math.max(0.000001, Math.abs(Math.sin(this.path.dist)))
    convFact = Math.min(15, toDb(convFact))
    md.freeSpaceLoss = 36.58 + 2 * toDb(0.6214 * pathLen * this.freq) - convFact

    const distI = this.path.dist - 0.5 * (bestTx.hopDist + bestRx.hopDist)
    const distM = this.calcMModeDistance(distI, this.freq)
    const distF = Math.max(0, distI - distM)
    const lossM = distM * EarthR * this.absPerKm(this.freq, avgElevation, md.ref.virtHeight, distM, 0.1)
    const lossF = distF * EarthR * this.absPerKm(this.freq, avgElevation, md.ref.virtHeight, distF, this.absorptionIndex)

    const txEndLoss = 0.5 * (bestTx.absorptionLoss + bestTx.deviationTerm)
    const rxEndLoss = 0.5 * (bestRx.absorptionLoss + bestRx.deviationTerm)
    md.groundLoss = 0.5 * (bestTx.groundLoss + bestRx.groundLoss)
    let hopCnt = Math.max(1, distF / (0.5 * (bestTx.hopDist + bestRx.hopDist)))

    // note: as in the original, the antenna gains are still zero when the loss is totalled
    md.sig.totalLossDb = md.freeSpaceLoss + txEndLoss + lossM + lossF + rxEndLoss + (hopCnt - 1) * md.groundLoss + this.adjAuroral - md.sig.txGainDb - md.sig.rxGainDb

    hopCnt = Math.max(1, this.path.dist / (bestTx.hopDist + bestRx.hopDist))
    md.hopCnt = Math.trunc(hopCnt)
    md.sig.txGainDb = this.pm.txGainDb
    md.sig.rxGainDb = this.pm.rxGainDb
    md.sig.delayMs = pathLen / VofL
    md.ref.elevation = bestTx.ref.elevation
    md.absorptionLoss = 0.5 * (bestTx.absorptionLoss + bestRx.absorptionLoss)
    md.obscuration = 0.5 * (bestTx.obscuration + bestRx.obscuration)
    md.deviationTerm = 0.5 * (bestTx.deviationTerm + bestRx.deviationTerm)
    md.sig.powerDbw = this.txPowerDbw - md.sig.totalLossDb
    md.sig.fieldDbuV = 107.2 + md.sig.powerDbw + 2 * toDb(this.freq) - md.sig.rxGainDb
    md.sig.snrDb = md.sig.powerDbw - this.noise.combined

    let dec = this.calcDeciles(this.freq, bestTx.layer)
    if (bestRx.layer !== bestTx.layer) {
      const d2 = this.calcDeciles(this.freq, bestRx.layer)
      dec = { mdn: 0, lo: 0.5 * (dec.lo + d2.lo), hi: 0.5 * (dec.hi + d2.hi) }
    }
    md.sig.power10 = Math.min(25, this.adjSignal10 + hopCnt * dec.lo)
    md.sig.power90 = Math.min(25, this.adjSignal90 + hopCnt * dec.hi)
    md.sig.mufDay = Math.min(bestTx.sig.mufDay, bestRx.sig.mufDay)

    const r = this.analyzeReliability()
    r.serviceProb = this.calcServiceProb()
    r.method = 'long'
    r.modeT = bestTx.layer
    r.modeR = bestRx.layer
    r.rxElevation = bestRx.ref.elevation
    return r
  }

  private absPerKm(freq: number, elev: number, virtHeight: number, dist: number, absIndex: number) {
    if (dist <= 0 || virtHeight <= 70) return 1000
    const AC = 677.2 * absIndex
    const BC = (freq + this.profiles[1].gyroFreq) ** 1.98 // gyro frequency at the path centre
    let r = AC / (BC + 10.2) / cosOfIncidence(elev, 100)
    const hops = dist / hopDistance(elev, virtHeight)
    return (r * hops) / (dist * EarthR)
  }

  /** Distance supported by M modes (for example a night-day-night path). */
  private calcMModeDistance(ionoDist: number, freq: number) {
    const pen = this.profiles.map((p) => p.E.fo / cosOfIncidence(DELOPT, p.E.hm))
    const fp1 = Math.max(pen[0], pen[2]), fp2 = pen[1], fp3 = Math.min(pen[0], pen[2])
    if (fp1 >= fp2) return 0
    if (freq >= fp2 + 0.001) return 0
    if (freq <= fp1 - 0.001) return 0
    let r = 0.5 * ionoDist * (fp2 - freq) * (1 / (fp2 - fp1) + 1 / (fp2 - fp3))
    if (r <= Rad_1000Km) r = 0
    if (ionoDist <= r + Rad_1000Km) r = 0 // must be able to get up there for an M mode
    return r
  }

  private computeLosses(m: ModeInfo, prof: IonoProfile, freq: number) {
    let nSqr: number, hEff: number, adx: number
    if (m.ref.vertFreq < prof.E.fo) {
      nSqr = m.ref.trueHeight >= HTLOSS ? 10.2 : XNUZ * Math.exp((-2 * (1 + (3 * (m.ref.trueHeight - 70)) / 18)) / HNU)
      hEff = Math.min(100, m.ref.trueHeight)
      adx = this.adjCCIR252A + this.adjCCIR252B * Math.log(Math.max(m.ref.vertFreq / prof.E.fo, this.adjDELoss))
    } else { nSqr = 10.2; hEff = 100; adx = 0 }
    const AC = 677.2 * prof.absorptionIndex
    const BC = (freq + prof.gyroFreq) ** 1.98
    m.absorptionLoss = AC / (BC + nSqr) / cosOfIncidence(m.ref.elevation, hEff)
    m.deviationTerm = (m.ref.devLoss / (BC + nSqr)) * ((m.ref.vertFreq + prof.gyroFreq) ** 1.98 + nSqr) / cosOfIncidence(m.ref.elevation, m.ref.virtHeight) + adx
    m.obscuration = 0
    m.groundLoss = this.meanGroundLoss(m.ref.elevation, freq)
  }

  // SETTXR
  private listModes(rf: Reflectrix): ModeInfo[] {
    const out: ModeInfo[] = []
    const fill = (m: ModeInfo) => {
      this.computeLosses(m, rf.prof, rf.mhz)
      const M = this.mufCalc.mufInfo[this.mufCalc.layer]
      m.sig.mufDay = calcMufProb(rf.mhz, M.muf, M.muf, M.sigLo, M.sigHi)
      m.absorptionLoss -= toDb(m.sig.mufDay) / cosOfIncidence(m.ref.elevation, m.ref.trueHeight) // adjustment to the absorption loss
    }
    for (const s of rf.refl) {
      if (s.ref.virtHeight >= 70 && Math.min(Rad_4000Km, this.path.dist) / s.hopDist >= 0.9 && s.ref.elevation >= this.pm.minAngle) {
        const m = newMode()
        m.ref = { ...s.ref }; m.hopCnt = s.hopCnt; m.hopDist = s.hopDist; m.layer = s.layer
        fill(m)
        out.push(m)
      }
    }
    if (out.length === 0) { // penetrated layer: try the over-the-MUF mode
      const M = this.mufCalc.mufInfo[this.mufCalc.layer]
      const m = newMode()
      m.ref = { ...M.ref }; m.hopCnt = M.hopCount; m.hopDist = this.path.dist / m.hopCnt; m.layer = this.mufCalc.layer
      fill(m)
      out.push(m)
    }
    return out
  }

  // SELTXR
  private selectOptimumAngle(modes: ModeInfo[]): ModeInfo {
    const dEnd = Math.min(Rad_4000Km, this.path.dist)
    const gain = (m: ModeInfo, hops: number) => this.pm.txGainDb - hops * (m.absorptionLoss + m.deviationTerm)
    let best = modes[0]
    let hops = dEnd / best.hopDist
    let bestFrac = Math.abs(hops - delphiRound(hops))
    let bestGain = gain(best, hops)
    let bestAngle = Math.abs(best.ref.elevation - DELOPT)
    for (let i = 1; i < modes.length; i++) {
      hops = dEnd / modes[i].hopDist
      const hopFrac = Math.abs(hops - delphiRound(hops))
      const g = gain(modes[i], hops)
      const angle = Math.abs(modes[i].ref.elevation - DELOPT)
      if (g < bestGain - GMIN) continue
      if (g <= bestGain + GMIN) {
        if (hopFrac > bestFrac + YMIN) continue
        if (hopFrac >= bestFrac - YMIN && angle > bestAngle) continue
      }
      best = modes[i]; bestFrac = hopFrac; bestGain = g; bestAngle = angle
    }
    return best
  }
}

