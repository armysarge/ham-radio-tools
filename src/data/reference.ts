// Bundled reference data, kept apart from logic. Each list carries its own source and revision.
export interface Meta { source: string; revision: string; note?: string; sourceUrl?: string }

export const CTCSS_META: Meta = { source: 'EIA/TIA-603 (38 standard tones); the 12 “extended” tones are common manufacturer additions', revision: '2026-10-19' }
// [Hz, standard EIA-603 tone?]
export const CTCSS: [number, boolean][] = [
  [67.0, true], [69.3, false], [71.9, true], [74.4, true], [77.0, true], [79.7, true], [82.5, true], [85.4, true], [88.5, true], [91.5, true],
  [94.8, true], [97.4, true], [100.0, true], [103.5, true], [107.2, true], [110.9, true], [114.8, true], [118.8, true], [123.0, true], [127.3, true],
  [131.8, true], [136.5, true], [141.3, true], [146.2, true], [151.4, true], [156.7, true], [159.8, false], [162.2, true], [165.5, false], [167.9, true],
  [171.3, false], [173.8, true], [177.3, false], [179.9, true], [183.5, false], [186.2, true], [189.9, false], [192.8, true], [196.6, false], [199.5, false],
  [203.5, true], [206.5, false], [210.7, true], [218.1, true], [225.7, true], [229.1, false], [233.6, true], [241.8, true], [250.3, true], [254.1, false],
]

export const DCS_META: Meta = {
  source: 'Yaesu FT-3165R/FT-3165E Advance Manual, items 30–31 (DCS code list and inversion options)',
  revision: '2024-11',
  note: 'This is the 104-code set shown in the cited manual. Individual radios may support only a subset or use different names for polarity settings.',
  sourceUrl: 'https://www.yaesu.com/Files/4CB3F875-1018-01AF-FAF21EE346767CA2/FT-3165R_E_AM_2411-A.pdf',
}
// Transcribed from the cited Yaesu table. Three-digit strings are octal, not decimal.
export const DCS_CODES = `023 025 026 031 032 036 043 047 051 053
054 065 071 072 073 074 114 115 116 122
125 131 132 134 143 145 152 155 156 162
165 172 174 205 212 223 225 226 243 244
245 246 251 252 255 261 263 265 266 271
274 306 311 315 325 331 332 343 346 351
356 364 365 371 411 412 413 423 431 432
445 446 452 454 455 462 464 465 466 503
506 516 523 526 532 546 565 606 612 624
627 631 632 654 662 664 703 712 723 731
732 734 743 754`.split(/\s+/).sort()

