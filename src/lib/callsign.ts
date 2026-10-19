import { BLOCKS, ENTITIES } from '../data/callsigns'

export interface Where { holder: string; entity: string | null; matched: string }
export interface CallsignResult {
  status: 'ok' | 'invalid' | 'not-allocated'
  input: string; call: string | null; suffix: string | null
  issuedBy: Where | null // from the call sign itself
  operating: Where | null // from a prefix such as DL/ in DL/W1AW, when present
  notes: string[]
}

const SUFFIXES = new Set(['P', 'M', 'MM', 'AM', 'QRP', 'LH', 'B', 'A'])
const CALL_SHAPE = /^[A-Z0-9]{1,3}\d[A-Z0-9]*[A-Z]$/ // prefix + digit + suffix ending in a letter
const looksLikeCall = (t: string) => CALL_SHAPE.test(t) && t.length >= 4

/** Country that holds the ITU block containing this call sign or prefix, or null if the series is unallocated. */
export function blockHolder(token: string): string | null {
  const t = token.toUpperCase()
  if (t.startsWith('SS') && t.length >= 3 && /[A-Z]/.test(t[2])) return t[2] <= 'M' ? 'Egypt' : 'Sudan' // SSA–SSM Egypt, SSN–SSZ Sudan
  if (t.startsWith('3D') && t.length >= 3) return /[A-M]/.test(t[2]) ? 'Eswatini' : 'Fiji' // 3DA–3DM Eswatini, 3DN–3DZ Fiji (3D2… is Fiji)
  const two = t.slice(0, 2)
  if (two.length === 2) for (const [f, to, h] of BLOCKS) if (f.length === 2 && two >= f && two <= to) return h
  for (const [f, , h] of BLOCKS) if (f.length === 1 && t[0] === f) return h
  return null
}
/** Island group / home nation / dependency from the longest matching prefix, if different from the block holder. */
export function entityOf(token: string, holder: string | null): string | null {
  const t = token.toUpperCase()
  let best: [string, string, string] | null = null
  for (const e of ENTITIES) if (t.startsWith(e[0]) && (!best || e[0].length > best[0].length)) best = e
  return best && best[1] !== holder ? best[1] : null
}
const where = (token: string): Where | null => { const holder = blockHolder(token); return holder ? { holder, entity: entityOf(token, holder), matched: token.toUpperCase() } : null }

export function lookup(raw: string): CallsignResult {
  const input = raw.trim().toUpperCase().replace(/\s+/g, '')
  const base: CallsignResult = { status: 'invalid', input, call: null, suffix: null, issuedBy: null, operating: null, notes: [] }
  if (!input) return { ...base, notes: ['Enter a call sign, e.g. W1AW, DL/W1AW or ZS6ABC/P.'] }
  if (!/^[A-Z0-9/]+$/.test(input)) return { ...base, notes: ['Call signs use only letters, digits and “/”.'] }
  const parts = input.split('/').filter(Boolean)
  if (!parts.length || parts.length > 3) return { ...base, notes: ['Use at most two “/” separators, e.g. DL/W1AW/P.'] }

  let call: string | null = null, prefix: string | null = null, suffix: string | null = null
  const rest: string[] = []
  for (const p of parts) { if (call === null && looksLikeCall(p)) call = p; else rest.push(p) }
  if (call === null) { // no token looks like a full call: treat the longest as the call so partial input still gives a country
    const i = parts.reduce((b, p, k) => (p.length > parts[b].length ? k : b), 0)
    call = parts[i]; rest.length = 0; parts.forEach((p, k) => k !== i && rest.push(p))
  }
  for (const p of rest) { if (SUFFIXES.has(p) || /^\d$/.test(p)) suffix = suffix ? `${suffix}/${p}` : p; else if (prefix === null) prefix = p; else base.notes.push(`Ignored “${p}”: more than one operating prefix.`) }

  const notes = [...base.notes]
  const issuedBy = where(call)
  const operating = prefix ? where(prefix) : null
  if (prefix && !operating) notes.push(`The prefix “${prefix}” is not in any allocated ITU series.`)
  if (!issuedBy) return { ...base, status: 'not-allocated', call, suffix, operating, notes: [...notes, `“${call.slice(0, 2)}…” is not in any allocated ITU call sign series.`] }

  if (suffix?.includes('MM')) notes.push('/MM = maritime mobile: on a ship at sea, so there is no operating country. The call was issued by the country shown.')
  else if (suffix?.includes('AM')) notes.push('/AM = aeronautical mobile: operating from an aircraft, so there is no operating country.')
  else if (suffix === 'P' || suffix === 'M') notes.push(suffix === 'P' ? '/P = portable: away from the licensed address.' : '/M = mobile: operating from a vehicle.')
  else if (suffix && /^\d$/.test(suffix)) notes.push(`/${suffix} = operating from call area ${suffix}, which may differ from the area in the call sign.`)
  if (operating) notes.push('A prefix before “/” names the country the operator is currently in; it overrides the call sign’s own country for that operation.')
  notes.push('The ITU series shows which country issued the call sign. People can move, so it is not proof of where an operator lives or is.')
  return { status: 'ok', input, call, suffix, issuedBy, operating, notes }
}
