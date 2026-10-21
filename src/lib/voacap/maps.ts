// Port of FrMaps.pas from DVOACAP (MIT, Copyright (c) 2013-2025 Alex Shovkoplyas, VE3NEA): the Fourier-series ionospheric maps
// (foF2, M(3000), foE, foEs, noise, land/sea) that VOACAP reads from its CCIR/URSI coefficient files.
import { COEFF_BYTES, FOF2_BYTES, VOACAP_MONTHS } from './coeffs'
import { HALF_PI, NORM_DECILE, RinD, TWO_PI, delphiRound, newDistribution, type Distribution } from './types'
import { makeSinCosArray } from './geo'

export const enum FixedMap { Noise1, Noise2, Noise3, Noise4, Noise5, Noise6, LandMass, YmF2 }
export const enum VarMap { EsU, EsM, EsL, F2, Fm3, Er }

type N1 = number[]
type N2 = number[][]
type N3 = number[][][]

class Reader {
  private dv: DataView
  pos = 0
  constructor(bytes: Uint8Array) { this.dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength) }
  private flat(n: number, f: (o: number) => number, size: number) { const a = new Array<number>(n); for (let i = 0; i < n; i++, this.pos += size) a[i] = f(this.pos); return a }
  i32(n: number) { return this.flat(n, (o) => this.dv.getInt32(o, true), 4) }
  f32(n: number) { return this.flat(n, (o) => this.dv.getFloat32(o, true), 4) }
  // nested arrays, last dimension varies fastest (as in the Pascal arrays)
  a1(a: number): N1 { return this.f32(a) }
  a2(a: number, b: number): N2 { return Array.from({ length: a }, () => this.f32(b)) }
  a3(a: number, b: number, c: number): N3 { return Array.from({ length: a }, () => this.a2(b, c)) }
}

const decodeBase64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))

export class FourierMaps {
  private IKIM: number[][] = []
  private SYS: N3 = []
  private F2D: N3 = []
  private PERR: N3 = []
  private ANEW: N1 = []; private BNEW: N1 = []; private ACHI: N1 = []; private BCHI: N1 = []
  private XPMAP: N3 = []
  private XFM3CF: N3 = []; private XESMCF: N3 = []; private XESLCF: N3 = []; private XESUCF: N3 = []; private XERCOF: N3 = []; private XF2COF: N3 = []
  // fixed maps P[kind][n][m] and ABP[kind][0..1]
  private P: N3 = []
  private ABP: N2 = []
  private COFION: N2[] = []
  private CoefV: N1[] = []
  DUD: N3 = []
  FAM: N3 = []

  month = 0
  ssn = 0
  utc = 0

  constructor() { this.setMonthSsnUtc(1, 1, 1) }

  setMonthSsnUtc(month: number, ssn: number, utc: number) {
    if (this.month !== month) { this.loadMonth(month); this.interpolateInSsn(ssn); this.interpolateInUtc(utc) }
    else if (ssn !== this.ssn) { this.interpolateInSsn(ssn); this.interpolateInUtc(utc) }
    else if (utc !== this.utc) this.interpolateInUtc(utc)
  }

  private loadMonth(month: number) {
    this.month = month
    const all = decodeBase64(VOACAP_MONTHS[month - 1])
    const r = new Reader(all.subarray(0, COEFF_BYTES))
    this.IKIM = Array.from({ length: 6 }, () => r.i32(10))
    this.DUD = r.a3(5, 12, 5)
    this.FAM = r.a3(12, 2, 7)
    this.SYS = r.a3(6, 16, 9)
    const FAKP = r.a3(6, 16, 29)
    const FAKABP = r.a2(6, 2)
    this.XFM3CF = r.a3(2, 49, 9)
    this.ANEW = r.a1(3); this.BNEW = r.a1(3); this.ACHI = r.a1(2); this.BCHI = r.a1(2)
    const FAKMAP = r.a2(16, 29)
    const ABMAP = r.a2(3, 2)
    this.F2D = r.a3(6, 6, 16)
    this.PERR = r.a3(6, 4, 9)
    this.XESMCF = r.a3(2, 61, 7)
    this.XPMAP = r.a3(2, 16, 29)
    this.XESLCF = r.a3(2, 55, 5)
    this.XESUCF = r.a3(2, 55, 5)
    this.XERCOF = r.a3(2, 22, 9)
    if (r.pos !== COEFF_BYTES) throw new Error('VOACAP coefficient data has an unexpected size')
    this.P = [...FAKP, FAKMAP, FAKMAP.map((row) => row.slice())] // [7] (YmF2) is filled in by interpolateInSsn
    this.ABP = [...FAKABP, ABMAP[0], ABMAP[1]]
    this.XF2COF = new Reader(all.subarray(COEFF_BYTES, COEFF_BYTES + FOF2_BYTES)).a3(2, 76, 13)
  }

  private interpolateInSsn(ssn: number) {
    this.ssn = ssn
    const r100 = (ssn - 0) / (100 - 0), r125 = (ssn - 25) / (125 - 25), r150 = (ssn - 10) / (150 - 10)
    const mix = (x: N3, r: number): N2 => x[0].map((row, i) => row.map((v, j) => v * (1 - r) + x[1][i][j] * r))
    const c: N2[] = []
    c[VarMap.F2] = mix(this.XF2COF, r100)
    c[VarMap.EsM] = mix(this.XESMCF, r150)
    // note from the original: XESLCF is Hi and XESUCF is Lo (a quirk of the input data)
    c[VarMap.EsL] = mix(this.XESUCF, r150)
    c[VarMap.EsU] = mix(this.XESLCF, r150)
    c[VarMap.Fm3] = mix(this.XFM3CF, r100)
    c[VarMap.Er] = mix(this.XERCOF, r150)
    this.COFION = c
    this.P[FixedMap.YmF2] = mix(this.XPMAP, r125)
  }

