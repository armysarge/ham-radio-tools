// Clock and timer helpers.

export function formatHms(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000)), d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), x = s % 60
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d ? d + 'd ' : ''}${p(h)}:${p(m)}:${p(x)}`
}
/** A `datetime-local` value read as UTC (the contest-rules convention). Returns null if it isn't a valid date. */
export function parseUtc(v: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(v)) return null
  const t = Date.parse(v + (v.length === 16 ? ':00' : '') + 'Z')
  return Number.isNaN(t) ? null : t
}
/** Time left until the next ID reminder; negative means it is overdue. */
export const idRemainingMs = (lastIdMs: number, intervalMin: number, nowMs: number) => lastIdMs + intervalMin * 60000 - nowMs
/** Clock text for a zone, or null if the zone name is not one the browser knows. */
export function clockIn(zone: string, nowMs: number): { time: string; date: string } | null {
  try {
    const d = new Date(nowMs)
    return {
      time: new Intl.DateTimeFormat('en-GB', { timeZone: zone, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(d),
      date: new Intl.DateTimeFormat('en-CA', { timeZone: zone, weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d),
    }
  } catch { return null }
}
