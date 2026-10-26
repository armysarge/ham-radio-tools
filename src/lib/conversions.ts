export interface ConversionUnit { id: string; label: string; factor: number; offset?: number }
export interface Quantity { id: string; name: string; units: ConversionUnit[] }
const u = (id: string, label: string, factor: number, offset = 0): ConversionUnit => ({ id, label, factor, offset })

// Canonical = value × factor + offset. International feet/inches, never legacy US survey feet.
export const QUANTITIES: Quantity[] = [
  { id: 'length', name: 'Length', units: [u('m', 'm', 1), u('mm', 'mm', .001), u('cm', 'cm', .01), u('km', 'km', 1000), u('in', 'in', .0254), u('ft', 'ft', .3048), u('yd', 'yd', .9144), u('mi', 'mile', 1609.344), u('nmi', 'nautical mile', 1852)] },
  { id: 'area', name: 'Area', units: [u('m2', 'm²', 1), u('cm2', 'cm²', .0001), u('ft2', 'ft²', .3048 ** 2), u('acre', 'acre (international)', 43560 * .3048 ** 2), u('ha', 'hectare', 10000)] },
  { id: 'frequency', name: 'Frequency', units: [u('Hz', 'Hz', 1), u('kHz', 'kHz', 1e3), u('MHz', 'MHz', 1e6), u('GHz', 'GHz', 1e9)] },
  { id: 'time', name: 'Time', units: [u('s', 's', 1), u('ms', 'ms', 1e-3), u('us', 'µs', 1e-6), u('ns', 'ns', 1e-9), u('min', 'min', 60), u('h', 'h', 3600), u('d', 'day', 86400)] },
  { id: 'power', name: 'Power', units: [u('W', 'W', 1), u('mW', 'mW', .001), u('kW', 'kW', 1000)] },
  { id: 'voltage', name: 'Voltage', units: [u('V', 'V', 1), u('mV', 'mV', 1e-3), u('uV', 'µV', 1e-6), u('kV', 'kV', 1e3)] },
  { id: 'current', name: 'Current', units: [u('A', 'A', 1), u('mA', 'mA', 1e-3), u('uA', 'µA', 1e-6)] },
  { id: 'resistance', name: 'Resistance', units: [u('ohm', 'Ω', 1), u('kohm', 'kΩ', 1e3), u('Mohm', 'MΩ', 1e6)] },
  { id: 'capacitance', name: 'Capacitance', units: [u('F', 'F', 1), u('mF', 'mF', 1e-3), u('uF', 'µF', 1e-6), u('nF', 'nF', 1e-9), u('pF', 'pF', 1e-12)] },
  { id: 'inductance', name: 'Inductance', units: [u('H', 'H', 1), u('mH', 'mH', 1e-3), u('uH', 'µH', 1e-6), u('nH', 'nH', 1e-9)] },
  { id: 'energy', name: 'Energy', units: [u('J', 'J', 1), u('kJ', 'kJ', 1000), u('Wh', 'Wh', 3600), u('kWh', 'kWh', 3600000)] },
  { id: 'temperature', name: 'Temperature', units: [u('K', 'K', 1), u('C', '°C', 1, 273.15), u('F', '°F', 5 / 9, 273.15 - 32 * 5 / 9)] },
]

export function convertUnit(value: number, quantity: string, from: string, to: string): number {
  const group = QUANTITIES.find(q => q.id === quantity)
  const a = group?.units.find(u => u.id === from), b = group?.units.find(u => u.id === to)
  if (!a || !b) throw new RangeError('Choose units from the same quantity.')
  if (!Number.isFinite(value)) throw new RangeError('Enter a finite number.')
  let canonical = value * a.factor + (a.offset ?? 0)
  if (quantity === 'temperature') {
    if (canonical < -1e-10) throw new RangeError('Temperature cannot be below absolute zero (0 K).')
    canonical = Math.max(0, canonical)
  }
  const result = (canonical - (b.offset ?? 0)) / b.factor
  if (!Number.isFinite(canonical) || !Number.isFinite(result)) throw new RangeError('Value exceeds the supported conversion range.')
  if (value !== 0 && (canonical === 0 || result === 0) && quantity !== 'temperature') throw new RangeError('Value is too small for the supported conversion range.')
  return Object.is(result, -0) ? 0 : result
}
