// Logbook records and ADIF 3.1 export/import. ADIF is a plain-text interchange format; field lengths are character counts,
// so everything written is reduced to printable ASCII (international ADIF fields are not used).
export interface Qso {
  id: string; call: string; date: string /* YYYY-MM-DD, UTC */; time: string /* HH:MM, UTC */; freqMHz: number | null; mode: string
  rstSent: string; rstRcvd: string; name: string; grid: string; comment: string
}

/** ADIF band names by frequency range in MHz (from the ADIF band enumeration). */
const BANDS: [string, number, number][] = [
  ['2190m', 0.1357, 0.1378], ['630m', 0.472, 0.479], ['160m', 1.8, 2], ['80m', 3.5, 4], ['60m', 5.06, 5.45], ['40m', 7, 7.3], ['30m', 10.1, 10.15], ['20m', 14, 14.35],
  ['17m', 18.068, 18.168], ['15m', 21, 21.45], ['12m', 24.89, 24.99], ['10m', 28, 29.7], ['6m', 50, 54], ['4m', 70, 71], ['2m', 144, 148], ['1.25m', 222, 225],
  ['70cm', 420, 450], ['33cm', 902, 928], ['23cm', 1240, 1300],
]
/** ADIF has no top-level FT4 or PSK31: they are submodes (MFSK/FT4, PSK/BPSK31). Everything else is written as its own mode. */
const SUBMODE: Record<string, [string, string]> = { FT4: ['MFSK', 'FT4'], PSK31: ['PSK', 'BPSK31'] }
const fromSub = (mode: string, sub: string) => Object.entries(SUBMODE).find(([, [m, s]]) => m === mode.toUpperCase() && s === sub.toUpperCase())?.[0]
export const bandOf = (mhz: number | null) => (mhz == null ? '' : BANDS.find(([, lo, hi]) => mhz >= lo && mhz <= hi)?.[0] ?? '')

const ascii = (s: string) => s.normalize('NFKD').replace(/[^\x20-\x7e]/g, '').replace(/[\r\n]+/g, ' ').trim()
export function field(name: string, value: string | number | null | undefined) {
  if (value == null) return ''
  const v = ascii(String(value))
  return v ? `<${name}:${v.length}>${v} ` : ''
}

export function toAdif(qsos: Qso[], station: string, version: string): string {
  const head = `Ham Radio Tools log export\n${field('ADIF_VER', '3.1.4')}${field('PROGRAMID', 'Ham Radio Tools')}${field('PROGRAMVERSION', version)}<EOH>\n`
  const rows = qsos.map((q) => [
    field('CALL', q.call.toUpperCase()), field('QSO_DATE', q.date.replace(/-/g, '')), field('TIME_ON', q.time.replace(':', '') + '00'),
    field('BAND', bandOf(q.freqMHz)), field('FREQ', q.freqMHz), field('MODE', (SUBMODE[q.mode] ?? [q.mode])[0]), field('SUBMODE', SUBMODE[q.mode]?.[1]), field('RST_SENT', q.rstSent), field('RST_RCVD', q.rstRcvd),
    field('NAME', q.name), field('GRIDSQUARE', q.grid.toUpperCase()), field('COMMENT', q.comment), field('STATION_CALLSIGN', station.toUpperCase()), '<EOR>',
  ].join(''))
  return head + rows.join('\n') + '\n'
}

/** Read ADIF text: returns records as upper-cased field maps. Tolerant of case, line breaks and the optional `:type` part of a tag. */
export function parseAdif(text: string): Record<string, string>[] {
  const body = /<eoh>/i.test(text) ? text.slice(text.search(/<eoh>/i) + 5) : text
  const out: Record<string, string>[] = []
  let cur: Record<string, string> = {}
  const re = /<([A-Za-z0-9_]+)(?::(\d+))?(?::[A-Za-z])?>/g
  let m: RegExpExecArray | null
  while ((m = re.exec(body))) {
    const name = m[1].toUpperCase()
    if (name === 'EOR') { if (Object.keys(cur).length) out.push(cur); cur = {}; continue }
    if (m[2] === undefined) continue
    const len = Number(m[2]), start = re.lastIndex
    cur[name] = body.slice(start, start + len)
    re.lastIndex = start + len
  }
  if (Object.keys(cur).length) out.push(cur)
  return out
}

export function fromAdif(rec: Record<string, string>, id: string): Qso | null {
  const call = (rec.CALL ?? '').trim().toUpperCase()
  const d = (rec.QSO_DATE ?? '').trim(), t = (rec.TIME_ON ?? '').trim()
  if (!call || !/^\d{8}$/.test(d)) return null
  const hh = t.slice(0, 2) || '00', mm = t.slice(2, 4) || '00'
  const f = Number(rec.FREQ)
  return { id, call, date: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`, time: `${hh}:${mm}`, freqMHz: Number.isFinite(f) && rec.FREQ ? f : null, mode: fromSub(rec.MODE ?? '', rec.SUBMODE ?? '') ?? rec.MODE ?? '', rstSent: rec.RST_SENT ?? '', rstRcvd: rec.RST_RCVD ?? '', name: rec.NAME ?? '', grid: (rec.GRIDSQUARE ?? '').toUpperCase(), comment: rec.COMMENT ?? '' }
}

/** Same call, band and mode on the same UTC date: the usual contest duplicate rule. */
export const isDuplicate = (log: Qso[], q: Pick<Qso, 'call' | 'date' | 'freqMHz' | 'mode'>) =>
  log.some((x) => x.call === q.call.toUpperCase() && x.date === q.date && x.mode === q.mode && bandOf(x.freqMHz) === bandOf(q.freqMHz))
