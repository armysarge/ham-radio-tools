import { afterEach, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import DesktopTitleBar from '../src/components/DesktopTitleBar.vue'
afterEach(() => { delete window.hrtDesktop; document.documentElement.classList.remove('desktop-app') })
it('leaves the web app without desktop controls', () => {
  const wrapper = mount(DesktopTitleBar)
  expect(wrapper.find('header').exists()).toBe(false)
  wrapper.unmount()
})
it('connects accessible controls and updates restore state, then unsubscribes', async () => {
  let listener: (state: { maximized: boolean }) => void = () => {}
  const unsubscribe = vi.fn()
  const bridge = { minimize: vi.fn(), toggleMaximize: vi.fn(), close: vi.fn(), getState: async () => ({ maximized: false }), onState: (cb: typeof listener) => { listener = cb; return unsubscribe }, checkUpdate: vi.fn(), downloadUpdate: vi.fn(), installUpdate: vi.fn(), onUpdateProgress: vi.fn(() => () => {}) }
  window.hrtDesktop = { ...bridge, copyText: vi.fn(), saveFile: vi.fn() }
  const wrapper = mount(DesktopTitleBar)
  await flushPromises()
  await wrapper.get('[aria-label="Minimize window"]').trigger('click')
  await wrapper.get('[aria-label="Maximize window"]').trigger('click')
  listener({ maximized: true }); await flushPromises()
  expect(wrapper.find('[aria-label="Restore window"]').exists()).toBe(true)
  await wrapper.get('[aria-label="Close window"]').trigger('click')
  expect(bridge.minimize).toHaveBeenCalledOnce()
  expect(bridge.toggleMaximize).toHaveBeenCalledOnce()
  expect(bridge.close).toHaveBeenCalledOnce()
  wrapper.unmount(); expect(unsubscribe).toHaveBeenCalledOnce()
})
