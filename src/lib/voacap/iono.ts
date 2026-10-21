// Port of LayrParm.pas and IonoProf.pas from DVOACAP (MIT, Copyright (c) 2013-2025 Alex Shovkoplyas, VE3NEA):
// layer parameters at a control point, the electron-density profile, ionogram, oblique frequencies and deviative loss.
import { Angles, EarthR, HALF_PI, JUST_BELOW_MAX_ELEV, MAX_NON_POLE_LAT, RinD, TWDIV, WT, XT, newDistribution, newLayer, sign,
  type ControlPoint, type Distribution, type LayerInfo, type ModeInfo, type MufInfo, type Reflection } from './types'
import { FixedMap, VarMap, type FourierMaps } from './maps'

// ============================ LayrParm ============================
function computeF2Retardation(pnt: ControlPoint): number {
  const DELZ = 2 * RinD, XF1 = 1.1
  const fc = 0.834 * pnt.F2.fo
  let fec = Math.max(1.1, fc / pnt.E.fo)
  let result = fec * Math.log((fec + 1) / (fec - 1))
  result = (result - 2) * pnt.E.ym

  if (pnt.F1.fo > 0) {
    fec = Math.max(XF1, fc / pnt.F1.fo)
    fec = fec * Math.log((fec + 1) / (fec - 1))
    const zn = pnt.zenMax - DELZ
    let rft: number
    if (pnt.zenAngle <= zn) rft = 0.5 * pnt.F1.ym * (fec - 2)
    else {
      // near day/night: force F1 up into F2 and retardation to zero from zn to zmax
      const sz = (pnt.zenAngle - zn) / DELZ
      const hn = 165 + (0.6428 / RinD) * zn
      const yn = (hn * pnt.F1.ym) / pnt.F1.hm
      rft = 0.5 * yn * (fec - 2) * (1 - sz)
      // F2 without F1
      const hm = pnt.hpF2 - result
      const ym = hm / pnt.rat
      let dh = hm - ym - (hn - yn)
      if (dh > 0) {
        dh = dh * (1 - sz)
        pnt.F1.hm = hm - ym - dh + pnt.F1.ym
        if (pnt.F1.fo > fc) {
          const y1max = yn + ((ym - yn) * (pnt.F1.fo / pnt.F2.fo - 0.834)) / 0.166
          pnt.F1.ym = yn + (y1max - yn) * sz
          pnt.F1.hm = hm - ym - dh + pnt.F1.ym
        }
      }
    }
    result += rft
  }
  return result
}

export function computeIonoParams(pnt: ControlPoint, map: FourierMaps) {
  const PSC4 = 0.7, BETAE = 5.5, BETAF1 = 4.0
  const cosLat = Math.cos(pnt.loc.lat)

  // E layer
  let v = map.computeVarMap(VarMap.Er, pnt.loc.lat, pnt.eastLon, cosLat)
  if (v < 0.36) v = 0.36 * Math.sqrt(1 + 0.0098 * map.ssn)
  pnt.E.fo = v
  pnt.E.hm = 110
  pnt.E.ym = 110 / BETAE
  pnt.absorp = -0.04 * Math.exp(-2.937 + 0.8445 * pnt.E.fo)

  // F1 layer
  pnt.zenMax = map.computeZenMax(pnt.magDip)
  if (pnt.zenAngle <= pnt.zenMax) {
    pnt.F1.fo = map.computeFoF1(pnt.zenAngle)
    pnt.F1.hm = 165 + (0.6428 / RinD) * pnt.zenAngle
    pnt.F1.ym = pnt.F1.hm / BETAF1
  } else pnt.F1.fo = 0

  // F2 layer
  const gm = Math.abs(pnt.magLat) - 0.25 * Math.PI
  const z = pnt.zenAngle * sign(pnt.localTime - 0.5) + Math.PI
  pnt.rat = Math.max(2, map.computeFixedMap(FixedMap.YmF2, gm, z))
  pnt.f2m3 = map.computeVarMap(VarMap.Fm3, pnt.magDip, pnt.eastLon, cosLat)
  pnt.hpF2 = 1490 / pnt.f2m3 - 176

  pnt.F2.fo = map.computeVarMap(VarMap.F2, pnt.magDip, pnt.eastLon, cosLat) + 0.5 * pnt.gyroFreq
  pnt.F1.fo = Math.min(pnt.F1.fo, pnt.F2.fo - 0.2) // F1 must be less than F2

  pnt.F2.hm = pnt.hpF2 - computeF2Retardation(pnt)
  pnt.F2.ym = pnt.F2.hm / pnt.rat

  // Es layer (kept for completeness; sporadic E is not used by the predictions, as in the original)
  pnt.Es.fo = map.computeVarMap(VarMap.EsM, pnt.magDip, pnt.eastLon, cosLat) * PSC4
  pnt.esFoLo = map.computeVarMap(VarMap.EsL, pnt.magDip, pnt.eastLon, cosLat) * PSC4
  pnt.esFoHi = map.computeVarMap(VarMap.EsU, pnt.magDip, pnt.eastLon, cosLat) * PSC4
  pnt.Es.hm = 110
}

