import type { BroadcastEntry } from '../lib/packs'

// Time-signal and standard-frequency stations: long-lived, continuous services, so they can be bundled.
// Programme schedules (shortwave broadcasters, utility stations) change every season and are supplied as dated packs instead.
export const TIME_STATIONS_META = { source: 'Station operators’ public information (NIST, NRC, VNIIFTRI, NTSC, PTB, NPL, NICT), as generally published', revision: '2026-10-19',
  note: 'Services can change frequency, power or hours, or close. Verify before relying on them (for example for calibration).' }
const T = (freqKhz: number, station: string, country: string, note: string): BroadcastEntry => ({ freqKhz, startUtc: '0000', endUtc: '0000', days: 'daily', station, country, language: 'time signal', target: 'Worldwide', note })
export const TIME_STATIONS: BroadcastEntry[] = [
  ...[2500, 5000, 10000, 15000, 20000].map((f) => T(f, 'WWV (Fort Collins, Colorado)', 'USA', 'Continuous time and frequency signals; voice announcements each minute')),
  ...[2500, 5000, 10000, 15000].map((f) => T(f, 'WWVH (Kauai, Hawaii)', 'USA', 'Continuous; female voice announcements, offset from WWV')),
  T(60, 'WWVB (Fort Collins, Colorado)', 'USA', 'Low-frequency time code for radio-controlled clocks'),
  ...[3330, 7850, 14670].map((f) => T(f, 'CHU (Ottawa)', 'Canada', 'Continuous; English/French announcements and a digital time code')),
  ...[4996, 9996, 14996].map((f) => T(f, 'RWM (Moscow)', 'Russia', 'Continuous time signals with some scheduled breaks')),
  ...[2500, 5000, 10000, 15000].map((f) => T(f, 'BPM (Pucheng)', 'China', 'Time signals; daily schedule of transmissions varies')),
  T(77.5, 'DCF77 (Mainflingen)', 'Germany', 'Low-frequency time code'),
  T(60, 'MSF (Anthorn)', 'United Kingdom', 'Low-frequency time code'),
  T(40, 'JJY (Fukushima)', 'Japan', 'Low-frequency time code'),
  T(60, 'JJY (Saga)', 'Japan', 'Low-frequency time code'),
]
