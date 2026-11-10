import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRequire } from 'node:module'
import { flushPromises, mount } from '@vue/test-utils'
import SatellitePasses from '../src/tools/SatellitePasses.vue'
import { state } from '../src/core/store'
import { cleanSavedElements } from '../src/lib/elementStore'
import { MAX_SETS, describeMerge, formatTle, mergeElements, parseElementFile } from '../src/lib/elements'

const { fetchAmateurElements, ELEMENTS_URL, MIN_INTERVAL_MS } = createRequire(import.meta.url)('../desktop/elements.cjs')

const sum = (l: string) => { let s = 0; for (const c of l.slice(0, 68)) s += c === '-' ? 1 : /\d/.test(c) ? Number(c) : 0; return s % 10 }
const L1 = '1 25544U 98067A   08264.51782528 -.00002182  00000-0 -11606-4 0  2927'
const L2 = '2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.72125391563537'
/** A valid two-line set for a made-up catalogue number and epoch day of 2026. */
function tle(norad: number, name: string, day = 300.5, extra = '') {
  const n = String(norad).padStart(5, '0')
  let a = L1.slice(0, 2) + n + L1.slice(7, 18) + '26' + day.toFixed(8).padStart(12, '0') + L1.slice(32, 68)
  let b = L2.slice(0, 2) + n + L2.slice(7, 68)
  a += sum(a); b += sum(b)
  return `${name}${extra}\n${a}\n${b}`
}
const file = [tle(25544, 'ISS (ZARYA)'), tle(27607, 'SO-50'), tle(43017, 'AO-91')].join('\r\n') + '\r\n'

describe('element file parsing and merging', () => {
  it('reads three-line and two-line sets, with Windows line endings', () => {
    const { sets, rejected } = parseElementFile(file)
    expect(rejected).toBe(0)
    expect(sets.map((s) => s.name)).toEqual(['ISS (ZARYA)', 'SO-50', 'AO-91'])
    const bare = parseElementFile(tle(25544, '').split('\n').slice(1).join('\n'))
    expect(bare.sets).toHaveLength(1)
  })
  it('rejects damaged sets without losing the good ones', () => {
    const bad = tle(11111, 'BAD').replace(/(\n1 .{66})\d/, '$19') // wrong checksum
    const mismatch = tle(22222, 'MISMATCH').replace(/\n2 22222/, '\n2 22223')
    const text = [tle(25544, 'ISS'), bad, mismatch, 'random text', tle(27607, 'SO-50')].join('\n')
    const { sets, rejected } = parseElementFile(text)
    expect(sets.map((s) => s.name)).toEqual(['ISS', 'SO-50'])
    expect(rejected).toBe(2)
    expect(parseElementFile('nothing useful here').sets).toEqual([])
    expect(() => parseElementFile('x'.repeat(2 * 1024 * 1024 + 1))).toThrow(/2 MB/)
  })
  it('keeps the newest epoch per satellite and reports what changed', () => {
    const now = new Date('2026-11-09T12:00:00Z')
    const first = mergeElements([], parseElementFile(file).sets, now)
    expect(first.report).toMatchObject({ added: 3, updated: 0 })
    expect(first.next.map((e) => e.name)).toEqual(['AO-91', 'ISS (ZARYA)', 'SO-50'])
    const second = mergeElements(first.next, parseElementFile([tle(25544, 'ISS (ZARYA)', 305.5), tle(27607, 'SO-50', 300.5), tle(43017, 'AO-91', 290.5), tle(39444, 'AO-73')].join('\n')).sets, now)
    expect(second.report).toEqual({ added: 1, updated: 1, unchanged: 1, older: 1, skipped: 0 })
    expect(second.next.find((e) => e.norad === 25544)!.line1).toContain('26305.50000000')
    expect(second.next.find((e) => e.norad === 43017)!.line1).toContain('26300.50000000')
    expect(describeMerge(second.report, 1)).toBe('1 added, 1 updated, 1 already up to date, 1 older than the saved set and ignored, 1 rejected as damaged.')
  })
  it('stops adding when the library is full', () => {
    const full = Array.from({ length: MAX_SETS }, (_, i) => ({ norad: 50000 + i, name: 'X', line1: L1, line2: L2, epoch: '2026-10-01T00:00:00.000Z', saved: '' }))
    const { next, report } = mergeElements(full, parseElementFile(tle(1, 'NEW')).sets)
    expect(next).toHaveLength(MAX_SETS); expect(report.skipped).toBe(1)
  })
  it('drops malformed saved data when loading', () => {
    const good = parseElementFile(tle(25544, 'ISS')).sets[0]
    const mk = (o = {}) => ({ norad: 25544, name: good.name, line1: good.line1, line2: good.line2, epoch: '2026-10-27T12:00:00.000Z', saved: 'x', ...o })
    expect(cleanSavedElements([mk(), mk(), mk({ norad: 'x' }), mk({ line1: 'short' }), mk({ epoch: 'nope' }), null, 7])).toHaveLength(1)
    expect(cleanSavedElements('bad')).toEqual([])
  })
})

