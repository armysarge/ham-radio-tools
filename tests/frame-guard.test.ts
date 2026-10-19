import { describe, it, expect } from 'vitest'
import { frameHeaders, guardSource, headersFile, parseAllowed } from '../scripts/frame-guard.mjs'

const run = (allowed: string[], env: { framed: boolean; ancestors?: string[]; referrer?: string; origin?: string }) => {
  const doc = { referrer: env.referrer ?? '', documentElement: { innerHTML: 'app' } }
  const w: Record<string, unknown> = {}; w.self = w; w.top = env.framed ? {} : w
  const loc = { origin: env.origin ?? 'https://demo.example', href: 'https://demo.example/', ancestorOrigins: env.ancestors }
  new Function('window', 'document', 'location', guardSource(allowed))(w, doc, loc)
  return { blocked: w.__hrtBlocked === true, html: doc.documentElement.innerHTML }
}

describe('ALLOWED_FRAME_ANCESTORS parsing', () => {
  it('accepts origins, trims, de-duplicates', () => { expect(parseAllowed(' https://a.com, https://b.org:8443/ ,https://a.com')).toEqual(['https://a.com', 'https://b.org:8443']); expect(parseAllowed('')).toEqual([]); expect(parseAllowed(undefined)).toEqual([]) })
  it('rejects anything that is not a bare origin', () => {
    for (const bad of ['example.com', 'https://a.com/path', 'javascript:alert(1)', '*', 'https://a.com;frame-ancestors *']) expect(() => parseAllowed(bad), bad).toThrow(/ALLOWED_FRAME_ANCESTORS/)
  })
})
describe('headers', () => {
  it('denies framing by default and lists allowed origins otherwise', () => {
    expect(frameHeaders([])).toEqual({ 'Content-Security-Policy': "frame-ancestors 'none'", 'X-Frame-Options': 'DENY' })
    expect(frameHeaders(['https://a.com', 'https://b.org'])).toEqual({ 'Content-Security-Policy': "frame-ancestors 'self' https://a.com https://b.org" })
    expect(headersFile([])).toContain('X-Frame-Options: DENY'); expect(headersFile(['https://a.com'])).toContain("frame-ancestors 'self' https://a.com")
  })
})
describe('in-page guard', () => {
  it('does nothing when the app is the top page', () => expect(run([], { framed: false })).toEqual({ blocked: false, html: 'app' }))
  it('blanks the page when framed by an unlisted site (ancestorOrigins)', () => { const r = run(['https://ok.com'], { framed: true, ancestors: ['https://evil.com'] }); expect(r.blocked).toBe(true); expect(r.html).toContain('cannot be shown inside another site') })
  it('blocks when any ancestor in the chain is unlisted', () => expect(run(['https://ok.com'], { framed: true, ancestors: ['https://ok.com', 'https://evil.com'] }).blocked).toBe(true))
  it('allows listed sites and itself', () => { expect(run(['https://ok.com'], { framed: true, ancestors: ['https://ok.com'] }).blocked).toBe(false); expect(run([], { framed: true, ancestors: ['https://demo.example'] }).blocked).toBe(false) })
  it('falls back to the referrer where ancestorOrigins is missing (Firefox), and blocks when it is missing too', () => {
    expect(run(['https://ok.com'], { framed: true, referrer: 'https://ok.com/page?x=1' }).blocked).toBe(false)
    expect(run(['https://ok.com'], { framed: true, referrer: 'https://evil.com/' }).blocked).toBe(true); expect(run(['https://ok.com'], { framed: true, referrer: '' }).blocked).toBe(true)
  })
  it('by default (no allowed sites) blocks every foreign frame', () => expect(run([], { framed: true, ancestors: ['https://anything.com'] }).blocked).toBe(true))
})
