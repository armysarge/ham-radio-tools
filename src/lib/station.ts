// Station engineering maths: feedline loss, link budget, matching, filters, coils, power. Pure functions, SI units unless named otherwise.
import { C } from './rf'

const need = (ok: boolean, msg: string) => { if (!ok) throw new RangeError(msg) }
const clean = (x: number) => Number(x.toPrecision(12))
const TWO_PI = 2 * Math.PI

// ============ feedline loss ============
export const FT_PER_M = 1 / 0.3048
/**
 * Matched loss of a cable at fHz, scaled from one datasheet point (dB per 100 ft at refHz) with the square-root-of-frequency law.
 * That law holds while conductor (skin-effect) loss dominates: good for HF and VHF, optimistic at UHF and above, where a datasheet value at your frequency is better.
 */
export function matchedLossDb(dbPer100ftAtRef: number, refHz: number, fHz: number, lengthM: number) {
  need(dbPer100ftAtRef > 0 && refHz > 0 && fHz > 0, 'Loss and frequencies must be greater than 0')
  need(lengthM >= 0, 'Length must be 0 or more')
  return dbPer100ftAtRef * Math.sqrt(fHz / refHz) * ((lengthM * FT_PER_M) / 100)
}
/** Total line loss when the load is mismatched (ARRL formula): 10·log10((a² − ρ²) / (a·(1 − ρ²))), a = 10^(matched/10). */
export function lossWithSwr(matchedDb: number, swr: number) {
  need(matchedDb >= 0, 'Matched loss must be 0 or more'); need(swr >= 1, 'SWR must be 1 or greater')
  const rho = (swr - 1) / (swr + 1), a = 10 ** (matchedDb / 10)
  return 10 * Math.log10((a * a - rho * rho) / (a * (1 - rho * rho)))
}
export const dbToFraction = (db: number) => 10 ** (-db / 10)

// ============ link budget and path ============
/** Free-space path loss in dB for distance in km and frequency in MHz. */
export function fspl(dKm: number, fMHz: number) { need(dKm > 0 && fMHz > 0, 'Distance and frequency must be greater than 0'); return 20 * Math.log10(dKm) + 20 * Math.log10(fMHz) + 32.44 }
export const wattsToDbmL = (w: number) => { need(w > 0, 'Power must be greater than 0'); return 10 * Math.log10(w * 1000) }
/** Receiver noise floor (minimum detectable signal) in dBm from bandwidth, noise figure and the SNR you need. */
export function minDetectableDbm(bandwidthHz: number, noiseFigureDb: number, snrDb: number) { need(bandwidthHz > 0, 'Bandwidth must be greater than 0'); return -174 + 10 * Math.log10(bandwidthHz) + noiseFigureDb + snrDb }
export interface LinkInputs { txW: number; txGainDbi: number; txLossDb: number; dKm: number; fMHz: number; rxGainDbi: number; rxLossDb: number; otherLossDb: number; rxSensDbm: number }
export function linkBudget(i: LinkInputs) {
  const eirp = wattsToDbmL(i.txW) + i.txGainDbi - i.txLossDb, path = fspl(i.dKm, i.fMHz)
  const rx = eirp - path - i.otherLossDb + i.rxGainDbi - i.rxLossDb
  return { eirpDbm: eirp, pathLossDb: path, rxDbm: rx, marginDb: rx - i.rxSensDbm }
}
/** Distance to the radio horizon between two antennas of heights h1, h2 (m), standard atmosphere k = 4/3. */
export function radioHorizonKm(h1: number, h2: number, k = 4 / 3) { need(h1 >= 0 && h2 >= 0, 'Heights must be 0 or more'); return 3.57 * Math.sqrt(k) * (Math.sqrt(h1) + Math.sqrt(h2)) }
/** Radius (m) of the nth Fresnel zone at a point d1 km from one end of a path of total length dKm, at fGHz. */
export function fresnelRadius(d1: number, dKm: number, fGHz: number, n = 1) {
  need(dKm > 0 && d1 > 0 && d1 < dKm && fGHz > 0 && n >= 1, 'The point must lie between the ends, and the frequency must be greater than 0')
  return 17.32 * Math.sqrt((n * d1 * (dKm - d1)) / (fGHz * dKm))
}

// ============ L-network matching ============
export interface LNet { q: number; xSeries: number; xShunt: number; lowPass: { L: number; C: number }; highPass: { L: number; C: number }; shuntAcross: 'source' | 'load' }
/** Match two purely resistive impedances at fHz. The shunt element goes across the higher resistance. */
export function lNetwork(rSource: number, rLoad: number, fHz: number): LNet {
  need(rSource > 0 && rLoad > 0 && fHz > 0, 'Resistances and frequency must be greater than 0')
  need(Math.abs(rSource - rLoad) > 1e-9 * Math.max(rSource, rLoad), 'The two resistances are already equal: no matching network is needed')
  const hi = Math.max(rSource, rLoad), lo = Math.min(rSource, rLoad), w = TWO_PI * fHz
  const q = Math.sqrt(hi / lo - 1), xs = q * lo, xp = hi / q
  return { q, xSeries: xs, xShunt: xp, shuntAcross: rSource > rLoad ? 'source' : 'load', lowPass: { L: xs / w, C: 1 / (w * xp) }, highPass: { L: xp / w, C: 1 / (w * xs) } }
}

