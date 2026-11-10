// Snapshot of amateur-satellite operating frequencies from the SatNOGS DB transmitter database.
// Data licence: Creative Commons Attribution-ShareAlike 4.0 (https://creativecommons.org/licenses/by-sa/4.0/).
// This file is data adapted from SatNOGS DB (Libre Space Foundation); keep this notice and the licence if you copy it.
// Provenance, selection rules and the refresh routine are in docs/DATA_SOURCES.md and docs/CONTENT_MAINTENANCE.md.
export const SAT_FREQ_META = {
  source: 'SatNOGS DB',
  sourceUrl: 'https://db.satnogs.org/',
  license: 'CC BY-SA 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
  retrieved: '2026-11-10',
  reviewEveryDays: 90,
}

export interface SatLink {
  id: string
  label: string
  mode: string
  /** Downlink range in Hz as [low, high]. A single frequency repeats the value. */
  downHz: [number, number]
  /** Uplink range in Hz, omitted when the satellite has no uplink on this link. */
  upHz?: [number, number]
  linear: boolean
  note?: string
}
export interface SatFreqEntry { name: string; norad: number; links: SatLink[] }

const one = (hz: number): [number, number] => [hz, hz]

// Only links SatNOGS lists as active and alive on the retrieval date, limited to voice/linear links with a published uplink.
// Entries marked active in a database are not proof that a transponder is switched on today.
export const SAT_FREQUENCIES: SatFreqEntry[] = [
  { name: 'ISS (ZARYA)', norad: 25544, links: [
    { id: 'fm-repeater', label: 'V/U FM voice repeater (CTCSS 67.0 Hz)', mode: 'FM', upHz: one(145_990_000), downHz: one(437_800_000), linear: false, note: 'Crew activities and scheduled outages can interrupt service.' },
  ] },
  { name: 'SO-50 (SAUDISAT 1C)', norad: 27607, links: [
    { id: 'fm-voice', label: 'V/U FM voice (CTCSS 67.0 Hz)', mode: 'FM', upHz: one(145_850_000), downHz: one(436_795_000), linear: false },
  ] },
  { name: 'AO-91 (RadFxSat / Fox-1B)', norad: 43017, links: [
    { id: 'fm-voice', label: 'U/V FM voice (no CTCSS)', mode: 'FM', upHz: one(435_250_000), downHz: one(145_960_000), linear: false },
  ] },
  { name: 'IO-86 (LAPAN-ORARI)', norad: 40931, links: [
    { id: 'fm-voice', label: 'V/U FM voice (CTCSS 88.5 Hz)', mode: 'FM', upHz: one(145_880_000), downHz: one(435_880_000), linear: false },
  ] },
  { name: 'AO-7 (AMSAT-OSCAR 7)', norad: 7530, links: [
    { id: 'mode-b', label: 'Mode B (U/V) linear', mode: 'SSB/CW', upHz: [432_125_000, 432_175_000], downHz: [145_925_000, 145_975_000], linear: true },
    { id: 'mode-a', label: 'Mode A (V/A) linear', mode: 'SSB/CW', upHz: [145_850_000, 145_950_000], downHz: [29_400_000, 29_500_000], linear: true },
  ] },
  { name: 'RS-44 (DOSAAF-85)', norad: 44909, links: [
    { id: 'linear', label: 'V/U linear transponder', mode: 'SSB/CW', upHz: [145_935_000, 145_995_000], downHz: [435_610_000, 435_670_000], linear: true },
  ] },
  { name: 'AO-73 (FUNcube-1)', norad: 39444, links: [
    { id: 'linear', label: 'U/V linear transponder', mode: 'SSB/CW', upHz: [435_130_000, 435_150_000], downHz: [145_950_000, 145_970_000], linear: true },
  ] },
  { name: 'AO-123 (ASRTU-1)', norad: 61781, links: [
    { id: 'fm-voice', label: 'V/U FM voice (CTCSS 67.0 Hz)', mode: 'FM', upHz: one(145_850_000), downHz: one(435_400_000), linear: false },
  ] },
  { name: 'FO-29 (JAS-2)', norad: 24278, links: [
    { id: 'linear', label: 'V/U linear transponder', mode: 'SSB/CW', upHz: [145_900_000, 146_000_000], downHz: [435_800_000, 435_900_000], linear: true },
  ] },
  { name: 'JO-97 (JY1Sat)', norad: 43803, links: [
    { id: 'linear', label: 'U/V linear transponder', mode: 'SSB/CW', upHz: [435_100_000, 435_120_000], downHz: [145_855_000, 145_875_000], linear: true },
  ] },
  { name: 'QMR-KWT 2 (RS95S)', norad: 67291, links: [
    { id: 'fm-voice', label: 'V/U FM voice (CTCSS 67.0 Hz)', mode: 'FM', upHz: one(145_920_000), downHz: one(436_950_000), linear: false },
  ] },
]

/** Nominal frequency used for Doppler: the single frequency, or the centre of a linear passband. */
export const centreHz = (r: [number, number]) => (r[0] + r[1]) / 2
export const satFrequencyAgeDays = (now: Date) => Math.floor((now.getTime() - Date.parse(SAT_FREQ_META.retrieved + 'T00:00:00Z')) / 86400000)
