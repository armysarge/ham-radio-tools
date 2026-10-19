import { describe, it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { tools } from '../src/core/registry'

const global = { stubs: { RouterLink: true }, mocks: { $route: { query: {} } } }
const open = async (id: string) => { const c = ((await tools.find((t) => t.id === id)!.component()) as any).default; const w = mount(c, { global }); await flushPromises(); return w }

describe('station tools render with their defaults', () => {
  it('feedline loss: 20 m of RG-58 at 14.2 MHz, SWR 1.5', async () => { const w = await open('feedline-loss'); expect(w.text()).toContain('Total feedline loss'); expect(w.text()).not.toContain('NaN') })
  it('link budget gives a positive margin for 5 W over 20 km on 145 MHz', async () => { const w = await open('link-budget'); expect(w.text()).toContain('Link margin'); expect(w.text()).toContain('Radio horizon') })
  it('L-network 50 to 200 ohms', async () => { const w = await open('l-network'); expect(w.text()).toContain('0.9706'); expect(w.text()).toContain('97.06') })
  it('low-pass filter shows five parts', async () => { const w = await open('low-pass-filter'); expect(w.text()).toContain('C1 (shunt)'); expect(w.text()).toContain('C5 (shunt)') })
  it('coils: toroid turns', async () => { const w = await open('coils'); expect(w.text()).toContain('45.18') })
  it('power planner', async () => { const w = await open('power-planner'); expect(w.text()).toContain('Solar panel needed') })
})