describe('desktop CelesTrak fetch', () => {
  const ok = () => vi.fn(async () => new Response(file, { status: 200 }))
  it('requests only the documented URL, identifies itself and returns the text', async () => {
    const fetchImpl = ok(), state = { lastAttempt: 0 }
    const r = await fetchAmateurElements({ fetchImpl, now: () => 1_000_000_000_000, state, userAgent: 'Test/1' })
    expect(r.text).toContain('ISS (ZARYA)'); expect(r.retrievedAt).toBe(new Date(1_000_000_000_000).toISOString())
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe(ELEMENTS_URL); expect(url).toMatch(/^https:\/\/celestrak\.org\/NORAD\/elements\/gp\.php\?GROUP=amateur&FORMAT=tle$/)
    expect(init).toMatchObject({ redirect: 'manual', headers: { 'User-Agent': 'Test/1' } })
  })
  it('waits for the two-hour refresh before another request', async () => {
    const fetchImpl = ok(), state = { lastAttempt: 0 }
    let t = 5_000_000_000_000
    await fetchAmateurElements({ fetchImpl, now: () => t, state })
    t += MIN_INTERVAL_MS - 60_000
    await expect(fetchAmateurElements({ fetchImpl, now: () => t, state })).rejects.toThrow(/every 2 hours.*1 minutes/)
    t += 60_000
    await fetchAmateurElements({ fetchImpl, now: () => t, state })
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })
  it.each([403, 404, 301, 503])('stops and reports HTTP %i, and does not retry at once', async (status) => {
    const fetchImpl = vi.fn(async () => new Response(null, { status })), state = { lastAttempt: 0 }
    await expect(fetchAmateurElements({ fetchImpl, now: () => 9e12, state })).rejects.toThrow(new RegExp(`HTTP ${status}`))
    await expect(fetchAmateurElements({ fetchImpl, now: () => 9e12 + 1000, state })).rejects.toThrow(/every 2 hours/)
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })
  it('rejects non-element and oversized responses', async () => {
    await expect(fetchAmateurElements({ fetchImpl: async () => new Response('<html>Not found</html>', { status: 200 }), now: () => 1e13, state: { lastAttempt: 0 } })).rejects.toThrow(/did not return element sets/)
    await expect(fetchAmateurElements({ fetchImpl: async () => new Response('1 '.repeat(2 * 1024 * 1024), { status: 200 }), now: () => 1e13, state: { lastAttempt: 0 } })).rejects.toThrow(/larger than expected/)
  })
})

