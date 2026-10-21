// Port of NoiseMdl.pas from DVOACAP (MIT, Copyright (c) 2013-2025 Alex Shovkoplyas, VE3NEA): atmospheric, galactic and man-made radio noise.
import { DBinNP, NPinDB, TWO_PI, fromDb, newDistribution, toDb, type Distribution, type GeoPoint } from './types'
import { FixedMap, type FourierMaps } from './maps'

interface AV { AU: number; VU: number; AL: number; VL: number }

function calcAV(d: Distribution): AV {
  const DFAC = 7.87384, BFAC = 30.99872
  const AU = Math.exp((d.value.hi / DFAC) ** 2 + d.value.mdn * NPinDB)
  const AL = Math.exp((d.value.lo / DFAC) ** 2 + d.value.mdn * NPinDB)
  return { AU, VU: AU * AU * (Math.exp(d.value.hi ** 2 / BFAC) - 1), AL, VL: AL * AL * (Math.exp(d.value.lo ** 2 / BFAC) - 1) }
}

const interpolateDistribution = (a: Distribution, b: Distribution, r: number): Distribution => ({
  value: { mdn: a.value.mdn * (1 - r) + b.value.mdn * r, lo: a.value.lo * (1 - r) + b.value.lo * r, hi: a.value.hi * (1 - r) + b.value.hi * r },
  error: { mdn: a.error.mdn * (1 - r) + b.error.mdn * r, lo: a.error.lo * (1 - r) + b.error.lo * r, hi: a.error.hi * (1 - r) + b.error.hi * r },
})

export class NoiseModel {
  private lat = 0
  private T1 = 0; private T2 = 0; private dT = 0
  private nsMHz1 = 0; private nsMHz2 = 0
  map!: FourierMaps
  manMadeNoiseAt3MHz = 145
  atmosphericNoise = newDistribution()
  galacticNoise = newDistribution()
  manMadeNoise = newDistribution()
  combinedNoise = newDistribution()

  get combined() { return this.combinedNoise.value.mdn }

  /** Prepares the 1 MHz noise coefficients for a receiver location and local time (fraction of a day). */
  computeNoiseAt1Mhz(loc: GeoPoint, localTime: number) {
    const lt = 24 * localTime
    const eastLon = loc.lon >= 0 ? loc.lon : TWO_PI + loc.lon
    this.lat = loc.lat
    this.T1 = lt < 22 ? Math.trunc(lt / 4) : FixedMap.Noise6
    this.dT = (lt - (4 * this.T1 + 2)) * 0.25
    if (this.dT < 0) this.T2 = this.T1 - 1
    else if (this.dT > 0) this.T2 = this.T1 + 1
    else this.T2 = this.T1
    if (this.T2 < FixedMap.Noise1) this.T2 = FixedMap.Noise6
    else if (this.T2 > FixedMap.Noise6) this.T2 = FixedMap.Noise1
    this.nsMHz1 = this.map.computeFixedMap(this.T1, this.lat, eastLon)
    this.nsMHz2 = this.map.computeFixedMap(this.T2, this.lat, eastLon)
  }

  private noiseAtFreq(idx: number, freq: number, noise1MHz: number): Distribution {
    const r = newDistribution()
    if (this.lat < 0) idx += 6
    let pz = this.map.computeFam(idx, 0, -0.75)
    let px = this.map.computeFam(idx, 1, -0.75)
    r.value.mdn = noise1MHz * (2 - pz) - px
    let x = (8 * 2 ** Math.log10(freq) - 11) / 4
    pz = this.map.computeFam(idx, 0, x)
    px = this.map.computeFam(idx, 1, x)
    r.value.mdn = r.value.mdn * pz + px
    x = Math.log10(Math.min(20, freq))
    r.value.hi = this.map.computeDud(0, idx, x)
    r.value.lo = this.map.computeDud(1, idx, x)
    r.error.hi = this.map.computeDud(2, idx, x)
    r.error.lo = this.map.computeDud(3, idx, x)
    r.error.mdn = this.map.computeDud(4, idx, Math.min(1, x))
    return r
  }

