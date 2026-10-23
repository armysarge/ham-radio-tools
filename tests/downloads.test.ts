import { expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import Downloads from '../src/views/Downloads.vue'
it('offers demo and exact release asset links without requesting the network', () => {
  const request = vi.spyOn(globalThis, 'fetch')
  const w = mount(Downloads, { global: { stubs: { RouterLink: true } } })
  const links = w.findAll('a').map(a => a.attributes('href'))
  const root = `https://github.com/armysarge/ham-radio-tools/releases/download/v${__APP_VERSION__}/`
  expect(links).toContain('https://hamradiotools.armysarge.co.za/')
  expect(links).toContain(root + `ham-radio-tools-${__APP_VERSION__}-win-x64.exe`)
  expect(links).toContain(root + `ham-radio-tools-${__APP_VERSION__}-linux-x64.AppImage`)
  expect(links).toContain(root + `ham-radio-tools-web-${__APP_VERSION__}.zip`)
  expect(links).toContain(root + 'SHA256SUMS.txt')
  expect(request).not.toHaveBeenCalled()
  w.unmount(); request.mockRestore()
})
