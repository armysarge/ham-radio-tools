import { afterEach, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { BBC_SCHEDULE, BBC_META } from '../src/data/bbcSchedule'
import { scheduleDateStatus, transmissionOnAirAt } from '../src/lib/packs'
import BroadcastSchedules from '../src/tools/BroadcastSchedules.vue'

afterEach(() => vi.useRealTimers())
it('makes the full BBC schedule discoverable even outside an on-air window', async () => {
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
  vi.setSystemTime(new Date('2026-10-26T09:00:00Z'))
  const w = mount(BroadcastSchedules, { global: { stubs: { RouterLink: true } } })
  try {
    expect(w.findAll('button').some(b => b.text() === 'Browse BBC frequencies')).toBe(false)
    await w.get('select').setValue('bbc:b26')
    await w.findAll('button').find(b => b.text() === 'Everything')!.trigger('click')
    await flushPromises()
    expect(w.get('select').element.value).toBe('bbc:b26')
    expect(w.get('.schedule-results').text()).toContain('30 transmissions')
    expect(w.get('.schedule-results').text()).toContain('BBC World Service')
    expect(w.get('.schedule-results').text()).toContain('17575')
    expect(w.get('section[aria-label="On the air now"]').text()).toContain('WWV (Fort Collins')
  } finally { w.unmount() }
})
it('transcribes the supplied BBC season with explicit weekdays and reception modes', () => {
  expect(BBC_SCHEDULE).toHaveLength(30)
  expect(BBC_META.validFrom).toBe('2026-10-25')
  expect(BBC_META.validUntil).toBe('2027-03-27')
  expect(BBC_SCHEDULE.filter(e => e.freqKhz < 3000)).toHaveLength(14)
  expect(BBC_SCHEDULE.find(e => e.freqKhz === 17575)?.note).toContain('DRM')
  const weekend = BBC_SCHEDULE.find(e => e.freqKhz === 21630)!
  expect(transmissionOnAirAt(weekend, 1500, 6)).toBe(true)
  expect(transmissionOnAirAt(weekend, 1500, 1)).toBe(false)
  const weekday = BBC_SCHEDULE.find(e => e.freqKhz === 15420)!
  expect(transmissionOnAirAt(weekday, 1800, 5)).toBe(true)
  expect(transmissionOnAirAt(weekday, 1800, 6)).toBe(false)
  const midnight = BBC_SCHEDULE.find(e => e.freqKhz === 11645)!
  expect(transmissionOnAirAt(midnight, 2359, 1)).toBe(true)
  expect(transmissionOnAirAt(midnight, 0, 2)).toBe(false)
})
it('uses inclusive UTC season dates and excludes dates outside the published window', () => {
  expect(scheduleDateStatus(BBC_META, new Date('2026-10-24T23:59:59Z'))).toBe('upcoming')
  expect(scheduleDateStatus(BBC_META, new Date('2026-10-25T00:00:00Z'))).toBe('current')
  expect(scheduleDateStatus(BBC_META, new Date('2027-03-27T23:59:59Z'))).toBe('current')
  expect(scheduleDateStatus(BBC_META, new Date('2027-03-28T00:00:00Z'))).toBe('expired')
})
it('provides BBC offline, expires the live list and keeps an explicitly labelled archive', async () => {
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
  vi.setSystemTime(new Date('2026-10-26T05:30:00Z'))
  const w = mount(BroadcastSchedules, { global: { stubs: { RouterLink: true } } })
  try {
    await flushPromises()
    const live = w.get('section[aria-label="On the air now"]')
    expect(live.text()).toContain('BBC World Service')
    expect(live.text()).toContain('9410, 9915 kHz')
    expect(live.text()).toContain('WWV (Fort Collins')
    await w.get('select').setValue('bbc:b26')
    expect(live.text()).toContain('9410, 9915 kHz')
    expect(w.text()).toContain('2027-03-27')
    vi.setSystemTime(new Date('2027-03-28T05:30:00Z'))
    await vi.advanceTimersByTimeAsync(15000)
    expect(live.text()).not.toContain('9410, 9915 kHz')
    expect(live.text()).toContain('expired')
    expect(live.text()).toContain('WWV (Fort Collins')
    expect(w.get('.schedule-results').text()).not.toContain('BBC World Service')
    await w.findAll('button').find(b => b.text() === 'Everything')!.trigger('click')
    expect(w.get('.schedule-results').text()).toContain('BBC World Service')
    expect(w.get('.schedule-results').text()).toContain('Archive')
  } finally { w.unmount() }
})
