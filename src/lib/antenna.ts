import { C } from './rf'

/**
 * Half-wave dipole total length (m) = k · c / (2f).
 * k is the end-effect shortening factor (~0.95 for thin wire; 0.94–0.98 typical). It is an empirical
 * design estimate, not a simulation. k = 0.9517 reproduces the familiar 468/f(MHz) feet rule.
 */
export function dipoleLength(fHz: number, k = 0.95) {
  if (!(fHz > 0)) throw new RangeError('Frequency must be greater than 0')
  if (!(k >= 0.9 && k <= 1)) throw new RangeError('Shortening factor must be between 0.90 and 1.00')
  return (k * C) / (2 * fHz)
}

/**
 * Per-leg trim for a dipole of total length `totalM` that resonated at `measuredHz` instead of `targetHz`.
 * Resonance scales ~inversely with length for small corrections. Positive = cut, negative = add.
 */
export function trimPerLeg(totalM: number, targetHz: number, measuredHz: number) {
  if (!(targetHz > 0 && measuredHz > 0)) throw new RangeError('Frequencies must be greater than 0')
  return (totalM - (totalM * measuredHz) / targetHz) / 2
}

const DEG = Math.PI / 180

/**
 * Inverted-V: a dipole whose legs slope down from a centre support. Sloping legs interact with the ground and
 * each other, so the wire is cut a few percent shorter than a flat dipole (`slope` ≈ 0.97, empirical).
 * Geometry is plain trigonometry from the included angle at the apex.
 */
export function invertedV(fHz: number, k = 0.95, slope = 0.97, apexDeg = 120, apexHeightM = 10) {
  if (!(apexDeg >= 60 && apexDeg <= 180)) throw new RangeError('Included angle must be between 60° and 180°')
  if (!(slope >= 0.9 && slope <= 1)) throw new RangeError('Sloping-leg factor must be between 0.90 and 1.00')
  if (!(apexHeightM > 0)) throw new RangeError('Apex height must be greater than 0')
  const total = dipoleLength(fHz, k) * slope
  const leg = total / 2
  const half = (apexDeg / 2) * DEG
  const drop = leg * Math.cos(half)
  return { total, leg, span: 2 * leg * Math.sin(half), drop, endHeight: apexHeightM - drop }
}

/** Quarter-wave vertical: radiator and resonant radials share the same length, k·c/(4f). */
export function vertical(fHz: number, k = 0.95, droopDeg = 0) {
  if (!(droopDeg >= 0 && droopDeg <= 60)) throw new RangeError('Radial droop must be between 0° and 60°')
  const radiator = dipoleLength(fHz, k) / 2
  return { radiator, radial: radiator, radialReach: radiator * Math.cos(droopDeg * DEG), radialDrop: radiator * Math.sin(droopDeg * DEG) }
}

export type LoopShape = 'square' | 'circle' | 'triangle'
/** Full-wave loop: perimeter = k·c/f with k ≈ 1.0218 (the 1005/f ft rule). */
export function loop(fHz: number, k = 1.0218, shape: LoopShape = 'square') {
  if (!(fHz > 0)) throw new RangeError('Frequency must be greater than 0')
  if (!(k >= 1 && k <= 1.06)) throw new RangeError('Loop factor must be between 1.00 and 1.06')
  const perimeter = (k * C) / fHz
  const side = shape === 'circle' ? NaN : perimeter / (shape === 'square' ? 4 : 3)
  return {
    perimeter, side,
    diameter: shape === 'circle' ? perimeter / Math.PI : NaN,
    height: shape === 'square' ? side : shape === 'triangle' ? (side * Math.sqrt(3)) / 2 : perimeter / Math.PI,
  }
}

export interface HarmonicBand { n: number; hz: number; band: string | null }
/**
 * End-fed half-wave (EFHW): a half-wave wire fed at one end. The feed point is a high-impedance (voltage) point on the
 * fundamental AND on every harmonic, so one wire works on every band that falls on a multiple of the design frequency.
 * Length uses the same end-effect factor as a dipole. The counterpoise is a short wire (or the coax shield, with a choke).
 */
export function efhw(fHz: number, k = 0.95, bands: { name: string; fromHz: number; toHz: number }[] = []) {
  const length = dipoleLength(fHz, k)
  const lambda = C / fHz
  const harmonics: HarmonicBand[] = []
  for (let n = 1; n <= 8; n++) {
    const hz = n * fHz, band = bands.find((b) => hz >= b.fromHz && hz <= b.toHz)
    harmonics.push({ n, hz, band: band?.name ?? null })
  }
  return { length, counterpoiseMin: 0.05 * lambda, counterpoiseMax: 0.1 * lambda, harmonics }
}

/**
 * Impedance seen at the radio end of an ideal, lossless 'ratio':1 impedance transformer fed from a wire end whose
 * impedance is `zEnd`, and the SWR that gives on 50 ohm. Illustrates why 49:1 or 64:1 is used; real ends vary with
 * height, wire and counterpoise, and a real transformer has losses and leakage inductance.
 */
export function efhwMatch(zEndOhms: number, ratio: number, z0 = 50) {
  if (!(zEndOhms > 0) || !(ratio > 0) || !(z0 > 0)) throw new RangeError('Values must be greater than 0')
  const zIn = zEndOhms / ratio
  return { zIn, swr: Math.max(zIn, z0) / Math.min(zIn, z0) }
}
