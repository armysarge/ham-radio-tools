// Optional content packs (band plans, broadcast schedules…) imported from a local file or USB stick.
// A pack always says where its data came from and how old it is; the app never fetches packs itself.
export const PACK_FORMAT = 'ham-radio-tools-pack'
export const PACK_VERSION = 1
export type PackKind = 'band-plan' | 'broadcast-schedule'

export interface BandSegment { band: string; fromHz: number; toHz: number; use: string; modes?: string; power?: string; status?: string; note?: string }
export interface BroadcastEntry { freqKhz: number; startUtc: string; endUtc: string; days: string; station: string; language?: string; target?: string; country?: string; note?: string }
export interface Pack<D = unknown> {
  format: typeof PACK_FORMAT; version: number; kind: PackKind
  id: string; title: string; jurisdiction?: string; source: string; sourceUrl?: string
  revision: string // YYYY-MM-DD
  license: string; data: D
}
export type PackMeta = Omit<Pack, 'data'> & { rows: number; installed: string }

const MAX_BYTES = 25 * 1024 * 1024, MAX_ROWS = 200_000
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const s = (v: unknown, max = 300) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null)
const optS = (v: unknown, max = 300) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined)
const DATE = /^\d{4}-\d{2}-\d{2}$/

export const ageDays = (revision: string, now = new Date()) => Math.floor((now.getTime() - Date.parse(revision + 'T00:00:00Z')) / 86_400_000)

/** Parse and validate a pack file. Throws an Error whose message is suitable for the user. */
export function parsePack(text: string): { pack: Pack; skipped: string[]; rows: number } {
  if (text.length > MAX_BYTES) throw new Error('This file is larger than 25 MB, so it is not a Ham Radio Tools pack.')
  let raw: unknown
  try { raw = JSON.parse(text) } catch { throw new Error('This file is not valid JSON.') }
  if (!isObj(raw) || raw.format !== PACK_FORMAT) throw new Error('This is not a Ham Radio Tools content pack (missing format marker).')
  if (typeof raw.version !== 'number' || raw.version > PACK_VERSION) throw new Error('This pack needs a newer version of the app.')
  if (raw.kind !== 'band-plan' && raw.kind !== 'broadcast-schedule') throw new Error(`Unknown pack type “${String(raw.kind)}”.`)
  const id = s(raw.id, 80), title = s(raw.title, 120), source = s(raw.source), license = s(raw.license)
  if (!id || !/^[a-z0-9][a-z0-9._-]*$/i.test(id)) throw new Error('The pack needs an id made of letters, digits, dots, dashes or underscores.')
  if (!title || !source || !license) throw new Error('A pack must state its title, source and licence so you know where the data came from.')
  if (typeof raw.revision !== 'string' || !DATE.test(raw.revision) || Number.isNaN(Date.parse(raw.revision))) throw new Error('The pack revision must be a date written YYYY-MM-DD.')
  if (!isObj(raw.data)) throw new Error('The pack has no data section.')

  const skipped: string[] = []
  let data: unknown, rows: number
  if (raw.kind === 'band-plan') {
    const list = Array.isArray(raw.data.segments) ? raw.data.segments : []
    const segments: BandSegment[] = []
    list.forEach((x, i) => {
      const band = isObj(x) ? s(x.band, 40) : null, use = isObj(x) ? s(x.use) : null
      if (!isObj(x) || !band || !use || typeof x.fromHz !== 'number' || typeof x.toHz !== 'number' || !(x.fromHz > 0) || !(x.toHz > x.fromHz)) { skipped.push(`segment #${i + 1}: needs band, use, and 0 < fromHz < toHz`); return }
      segments.push({ band, fromHz: x.fromHz, toHz: x.toHz, use, modes: optS(x.modes), power: optS(x.power), status: optS(x.status), note: optS(x.note) })
    })
    if (!segments.length) throw new Error('The pack contains no usable band segments.')
    data = { segments }; rows = segments.length
  } else {
    const list = Array.isArray(raw.data.entries) ? raw.data.entries : []
    if (list.length > MAX_ROWS) throw new Error(`Too many rows (${list.length}); the limit is ${MAX_ROWS}.`)
    const entries: BroadcastEntry[] = []
    list.forEach((x, i) => {
      const station = isObj(x) ? s(x.station, 80) : null
      const t = (v: unknown) => typeof v === 'string' && /^([01]\d|2[0-3])[0-5]\d$/.test(v)
      if (!isObj(x) || !station || typeof x.freqKhz !== 'number' || !(x.freqKhz > 0) || !t(x.startUtc) || !t(x.endUtc)) { if (skipped.length < 50) skipped.push(`entry #${i + 1}: needs station, freqKhz > 0 and HHMM start/end times (UTC)`); return }
      const days = typeof x.days === 'string' && /^(daily|[1-7]{1,7})$/.test(x.days) ? x.days : 'daily'
      entries.push({ freqKhz: x.freqKhz, startUtc: x.startUtc as string, endUtc: x.endUtc as string, days, station, language: optS(x.language, 40), target: optS(x.target, 40), country: optS(x.country, 40), note: optS(x.note) })
    })
    if (!entries.length) throw new Error('The pack contains no usable schedule entries.')
    data = { entries }; rows = entries.length
  }
  const pack: Pack = { format: PACK_FORMAT, version: PACK_VERSION, kind: raw.kind, id, title, jurisdiction: optS(raw.jurisdiction, 80), source, sourceUrl: optS(raw.sourceUrl, 300), revision: raw.revision, license, data }
  return { pack, skipped, rows }
}

/** Is `hhmm` inside [start, end) UTC, handling wrap past midnight? 0000-2400 style equal values mean all day. */
export function onAirAt(startUtc: string, endUtc: string, hhmm: number): boolean {
  const a = +startUtc, b = +endUtc
  if (a === b) return true
  return a < b ? hhmm >= a && hhmm < b : hhmm >= a || hhmm < b
}
/** days: 'daily' or digits 1..7 where 1 = Monday. */
export const runsOnDay = (days: string, isoWeekday: number) => days === 'daily' || days.includes(String(isoWeekday))