// ============================ IonoProf ============================
export const HmD = 70, HmE = 110, YmE = 20
const BotE = HmE - 0.85 * YmE
const TopE = HmE + YmE
const Fnx = 1 - 0.85 * 0.85
const Alp = (2 * (HmE - BotE)) / (Fnx * YmE * YmE)

/** 1-based table search used throughout VOACAP. */
export function getIndexOf(value: number, arr: number[]): number {
  if (value <= arr[1]) return 1
  for (let f = 1; f <= arr.length - 2; f++) {
    if (arr[f] === value) return f
    if (sign(value - arr[f]) !== sign(value - arr[f + 1])) return f
  }
  return arr.length - 1
}
export function interpolateTable(x: number, arrX: number[], arrY: number[]): number {
  if (x <= arrX[1]) return arrY[1]
  const idx = getIndexOf(x, arrX)
  if (idx === arrX.length - 1 || x === arrX[idx]) return arrY[idx]
  const r = (x - arrX[idx]) / (arrX[idx + 1] - arrX[idx])
  return arrY[idx] * (1 - r) + arrY[idx + 1] * r
}
function interpolateRange(startH: number, endH: number, arr: number[]) {
  const dif = (arr[endH] - arr[startH]) / (endH - startH)
  for (let h = startH + 1; h <= endH - 1; h++) arr[h] = arr[h - 1] + dif
}
export function corrToMartynsTheorem(ref: Reflection) {
  const dH = (ref.virtHeight - ref.trueHeight) / EarthR
  return dH * (ref.trueHeight + 2 * (EarthR + ref.trueHeight) * dH)
}

const zeros = (n: number) => new Array<number>(n).fill(0)

export class IonoProfile {
  private FcE = 0; private FcV_bot = 0; private FcV_top = 0; private FcF1 = 0; private FcF2 = 0
  private BotV = 0; private TopV = 0; private BotF1 = 0; private TopF1 = 0; private BotF2 = 0
  private SlopeV = 0; private SlopeF1 = 0; private LinearF1 = false
  private fMhz = 0; private fTrueH = 0

  private densTrueHeight: number[] | null = null
  private elDensity: number[] = []

  lat = 0; magLat = 0; localTimeE = 0; localTimeF2 = 0
  E: LayerInfo = newLayer(); F1: LayerInfo = newLayer(); F2: LayerInfo = newLayer()

  igramVertFreq: number[] | null = null
  igramTrueHeight: number[] | null = null
  igramVirtHeight: number[] | null = null
  devLoss: number[] | null = null
  obliqueFreq: number[][] | null = null

  absorptionIndex = 0
  excessiveSystemLoss: Distribution = newDistribution()
  gyroFreq = 0

  get layers(): LayerInfo[] { return [this.E, this.F1, this.F2] }

  // ---- electron density profile ----
  computeElDensityProfile() {
    if (this.densTrueHeight) return
    this.densTrueHeight = zeros(51)
    this.elDensity = zeros(51)
    this.analyzeLayers()
    this.populateTrueHeightArray()
    this.populateElectronDensityArray()
  }

