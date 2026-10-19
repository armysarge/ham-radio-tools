import { describe, it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { BUNDLED_PACKS } from '../src/data/packs'
import BandPlans from '../src/tools/BandPlans.vue'

const pack = (id: string) => BUNDLED_PACKS.find((p) => p.id === id)!
const at = (id: string, hz: number) => pack(id).segments.filter((s) => hz >= s.fromHz && hz <= s.toHz)
const inside = (id: string, hz: number) => at(id, hz).length > 0

describe('bundled national band plans', () => {
  it('ships the five countries with full provenance', () => {
    expect(BUNDLED_PACKS.map((p) => p.jurisdiction).sort()).toEqual(['Australia', 'Canada', 'Germany', 'South Africa', 'United States'])
    for (const p of BUNDLED_PACKS) {
      expect(p.source.length, p.id).toBeGreaterThan(30); expect(p.sourceUrl, p.id).toMatch(/^https:\/\//); expect(p.license).toBeTruthy()
      expect(p.revision).toMatch(/^\d{4}-\d{2}-\d{2}$/); expect(p.notes!.length, p.id).toBeGreaterThan(80); expect(p.segments.length).toBeGreaterThan(20)
    }
  })
  it('segments are well-formed, ordered and never overlap inside a plan', () => {
    for (const p of BUNDLED_PACKS) {
      const s = [...p.segments].sort((a, b) => a.fromHz - b.fromHz)
      s.forEach((x, i) => { expect(x.fromHz, p.id).toBeLessThan(x.toHz); if (i) expect(x.fromHz, `${p.id} ${x.band}`).toBeGreaterThanOrEqual(s[i - 1].toHz) })
    }
  })

  it('USA: class privileges follow 47 CFR 97.301 (Region 2)', () => {
    const cls = (hz: number) => at('us-fcc-part97', hz)[0]?.classes
    expect(cls(14.1e6)).not.toContain('Technician')
    expect(cls(14.16e6)).toBe('Extra') // 14.150–14.175 Extra only
    expect(cls(14.2e6)).toBe('Extra, Advanced') // 14.175–14.225
    expect(cls(14.3e6)).toBe('Extra, Advanced, General') // 14.225–14.350
    expect(cls(3.9e6)).toBe('Extra, Advanced, General'); expect(cls(3.75e6)).toBe('Extra, Advanced')
    expect(cls(28.4e6)).toContain('Technician'); expect(at('us-fcc-part97', 28.4e6)[0].use).toContain('phone')
    expect(cls(137e3)).not.toContain('Technician') // 2200 m
    expect(cls(146e6)).toBe('Extra, Advanced, General, Technician')
    expect(at('us-fcc-part97', 7.15e6)[0].use).toContain('phone'); expect(at('us-fcc-part97', 7.05e6)[0].use).not.toContain('phone')
    expect(at('us-fcc-part97', 5.36e6)[0].power).toBe('9.15 W ERP')
    expect(inside('us-fcc-part97', 7.31e6)).toBe(false); expect(inside('us-fcc-part97', 4.1e6)).toBe(false)
  })
  it('Germany: AFuV Anlage 1 limits', () => {
    expect(at('de-bnetza-afuv', 7.1e6)[0]).toMatchObject({ classes: 'Class A', status: 'primary' })
    expect(at('de-bnetza-afuv', 7.1e6)[0].power).toBe('A: 750 W PEP')
    expect(at('de-bnetza-afuv', 3.6e6)[0].classes).toBe('Class A, Class E')
    expect(at('de-bnetza-afuv', 29e6)[0].classes).toBe('Class A, Class E, Class N')
    expect(at('de-bnetza-afuv', 29e6)[0].power).toContain('N: 10 W ERP')
    expect(at('de-bnetza-afuv', 5.36e6)[0].power).toBe('A: 9.14 W ERP') // decimal comma converted
    expect(at('de-bnetza-afuv', 1.87e6)[0]).toMatchObject({ status: 'secondary' })
    expect(inside('de-bnetza-afuv', 7.25e6)).toBe(false) // Region 1: 40 m ends at 7.2 MHz
  })
  it('South Africa: Annexure I limits', () => {
    expect(at('za-icasa-annexure-i', 7.1e6).some((s) => s.classes === 'Class A, Class B')).toBe(true)
    expect(at('za-icasa-annexure-i', 14.2e6)[0].classes).toBe('Class A')
    expect(inside('za-icasa-annexure-i', 7.25e6)).toBe(false)
    expect(at('za-icasa-annexure-i', 3.7e6)[0].power).toContain('Class B 20 dBW (100 W PEP)')
    expect(at('za-icasa-annexure-i', 5.4e6)[0].note).toContain('National Radio Frequency Plan 2018')
  })
  it('Canada: Schedule I qualifications and bandwidths', () => {
    expect(at('ca-ised-rbr4', 7.25e6)[0].classes).toContain('Advanced'); expect(at('ca-ised-rbr4', 146e6)[0].classes).toBe('Basic (any certificate)')
    expect(at('ca-ised-rbr4', 14.1e6)[0].note).toContain('6 kHz'); expect(at('ca-ised-rbr4', 28.5e6)[0].note).toContain('20 kHz')
    expect(inside('ca-ised-rbr4', 221e6)).toBe(false) // 220–222 omitted (exceptional circumstances only)
  })
  it('Australia: Advanced licence gaps are preserved', () => {
    expect(inside('au-acma-class-licence', 3.65e6)).toBe(true); expect(inside('au-acma-class-licence', 3.75e6)).toBe(false); expect(inside('au-acma-class-licence', 3.79e6)).toBe(true)
    expect(inside('au-acma-class-licence', 7.2e6)).toBe(true); expect(inside('au-acma-class-licence', 1.9e6)).toBe(false)
    expect(at('au-acma-class-licence', 14.2e6)[0].power).toContain('400 W pX')
  })
})

describe('band plan tool with bundled countries', () => {
  const global = { stubs: { RouterLink: true } }
  it('lists countries, shows source and revision, and answers a frequency lookup per class', async () => {
    const w = mount(BandPlans, { global }); await flushPromises()
    const opts = w.findAll('select option').map((o) => o.text())
    expect(opts).toEqual(expect.arrayContaining(['United States', 'South Africa', 'Germany', 'Canada', 'Australia']))
    await w.find('select').setValue('b:us-fcc-part97'); await flushPromises()
    expect(w.text()).toContain('47 CFR'.replace('47 CFR', 'Code of Federal Regulations')); expect(w.text()).toContain('Revision 2026-10-19')
    expect(w.text()).toContain('Extra, Advanced') // 14.2 MHz lookup result shows who may use it
    expect(w.text()).toContain('Read first')
    await w.find('select').setValue('b:za-icasa-annexure-i'); await flushPromises()
    await w.find('input[type=text]').setValue('7.25'); await flushPromises()
    expect(w.text()).toContain('Not inside any amateur allocation')
  })
})
