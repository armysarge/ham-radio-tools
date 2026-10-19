// Typical catalogue AL values for common toroids (nH per turn²). Real parts vary: ±10 % to ±25 % depending on material and size,
// so wind a trial coil and measure it. Always check the maker's datasheet for the core you actually bought.
export interface Core { name: string; al: number; material: string; use: string }
export const CORES_META = { revision: '2026-10-19', source: 'Typical Amidon/Micrometals iron-powder and Fair-Rite/Amidon ferrite catalogue figures, rounded; verify against your supplier’s datasheet' }
export const CORES: Core[] = [
  { name: 'T37-2', al: 4.0, material: 'Iron powder, red (-2)', use: 'Tuned circuits and filters, about 1–30 MHz' },
  { name: 'T50-2', al: 4.9, material: 'Iron powder, red (-2)', use: 'Tuned circuits and filters, about 1–30 MHz' },
  { name: 'T68-2', al: 5.7, material: 'Iron powder, red (-2)', use: 'Low-pass filters up to ~100 W' },
  { name: 'T80-2', al: 5.5, material: 'Iron powder, red (-2)', use: 'Low-pass filters up to ~100 W' },
  { name: 'T106-2', al: 13.5, material: 'Iron powder, red (-2)', use: 'Filters and tuners at higher power' },
  { name: 'T130-2', al: 11.0, material: 'Iron powder, red (-2)', use: 'Filters and tuners at higher power' },
  { name: 'T200-2', al: 12.0, material: 'Iron powder, red (-2)', use: 'High-power tuners and filters' },
  { name: 'T37-6', al: 3.0, material: 'Iron powder, yellow (-6)', use: 'Higher HF and VHF, about 10–50 MHz' },
  { name: 'T50-6', al: 4.0, material: 'Iron powder, yellow (-6)', use: 'Higher HF and VHF, about 10–50 MHz' },
  { name: 'T68-6', al: 4.7, material: 'Iron powder, yellow (-6)', use: 'Higher HF and VHF, about 10–50 MHz' },
  { name: 'T80-6', al: 4.5, material: 'Iron powder, yellow (-6)', use: 'Higher HF and VHF, about 10–50 MHz' },
  { name: 'T106-6', al: 11.6, material: 'Iron powder, yellow (-6)', use: 'Higher HF and VHF at more power' },
  { name: 'FT37-43', al: 420, material: 'Ferrite, mix 43', use: 'Broadband transformers and chokes (not tuned inductors)' },
  { name: 'FT50-43', al: 523, material: 'Ferrite, mix 43', use: 'Broadband transformers and chokes' },
  { name: 'FT82-43', al: 557, material: 'Ferrite, mix 43', use: 'Broadband transformers and chokes' },
  { name: 'FT114-43', al: 603, material: 'Ferrite, mix 43', use: 'Chokes and transformers at higher power' },
  { name: 'FT140-43', al: 885, material: 'Ferrite, mix 43', use: 'Chokes and transformers at higher power' },
  { name: 'FT240-43', al: 1240, material: 'Ferrite, mix 43', use: 'Large common-mode chokes and EFHW transformers' },
  { name: 'FT37-61', al: 55, material: 'Ferrite, mix 61', use: 'VHF chokes and transformers' },
  { name: 'FT50-61', al: 68, material: 'Ferrite, mix 61', use: 'VHF chokes and transformers' },
]
