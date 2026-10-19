import { C } from './rf'

export interface BandRange { name: string; fromHz: number; toHz: number }
export interface HarmonicHit { n: number; hz: number }
export interface BandHits { band: string; count: number; first: HarmonicHit | null; sample: HarmonicHit[] }
export const HF_BANDS: BandRange[] = [
  { name: '160 m', fromHz: 1.8e6, toHz: 2.0e6 }, { name: '80 m', fromHz: 3.5e6, toHz: 4.0e6 }, { name: '60 m', fromHz: 5.3515e6, toHz: 5.3665e6 },
  { name: '40 m', fromHz: 7.0e6, toHz: 7.3e6 }, { name: '30 m', fromHz: 10.1e6, toHz: 10.15e6 }, { name: '20 m', fromHz: 14.0e6, toHz: 14.35e6 },
  { name: '17 m', fromHz: 18.068e6, toHz: 18.168e6 }, { name: '15 m', fromHz: 21.0e6, toHz: 21.45e6 }, { name: '12 m', fromHz: 24.89e6, toHz: 24.99e6 },
  { name: '10 m', fromHz: 28.0e6, toHz: 29.7e6 }, { name: '6 m', fromHz: 50e6, toHz: 54e6 },
]

/**
 * Where do the harmonics of a noise source with fundamental `fundHz` (a switching supply, clock or PLC carrier) land?
 * Counts the multiples n·f inside each band, with a few examples; a source with a low fundamental hits every band.
 */
export function harmonicsInBands(fundHz: number, bands: BandRange[] = HF_BANDS): BandHits[] {
  if (!(fundHz > 0)) throw new RangeError('Fundamental frequency must be greater than 0')
  return bands.map((b) => {
    const n0 = Math.max(1, Math.ceil(b.fromHz / fundHz - 1e-9)), n1 = Math.floor(b.toHz / fundHz + 1e-9)
    const count = Math.max(0, n1 - n0 + 1)
    const sample: HarmonicHit[] = []
    for (let n = n0; n <= n1 && sample.length < 6; n++) sample.push({ n, hz: n * fundHz })
    return { band: b.name, count, first: sample[0] ?? null, sample }
  })
}

/** Nearest harmonic of `fundHz` to a frequency you are listening on, and how far away it is. */
export function nearestHarmonic(fundHz: number, listenHz: number) {
  if (!(fundHz > 0) || !(listenHz > 0)) throw new RangeError('Frequencies must be greater than 0')
  const n = Math.max(1, Math.round(listenHz / fundHz))
  return { n, hz: n * fundHz, offsetHz: listenHz - n * fundHz }
}

/**
 * Small-loop limit for a direction-finding / sniffer loop: keep the perimeter at or below λ/10 at the highest frequency,
 * so the current is nearly uniform and the figure-8 pattern keeps deep nulls.
 */
export function smallLoopLimits(maxHz: number) {
  if (!(maxHz > 0)) throw new RangeError('Frequency must be greater than 0')
  const perimeter = C / maxHz / 10
  return { perimeter, diameter: perimeter / Math.PI, squareSide: perimeter / 4 }
}
/** Highest frequency at which a circular loop of the given diameter still meets the λ/10 rule. */
export function maxFreqForDiameter(diameterM: number) {
  if (!(diameterM > 0)) throw new RangeError('Diameter must be greater than 0')
  return C / (10 * Math.PI * diameterM)
}