  private analyzeLayers() {
    const XLow = 0.8516
    const { E, F1, F2 } = this
    const xUp = (0.98 * E.fo) / F2.fo
    this.BotV = HmE + YmE * Math.sqrt(1 - XLow * XLow)
    this.BotF2 = F2.hm - F2.ym
    this.FcE = E.fo * E.fo
    this.FcF2 = F2.fo * F2.fo
    this.TopV = this.BotF2 + F2.ym * (1 - Math.sqrt(1 - xUp * xUp))
    this.FcV_top = xUp * xUp * this.FcF2
    this.FcV_bot = XLow * XLow * this.FcE
    this.SlopeV = this.TopV > this.BotV ? (this.FcV_top - this.FcV_bot) / (this.TopV - this.BotV) : 0

    if (F1.fo <= 0) return
    this.FcF1 = F1.fo * F1.fo
    this.BotF1 = F1.hm - F1.ym
    this.TopF1 = F1.hm + F1.ym
    const htw = this.BotF2 + F2.ym * (1 - Math.sqrt(1 - this.FcF1 / this.FcF2))

    if (htw > F1.hm + 0.001) { this.LinearF1 = false; F1.ym = Math.min(F1.ym, F1.hm - HmE + 1); return }

    let ys = Math.max(1, htw - this.BotF1)
    this.SlopeF1 = this.FcF1 / ys
    F1.hm = htw
    F1.ym = ys

    if (this.BotF2 < this.BotF1) { this.LinearF1 = false; F1.ym = F1.hm - Math.max(this.BotF2, HmE - 1); return }

    this.LinearF1 = true
    let yb = 1 - (E.fo / F1.fo) ** 2
    yb = Math.max(0.17, yb)
    yb = (F1.hm - HmE) / yb
    if (ys >= yb) { ys = yb; F1.ym = ys; this.SlopeF1 = this.FcF1 / ys; this.BotF1 = HmE }
    this.TopF1 = htw
  }

  private populateTrueHeightArray() {
    const D = this.densTrueHeight!
    const { F1, F2 } = this
    const dif = Math.max(0, 0.25 * (BotE - HmD))
    D[1] = HmD
    D[2] = D[1] + dif
    D[4] = BotE - Math.min(1, dif)
    D[3] = 0.5 * (D[2] + D[4])
    D[5] = BotE
    D[11] = HmE
    interpolateRange(5, 11, D)
    D[17] = HmE + YmE
    interpolateRange(11, 17, D)
    D[11] = 0.5 * (D[10] + D[12])
    D[50] = F2.hm
    if (F1.fo === 0 || F2.hm - F2.ym <= F1.hm - F1.ym + 0.00001) {
      D[18] = F2.hm - F2.ym
      interpolateRange(18, 50, D)
    } else {
      D[18] = Math.max(D[17] + 1, F1.hm - F1.ym)
      D[28] = F1.hm
      interpolateRange(18, 28, D)
      interpolateRange(28, 50, D)
    }
  }

  private populateElectronDensityArray() {
    const D = this.densTrueHeight!, N = this.elDensity
    const { F1, F2 } = this
    const fsq = Fnx * Math.exp(-Alp * (BotE - HmD))
    this.BotF1 = F1.fo > 0 ? Math.max(HmE, F1.hm - F1.ym) : 0
    for (let h = 1; h <= 50; h++) {
      const height = D[h]
      let fnD = 0, fnE = 0, fnVal = 0, fnF1 = 0, fnF2 = 0
      if (height > this.BotV && height < this.TopV) fnVal = this.FcV_top + this.SlopeV * (height - this.TopV)
      if (height < BotE) fnD = this.FcE * fsq * Math.exp(Alp * (height - HmD))
      else if (height <= TopE) fnE = this.FcE * (1 - ((height - HmE) / YmE) ** 2)
      if (F1.fo > 0 && height >= this.BotF1 && height <= this.TopF1) {
        fnF1 = this.LinearF1 ? this.SlopeF1 * (height - (F1.hm - F1.ym)) : this.FcF1 * (1 - ((height - F1.hm) / F1.ym) ** 2)
      }
      if (height >= this.BotF2) fnF2 = this.FcF2 * (1 - ((height - F2.hm) / F2.ym) ** 2)
      N[h] = Math.max(fnD, fnE, fnVal, fnF1, fnF2)
    }
  }

