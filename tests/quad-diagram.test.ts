import { mount } from '@vue/test-utils'
import { expect, it } from 'vitest'
import QuadDiagram from '../src/components/QuadDiagram.vue'
import Beam from '../src/tools/Beam.vue'
import { quad } from '../src/lib/beams'

const rows = (n: number) => quad(28.4e6, n).map(r => ({ role: r.role, size: r.side, pos: r.position, label: `${r.perimeter} m`, posLabel: `${r.position} m` }))
it('shows separate projected loop planes, spreaders, boom and one driven feed gap', async () => {
  const w = mount(QuadDiagram, { props: { rows: rows(3) } })
  expect(w.findAll('.quad-loop')).toHaveLength(3)
  expect(w.findAll('.quad-spreaders')).toHaveLength(3)
  expect(w.findAll('.quad-feed-terminal')).toHaveLength(2)
  expect(w.get('svg').attributes('aria-label')).toContain('3D')
  const initial = w.findAll('.quad-loop').map(p => p.attributes('d'))
  await w.get('input[aria-label="Quad view azimuth"]').setValue('60')
  expect(w.findAll('.quad-loop').map(p => p.attributes('d'))).not.toEqual(initial)
  await w.get('button').trigger('click')
  expect(w.findAll('.quad-loop').map(p => p.attributes('d'))).toEqual(initial)
  await w.setProps({ rows: rows(5) })
  expect(w.findAll('.quad-loop')).toHaveLength(5)
  expect(w.findAll('.quad-loop').every(p => !/NaN|Infinity/.test(p.attributes('d')!))).toBe(true)
  w.unmount()
})
it('uses the 3D drawing only for the quad tool and retains the dimension table', () => {
  const quadPage = mount(Beam, { props: { which: 'quad' }, global: { stubs: { AntennaBands: true, RadiationPattern: true } } })
  expect(quadPage.findComponent(QuadDiagram).exists()).toBe(true)
  expect(quadPage.text()).toContain('Distance from reflector')
  quadPage.unmount()
  const yagiPage = mount(Beam, { props: { which: 'yagi' }, global: { stubs: { AntennaBands: true, RadiationPattern: true } } })
  expect(yagiPage.findComponent(QuadDiagram).exists()).toBe(false)
  expect(yagiPage.find('svg[aria-label^="Yagi top view"]').exists()).toBe(true)
  yagiPage.unmount()
})
