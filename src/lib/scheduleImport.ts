import type { BroadcastEntry } from './packs'

// Converts plain-text schedule files into pack entries. Two layouts are understood:
//  1. Semicolon-separated files with a header like  kHz;Time(UTC);Days;ITU;Station;Lng;Target;Remarks;P;Start;Stop
//     (the layout published by the EiBi shortwave schedule).
//  2. Our own CSV:  freq_khz,start_utc,end_utc,days,station,language,target,country,note
// The app never downloads these; you obtain the file yourself and check its licence.
const DAY_NAMES: Record<string, string> = { MO: '1', TU: '2', WE: '3', TH: '4', FR: '5', SA: '6', SU: '7' }

export function parseDays(raw: string | undefined): string {
  const s = (raw ?? '').trim().toUpperCase()
  if (!s || s === 'DAILY') return 'daily'
  if (/^[1-7]{1,7}$/.test(s)) return [...new Set(s)].sort().join('')
  const names = s.match(/[A-Z]{2}/g)
  if (names && names.join('') === s && names.every((n) => DAY_NAMES[n])) return [...new Set(names.map((n) => DAY_NAMES[n]))].sort().join('')
  return 'daily' // “irr”, “alt”, ranges like Mo-Fr and similar: treated as daily; the remark keeps the original text
}
const hhmm = (v: string) => (v === '2400' ? '0000' : /^([01]\d|2[0-3])[0-5]\d$/.test(v) ? v : null)
const splitLine = (line: string, sep: string) => line.split(sep).map((c) => c.trim().replace(/^"|"$/g, ''))

export function parseScheduleText(text: string): { entries: BroadcastEntry[]; skipped: string[]; layout: 'eibi' | 'csv' } {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim())
  if (!lines.length) throw new Error('The file is empty.')
  const header = lines[0].toLowerCase()
  const eibi = header.includes('khz') && header.includes('time(utc)') && lines[0].includes(';')
  const sep = eibi ? ';' : ','
  if (!eibi && !(header.includes('freq') && header.includes('station'))) throw new Error('Unrecognised layout. Expected a header line like “kHz;Time(UTC);Days;ITU;Station;…” or “freq_khz,start_utc,end_utc,days,station,…”.')
  const cols = splitLine(lines[0], sep).map((c) => c.toLowerCase())
  const at = (names: string[]) => cols.findIndex((c) => names.includes(c))
  const idx = eibi
    ? { f: at(['khz']), t: at(['time(utc)']), d: at(['days']), st: at(['station']), l: at(['lng', 'language']), tg: at(['target']), c: at(['itu']), n: at(['remarks']) }
    : { f: at(['freq_khz', 'freqkhz']), t: -1, s: at(['start_utc']), e: at(['end_utc']), d: at(['days']), st: at(['station']), l: at(['language']), tg: at(['target']), c: at(['country']), n: at(['note']) }
  if (idx.f < 0 || idx.st < 0 || (eibi ? idx.t < 0 : (idx as { s: number }).s < 0 || (idx as { e: number }).e < 0)) throw new Error('The header is missing a required column (frequency, time and station).')

  const entries: BroadcastEntry[] = [], skipped: string[] = []
  lines.slice(1).forEach((line, i) => {
    const c = splitLine(line, sep), n = i + 2
    const f = Number(c[idx.f])
    let start: string | null, end: string | null
    if (eibi) { const m = /^(\d{4})-(\d{4})$/.exec(c[idx.t] ?? ''); start = m ? hhmm(m[1]) : null; end = m ? hhmm(m[2]) : null }
    else { start = hhmm(c[(idx as { s: number }).s] ?? ''); end = hhmm(c[(idx as { e: number }).e] ?? '') }
    const station = c[idx.st]
    if (!(f > 0) || !start || !end || !station) { if (skipped.length < 50) skipped.push(`line ${n}: needs a frequency, a valid HHMM time range and a station`); return }
    const rawDays = idx.d >= 0 ? c[idx.d] : ''
    const days = parseDays(rawDays)
    const noteParts = [idx.n >= 0 ? c[idx.n] : '', days === 'daily' && rawDays && !/^daily$/i.test(rawDays) ? `days: ${rawDays}` : ''].filter(Boolean)
    entries.push({ freqKhz: f, startUtc: start, endUtc: end, days, station: station.slice(0, 80), language: (idx.l >= 0 && c[idx.l]) || undefined, target: (idx.tg >= 0 && c[idx.tg]) || undefined, country: (idx.c >= 0 && c[idx.c]) || undefined, note: noteParts.join(' · ') || undefined })
  })
  if (!entries.length) throw new Error('No usable schedule lines were found in this file.')
  return { entries, skipped, layout: eibi ? 'eibi' : 'csv' }
}