export const ABBR_META: Meta = { source: 'Common amateur CW/phone usage (ARRL Operating Manual and general practice), paraphrased', revision: '2026-10-19' }
export const ABBREVIATIONS: [string, string, string][] = [
  ['73', 'Best regards', 'Closing'], ['88', 'Love and kisses (informal)', 'Closing'], ['AGN', 'Again', 'CW'], ['ANT', 'Antenna', 'Station'],
  ['BK', 'Break', 'CW'], ['BCNU', 'Be seeing you', 'Closing'], ['CFM', 'Confirm', 'CW'], ['CL', 'Closing station / clear', 'Operating'], ['CPY', 'Copy', 'CW'],
  ['CQ', 'Calling any station', 'Operating'], ['CUL', 'See you later', 'Closing'], ['CW', 'Continuous wave (Morse)', 'Mode'], ['DE', 'From (“this is”)', 'Operating'],
  ['DX', 'Distance; a far-away station', 'Operating'], ['EL', 'Element (of an antenna)', 'Station'], ['ES', 'And', 'CW'], ['FB', 'Fine business (excellent)', 'CW'],
  ['FER', 'For', 'CW'], ['GA', 'Good afternoon / go ahead', 'CW'], ['GE', 'Good evening', 'CW'], ['GM', 'Good morning', 'CW'], ['GN', 'Good night', 'CW'],
  ['HI', 'Laughter', 'CW'], ['HR', 'Here', 'CW'], ['HW', 'How (“how copy?”)', 'CW'], ['K', 'Over — go ahead, anyone', 'Operating'], ['KN', 'Over — go ahead, only the named station', 'Operating'],
  ['MNI', 'Many', 'CW'], ['NR', 'Number', 'CW'], ['NW', 'Now', 'CW'], ['OM', 'Old man (friendly term for a man)', 'CW'], ['OP', 'Operator', 'Operating'],
  ['PSE', 'Please', 'CW'], ['PWR', 'Power', 'Station'], ['R', 'Received / roger', 'Operating'], ['RCVR', 'Receiver', 'Station'], ['RIG', 'Radio equipment', 'Station'],
  ['RPT', 'Repeat', 'CW'], ['RST', 'Readability, strength, tone report', 'Operating'], ['SK', 'End of contact', 'Operating'], ['SRI', 'Sorry', 'CW'], ['TKS', 'Thanks', 'CW'],
  ['TNX', 'Thanks', 'CW'], ['TU', 'Thank you', 'CW'], ['TX', 'Transmitter / transmit', 'Station'], ['UR', 'Your / you’re', 'CW'], ['VY', 'Very', 'CW'], ['WX', 'Weather', 'CW'],
  ['XCVR', 'Transceiver', 'Station'], ['XYL', 'Wife', 'CW'], ['YL', 'Young lady (any female operator)', 'CW'], ['QSL', 'Confirmation of contact (card/log)', 'Operating'],
  ['SWR', 'Standing wave ratio', 'Station'], ['VSWR', 'Voltage standing wave ratio', 'Station'], ['QRP', 'Low power (5 W or less)', 'Operating'], ['RF', 'Radio frequency', 'Technical'],
  ['SSB', 'Single sideband', 'Mode'], ['FM', 'Frequency modulation', 'Mode'], ['AM', 'Amplitude modulation', 'Mode'], ['FT8', 'Weak-signal digital mode (15 s cycles)', 'Mode'],
  ['SOTA', 'Summits on the Air', 'Programme'], ['POTA', 'Parks on the Air', 'Programme'], ['IOTA', 'Islands on the Air', 'Programme'], ['UTC', 'Coordinated Universal Time', 'Technical'],
  ['QTH', 'Location', 'Operating'], ['ARRL', 'American Radio Relay League', 'Organisation'], ['IARU', 'International Amateur Radio Union', 'Organisation'], ['RSGB', 'Radio Society of Great Britain', 'Organisation'],
  ['ITU', 'International Telecommunication Union', 'Organisation'], ['BALUN', 'Balanced-to-unbalanced transformer', 'Technical'], ['UNUN', 'Unbalanced-to-unbalanced transformer', 'Technical'],
  ['ATU', 'Antenna tuning unit', 'Station'], ['PEP', 'Peak envelope power', 'Technical'], ['EIRP', 'Effective isotropic radiated power', 'Technical'], ['VOX', 'Voice-operated transmit', 'Technical'],
]

