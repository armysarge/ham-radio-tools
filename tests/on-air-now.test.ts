import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import BroadcastSchedules from '../src/tools/BroadcastSchedules.vue'
import { transmissionOnAirAt, type BroadcastEntry } from '../src/lib/packs'
import { getPack, installedPacks } from '../src/core/packs'

vi.mock('../src/core/packs', async () => {
  const { shallowRef } = await import('vue')
  const installedPacks = shallowRef([{ id: 'fixture', kind: 'broadcast-schedule', title: 'Test schedule', revision: '2026-09-01', source: 'Test source' }])
  return {
    installedPacks,
    refreshPacks: vi.fn(async () => {}),
    getPack: vi.fn(async (id: string) => ({ ...installedPacks.value.find(p => p.id === id), data: { entries: [
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

it('applies each imported season at UTC midnight while retaining its reference rows', async () => {
  const original = installedPacks.value
  vi.setSystemTime(new Date('2026-10-25T23:59:45Z'))
  installedPacks.value = [{ ...original[0]!, validFrom: '2026-10-26', validUntil: '2026-10-26' }]
  vi.mocked(getPack).mockResolvedValueOnce({ ...installedPacks.value[0], data: { entries: [
    { station: 'Seasonal service', freqKhz: 5950, startUtc: '0000', endUtc: '0000', days: 'daily' },
  ] } } as Awaited<ReturnType<typeof getPack>>)
  const w = mount(BroadcastSchedules, { global: { stubs: { RouterLink: true } } })
  try {
    await w.get('select').setValue('fixture'); await flushPromises()
    const live = w.get('section[aria-label="On the air now"]')
    const details = w.get('.schedule-results')
    expect(live.text()).toContain('not yet in effect')
    expect(live.text()).not.toContain('Seasonal service')
    expect(details.text()).not.toContain('Seasonal service')
    await w.findAll('button').find(b => b.text() === 'Everything')!.trigger('click')
    expect(details.text()).toContain('Upcoming reference')
    expect(details.text()).toContain('Seasonal service')
    await w.findAll('button').find(b => b.text() === 'On air at…')!.trigger('click')

    await vi.advanceTimersByTimeAsync(15_000)
    expect(live.text()).toContain('Seasonal service')
    expect(details.text()).toContain('Seasonal service')

    vi.setSystemTime(new Date('2026-10-26T23:59:45Z'))
    await vi.advanceTimersByTimeAsync(15_000)
    expect(live.text()).toContain('expired')
    expect(live.text()).not.toContain('Seasonal service')
    expect(live.text()).toContain('WWV (Fort Collins')
    expect(details.text()).not.toContain('Seasonal service')
    await w.findAll('button').find(b => b.text() === 'Everything')!.trigger('click')
    expect(details.text()).toContain('Archive')
    expect(details.text()).toContain('Seasonal service')
  } finally { w.unmount(); installedPacks.value = original }
})

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
    expect(now.text()).toContain('WWV (Fort Collins')
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
    await w.get('select').setValue('bundled:time')
    finish(null); await flushPromises()
    const now = w.get('section[aria-label="On the air now"]')
    expect(now.text()).toContain('WWV (Fort Collins')
    expect(now.text()).toContain('Schedule unavailable')
    expect(now.text()).toContain('WWV (Fort Collins')
  } finally { w.unmount() }
})

it('combines bundled and multiple installed sources independently of the dropdown, and handles removal', async () => {
  vi.setSystemTime(new Date('2026-10-26T05:30:00Z'))
  const original = installedPacks.value
  installedPacks.value = [...original, { ...original[0]!, id: 'second', title: 'Second schedule' }]
  vi.mocked(getPack).mockImplementation(async id => ({ ...installedPacks.value.find(p => p.id === id), data: { entries: [
    { station: id === 'second' ? 'Second service' : 'First service', freqKhz: 8000, startUtc: '0000', endUtc: '0000', days: 'daily' },
  ] } }) as Awaited<ReturnType<typeof getPack>>)
  const w = mount(BroadcastSchedules, { global: { stubs: { RouterLink: true } } })
  try {
    await flushPromises()
    const now = w.get('section[aria-label="On the air now"]')
    for (const text of ['WWV (Fort Collins', '9410, 9915 kHz', 'First service', 'Second service']) expect(now.text()).toContain(text)
    const before = now.text()
    await w.get('select').setValue('second'); await flushPromises()
    expect(now.text()).toBe(before)
    expect(w.get('.schedule-results').text()).toContain('Second service')
    installedPacks.value = original
    await flushPromises()
    expect(now.text()).not.toContain('Second service')
    expect(now.text()).toContain('First service')
  } finally { w.unmount(); installedPacks.value = original }
})

it('keeps successful sources visible when another installed pack fails to load', async () => {
  vi.mocked(getPack).mockRejectedValueOnce(new Error('Read failed'))
  const w = mount(BroadcastSchedules, { global: { stubs: { RouterLink: true } } })
  try {
    await flushPromises()
    const now = w.get('section[aria-label="On the air now"]')
    expect(now.text()).toContain('Read failed')
    expect(now.text()).toContain('WWV (Fort Collins')
  } finally { w.unmount() }
})

it('does not restore a removed pack when its pending read finishes or reload packs on clock ticks', async () => {
  const original = installedPacks.value
  let finish!: (value: Awaited<ReturnType<typeof getPack>>) => void
  vi.mocked(getPack).mockClear().mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
  const w = mount(BroadcastSchedules, { global: { stubs: { RouterLink: true } } })
  try {
    installedPacks.value = []
    await flushPromises()
    finish({ data: { entries: [{ station: 'Removed service', freqKhz: 8000, startUtc: '0000', endUtc: '0000', days: 'daily' }] } } as Awaited<ReturnType<typeof getPack>>)
    await flushPromises()
    await vi.advanceTimersByTimeAsync(30_000)
    expect(w.get('section[aria-label="On the air now"]').text()).not.toContain('Removed service')
    expect(getPack).toHaveBeenCalledTimes(1)
  } finally { w.unmount(); installedPacks.value = original }
})
