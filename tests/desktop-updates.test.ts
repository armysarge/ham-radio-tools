import { afterEach, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import DesktopUpdates from '../src/components/DesktopUpdates.vue'
import { desktopUpdateState } from '../src/core/desktopUpdates'
import type { UpdateResult } from '../src/platform/desktop'
afterEach(() => { delete window.hrtDesktop; Object.assign(desktopUpdateState, { release: null, busy: false, action: null, downloaded: false, linux: false, message: '', error: '', percent: 0 }) })
it('makes no check at mount; check, download and installer require separate clicks', async () => {
  const unsubscribe = vi.fn()
  const checkUpdate = vi.fn(async () => ({ release: { version: '0.4.0', name: 'installer.exe', size: 1048576 } }))
  const downloadUpdate = vi.fn(async () => ({ downloaded: true, platform: 'win32' }))
  const installUpdate = vi.fn(async () => ({ canceled: true }))
  window.hrtDesktop = { copyText: vi.fn(), saveFile: vi.fn(), minimize: vi.fn(), toggleMaximize: vi.fn(), close: vi.fn(), getState: vi.fn(), onState: vi.fn(), checkUpdate, downloadUpdate, installUpdate, onUpdateProgress: () => unsubscribe }
  const wrapper = mount(DesktopUpdates)
  expect(checkUpdate).not.toHaveBeenCalled()
  await wrapper.get('button').trigger('click'); await flushPromises()
  expect(checkUpdate).toHaveBeenCalledOnce(); expect(downloadUpdate).not.toHaveBeenCalled()
  await wrapper.findAll('button')[1]!.trigger('click'); await flushPromises()
  expect(downloadUpdate).toHaveBeenCalledOnce(); expect(installUpdate).not.toHaveBeenCalled()
  expect(wrapper.text()).toContain('SHA-256 verified')
  await wrapper.findAll('button')[1]!.trigger('click'); await flushPromises()
  expect(wrapper.text()).toContain('Canceled')
  wrapper.unmount(); expect(unsubscribe).toHaveBeenCalledOnce()
  const reopened = mount(DesktopUpdates)
  expect(reopened.text()).toContain('Open update installer')
  expect(checkUpdate).toHaveBeenCalledOnce(); expect(downloadUpdate).toHaveBeenCalledOnce()
  reopened.unmount()
})
it('does not show update controls on the web', () => {
  const wrapper = mount(DesktopUpdates)
  expect(wrapper.find('section').exists()).toBe(false)
  wrapper.unmount()
})

it('shows actual download progress across Settings remounts, then verifies completion and clears failed retries', async () => {
  let progress!: (percent: number) => void
  let finish!: (result: UpdateResult) => void
  const unsubscribe = vi.fn()
  window.hrtDesktop = {
    copyText: vi.fn(), saveFile: vi.fn(), minimize: vi.fn(), toggleMaximize: vi.fn(), close: vi.fn(), getState: vi.fn(), onState: vi.fn(),
    checkUpdate: vi.fn(), installUpdate: vi.fn(),
    downloadUpdate: vi.fn(() => new Promise<UpdateResult>(resolve => { finish = resolve })),
    onUpdateProgress: callback => { progress = callback; return unsubscribe },
  }
  desktopUpdateState.release = { version: '9.0.0', name: 'installer.exe', size: 1048576 }
  let w = mount(DesktopUpdates)
  try {
    await w.findAll('button')[1]!.trigger('click')
    expect(w.get('[role="progressbar"]').attributes('aria-valuenow')).toBe('0')
    progress(42); await flushPromises()
    expect(w.get('[role="progressbar"]').attributes('aria-valuenow')).toBe('42')
    expect(w.get('.download-fill').attributes('style')).toContain('width: 42%')
    w.unmount()
    expect(unsubscribe).not.toHaveBeenCalled()
    progress(73)
    w = mount(DesktopUpdates)
    expect(w.get('[role="progressbar"]').attributes('aria-valuenow')).toBe('73')
    progress(100); await flushPromises()
    expect(w.text()).toContain('Verifying download')
    expect(w.text()).not.toContain('SHA-256 verified')
    finish({ downloaded: true, platform: 'win32' }); await flushPromises()
    expect(w.get('[role="progressbar"]').attributes('aria-valuenow')).toBe('100')
    expect(w.text()).toContain('SHA-256 verified')
    expect(w.find('.download-track.active').exists()).toBe(false)
    expect(unsubscribe).toHaveBeenCalledOnce()
    desktopUpdateState.downloaded = false
    await flushPromises()
    await w.findAll('button')[1]!.trigger('click')
    expect(w.get('[role="progressbar"]').attributes('aria-valuenow')).toBe('0')
    finish({ error: 'Checksum mismatch' }); await flushPromises()
    expect(w.get('[role="alert"]').text()).toContain('Checksum mismatch')
    expect(w.find('[role="progressbar"]').exists()).toBe(false)
  } finally { w.unmount() }
})
