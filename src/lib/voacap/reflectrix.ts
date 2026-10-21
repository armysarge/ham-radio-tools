// Port of Reflx.pas from DVOACAP (MIT, Copyright (c) 2013-2025 Alex Shovkoplyas, VE3NEA): the reflectrix, i.e. every propagation mode
// (layer, take-off angle, hop distance) that a profile supports at one frequency, and the modes that fit a given hop distance.
import { Angles, EarthR, JUST_BELOW_MAX_ELEV, MAX_ELEV_ANGLE, MAX_NON_POLE_LAT, RinD, cloneMode, newMode, type Layer, type ModeInfo } from './types'
import { calcElevationAngle, cosOfIncidence, hopDistance, sinOfIncidence } from './geo'
import { corrToMartynsTheorem, getIndexOf, interpolateTable, type IonoProfile } from './iono'
import type { CircuitMuf } from './muf'

const MAX_MODES = 6
const LAYER_END = [10, 20, 30]

export class Reflectrix {
  private kHz = 0
  private lr: Layer = 0
  private htIdx = 0; private lowH = 0; private highH = 0
  private angIdx = 0
  private penAngles: [number, number, number] = [0, 0, 0]
  private modeCnt = 0
  private done = false

  mhz = 0
  prof!: IonoProfile
  minAngle: number
  refl: ModeInfo[] = []
  modes: ModeInfo[] = []
  skipDistance = 0
  maxDistance = 0

  constructor(minAngle: number, freq: number, prof: IonoProfile) {
    this.minAngle = minAngle
    this.computeReflectrix(freq, prof)
  }

  // ---------- all modes for the frequency ----------
  private computeReflectrix(mhz: number, prof: IonoProfile) {
    this.mhz = mhz
    this.kHz = Math.trunc(mhz * 1000)
    this.prof = prof
    this.penAngles = prof.computePenetrationAngles(mhz)
    this.skipDistance = 2147483647
    this.maxDistance = 0
    this.refl = Array.from({ length: 45 }, () => newMode())
    this.modeCnt = 0
    this.highH = 0
    this.angIdx = 0
    this.done = false
    this.findModesForLayer(0)
    if (!this.done && prof.F1.fo > 0) this.findModesForLayer(1)
    if (!this.done) this.findModesForLayer(2)
    this.refl.length = this.modeCnt
  }

  private findModesForLayer(layer: Layer) {
    this.lr = layer
    this.lowH = this.highH + 1
    this.highH = LAYER_END[layer]
    this.htIdx = this.lowH

    const pen = this.penAngles[layer]
    if (pen <= 0) { this.done = false; return }
    if (pen > MAX_ELEV_ANGLE) { this.done = true; return }

    const OF = this.prof.obliqueFreq!
    for (;;) {
      this.angIdx++
      if (this.angIdx > OF.length - 1) { this.done = true; return }
      if (Angles[this.angIdx] >= pen) { this.addReflCusp(); return }
      for (;;) {
        const row = OF[this.angIdx]
        if (row[this.lowH] >= this.kHz) { this.addReflExact(); break }
        else if (this.htIdx >= this.highH) break
        else if (this.kHz === row[this.htIdx]) { this.addReflExact(); break }
        else if (this.kHz > row[this.htIdx] && this.kHz <= row[this.htIdx + 1]) { this.addReflInterp(); break }
        else this.htIdx++
      }
      if (this.done) return
    }
  }

  private addReflExact() {
    const m = this.refl[this.modeCnt]
    m.ref.elevation = Angles[this.angIdx]
    m.layer = this.lr
    this.prof.populateModeInfo(m, this.htIdx)
    this.addRefl()
  }

  private addReflInterp() {
    const m = this.refl[this.modeCnt]
    const row = this.prof.obliqueFreq![this.angIdx]
    m.ref.elevation = Angles[this.angIdx]
    m.layer = this.lr
    let r = row[this.htIdx + 1] - row[this.htIdx]
    r = (this.kHz - row[this.htIdx]) / Math.max(1, r)
    this.prof.populateModeInfo(m, this.htIdx, r)
    this.addRefl()
  }