export interface Constant { name: string; symbol: string; value: number; display: string; unit: string; note: string; kind: 'exact' | 'measured' | 'convention' | 'rule' }
export const CONSTANTS_META: Meta = { source: 'CODATA 2022 (NIST), SI 2019 definitions, IEEE/IUGG conventions', revision: '2026-10-19', note: 'Rules of thumb are empirical and not exact.' }
export const CONSTANTS: Constant[] = [
  { name: 'Speed of light in vacuum', symbol: 'c', value: 299792458, display: '299 792 458', unit: 'm/s', note: 'Exact by definition of the metre', kind: 'exact' },
  { name: 'Planck constant', symbol: 'h', value: 6.62607015e-34, display: '6.626 070 15 × 10⁻³⁴', unit: 'J·s', note: 'Exact since 2019', kind: 'exact' },
  { name: 'Elementary charge', symbol: 'e', value: 1.602176634e-19, display: '1.602 176 634 × 10⁻¹⁹', unit: 'C', note: 'Exact since 2019', kind: 'exact' },
  { name: 'Boltzmann constant', symbol: 'k', value: 1.380649e-23, display: '1.380 649 × 10⁻²³', unit: 'J/K', note: 'Exact since 2019; thermal noise = kTB', kind: 'exact' },
  { name: 'Avogadro constant', symbol: 'N_A', value: 6.02214076e23, display: '6.022 140 76 × 10²³', unit: '1/mol', note: 'Exact since 2019', kind: 'exact' },
  { name: 'Vacuum permittivity', symbol: 'ε₀', value: 8.8541878188e-12, display: '8.854 187 8188(14) × 10⁻¹²', unit: 'F/m', note: 'Measured; ±1.6 × 10⁻¹⁰ relative', kind: 'measured' },
  { name: 'Vacuum permeability', symbol: 'μ₀', value: 1.25663706127e-6, display: '1.256 637 061 27(20) × 10⁻⁶', unit: 'H/m', note: 'Measured; ≈ 4π × 10⁻⁷ but no longer exactly', kind: 'measured' },
  { name: 'Impedance of free space', symbol: 'Z₀', value: 376.730313412, display: '376.730 313 412(59)', unit: 'Ω', note: 'μ₀·c. Often rounded to 377 Ω or 120π', kind: 'measured' },
  { name: 'Standard noise temperature', symbol: 'T₀', value: 290, display: '290', unit: 'K', note: 'IEEE convention for noise figure', kind: 'convention' },
  { name: 'Thermal noise density at 290 K', symbol: 'kT₀', value: -173.98, display: '−173.98', unit: 'dBm/Hz', note: 'Add 10·log₁₀(bandwidth in Hz): 2.4 kHz SSB ≈ −140 dBm', kind: 'convention' },
  { name: 'Earth mean radius', symbol: 'R', value: 6371.0088, display: '6371.0088', unit: 'km', note: 'IUGG mean radius; used for great-circle maths', kind: 'convention' },
  { name: 'Standard gravity', symbol: 'g₀', value: 9.80665, display: '9.806 65', unit: 'm/s²', note: 'Exact by convention', kind: 'exact' },
  { name: 'Neper to decibel', symbol: 'Np', value: 8.685889638, display: '8.685 889 638', unit: 'dB per Np', note: '20·log₁₀(e)', kind: 'exact' },
  { name: 'Foot', symbol: 'ft', value: 0.3048, display: '0.3048', unit: 'm', note: 'Exact', kind: 'exact' },
  { name: 'Inch', symbol: 'in', value: 0.0254, display: '0.0254', unit: 'm', note: 'Exact', kind: 'exact' },
  { name: 'Statute mile', symbol: 'mi', value: 1609.344, display: '1609.344', unit: 'm', note: 'Exact', kind: 'exact' },
  { name: 'Nautical mile', symbol: 'nmi', value: 1852, display: '1852', unit: 'm', note: 'Exact', kind: 'exact' },
  { name: 'Half-wave dipole length (rule)', symbol: '468/f', value: 468, display: '468 ÷ f(MHz)', unit: 'ft', note: 'Empirical, thin wire in free space (k ≈ 0.95)', kind: 'rule' },
  { name: 'Quarter-wave vertical (rule)', symbol: '234/f', value: 234, display: '234 ÷ f(MHz)', unit: 'ft', note: 'Empirical (k ≈ 0.95)', kind: 'rule' },
  { name: 'Full-wave loop (rule)', symbol: '1005/f', value: 1005, display: '1005 ÷ f(MHz)', unit: 'ft', note: 'Empirical perimeter', kind: 'rule' },
  { name: 'Free-space wavelength (rule)', symbol: '300/f', value: 299.792458, display: '299.79 ÷ f(MHz)', unit: 'm', note: '“300 ÷ f” is accurate to 0.07%', kind: 'rule' },
]

// ITU Radio Regulations Article 5 amateur allocations, simplified: one row per band and region.
// Region 1 = Europe, Africa, Middle East, former USSR; Region 2 = the Americas; Region 3 = most of Asia and Oceania.
export const ITU_META: Meta = { source: 'ITU Radio Regulations, Article 5; international table and footnotes reproduced in 47 CFR 2.106. Simplified amateur overview.', revision: '2026-10-23',
  note: 'Simplified overview. National rules are narrower or different, many bands are shared with other services, and footnotes add conditions. Always check the current Radio Regulations and your licence.' }
