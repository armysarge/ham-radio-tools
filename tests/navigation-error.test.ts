import { mount, flushPromises } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterEach, expect, it, vi } from 'vitest'
import NavigationError from '../src/components/NavigationError.vue'

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

async function setup() {
  let fails = true
  const router = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/', component: {} },
    { path: '/tool/efhw', component: {}, meta: { title: 'End-Fed Half-Wave' } },
    { path: '/tool/inverted-v', component: () => fails ? Promise.reject(new TypeError('Failed to fetch dynamically imported module: hrt://app/assets/InvertedV-Abc123.js?private')) : Promise.resolve({}), meta: { title: 'Inverted-V Dipole' } },
  ] })
  await router.push('/tool/efhw')
  const w = mount(NavigationError, { global: { plugins: [router] } })
  return { router, w, restore: () => { fails = false } }
}

it('makes a failed route visible while retaining the current page, and clears after a successful retry', async () => {
  const { router, w, restore } = await setup()
  await expect(router.push('/tool/inverted-v')).rejects.toThrow('dynamically imported')
  await flushPromises()
  expect(router.currentRoute.value.path).toBe('/tool/efhw')
  expect(w.get('[role="alert"]').text()).toContain('Inverted-V Dipole')
  expect(w.text()).toContain('unsaved inputs')
  expect(w.text()).not.toContain('private')
  expect(w.findAll('button').some(b => b.text() === 'Reload app')).toBe(true)
  restore()
  await w.findAll('button').find(b => b.text() === 'Try again')!.trigger('click')
  await flushPromises()
  expect(router.currentRoute.value.path).toBe('/tool/inverted-v')
  expect(w.find('[role="alert"]').exists()).toBe(false)
  w.unmount()
})

it('keeps navigation to other tools working and removes its hooks on unmount', async () => {
  const { router, w } = await setup()
  await expect(router.push('/tool/inverted-v')).rejects.toThrow()
  await flushPromises()
  expect(w.find('[role="alert"]').exists()).toBe(true)
  await router.push('/')
  await flushPromises()
  expect(w.find('[role="alert"]').exists()).toBe(false)
  w.unmount()
})

it('has only normal recovery controls on desktop, without diagnostic export', async () => {
  vi.stubGlobal('hrtDesktop', {})
  const { router, w } = await setup()
  await expect(router.push('/tool/inverted-v')).rejects.toThrow()
  await flushPromises()
  expect(w.findAll('button').map(button => button.text())).toEqual(['Try again', 'Reload app'])
  w.unmount()
})
