// Typical catalogue AL values for common toroids (nH per turn²). Real parts vary: ±10 % to ±25 % depending on material and size,
// so wind a trial coil and measure it. Always check the maker's datasheet for the core you actually bought.
export interface Core { name: string; al: number; material: string; use: string; odIn: number; idIn: number; hIn: number } // sizes in inches, nominal (coating adds a little)
export const CORES_META = { revision: '2026-10-19', source: 'Typical Amidon/Micrometals iron-powder and Fair-Rite/Amidon ferrite catalogue figures, rounded; verify against your supplier’s datasheet' }
export const CORES: Core[] = [
  { name: 'T37-2', al: 4.0, material: 'Iron powder, red (-2)', use: 'Tuned circuits and filters, about 1–30 MHz', odIn: 0.375, idIn: 0.205, hIn: 0.128 },
  { name: 'T50-2', al: 4.9, material: 'Iron powder, red (-2)', use: 'Tuned circuits and filters, about 1–30 MHz', odIn: 0.5, idIn: 0.303, hIn: 0.19 },
  { name: 'T68-2', al: 5.7, material: 'Iron powder, red (-2)', use: 'Low-pass filters up to ~100 W', odIn: 0.69, idIn: 0.37, hIn: 0.19 },
  { name: 'T80-2', al: 5.5, material: 'Iron powder, red (-2)', use: 'Low-pass filters up to ~100 W', odIn: 0.795, idIn: 0.495, hIn: 0.25 },
  { name: 'T106-2', al: 13.5, material: 'Iron powder, red (-2)', use: 'Filters and tuners at higher power', odIn: 1.06, idIn: 0.57, hIn: 0.437 },
  { name: 'T130-2', al: 11.0, material: 'Iron powder, red (-2)', use: 'Filters and tuners at higher power', odIn: 1.3, idIn: 0.78, hIn: 0.437 },
  { name: 'T200-2', al: 12.0, material: 'Iron powder, red (-2)', use: 'High-power tuners and filters', odIn: 2, idIn: 1.25, hIn: 0.55 },
  { name: 'T37-6', al: 3.0, material: 'Iron powder, yellow (-6)', use: 'Higher HF and VHF, about 10–50 MHz', odIn: 0.375, idIn: 0.205, hIn: 0.128 },
  { name: 'T50-6', al: 4.0, material: 'Iron powder, yellow (-6)', use: 'Higher HF and VHF, about 10–50 MHz', odIn: 0.5, idIn: 0.303, hIn: 0.19 },
  { name: 'T68-6', al: 4.7, material: 'Iron powder, yellow (-6)', use: 'Higher HF and VHF, about 10–50 MHz', odIn: 0.69, idIn: 0.37, hIn: 0.19 },
  { name: 'T80-6', al: 4.5, material: 'Iron powder, yellow (-6)', use: 'Higher HF and VHF, about 10–50 MHz', odIn: 0.795, idIn: 0.495, hIn: 0.25 },
  { name: 'T106-6', al: 11.6, material: 'Iron powder, yellow (-6)', use: 'Higher HF and VHF at more power', odIn: 1.06, idIn: 0.57, hIn: 0.437 },
  { name: 'FT37-43', al: 420, material: 'Ferrite, mix 43', use: 'Broadband transformers and chokes (not tuned inductors)', odIn: 0.375, idIn: 0.187, hIn: 0.125 },
  { name: 'FT50-43', al: 523, material: 'Ferrite, mix 43', use: 'Broadband transformers and chokes', odIn: 0.5, idIn: 0.281, hIn: 0.188 },
  { name: 'FT82-43', al: 557, material: 'Ferrite, mix 43', use: 'Broadband transformers and chokes', odIn: 0.825, idIn: 0.52, hIn: 0.25 },
  { name: 'FT114-43', al: 603, material: 'Ferrite, mix 43', use: 'Chokes and transformers at higher power', odIn: 1.142, idIn: 0.748, hIn: 0.295 },
  { name: 'FT140-43', al: 885, material: 'Ferrite, mix 43', use: 'Chokes and transformers at higher power', odIn: 1.4, idIn: 0.9, hIn: 0.5 },
  { name: 'FT240-43', al: 1240, material: 'Ferrite, mix 43', use: 'Large common-mode chokes and EFHW transformers', odIn: 2.4, idIn: 1.4, hIn: 0.5 },
  { name: 'FT37-61', al: 55, material: 'Ferrite, mix 61', use: 'VHF chokes and transformers', odIn: 0.375, idIn: 0.187, hIn: 0.125 },
  { name: 'FT50-61', al: 68, material: 'Ferrite, mix 61', use: 'VHF chokes and transformers', odIn: 0.5, idIn: 0.281, hIn: 0.188 },
]