// ============ low-pass filters ============
export type FilterKind = 'butterworth' | 'chebyshev'
export function filterG(kind: FilterKind, n: number, rippleDb = 0.1): number[] {
  need(Number.isInteger(n) && n >= 3 && n <= 9 && n % 2 === 1, 'Use an odd order from 3 to 9 (equal source and load resistance needs an odd order)')
  if (kind === 'butterworth') return Array.from({ length: n }, (_, i) => clean(2 * Math.sin(((2 * (i + 1) - 1) * Math.PI) / (2 * n))))
  need(rippleDb > 0 && rippleDb <= 3, 'Ripple must be between 0 and 3 dB')
  const beta = Math.log(1 / Math.tanh(rippleDb / 17.37)), gamma = Math.sinh(beta / (2 * n))
  const a = (k: number) => Math.sin(((2 * k - 1) * Math.PI) / (2 * n)), b = (k: number) => gamma * gamma + Math.sin((k * Math.PI) / n) ** 2
  const g: number[] = [(2 * a(1)) / gamma]
  for (let k = 2; k <= n; k++) g.push((4 * a(k - 1) * a(k)) / (b(k - 1) * g[k - 2]))
  return g
}
export interface FilterPart { kind: 'C' | 'L'; position: 'shunt' | 'series'; value: number }
/** Ladder values for cutoff fcHz and impedance z0. 'pi' starts and ends with shunt capacitors, 't' with series inductors. */
export function lowPassParts(g: number[], fcHz: number, z0: number, topology: 'pi' | 't'): FilterPart[] {
  need(fcHz > 0 && z0 > 0, 'Cutoff and impedance must be greater than 0')
  const w = TWO_PI * fcHz
  return g.map((gk, i) => {
    const capacitor = topology === 'pi' ? i % 2 === 0 : i % 2 === 1
    return capacitor ? { kind: 'C', position: 'shunt', value: gk / (w * z0) } : { kind: 'L', position: 'series', value: (gk * z0) / w }
  })
}
/** Attenuation (dB) at f/fc for an ideal lossless filter. */
export function filterAttenuationDb(kind: FilterKind, n: number, ratio: number, rippleDb = 0.1) {
  need(ratio > 0, 'Frequency ratio must be greater than 0')
  if (kind === 'butterworth') return 10 * Math.log10(1 + ratio ** (2 * n))
  const eps2 = 10 ** (rippleDb / 10) - 1, tn = ratio <= 1 ? Math.cos(n * Math.acos(ratio)) : Math.cosh(n * Math.acosh(ratio))
  return 10 * Math.log10(1 + eps2 * tn * tn)
}

// ============ coils ============
/** Turns for a toroid: N = sqrt(L / AL). L in henries, AL in nH per turn². */
export const toroidTurns = (L: number, alNh: number) => { need(L > 0 && alNh > 0, 'Inductance and AL must be greater than 0'); return Math.sqrt((L * 1e9) / alNh) }
export const toroidInductance = (turns: number, alNh: number) => { need(turns > 0 && alNh > 0, 'Turns and AL must be greater than 0'); return (alNh * turns * turns) * 1e-9 }
/** Wheeler's single-layer air-core solenoid formula: L(µH) = d²n² / (18d + 40l), d and l in inches. Good to about 1 % for l > 0.8 d. */
export function airCoilInductanceUh(dIn: number, lengthIn: number, turns: number) { need(dIn > 0 && lengthIn > 0 && turns > 0, 'Diameter, length and turns must be greater than 0'); return (dIn * dIn * turns * turns) / (18 * dIn + 40 * lengthIn) }
/** Turns needed for a target inductance when turns are wound with a given pitch (inches per turn); length = turns × pitch. */
export function airCoilTurns(targetUh: number, dIn: number, pitchIn: number) {
  need(targetUh > 0 && dIn > 0 && pitchIn > 0, 'All values must be greater than 0')
  let n = Math.sqrt((targetUh * 18 * dIn) / (dIn * dIn)) // first guess with zero length
  for (let i = 0; i < 60; i++) n = Math.sqrt((targetUh * (18 * dIn + 40 * n * pitchIn)) / (dIn * dIn))
  return n
}
export const inductiveReactanceOf = (L: number, fHz: number) => TWO_PI * fHz * L

// ============ batteries and solar ============
export interface Load { amps: number; hoursPerDay: number }
/** Daily energy use (Wh) and average current from duty-cycled loads at the battery voltage. */
export function dailyEnergy(loads: Load[], volts: number) {
  need(volts > 0, 'Voltage must be greater than 0'); need(loads.every((l) => l.amps >= 0 && l.hoursPerDay >= 0 && l.hoursPerDay <= 24), 'Currents must be 0 or more and hours between 0 and 24')
  const ah = loads.reduce((s, l) => s + l.amps * l.hoursPerDay, 0)
  return { ahPerDay: ah, whPerDay: ah * volts, avgAmps: ah / 24 }
}
/** Hours the battery lasts at an average current, using only the usable fraction of its rated capacity. */
export function runtimeHours(capacityAh: number, usable: number, avgAmps: number) {
  need(capacityAh > 0 && usable > 0 && usable <= 1 && avgAmps > 0, 'Capacity, usable fraction (0–1) and current must be greater than 0')
  return (capacityAh * usable) / avgAmps
}
/** Solar panel and battery for a daily load: panel W = load Wh ÷ (peak-sun-hours × system efficiency). */
export function solarSizing(whPerDay: number, peakSunHours: number, systemEff: number, autonomyDays: number, usable: number, volts: number) {
  need(whPerDay > 0 && peakSunHours > 0 && systemEff > 0 && systemEff <= 1 && autonomyDays >= 0 && usable > 0 && usable <= 1 && volts > 0, 'Check the values: efficiency and usable fraction are between 0 and 1')
  const panelW = whPerDay / (peakSunHours * systemEff), batteryWh = (whPerDay * autonomyDays) / usable
  return { panelW, batteryWh, batteryAh: batteryWh / volts }
}
export const speedOfLight = C