describe('saved element sets on the satellite page', () => {
  beforeEach(() => { localStorage.clear(); state.elements = []; state.elementsFetched = null })
  afterEach(() => { delete window.hrtDesktop })
  const mountPage = () => mount(SatellitePasses, { global: { stubs: { ToolLayout: { template: '<div><slot /><slot name="explain" /></div>' }, RouterLink: { template: '<a><slot /></a>' } } } })
  const btn = (w: ReturnType<typeof mountPage>, label: string) => w.findAll('button').find((b) => b.text().startsWith(label))
  const upload = async (w: ReturnType<typeof mountPage>, content: string, name = 'amateur.txt') => {
    const input = w.get('input[type="file"]')
    const f = new File([content], name, { type: 'text/plain' })
    Object.defineProperty(input.element, 'files', { value: [f], configurable: true })
    await input.trigger('change'); await flushPromises()
  }
  it('imports a file, stores it and fills the element box from a saved set', async () => {
    const w = mountPage()
    try {
      expect(w.text()).toContain('None saved yet')
      expect(btn(w, 'Update from CelesTrak')).toBeUndefined()
      expect(w.text()).toContain('available in the desktop app')
      await upload(w, file)
      expect(w.text()).toContain('Imported amateur.txt: 3 added')
      expect(state.elements).toHaveLength(3)
      expect(JSON.parse(localStorage.getItem('hrt:v1')!).elements).toHaveLength(3)
      const select = w.get('select')
      await select.setValue('27607')
      expect((w.get('textarea').element as HTMLTextAreaElement).value).toContain('SO-50')
      await btn(w, 'Remove selected')!.trigger('click')
      expect(state.elements.map((e) => e.norad)).toEqual([43017, 25544])
    } finally { w.unmount() }
  })
  it('saves the pasted set and ignores a re-save', async () => {
    const w = mountPage()
    try {
      await w.get('textarea').setValue(tle(25544, 'ISS (ZARYA)'))
      await btn(w, 'Save pasted set')!.trigger('click')
      expect(w.text()).toContain('Saved: 1 added')
      await btn(w, 'Save pasted set')!.trigger('click')
      expect(w.text()).toContain('1 already up to date')
      expect(state.elements).toHaveLength(1)
    } finally { w.unmount() }
  })
  it('explains bad files without changing the library', async () => {
    const w = mountPage()
    try {
      await upload(w, 'hello world')
      expect(w.get('[role="alert"]').text()).toContain('No element sets found')
      expect(state.elements).toHaveLength(0)
    } finally { w.unmount() }
  })
  it('updates from CelesTrak on the desktop, once per two hours', async () => {
    const fetchElements = vi.fn(async () => ({ text: file, retrievedAt: new Date().toISOString() }))
    window.hrtDesktop = { fetchElements } as unknown as NonNullable<Window['hrtDesktop']>
    const w = mountPage()
    try {
      await btn(w, 'Update from CelesTrak')!.trigger('click'); await flushPromises()
      expect(w.text()).toContain('Updated from CelesTrak: 3 added')
      expect(state.elementsFetched).not.toBeNull(); expect(state.elements).toHaveLength(3)
      await btn(w, 'Update from CelesTrak')!.trigger('click'); await flushPromises()
      expect(fetchElements).toHaveBeenCalledTimes(1)
      expect(w.text()).toContain('less than 2 hours ago')
    } finally { w.unmount() }
  })
  it('shows the desktop error and keeps saved sets', async () => {
    state.elements = parseElementFile(file).sets.map((t) => mergeElements([], [t]).next[0])
    window.hrtDesktop = { fetchElements: vi.fn(async () => ({ error: 'CelesTrak answered HTTP 403, so the update was stopped.' })) } as unknown as NonNullable<Window['hrtDesktop']>
    const w = mountPage()
    try {
      await btn(w, 'Update from CelesTrak')!.trigger('click'); await flushPromises()
      expect(w.get('[role="alert"]').text()).toContain('HTTP 403')
      expect(state.elements).toHaveLength(3); expect(state.elementsFetched).toBeNull()
      expect(formatTle(state.elements[0]).split('\n')).toHaveLength(3)
    } finally { w.unmount() }
  })
})