  // ---- true height <-> electron density ----
  private densityToHeight(dens: number) {
    const D = this.densTrueHeight!, N = this.elDensity
    if (dens <= N[1]) return D[1]
    for (let h = 2; h < N.length; h++) {
      if (dens <= N[h]) { const r = (dens - N[h - 1]) / (N[h] - N[h - 1]); return D[h - 1] * (1 - r) + D[h] * r }
    }
    return D[50]
  }
  private heightToDensity(height: number) {
    const D = this.densTrueHeight!, N = this.elDensity
    if (height <= D[1]) return N[1]
    if (height >= D[D.length - 1]) return N[N.length - 1]
    for (let h = 2; h < D.length; h++) {
      if (height <= D[h]) { const r = (height - D[h - 1]) / (D[h] - D[h - 1]); return N[h - 1] * (1 - r) + N[h] * r }
    }
    return N[1]
  }

  getTrueHeight(mhz: number) { this.fMhz = mhz; this.fTrueH = this.densityToHeight(mhz * mhz); return this.fTrueH }

  getVirtualHeightGauss(mhz: number) {
    const D = this.densTrueHeight!
    if (mhz !== this.fMhz) this.getTrueHeight(mhz)
    const ht = this.fTrueH - D[1]
    const dens = mhz * mhz
    let result = 0
    for (let i = 0; i < XT.length; i++) {
      let ymup = D[1] + ht * (1 - TWDIV * (1 - XT[i]))
      ymup = Math.min(0.9999, this.heightToDensity(ymup) / dens)
      ymup = 1 / Math.sqrt(1 - ymup)
      let zmup = D[1] + ht * (1 - TWDIV * (1 + XT[i]))
      zmup = Math.min(0.9999, this.heightToDensity(zmup) / dens)
      zmup = 1 / Math.sqrt(1 - zmup)
      result += WT[i] * (ymup + zmup)
    }
    return D[1] + ht * TWDIV * result
  }

  // ---- ionogram ----
  computeIonogram() {
    if (this.igramTrueHeight) return
    if (!this.densTrueHeight) this.computeElDensityProfile()
    const { E, F1, F2 } = this
    const vf = zeros(31)
    vf[1] = 0.01
    vf[4] = E.fo * Math.sqrt(Fnx)
    interpolateRange(1, 4, vf)
    vf[9] = 0.957 * E.fo
    vf[10] = 0.99 * E.fo
    interpolateRange(4, 9, vf)
    vf[11] = 1.05 * E.fo
    vf[30] = 0.99 * F2.fo
    vf[29] = 0.98 * F2.fo
    vf[28] = 0.96 * F2.fo
    vf[27] = 0.92 * F2.fo
    if (F1.fo > 0) {
      vf[20] = 0.99 * F1.fo
      interpolateRange(11, 20, vf)
      vf[21] = 1.01 * F1.fo
      interpolateRange(21, 27, vf)
    } else interpolateRange(11, 27, vf)
    this.igramVertFreq = vf
    const th = zeros(31), vh = zeros(31)
    for (let i = 1; i <= 30; i++) { th[i] = this.getTrueHeight(vf[i]); vh[i] = this.getVirtualHeightGauss(vf[i]) }
    this.igramTrueHeight = th
    this.igramVirtHeight = vh
  }

  computeObliqueFreqs(angleCount: number) {
    if (this.obliqueFreq) return
    const vf = this.igramVertFreq!, th = this.igramTrueHeight!
    const of: number[][] = Array.from({ length: angleCount + 1 }, () => zeros(31))
    for (let a = 1; a <= angleCount; a++) {
      const rCosA = EarthR * Math.cos(Angles[a])
      for (let h = 1; h <= 30; h++) of[a][h] = Math.trunc((1000 * vf[h]) / Math.sqrt(1 - (rCosA / (EarthR + th[h])) ** 2))
    }
    this.obliqueFreq = of
  }

