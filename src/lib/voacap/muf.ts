// Port of MufCalc.pas from DVOACAP (MIT, Copyright (c) 2013-2025 Alex Shovkoplyas, VE3NEA): MUF, FOT and HPF for the E, F1 and F2 layers.
import { NORM_DECILE, Rad_2000Km, cumulativeNormal, newMufInfo, type Layer, type MufInfo } from './types'
import { calcElevationAngle, sinOfIncidence, type PathGeometry } from './geo'
import { corrToMartynsTheorem, YmE, HmE, type IonoProfile } from './iono'
import type { FourierMaps } from './maps'

const FQDEL = 0.1

/** The profile that controls the circuit: the one with the lowest foE (or foF2) among those along the path. */
export function selectProfile(profiles: IonoProfile[]): IonoProfile {
  switch (profiles.length) {
    case 1: return profiles[0]
    case 2: return profiles[0].E.fo <= profiles[1].E.fo ? profiles[0] : profiles[1]
    default:
      if (Math.abs(profiles[0].F2.fo - profiles[2].F2.fo) > 0.01) return profiles[0].F2.fo <= profiles[2].F2.fo ? profiles[0] : profiles[2]
      return profiles[0].E.fo <= profiles[2].E.fo ? profiles[0] : profiles[2]
  }
}

/** Probability that the MUF exceeds `freq`. */
export function calcMufProb(freq: number, modeMuf: number, median: number, sigmaLo: number, sigmaHi: number) {
  let z = freq - modeMuf
  if (median <= 0) return z <= 0 ? 1 : 0
  const sig = z <= 0 ? sigmaLo : sigmaHi
  z = z / Math.max(0.001, (modeMuf * sig) / median)
  return 1 - cumulativeNormal(z)
}

export class CircuitMuf {
  private profile!: IonoProfile
  private hopDist = 0
  private sinISqr = 0
  path!: PathGeometry
  map!: FourierMaps
  minAngle = 0
  mufInfo: MufInfo[] = [newMufInfo(), newMufInfo(), newMufInfo()]
  fot = 0; muf = 0; hpf = 0; angle = 0; layer: Layer = 2

  computeCircuitMuf(profiles: IonoProfile[]) {
    this.profile = selectProfile(profiles)
    this.profile.computeElDensityProfile()
    this.mufInfo[0] = this.computeMufE()
    this.mufInfo[2] = this.computeMufF2()
    this.mufInfo[1] = this.profile.F1.fo === 0 ? { ...this.mufInfo[0], ref: { ...this.mufInfo[0].ref } } : this.computeMufF1()
    const m = this.mufInfo
    this.fot = Math.max(m[0].fot, m[1].fot, m[2].fot)
    this.muf = Math.max(m[0].muf, m[1].muf, m[2].muf)
    this.hpf = Math.max(m[0].hpf, m[1].hpf, m[2].hpf)
    if (m[0].muf >= this.muf) { this.angle = m[0].ref.elevation; this.layer = 0 }
    else if (m[1].muf >= this.muf) { this.angle = m[1].ref.elevation; this.layer = 1 }
    else { this.angle = m[2].ref.elevation; this.layer = 2 }
  }

  private computeMufE(): MufInfo {
    const r = newMufInfo()
    r.ref.vertFreq = this.profile.E.fo / Math.sqrt(1 + (0.5 * YmE) / HmE)
    this.firstEstimate(r)
    r.sigLo = Math.max(0.01, 0.1 * r.muf)
    r.sigHi = r.sigLo
    r.fot = r.muf - NORM_DECILE * r.sigLo
    r.hpf = r.muf + NORM_DECILE * r.sigHi
    r.ref.devLoss = 0
    return r
  }

  private computeMufF2(): MufInfo {
    const BEX = 9.5
    const r = newMufInfo(), F2 = this.profile.F2
    const xtF2 = 1 / Math.sqrt(1 + (0.5 * F2.ym) / F2.hm)
    r.ref.vertFreq = F2.fo * xtF2
    if (this.path.dist < Rad_2000Km) r.ref.vertFreq *= 1 + (1 / xtF2 - 1) * Math.exp((-BEX * this.path.dist) / Rad_2000Km) // approach MUF(0)
    this.firstEstimate(r)
    this.refineEstimate(r, F2.fo)
    r.sigLo = Math.max(0.01, this.map.computeF2Deviation(r.muf, this.profile.lat, this.profile.localTimeF2, false))
    r.sigHi = Math.max(0.01, this.map.computeF2Deviation(r.muf, this.profile.lat, this.profile.localTimeF2, true))
    r.fot = r.muf - NORM_DECILE * r.sigLo
    r.hpf = r.muf + NORM_DECILE * r.sigHi
    r.ref.devLoss = 0
    return r
  }

  private computeMufF1(): MufInfo {
    const r = newMufInfo(), F1 = this.profile.F1
    r.ref.vertFreq = F1.fo / Math.sqrt(1 + (0.5 * F1.ym) / F1.hm)
    this.firstEstimate(r)
    this.refineEstimate(r, F1.fo)
    r.sigLo = Math.max(0.01, 0.1 * r.muf)
    r.sigHi = r.sigLo
    r.fot = r.muf - NORM_DECILE * r.sigLo
    r.hpf = r.muf + NORM_DECILE * r.sigHi
    r.ref.devLoss = 0
    return r
  }

  private firstEstimate(r: MufInfo) {
    r.ref.trueHeight = this.profile.getTrueHeight(r.ref.vertFreq)
    r.ref.virtHeight = this.profile.getVirtualHeightGauss(r.ref.vertFreq)
    r.hopCount = this.path.hopCount(this.minAngle, r.ref.virtHeight)
    this.hopDist = this.path.dist / r.hopCount
    r.ref.elevation = calcElevationAngle(this.hopDist, r.ref.virtHeight)
    this.sinISqr = sinOfIncidence(r.ref.elevation, r.ref.trueHeight) ** 2
    r.muf = r.ref.vertFreq / Math.sqrt(1 - this.sinISqr)
  }

  private refineEstimate(r: MufInfo, layerFo: number) {
    const origHeight = r.ref.virtHeight
    const corr0 = corrToMartynsTheorem(r.ref)
    for (let i = 1; i <= 4; i++) {
      const prevMuf = r.muf
      const corr = corr0 * (prevMuf / layerFo) ** 2 * this.sinISqr
      r.ref.virtHeight = origHeight + corr
      r.ref.elevation = calcElevationAngle(this.hopDist, r.ref.virtHeight)
      this.sinISqr = sinOfIncidence(r.ref.elevation, r.ref.trueHeight) ** 2
      r.muf = r.ref.vertFreq / Math.sqrt(1 - this.sinISqr)
      if (Math.abs(r.muf - prevMuf) <= FQDEL) break
    }
  }
}
