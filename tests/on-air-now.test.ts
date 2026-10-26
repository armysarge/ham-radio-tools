import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import BroadcastSchedules from '../src/tools/BroadcastSchedules.vue'
import { transmissionOnAirAt, type BroadcastEntry } from '../src/lib/packs'
import { getPack } from '../src/core/packs'

vi.mock('../src/core/packs', async () => {
  const { shallowRef } = await import('vue')
  return {
    installedPacks: shallowRef([{ id: 'fixture', kind: 'broadcast-schedule', title: 'Test schedule', revision: '2026-09-01', source: 'Test source' }]),
    refreshPacks: vi.fn(async () => {}),
    getPack: vi.fn(async () => ({ data: { entries: [
      { station: 'Night service', freqKhz: 6000, startUtc: '2300', endUtc: '0031', days: '7' },
      { station: 'Night service', freqKhz: 7000, startUtc: '2300', endUtc: '0031', days: '7' },
      { station: 'Day service', freqKhz: 9000, startUtc: '1200', endUtc: '1300', days: '1' },
    ] } })),
  }
})

const entry: BroadcastEntry = { station: 'Test', freqKhz: 6000, startUtc: '2300', endUtc: '0100', days: '7' }
it('uses the UTC start weekday for overnight transmissions, including week rollover', () => {
  expect(transmissionOnAirAt(entry, 2300, 7)).toBe(true)
  expect(transmissionOnAirAt(entry, 30, 1)).toBe(true)
  expect(transmissionOnAirAt(entry, 100, 1)).toBe(false)
  expect(transmissionOnAirAt(entry, 30, 7)).toBe(false)
  expect(transmissionOnAirAt({ ...entry, startUtc: '1200', endUtc: '1300' }, 1200, 7)).toBe(true)
  expect(transmissionOnAirAt({ ...entry, startUtc: '0000', endUtc: '0000' }, 30, 1)).toBe(false)
})

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
  vi.setSystemTime(new Date('2026-10-26T00:30:00Z'))
})
afterEach(() => vi.useRealTimers())

it('groups current frequencies, remains live during manual browsing and updates when a transmission ends', async () => {
  const w = mount(BroadcastSchedules, { global: { stubs: { RouterLink: true } } })
  try {
    await w.get('select').setValue('fixture'); await flushPromises()
    const now = w.get('section[aria-label="On the air now"]')
    expect(now.text()).toContain('00:30 UTC')
    expect(now.text()).toContain('Night service')
    expect(now.text()).toContain('6000, 7000 kHz')
    expect(now.text()).not.toContain('Day service')
    expect(now.text()).toContain('not confirmed reception')
    expect(now.text()).toContain('more than 45 days old')
    await w.get('input[type="checkbox"]').setValue(false)
    await w.get('input.mono').setValue('1200')
    expect(now.text()).not.toContain('Day service')
    expect(w.get('.schedule-results').text()).toContain('Day service')
    await vi.advanceTimersByTimeAsync(60_000)
    expect(now.text()).toContain('00:31 UTC')
    expect(now.text()).not.toContain('Night service')
    expect(now.text()).toContain('Nothing is scheduled')
  } finally { w.unmount() }
})

it('applies station and frequency filters to the live section', async () => {
  const w = mount(BroadcastSchedules, { global: { stubs: { RouterLink: true } } })
  try {
    await w.get('select').setValue('fixture'); await flushPromises()
    await w.get('input[placeholder="e.g. 5000"]').setValue('6500')
    const now = w.get('section[aria-label="On the air now"]')
    expect(now.text()).toContain('7000 kHz')
    expect(now.text()).not.toContain('6000')
    await w.get('input[placeholder="e.g. WWV, English, Canada"]').setValue('missing')
    expect(now.text()).toContain('Nothing is scheduled')
  } finally { w.unmount() }
})

it('ignores a previous schedule load after switching back to bundled stations', async () => {
  let finish!: (value: Awaited<ReturnType<typeof getPack>>) => void
  vi.mocked(getPack).mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
  const w = mount(BroadcastSchedules, { global: { stubs: { RouterLink: true } } })
  try {
    await w.get('select').setValue('fixture')
    expect(w.get('section[aria-label="On the air now"]').text()).toContain('Loading')
    await w.get('select').setValue('time')
    finish(null); await flushPromises()
    const now = w.get('section[aria-label="On the air now"]')
    expect(now.text()).toContain('WWV (Fort Collins')
    expect(now.text()).not.toContain('unavailable')
    expect(now.text()).not.toContain('Nothing is scheduled')
  } finally { w.unmount() }
})
