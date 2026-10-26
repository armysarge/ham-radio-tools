import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import MagneticWinding from '../src/components/MagneticWinding.vue'

describe('balun illustrations', () => {
  it('shows three equal unun conductors, three starts and a first-winding input tap', () => {
    const w = mount(MagneticWinding, { props: { kind: 'balun', primary: 6, balunTemplate: 'ruthroff-9-1' } })
    expect(w.findAll('.winding-route')).toHaveLength(3)
    expect(w.findAll('.winding-front')).toHaveLength(18)
    expect(w.findAll('.polarity-dot')).toHaveLength(3)
    expect(w.get('svg[aria-label*="9:1 unun"]').attributes('aria-label')).toContain('Both ports are unbalanced')
    expect(w.text()).toContain('B2 + C1')
    expect(w.text()).toContain('Counterpoise / return')
    w.unmount()
  })
  it('defaults to intact coax with one continuous winding route and visible leads', () => {
    const w = mount(MagneticWinding, { props: { kind: 'balun', primary: 7 } })
    expect(w.get('.winding-route').attributes('d')?.match(/M/g)).toHaveLength(1)
    expect(w.findAll('.winding-front')).toHaveLength(7)
    expect(w.text()).toContain('7 turns of continuous coax')
    expect(w.text()).toContain('Entry')
    expect(w.text()).toContain('Exit')
    expect(w.get('svg[aria-label*="Longitudinal and end sections"]').text()).toContain('Outer jacket')
    w.unmount()
  })

  it('changes the physical winding and connections when the template changes', async () => {
    const w = mount(MagneticWinding, { props: { kind: 'balun', primary: 5 } })
    await w.setProps({ balunTemplate: 'wire-1-1' })
    expect(w.findAll('.winding-route')).toHaveLength(2)
    expect(w.findAll('.winding-front')).toHaveLength(10)
    expect(w.get('path[aria-label="A1 to A2"]').attributes('d')).toBeTruthy()
    expect(w.get('path[aria-label="B1 to B2"]').attributes('d')).toBeTruthy()
    expect(w.find('path[aria-label*="join"]').exists()).toBe(false)
    expect(w.text()).toContain('5 turns per conductor')
    w.unmount()
  })

  it('uses two identical independent Guanella cores with parallel input and floating series output', () => {
    const w = mount(MagneticWinding, { props: { kind: 'balun', primary: 8, balunTemplate: 'guanella-4-1' } })
    expect(w.findAll('.winding-core')).toHaveLength(2)
    expect(w.findAll('.winding-route')).toHaveLength(4)
    expect(w.findAll('.winding-front')).toHaveLength(32)
    for (const pair of ['A to C', 'B to D', 'E to G', 'F to H']) expect(w.get(`path[aria-label="${pair}"]`).attributes('d')).toBeTruthy()
    expect(w.get('path[aria-label="Input hot join A to E"]').attributes('d')).toBeTruthy()
    expect(w.get('path[aria-label="Input shield join B to F"]').attributes('d')).toBeTruthy()
    expect(w.get('path[aria-label="Floating series join D to G"]').attributes('d')).toBeTruthy()
    expect(w.text()).toContain('Balanced + C')
    expect(w.text()).toContain('Balanced − H')
    expect(w.text()).toContain('DC continuity is not an RF test')
    w.unmount()
  })

  it('marks Ruthroff equal windings, dotted starts and the A2=B1 midpoint', () => {
    const w = mount(MagneticWinding, { props: { kind: 'balun', primary: 6, balunTemplate: 'ruthroff-4-1' } })
    expect(w.findAll('.winding-core')).toHaveLength(1)
    expect(w.findAll('.polarity-dot')).toHaveLength(2)
    expect(w.get('path[aria-label="Midpoint join A2 to B1"]').attributes('d')).toBeTruthy()
    expect(w.text()).toContain('A1')
    expect(w.text()).toContain('A2 + B1')
    expect(w.text()).toContain('B2')
    expect(w.text()).toContain('2:1 voltage and 4:1 impedance')
    expect(w.text()).toContain('without guaranteeing equal antenna currents')
    w.unmount()
  })

  it('caps pictured turns at 12 per conductor while retaining the actual count', () => {
    const w = mount(MagneticWinding, { props: { kind: 'balun', primary: 19, balunTemplate: 'wire-1-1' } })
    expect(w.findAll('.winding-front')).toHaveLength(24)
    expect(w.text()).toContain('19 turns per conductor')
    expect(w.text()).toContain('at most 12 turns per conductor')
    w.unmount()
  })

  it('does not invent a calculated turn count when primary is null', () => {
    const w = mount(MagneticWinding, { props: { kind: 'balun', primary: null } })
    expect(w.text()).toContain('— turns of continuous coax')
    expect(w.html()).not.toMatch(/NaN|Infinity/)
    w.unmount()
  })

  it('retains the separate RF transformer windings regardless of balun template', () => {
    const w = mount(MagneticWinding, { props: { kind: 'transformer', primary: 3, secondary: 7, balunTemplate: 'guanella-4-1' } })
    expect(w.text()).toContain('Primary 3 turns · secondary 7 turns')
    expect(w.get('svg[aria-label*="electrically separate"]').text()).toBe('P1P2S1S2')
    expect(w.findAll('.mag-primary.magnetic-back path')).toHaveLength(3)
    expect(w.findAll('.mag-secondary.magnetic-back path')).toHaveLength(7)
    expect(w.find('.winding-route').exists()).toBe(false)
    w.unmount()
  })
})
