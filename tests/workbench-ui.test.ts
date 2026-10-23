import { expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import ToolLayout from '../src/components/ToolLayout.vue'
import BandPlans from '../src/tools/BandPlans.vue'
import { ITU_BANDS } from '../src/data/reference'
const global = { stubs: { RouterLink: true } }
it('keeps an accessible icon-only favourite without classification badges', () => {
  const w = mount(ToolLayout, { props: { id: 'dipole' }, global })
  expect(w.find('.kind').exists()).toBe(false)
  const star = w.get('button[aria-pressed]')
  expect(star.text()).toMatch(/^[★☆]$/)
  expect(star.attributes('aria-label')).toContain('favorites')
})
it('includes 6 m with region-specific limits and status', () => {
  expect(ITU_BANDS.find(b => b.band === '6 m' && b.region === 1)).toMatchObject({ fromHz: 50e6, toHz: 52e6, status: 'secondary' })
  for (const region of [2, 3]) expect(ITU_BANDS.find(b => b.band === '6 m' && b.region === region)).toMatchObject({ fromHz: 50e6, toHz: 54e6, status: 'primary' })
})
it('filters a band table without restricting the frequency lookup', async () => {
  const w = mount(BandPlans, { global })
  await flushPromises()
  await w.get('select[aria-label="Filter by band"]').setValue('6 m')
  expect(w.get('table').text()).toContain('50–52')
  expect(w.get('table').text()).not.toContain('14–14.35')
  expect(w.text()).toContain('20 m · 14–14.35 MHz')
})
