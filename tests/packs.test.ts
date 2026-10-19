import 'fake-indexeddb/auto'
import { describe, it, expect } from 'vitest'
import { reactive } from 'vue'
import { ageDays, onAirAt, parsePack, runsOnDay } from '../src/lib/packs'
import { getPack, installPack, installedPacks, refreshPacks, removePack } from '../src/core/packs'

const base = { format: 'ham-radio-tools-pack', version: 1, id: 'test-plan', title: 'Test plan', source: 'Unit test', license: 'CC0', revision: '2026-10-01' }
const plan = (segments: unknown[]) => JSON.stringify({ ...base, kind: 'band-plan', data: { segments } })
const sched = (entries: unknown[], extra = {}) => JSON.stringify({ ...base, kind: 'broadcast-schedule', id: 'sched', ...extra, data: { entries } })

describe('pack validation', () => {
  it('accepts a band plan and skips bad segments with reasons', () => {
    const r = parsePack(plan([{ band: '20 m', fromHz: 14e6, toHz: 14.07e6, use: 'CW' }, { band: '20 m', fromHz: 14.07e6, toHz: 14e6, use: 'backwards' }, { band: '', fromHz: 1, toHz: 2, use: 'x' }]))
    expect(r.rows).toBe(1); expect(r.skipped).toHaveLength(2)
  })
  it('rejects packs without provenance, with a bad date, or of the wrong type', () => {
    expect(() => parsePack('nope')).toThrow(/not valid JSON/)
    expect(() => parsePack('{}')).toThrow(/not a Ham Radio Tools content pack/)
    expect(() => parsePack(JSON.stringify({ ...base, kind: 'band-plan', source: '', data: { segments: [] } }))).toThrow(/source and licence/)
    expect(() => parsePack(JSON.stringify({ ...base, kind: 'band-plan', revision: '1 Oct 2026', data: {} }))).toThrow(/YYYY-MM-DD/)
    expect(() => parsePack(JSON.stringify({ ...base, kind: 'band-plan', revision: '2026-13-40', data: {} }))).toThrow(/YYYY-MM-DD/)
    expect(() => parsePack(JSON.stringify({ ...base, kind: 'weather', data: {} }))).toThrow(/Unknown pack type/)
    expect(() => parsePack(JSON.stringify({ ...base, kind: 'band-plan', version: 9, data: {} }))).toThrow(/newer version/)
    expect(() => parsePack(JSON.stringify({ ...base, id: '../evil', kind: 'band-plan', data: {} }))).toThrow(/id/)
    expect(() => parsePack(plan([]))).toThrow(/no usable band segments/)
  })
  it('validates schedule times, days and frequencies', () => {
    const good = { freqKhz: 5950, startUtc: '0000', endUtc: '2400'.replace('2400', '2359'), days: '135', station: 'Test' }
    const r = parsePack(sched([good, { ...good, startUtc: '2500' }, { ...good, freqKhz: -1 }, { ...good, days: 'weird' }]))
    expect(r.rows).toBe(2) // the 'weird' days value falls back to daily
    expect(r.pack.data).toMatchObject({ entries: [{ days: '135' }, { days: 'daily' }] })
    expect(r.skipped).toHaveLength(2)
  })
})

describe('time helpers', () => {
  it('on-air windows, including past midnight and all-day', () => {
    expect(onAirAt('0600', '0800', 700)).toBe(true)
    expect(onAirAt('0600', '0800', 800)).toBe(false) // end is exclusive
    expect(onAirAt('2200', '0200', 2330)).toBe(true)
    expect(onAirAt('2200', '0200', 130)).toBe(true)
    expect(onAirAt('2200', '0200', 1200)).toBe(false)
    expect(onAirAt('0000', '0000', 1234)).toBe(true)
  })
  it('weekday filter uses ISO numbers (1 = Monday)', () => {
    expect(runsOnDay('daily', 3)).toBe(true); expect(runsOnDay('135', 3)).toBe(true); expect(runsOnDay('135', 2)).toBe(false)
  })
  it('age in days', () => { expect(ageDays('2026-09-19', new Date('2026-10-19T12:00:00Z'))).toBe(30) })
})

describe('pack storage (IndexedDB)', () => {
  it('stores a Vue reactive pack (Proxy) without a DataCloneError', async () => {
    const r = parsePack(plan([{ band: '40 m', fromHz: 7e6, toHz: 7.2e6, use: 'amateur' }]))
    await installPack(reactive(r.pack) as typeof r.pack, r.rows)
    expect((await getPack('test-plan'))!.title).toBe('Test plan')
    await removePack('test-plan')
  })
  it('installs, replaces, reads back and removes', async () => {
    const r1 = parsePack(plan([{ band: '40 m', fromHz: 7e6, toHz: 7.2e6, use: 'amateur' }]))
    await installPack(r1.pack, r1.rows)
    expect(installedPacks.value.map((p) => p.id)).toEqual(['test-plan'])
    expect(installedPacks.value[0]).not.toHaveProperty('data') // listing never loads the bulk data
    const r2 = parsePack(JSON.stringify({ ...JSON.parse(plan([{ band: '40 m', fromHz: 7e6, toHz: 7.3e6, use: 'amateur' }])), revision: '2026-10-15' }))
    await installPack(r2.pack, r2.rows)
    expect(installedPacks.value).toHaveLength(1)
    expect(installedPacks.value[0].revision).toBe('2026-10-15')
    const got = await getPack<{ segments: { toHz: number }[] }>('test-plan')
    expect(got!.data.segments[0].toHz).toBe(7.3e6)
    await removePack('test-plan'); await refreshPacks()
    expect(installedPacks.value).toEqual([])
    expect(await getPack('test-plan')).toBeNull()
  })
})

describe('pack source links', () => {
  const withUrl = (u: unknown) => parsePack(JSON.stringify({ ...JSON.parse(plan([{ band: '40 m', fromHz: 7e6, toHz: 7.2e6, use: 'x' }])), sourceUrl: u })).pack.sourceUrl
  it('keeps http(s) links and drops every other scheme', () => {
    expect(withUrl('https://example.org/plan')).toBe('https://example.org/plan')
    expect(withUrl('http://example.org/')).toBe('http://example.org/')
    for (const bad of ['javascript:alert(1)', ' JavaScript:alert(1)', 'data:text/html,<script>1</script>', 'file:///etc/passwd', 'vbscript:x', '//example.org', 'not a url', '', 42, null]) expect(withUrl(bad), String(bad)).toBeUndefined()
  })
})
