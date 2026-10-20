import { afterEach, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import DesktopUpdates from '../src/components/DesktopUpdates.vue'
import { desktopUpdateState } from '../src/core/desktopUpdates'
afterEach(() => { delete window.hrtDesktop; Object.assign(desktopUpdateState, { release: null, busy: false, downloaded: false, linux: false, message: '', error: '', percent: 0 }) })
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