  private addReflCusp() {
    this.angIdx-- // keep the angle count correct
    let m = this.refl[this.modeCnt]
    m.ref.elevation = this.penAngles[this.lr]
    m.layer = this.lr
    this.prof.populateModeInfo(m, this.highH)
    this.addRefl()

    this.done = this.done || this.lr === 2 || this.penAngles[this.lr] >= MAX_NON_POLE_LAT
    if (this.done) return

    // insert the cusp of the next layer
    m = this.refl[this.modeCnt]
    m.ref.elevation = this.refl[this.modeCnt - 1].ref.elevation + 0.001 * RinD
    m.layer = this.prof.F1.fo > 0 ? ((this.lr + 1) as Layer) : 2
    this.prof.populateModeInfo(m, this.highH + 1)
    this.addRefl()
  }

  private addRefl() {
    const m = this.refl[this.modeCnt]
    const xfsq = (this.mhz / this.prof.F2.fo) ** 2
    const xmut = 1 - (m.ref.vertFreq / this.mhz) ** 2
    m.ref.virtHeight += xfsq * xmut * corrToMartynsTheorem(m.ref)
    m.hopDist = hopDistance(m.ref.elevation, m.ref.virtHeight)
    if (m.hopDist < this.skipDistance) this.skipDistance = m.hopDist
    if (m.hopDist >= this.maxDistance && m.ref.elevation >= this.minAngle) this.maxDistance = m.hopDist
    this.modeCnt++
    this.done = this.modeCnt > this.refl.length - 1
  }

  // ---------- modes for a hop distance ----------
  findModes(hopDist: number, hopCnt: number) {
    this.modes = []
    this.modeCnt = 0
    if (hopDist >= this.maxDistance) return
    const R = this.refl, tol = 0.001 / EarthR
    let r = -1
    do {
      r++
      if (r >= R.length - 1) break
      const a = R[r].hopDist, b = R[r + 1].hopDist
      if (a < b) {
        if (hopDist < a) continue
        else if (hopDist === a) this.addModeExact(r, hopDist, hopCnt)
        else if (hopDist > b) continue
        else if (hopDist === b) { r++; this.addModeExact(r, hopDist, hopCnt) }
        else if (Math.abs(b - a) <= tol) this.addModeExact(r, hopDist, hopCnt)
        else this.addModeInterp(r, hopDist, hopCnt)
      } else if (a > b) {
        if (a < hopDist) continue
        else if (a === hopDist) this.addModeExact(r, hopDist, hopCnt)
        else if (hopDist < b) continue
        else if (hopDist === b) { r++; this.addModeExact(r, hopDist, hopCnt) }
        else if (Math.abs(b - a) <= tol) this.addModeExact(r, hopDist, hopCnt)
        else this.addModeInterp(r, hopDist, hopCnt)
      } else {
        // perhaps a bug in VOACAP (kept as is): should be the other way around
        if (Math.abs(hopDist - a) <= tol) continue
        else this.addModeExact(r, hopDist, hopCnt)
      }
    } while (this.modeCnt < MAX_MODES)
    this.modes.length = this.modeCnt
  }

  private addModeExact(idx: number, hopDist: number, hopCnt: number) {
    const m = cloneMode(this.refl[idx])
    if (m.ref.elevation >= this.minAngle) {
      m.hopDist = hopDist
      m.hopCnt = hopCnt
      this.modes[this.modeCnt++] = m
    }
  }

  private addModeInterp(idx: number, hopDist: number, hopCnt: number) {
    const A = this.refl[idx], B = this.refl[idx + 1]
    const m = newMode()
    m.layer = A.layer
    m.hopDist = hopDist
    m.hopCnt = hopCnt
    const r = (hopDist - A.hopDist) / (B.hopDist - A.hopDist)
    m.ref.trueHeight = A.ref.trueHeight * (1 - r) + B.ref.trueHeight * r
    m.ref.virtHeight = A.ref.virtHeight * (1 - r) + B.ref.virtHeight * r
    m.ref.devLoss = A.ref.devLoss * (1 - r) + B.ref.devLoss * r
    // force correct geometry: radiation angle, then Snell's law for the vertical frequency
    m.ref.elevation = calcElevationAngle(hopDist, m.ref.virtHeight)
    m.ref.vertFreq = this.mhz * cosOfIncidence(m.ref.elevation, m.ref.trueHeight)
    if (m.ref.elevation >= this.minAngle) this.modes[this.modeCnt++] = m
  }