export interface ItuBand { band: string; region: 1 | 2 | 3; fromHz: number; toHz: number; status: 'primary' | 'secondary' | 'shared'; note?: string }
const all = (band: string, f: number, t: number, status: ItuBand['status'], note?: string): ItuBand[] => [1, 2, 3].map((r) => ({ band, region: r as 1 | 2 | 3, fromHz: f, toHz: t, status, note }))
export const ITU_BANDS: ItuBand[] = [
  ...all('2200 m', 135.7e3, 137.8e3, 'secondary', 'RR 5.67A/B: 1 W EIRP; country exclusions and radionavigation protection apply. National authorization required.'),
  ...all('630 m', 472e3, 479e3, 'secondary', 'RR 5.80A/B: normally 1 W EIRP, up to 5 W where permitted; geographic protection and country exclusions apply.'),
  { band: '160 m', region: 1, fromHz: 1.81e6, toHz: 2.0e6, status: 'shared', note: 'Shared with other services; upper part depends on national rules' },
  { band: '160 m', region: 2, fromHz: 1.8e6, toHz: 2.0e6, status: 'shared' },
  { band: '160 m', region: 3, fromHz: 1.8e6, toHz: 2.0e6, status: 'shared' },
  { band: '80 m', region: 1, fromHz: 3.5e6, toHz: 3.8e6, status: 'shared' },
  { band: '80 m', region: 2, fromHz: 3.5e6, toHz: 4.0e6, status: 'shared' },
  { band: '80 m', region: 3, fromHz: 3.5e6, toHz: 3.9e6, status: 'shared' },
  ...all('60 m', 5.3515e6, 5.3665e6, 'secondary', 'WRC-15; 15 kHz wide, low power limits (RR 5.133B). Many countries use channels instead.'),
  { band: '40 m', region: 1, fromHz: 7.0e6, toHz: 7.2e6, status: 'primary', note: '7.0–7.1 MHz exclusive to amateur' },
  { band: '40 m', region: 2, fromHz: 7.0e6, toHz: 7.3e6, status: 'primary', note: '7.0–7.1 MHz exclusive to amateur' },
  { band: '40 m', region: 3, fromHz: 7.0e6, toHz: 7.2e6, status: 'primary', note: '7.0–7.1 MHz exclusive to amateur' },
  ...all('30 m', 10.1e6, 10.15e6, 'secondary'),
  ...all('20 m', 14.0e6, 14.35e6, 'primary'),
  ...all('17 m', 18.068e6, 18.168e6, 'primary'),
  ...all('15 m', 21.0e6, 21.45e6, 'primary'),
  ...all('12 m', 24.89e6, 24.99e6, 'primary'),
  ...all('10 m', 28.0e6, 29.7e6, 'primary'),
  { band: '6 m', region: 1, fromHz: 50e6, toHz: 52e6, status: 'secondary', note: 'WRC-19 baseline. RR 5.164–5.169B include country exceptions, different primary segments and broadcasting protection. Some national plans extend to 54 MHz; this row is not worldwide permission.' },
  { band: '6 m', region: 2, fromHz: 50e6, toHz: 54e6, status: 'primary', note: 'Country footnotes and national licensing conditions still apply.' },
  { band: '6 m', region: 3, fromHz: 50e6, toHz: 54e6, status: 'primary', note: 'Primary amateur allocation baseline; country footnotes include different service categories and broadcasting/fixed/mobile uses. Check the national table.' },
  { band: '2 m', region: 1, fromHz: 144e6, toHz: 146e6, status: 'primary' },
  { band: '2 m', region: 2, fromHz: 144e6, toHz: 148e6, status: 'primary' },
  { band: '2 m', region: 3, fromHz: 144e6, toHz: 148e6, status: 'primary' },
  { band: '70 cm', region: 1, fromHz: 430e6, toHz: 440e6, status: 'secondary' },
  { band: '70 cm', region: 2, fromHz: 420e6, toHz: 450e6, status: 'secondary' },
  { band: '70 cm', region: 3, fromHz: 430e6, toHz: 440e6, status: 'secondary' },
]
