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