  // ---------- over-the-MUF and zero-distance modes ----------
  addOverTheMufAndVertModes(hopDist: number, hopCnt: number, muf: CircuitMuf) {
    const EPS = 0.4001
    const layers = new Set<number>()
    for (const m of this.modes) layers.add(m.layer)

    // very short distance (take-off angle >= 89.9): zero distance may not be in the reflectrix
    if (muf.mufInfo[muf.layer].ref.elevation > JUST_BELOW_MAX_ELEV) { this.addVerticalMode(hopDist, hopCnt); return }

    // over-the-MUF: insert the MUF[L] mode
    for (let L = 0 as Layer; L <= 2; L++) {
      if (this.modeCnt >= MAX_MODES - 1) break
      if (layers.has(L)) continue
      if (L === 1 && this.prof.F1.fo <= 0) continue
      if (this.mhz + EPS >= muf.mufInfo[L].muf && hopCnt === muf.mufInfo[L].hopCount) {
        const m = newMode()
        m.ref = { ...muf.mufInfo[L].ref }
        m.layer = L
        m.hopDist = hopDist
        m.hopCnt = hopCnt
        this.addMode(m)
        layers.add(L)
      }
    }

    if (muf.mufInfo[muf.layer].hopCount === hopCnt) {
      if (this.modes.length === 0) this.addVerticalMode(hopDist, hopCnt)
      return
    }

    // above the MUF for this order of hop: find a new MUF for a mode with this number of hops
    for (let L = 0 as Layer; L <= 2; L++) {
      if (this.modeCnt >= MAX_MODES - 1) break
      if (layers.has(L)) continue
      if (L === 1 && this.prof.F1.fo <= 0) continue
      if (hopCnt < muf.mufInfo[L].hopCount) continue
      const m = newMode()
      m.ref.trueHeight = muf.mufInfo[L].ref.trueHeight
      m.ref.vertFreq = muf.mufInfo[L].ref.vertFreq
      m.ref.devLoss = muf.mufInfo[L].ref.devLoss
      m.layer = L
      m.hopDist = hopDist
      m.hopCnt = hopCnt
      m.ref.virtHeight = interpolateTable(m.ref.vertFreq, this.prof.igramVertFreq!, this.prof.igramVirtHeight!)
      m.ref.elevation = calcElevationAngle(hopDist, m.ref.virtHeight)
      let modeMuf = muf.mufInfo[L].ref.vertFreq / cosOfIncidence(m.ref.elevation, m.ref.trueHeight)
      // correction to Martyn's theorem, see CURMUF
      m.ref.virtHeight += (modeMuf / this.prof.layers[L].fo) ** 2 * sinOfIncidence(m.ref.elevation, m.ref.trueHeight) ** 2 * corrToMartynsTheorem(m.ref)
      m.ref.elevation = calcElevationAngle(hopDist, m.ref.virtHeight)
      modeMuf = muf.mufInfo[L].ref.vertFreq / cosOfIncidence(m.ref.elevation, m.ref.trueHeight)
      if (modeMuf > this.mhz + EPS) continue
      this.addMode(m)
      layers.add(L)
    }
    this.modes.length = this.modeCnt
  }

  private addVerticalMode(hopDist: number, hopCnt: number) {
    const freq = this.mhz - 0.001
    const vf = this.prof.igramVertFreq!
    const idx = getIndexOf(freq, vf)
    let r: number
    if (freq === vf[idx]) r = 0
    else if (idx === vf.length - 1) return
    else r = (freq - vf[idx]) / (vf[idx + 1] - vf[idx])
    const m = newMode()
    this.prof.populateModeInfo(m, idx, r)
    m.ref.elevation = Math.PI / 2
    m.hopDist = hopDist
    m.hopCnt = hopCnt
    for (let L = 0 as Layer; L <= 2; L++) if (m.ref.trueHeight < this.prof.layers[L].hm) { m.layer = L; break }
    this.addMode(m)
  }

  private addMode(m: ModeInfo) { this.modes[this.modeCnt++] = m }
}