  private interpolateInUtc(utc: number) {
    this.utc = utc
    const W = makeSinCosArray((utc - 0.5) * TWO_PI, 7)
    this.CoefV = this.COFION.map((cof, m) => cof.map((row) => {
      let v = row[0]
      for (let j = 1; j <= this.IKIM[m][9]; j++) v += W[j].sn * row[2 * j - 1] + W[j].cs * row[2 * j]
      return v
    }))
  }

  computeFixedMap(kind: FixedMap, lat: number, eastLon: number) {
    let result = this.ABP[kind][0] + this.ABP[kind][1] * (lat + HALF_PI)
    const Lm = kind === FixedMap.YmF2 ? 15 : 29, Ln = kind === FixedMap.YmF2 ? 10 : 15
    const Wn = makeSinCosArray(0.5 * eastLon, Ln + 1), Wm = makeSinCosArray(lat + HALF_PI, Lm + 1)
    const P = this.P[kind]
    for (let m = 0; m < Lm; m++) {
      let R = 0
      for (let n = 0; n < Ln; n++) R += Wn[n + 1].sn * P[n][m]
      result += Wm[m + 1].sn * (R + P[15][m])
    }
    return result
  }

  /** `lat` is the latitude or the magnetic dip, depending on the map kind; `gob` is cos(latitude). */
  computeVarMap(kind: VarMap, lat: number, eastLon: number, gob: number) {
    const coef = this.CoefV[kind], ik = this.IKIM[kind]
    const G = new Array<number>(coef.length).fill(0)
    const sx = Math.sin(lat)
    G[1] = sx
    let lastI = ik[0]
    for (let i = 2; i <= lastI; i++) G[i] = G[i - 1] * sx
    let powerCx = gob
    for (let pwrC = 1; pwrC <= 8; pwrC++) {
      let i = lastI + 1
      lastI = ik[pwrC]
      if (i >= lastI) break
      G[i] = powerCx * Math.cos(pwrC * eastLon)
      G[i + 1] = powerCx * Math.sin(pwrC * eastLon)
      i += 2
      while (i < lastI) { G[i] = sx * G[i - 2]; G[i + 1] = sx * G[i - 1]; i += 2 }
      powerCx *= gob
    }
    let result = coef[0]
    for (let i = 1; i <= lastI; i++) result += G[i] * coef[i]
    return result
  }

  computeZenMax(magDip: number) { return RinD * (this.ACHI[0] + this.BCHI[0] * this.ssn + (this.ACHI[1] + this.BCHI[1] * this.ssn) * Math.cos(magDip)) }

  computeFoF1(zenAngle: number) {
    const c = Math.cos(zenAngle)
    return (this.ANEW[0] + this.BNEW[0] * this.ssn) + (this.ANEW[1] + this.BNEW[1] * this.ssn) * c + (this.ANEW[2] + this.BNEW[2] * this.ssn) * c * c
  }

  computeF2Deviation(muf: number, lat: number, localTime: number, above: boolean) {
    let T = Math.trunc(localTime * 6 + 0.55)
    if (T >= 6) T = 0
    let L = Math.trunc(8.5 - Math.abs(lat) * 0.1 / RinD)
    if (L < 0) L = 0; else if (L > 7) L = 7
    if (!above) L += 8
    let S = this.ssn <= 50 ? 0 : this.ssn <= 100 ? 1 : 2
    if (lat <= 0) S += 3
    return Math.max(0.001, Math.abs((1 - this.F2D[T][S][L]) * muf) * (1 / NORM_DECILE))
  }

  computeExcessiveSystemLoss(magLat: number, localTime: number, over2500km: boolean): Distribution {
    const NN = over2500km ? 3 : 0, ND = magLat < 0 ? 3 : 0
    const hour = delphiRound(localTime * 24)
    let LJ = Math.floor(hour / 3 - 0.33)
    if (LJ < 0) LJ = 7
    if (magLat < 0) LJ += 8
    let LD = Math.floor(hour / 6 - 0.33)
    if (LD < 0) LD = 3
    const KJ = Math.max(0, Math.min(8, delphiRound((Math.abs(magLat / RinD) - 40) / 5)))
    const r = newDistribution()
    r.value.mdn = this.SYS[NN + 1][LJ][KJ]
    r.value.hi = this.SYS[NN + 2][LJ][KJ] / NORM_DECILE
    r.value.lo = this.SYS[NN][LJ][KJ] / NORM_DECILE
    r.error.mdn = this.PERR[ND][LD][KJ]
    r.error.hi = this.PERR[ND + 1][LD][KJ]
    r.error.lo = this.PERR[ND + 2][LD][KJ]
    return r
  }

  computeFam(i1: number, i2: number, u: number) { const a = this.FAM[i1][i2]; let r = a[0]; for (let i = 1; i < a.length; i++) r = u * r + a[i]; return r }
  computeDud(i1: number, i2: number, u: number) { const a = this.DUD[i1][i2]; let r = a[0]; for (let i = 1; i < a.length; i++) r = u * r + a[i]; return r }
}