  computeDeviativeLoss(mufs: MufInfo[]) {
    if (this.devLoss) return
    const dl = zeros(31)
    this.devLoss = dl
    const th = this.igramTrueHeight!, vh = this.igramVirtHeight!
    const { F1 } = this
    let Hm = 0, Hz = 0, Cf = 0, A = 0
    const computeExp = (h: number, ym: number, mx = 0.05) => {
      Cf = -2 * (th[h] - Hz) / ym
      Cf = Math.max(-10, Cf)
      Cf = A * Math.exp(Cf)
      if (mx > 0) Cf = Math.max(mx, Cf)
      return Math.max(0, Cf * (vh[h] - th[h] - Hm))
    }

    // E layer
    A = 0.2
    Hz = HmE - YmE
    Hm = mufs[0].ref.virtHeight - mufs[0].ref.trueHeight
    for (let h = 1; h <= 10; h++) if (th[h] > mufs[0].ref.trueHeight) dl[h] = computeExp(h, YmE, 0)

    if (F1.fo > 0) {
      // F1 layer: continuity at the E to F1 cusp
      A = Cf; Hz = th[11]; Hm = vh[13] - th[13]
      for (let h = 11; h <= 12; h++) dl[h] = computeExp(h, F1.ym)
      dl[13] = 0
      A = 0.1
      Hm = mufs[1].ref.virtHeight - mufs[1].ref.trueHeight
      for (let h = 14; h <= 20; h++) if (th[h] > mufs[1].ref.trueHeight) dl[h] = computeExp(h, F1.ym)
      // F2 layer with an F1 ledge
      A = Cf; Hz = th[21]; Hm = vh[23] - th[23]
      for (let h = 21; h <= 22; h++) dl[h] = computeExp(h, this.F2.ym)
      dl[23] = 0
      A = 0.1
      Hm = mufs[2].ref.virtHeight - mufs[2].ref.trueHeight
      for (let h = 24; h <= 30; h++) if (th[h] > mufs[2].ref.trueHeight) dl[h] = computeExp(h, this.F2.ym)
    } else {
      // F2 layer with no F1 ledge
      A = Cf; Hz = th[11]; Hm = vh[13] - th[13]
      for (let h = 11; h <= 12; h++) dl[h] = computeExp(h, this.F2.ym)
      dl[13] = 0
      A = 0.1
      Hm = mufs[2].ref.virtHeight - mufs[2].ref.trueHeight
      for (let h = 14; h <= 30; h++) if (th[h] > mufs[2].ref.trueHeight) dl[h] = computeExp(h, this.F2.ym, 0.5)
    }
  }

  /** Elevation angle at which each layer is penetrated, at frequency `mhz`. */
  computePenetrationAngles(mhz: number): [number, number, number] {
    const vf = this.igramVertFreq!, th = this.igramTrueHeight!
    const out: [number, number, number] = [0, 0, 0]
    const computeElev = (height: number, frat: number) => {
      const r = ((EarthR + height) * Math.sqrt(1 - frat)) / EarthR
      return r > 0.999999 ? 0 : Math.acos(r)
    }
    let frat = (vf[10] / mhz) ** 2
    if (frat < 0.9999) out[0] = computeElev(th[10], frat)
    else { out[0] = JUST_BELOW_MAX_ELEV; out[1] = HALF_PI; out[2] = HALF_PI; return out }

    if (this.F1.fo > 0) {
      frat = (vf[20] / mhz) ** 2
      if (frat < 0.9999) out[1] = computeElev(th[20], frat)
      else { out[1] = 89.9 * RinD; out[2] = 90 * RinD; return out }
    } else out[1] = out[0]

    if (mhz <= vf[30] + 0.0001) { out[2] = MAX_NON_POLE_LAT; return out }
    const xm = (i: number) => (EarthR + th[i]) * Math.sqrt(1 - (vf[i] / mhz) ** 2)
    const xm28 = xm(28), xm29 = xm(29), xm30 = xm(30)
    let X: number
    if (xm30 >= xm29) X = xm28 > xm30 ? xm28 : xm30
    else X = xm29 >= xm28 ? xm29 : xm28
    X /= EarthR
    out[2] = X > 0.999999 ? 0 : Math.acos(X)
    return out
  }

  /** Copy the ionogram row `idx` (or a linear blend of rows idx and idx+1) into the mode's reflection. */
  populateModeInfo(mode: ModeInfo, idx: number, frac = 0) {
    const th = this.igramTrueHeight!, vh = this.igramVirtHeight!, vf = this.igramVertFreq!, dl = this.devLoss!
    if (frac === 0) { mode.ref.trueHeight = th[idx]; mode.ref.virtHeight = vh[idx]; mode.ref.vertFreq = vf[idx]; mode.ref.devLoss = dl[idx] }
    else {
      mode.ref.trueHeight = th[idx] * (1 - frac) + th[idx + 1] * frac
      mode.ref.virtHeight = vh[idx] * (1 - frac) + vh[idx + 1] * frac
      mode.ref.vertFreq = vf[idx] * (1 - frac) + vf[idx + 1] * frac
      mode.ref.devLoss = dl[idx] * (1 - frac) + dl[idx + 1] * frac
    }
  }
}

