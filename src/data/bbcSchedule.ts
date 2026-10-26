import type { BroadcastEntry } from '../lib/packs'

// Factual transcription of the user-supplied BBC HTML; provenance/hash in docs/CONTENT_MAINTENANCE.md.
export const BBC_META = {
  title: 'BBC World Service · 2026–27 season',
  source: 'BBC World Service — Global Short Wave Frequencies (supplied page)',
  sourceUrl: 'https://www.bbc.co.uk/programmes/articles/2x9tqt6mc05vB2S37j8MWMJ/global-short-wave-frequencies',
  revision: '2026-10-26', // inspection/transcription date; original publication timestamp not established
  validFrom: '2026-10-25', validUntil: '2027-03-27',
}
type Row = [start: string, end: string, days: string, frequencies: number[]]
const region = (target: string, rows: Row[], drm = false): BroadcastEntry[] => rows.flatMap(([startUtc, endUtc, days, frequencies]) =>
  frequencies.map(freqKhz => ({ station: 'BBC World Service', target, freqKhz, startUtc, endUtc, days,
    note: drm ? 'DRM digital · requires DRM-capable reception' : freqKhz < 3000 ? 'Medium wave' : 'Shortwave' })))

export const BBC_SCHEDULE: BroadcastEntry[] = [
  ...region('West & Central Africa', [
    ['0500', '0700', 'daily', [9410, 9915]],
    ['1500', '1700', '6', [17700, 21630]],
    ['1630', '1830', '7', [17700, 17780]],
    ['1700', '1800', '12345', [17780]],
    ['1700', '1900', '12345', [15420]],
    ['1800', '1900', '12345', [15400]],
  ]),
  ...region('East Africa', [
    ['0500', '0600', 'daily', [17690]],
    ['0600', '0700', 'daily', [15490]],
    ['1500', '1700', '123456', [12095]],
    ['1630', '1830', '7', [12095]],
  ]),
  ...region('South East Asia', [
    ['1200', '1400', 'daily', [21565]],
    ['2200', '0000', 'daily', [11645]],
  ]),
  ...region('Middle East & Gulf States', [
    ['0230', '0500', 'daily', [702]],
    ['0600', '0700', '56', [639, 720]],
    ['1400', '1430', '67', [639, 720]],
    ['1430', '1500', 'daily', [639, 720]],
    ['1530', '1700', 'daily', [639, 720]],
    ['1600', '1630', 'daily', [702]],
    ['1730', '1800', 'daily', [639, 720]],
    ['1900', '1930', '67', [639, 720]],
  ]),
  ...region('South Asia', [['1500', '1600', 'daily', [17575]]], true),
]

/** Published date range is inclusive, in UTC. Out-of-season rows remain available only as a reference. */
export function bbcDateStatus(now: Date): 'upcoming' | 'current' | 'expired' {
  const date = now.toISOString().slice(0, 10)
  return date < BBC_META.validFrom ? 'upcoming' : date > BBC_META.validUntil ? 'expired' : 'current'
}
