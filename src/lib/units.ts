// Canonical units: Hz, m, W, Ω. Factors convert display unit -> canonical.
export interface Unit { label: string; factor: number }
export const FREQ_UNITS: Unit[] = [
  { label: 'Hz', factor: 1 }, { label: 'kHz', factor: 1e3 },
  { label: 'MHz', factor: 1e6 }, { label: 'GHz', factor: 1e9 },
]
export const LENGTH_UNITS: Unit[] = [
  { label: 'm', factor: 1 }, { label: 'cm', factor: 0.01 }, { label: 'mm', factor: 0.001 },
  { label: 'ft', factor: 0.3048 }, { label: 'in', factor: 0.0254 },
]
export const POWER_UNITS: Unit[] = [
  { label: 'W', factor: 1 }, { label: 'mW', factor: 1e-3 }, { label: 'kW', factor: 1e3 },
]
export const M_PER_IN = 0.0254

/** Format with `sig` significant digits, no exponent for ordinary magnitudes. */
export function fmt(v: number | null | undefined, sig = 4): string {
  if (v == null || Number.isNaN(v)) return '—'
  if (!Number.isFinite(v)) return v > 0 ? '∞' : '−∞'
  if (v === 0) return '0'
  const a = Math.abs(v)
  if (a >= 1e9 || a < 1e-4) return v.toExponential(sig - 1)
  return Number(v.toPrecision(sig)).toLocaleString('en-US', { maximumFractionDigits: 10, useGrouping: false })
}

/** Feet and inches string, e.g. "16 ft 7.4 in" */
export function feetInches(m: number): string {
  const totalIn = m / M_PER_IN
  let ft = Math.floor(totalIn / 12 + 1e-9)
  let inch = totalIn - ft * 12
  if (Number(inch.toFixed(1)) >= 12) { ft += 1; inch = 0 }
  return `${ft} ft ${Math.max(0, inch).toFixed(1)} in`
}
