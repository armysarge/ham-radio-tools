import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import type { App } from 'vue'
import type { Router } from 'vue-router'

let app: App, router: Router, root: HTMLElement
const text = () => root.textContent ?? ''
const partButton = (label: string) => Array.from(root.querySelectorAll<HTMLButtonElement>('[aria-label="Part to build"] button')).find(b => b.textContent === label)!
const navigate = async (path: string) => { await router.push(path); await flushPromises() }

beforeAll(async () => {
  localStorage.setItem('hrt:v1', JSON.stringify({ favorites: ['swr', 'diy-transformers', 'diy-components', 'ohms-law'] }))
  window.history.replaceState(null, '', '/#/tool/diy-transformers')
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {} }))
  root = document.createElement('div')
  root.id = 'app'
  document.body.appendChild(root)
  const { startup } = await import('../src/main')
  await startup
  app = (root as HTMLElement & { __vue_app__: App }).__vue_app__
  router = app.config.globalProperties.$router
  await router.isReady()
  await flushPromises()
})

afterAll(() => {
  app?.unmount()
  router?.options.history.destroy()
  root?.remove()
  localStorage.clear()
  vi.unstubAllGlobals()
})

describe('DIY Components navigation', () => {
  it('opens an old transformer bookmark on the merged tab with the shared header and illustration', () => {
    expect(window.location.hash).toBe('#/tool/diy-components?part=transformer')
    expect(root.querySelectorAll('h1')).toHaveLength(1)
    expect(root.querySelector('h1')?.textContent).toContain('DIY Components')
    expect(partButton('RF transformer').getAttribute('aria-pressed')).toBe('true')
    expect(root.querySelector('svg[aria-label^="Two electrically separate"]')).not.toBeNull()
    expect(text()).toContain('Which wire and cables can I use?')
    expect(text()).toContain('Build and verify')
    expect(root.querySelector('details.explain .formula')?.textContent).toContain('Ns = Np × √(Zs ÷ Zp)')
    expect(text()).not.toContain('Wheeler’s formula')
  })

  it('migrates and deduplicates the old favorite, preserving its position and other favorites', async () => {
    const { state } = await import('../src/core/store')
    expect(state.favorites).toEqual(['swr', 'diy-components', 'ohms-law'])
    const favorites = root.querySelectorAll('aside a[href="#/tool/diy-components"]')
    expect(favorites).toHaveLength(2) // one favorite and one category link
    expect(root.querySelector('.favorite-icon')?.getAttribute('aria-pressed')).toBe('true')
  })

  it('deep-links each part and keeps unrelated query parameters when switching tabs', async () => {
    await navigate('/tool/diy-components?part=toroid&keep=yes')
    expect(partButton('Toroid inductor').getAttribute('aria-pressed')).toBe('true')
    expect(text()).toContain('Inductance wanted')
    expect(root.querySelector('svg[aria-label^="Toroid inductor"]')).not.toBeNull()
    partButton('RF transformer').click()
    await flushPromises()
    expect(router.currentRoute.value.query).toEqual({ part: 'transformer', keep: 'yes' })
    expect(text()).toContain('Primary impedance')
    expect(root.querySelectorAll('.tool-head')).toHaveLength(1)
    partButton('Air-core coil').click()
    await flushPromises()
    expect(router.currentRoute.value.query).toEqual({ keep: 'yes' })
    expect(text()).toContain('Former diameter (outside)')
    for (const [part, label] of [['foilcap', 'Foil-and-film capacitor'], ['aircap', 'Air-variable capacitor'], ['dummy', 'Dummy load (resistor array)'], ['choke', 'Common-mode choke (coax on a ferrite core)']] as const) {
      await navigate(`/tool/diy-components?part=${part}`)
      expect(partButton(label).getAttribute('aria-pressed')).toBe('true')
    }
    await navigate('/tool/diy-components?part=unknown')
    expect(partButton('Air-core coil').getAttribute('aria-pressed')).toBe('true')
    await navigate('/tool/diy-components')
    expect(partButton('Air-core coil').getAttribute('aria-pressed')).toBe('true')
  })

  it('redirects an old link even while DIY Components is already mounted', async () => {
    await navigate('/tool/diy-components?part=toroid')
    await navigate('/tool/diy-transformers?keep=yes')
    expect(router.currentRoute.value.fullPath).toBe('/tool/diy-components?keep=yes&part=transformer')
    expect(partButton('RF transformer').getAttribute('aria-pressed')).toBe('true')
    expect(text()).toContain('Primary turns')
  })

  it('keeps transformer calculator inputs and illustration responsive after consolidation', async () => {
    await navigate('/tool/diy-components?part=transformer')
    const field = Array.from(root.querySelectorAll('.field')).find(f => f.querySelector('.lbl')?.textContent === 'Secondary impedance')!
    const input = field.querySelector('input')!
    input.value = '200'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await flushPromises()
    expect(text()).toContain('50 Ω → 200 Ω')
    expect(text()).toContain('1 : 2')
    expect(root.querySelector('svg[aria-label^="Two electrically separate"]')).not.toBeNull()
    expect(text()).not.toContain('NaN')
  })
})