  /** Noise distribution for one frequency; foF2 decides whether galactic noise reaches the ground. */
  computeDistribution(freq: number, foF2: number) {
    const ZeroAV: AV = { AU: 0, VU: 0, AL: 0, VL: 0 }
    const CFAC = 5.56765
    const D1 = this.noiseAtFreq(this.T1, freq, this.nsMHz1), D2 = this.noiseAtFreq(this.T2, freq, this.nsMHz2)
    this.atmosphericNoise = interpolateDistribution(D1, D2, Math.abs(this.dT))
    const avAtm = calcAV(this.atmosphericNoise)

    this.galacticNoise = { value: { mdn: 0, lo: 2, hi: 2 }, error: { mdn: 0.5, lo: 0.2, hi: 0.2 } }
    let avGal: AV
    if (freq > foF2) { this.galacticNoise.value.mdn = 52 - 23 * Math.log10(freq); avGal = calcAV(this.galacticNoise) }
    else { this.galacticNoise.value.mdn = 0; avGal = ZeroAV } // galactic noise does not penetrate

    this.manMadeNoise = { value: { mdn: 0, lo: 6, hi: 9.7 }, error: { mdn: 5.4, lo: 1.5, hi: 1.5 } }
    this.manMadeNoise.value.mdn = 204 - this.manMadeNoiseAt3MHz + 13.22 - 27.7 * Math.log10(freq)
    const avMan = calcAV(this.manMadeNoise)

    const sum: AV = { AU: avAtm.AU + avGal.AU + avMan.AU, VU: avAtm.VU + avGal.VU + avMan.VU, AL: avAtm.AL + avGal.AL + avMan.AL, VL: avAtm.VL + avGal.VL + avMan.VL }

    const atm = this.atmosphericNoise, gal = this.galacticNoise, man = this.manMadeNoise, comb = this.combinedNoise
    atm.value.mdn -= 204
    gal.value.mdn -= 204
    man.value.mdn -= 204

    // determination of the noise level is ITS-78
    comb.value.mdn = toDb(fromDb(atm.value.mdn) + fromDb(gal.value.mdn) + fromDb(man.value.mdn))

    // Spaulding's original replaces the simple power sum
    let sigHi = Math.log(1 + sum.VU / (sum.AU * sum.AU))
    let sigLo = Math.log(1 + sum.VL / (sum.AL * sum.AL))

    // Caruana's modification
    if (atm.value.hi > 12 || atm.value.lo > 12) {
      let sig = 2 * (Math.log(sum.AU) - (comb.value.mdn + 204) * NPinDB)
      if (sig > 0) sigHi = Math.min(sig, sigHi)
      sig = 2 * (Math.log(sum.AL) - (comb.value.mdn + 204) * NPinDB)
      if (sig > 0) sigLo = Math.min(sig, sigLo)
    }
    comb.value.mdn = DBinNP * (Math.log(sum.AU) - sigHi / 2) - 204
    comb.value.hi = CFAC * Math.sqrt(sigHi)
    comb.value.lo = CFAC * Math.sqrt(sigLo)

    // prediction errors
    const qpAtm = fromDb(atm.value.mdn - comb.value.mdn)
    const qpGal = freq > foF2 ? fromDb(gal.value.mdn - comb.value.mdn) : 0
    const qpMan = fromDb(man.value.mdn - comb.value.mdn)
    comb.error.mdn = Math.sqrt((qpAtm * atm.error.mdn) ** 2 + (qpGal * gal.error.mdn) ** 2 + (qpMan * man.error.mdn) ** 2)

    let pv = qpAtm * fromDb(atm.value.hi - comb.value.hi)
    comb.error.hi = (pv * atm.error.hi) ** 2 + ((pv - qpAtm) * atm.error.mdn) ** 2
    pv = qpAtm * fromDb(atm.value.lo - comb.value.lo)
    comb.error.lo = (pv * atm.error.lo) ** 2 + ((pv - qpAtm) * atm.error.mdn) ** 2

    pv = qpGal * fromDb(gal.value.hi - comb.value.hi)
    comb.error.hi += (pv * gal.error.hi) ** 2 + ((pv - qpGal) * gal.error.mdn) ** 2
    pv = qpGal * fromDb(gal.value.lo - comb.value.lo)
    comb.error.lo += (pv * gal.error.lo) ** 2 + ((pv - qpGal) * gal.error.mdn) ** 2

    pv = qpMan * fromDb(man.value.hi - comb.value.hi)
    comb.error.hi = Math.sqrt(comb.error.hi + (pv * man.error.hi) ** 2 + ((pv - qpMan) * man.error.mdn) ** 2)
    pv = qpMan * fromDb(man.value.lo - comb.value.lo)
    comb.error.lo = Math.sqrt(comb.error.lo + (pv * man.error.lo) ** 2 + ((pv - qpMan) * man.error.mdn) ** 2)
  }
}
