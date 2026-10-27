import { describe, expect, it } from 'vitest'
import data from '../src/data/allocations.json'
import { allocationRows, matchesService, frequencyLabel } from '../src/lib/allocations'

const at = <T extends { fromHz: number; toHz: number }>(rows: T[], hz: number) => rows.filter(r => hz >= r.fromHz && hz < r.toHz)

describe('official all-service allocation facts', () => {
  it('retains continuous coverage, valid priorities and source pages for all three ITU regions', () => {
    for (const rows of Object.values(data.regions)) {
      let end = 0
      for (const r of rows) {
        expect(Number.isFinite(r.fromHz) && Number.isFinite(r.toHz)).toBe(true)
        expect(r.fromHz).toBeLessThan(r.toHz)
        expect(r.fromHz).toBeLessThanOrEqual(end)
        expect(['primary', 'secondary', 'unallocated']).toContain(r.status)
        expect(r.page).toBeGreaterThanOrEqual(51)
        expect(r.page).toBeLessThanOrEqual(210)
        expect(r.footnotes.every(f => /^5\.\d{1,3}[A-Z]*$/.test(f))).toBe(true)
        end = Math.max(end, r.toHz)
      }
      expect(end).toBe(3e12)
    }
  })
  it('preserves regional differences in the 40 m neighbourhood', () => {
    expect(at(data.regions['1'], 7.25e6).map(r => r.service)).toEqual(['Broadcasting'])
    expect(at(data.regions['2'], 7.25e6).map(r => r.service)).toEqual(['Amateur'])
    expect(at(data.regions['3'], 7.25e6).map(r => r.service)).toContain('Broadcasting')
  })
  it('keeps aviation qualifiers and makes boundaries unambiguous', () => {
    const rows = data.regions['1']
    expect(at(rows, 125e6).some(r => r.service === 'Aeronautical mobile' && r.conditions === '(R)')).toBe(true)
    expect(at(rows, 137e6).every(r => r.toHz > 137e6)).toBe(true)
    expect(at(rows, 137e6).some(r => r.service.includes('satellite'))).toBe(true)
  })
  it('preserves secondary service priorities and Canadian national frequency limits', () => {
    expect(at(data.canada, 430.5e6)).toEqual(expect.arrayContaining([
      expect.objectContaining({ service: 'Radiolocation', status: 'primary' }),
      expect.objectContaining({ service: 'Amateur', status: 'secondary' }),
    ]))
    expect(at(data.canada, 80e6).some(r => r.service === 'Broadcasting')).toBe(true)
    expect(at(data.canada, 125e6).some(r => r.service === 'Aeronautical mobile')).toBe(true)
    expect(data.regions['1'].some(r => r.service === 'Space research' && r.status === 'secondary')).toBe(true)
  })
  it('retains adjacent printed footnote identifiers without corrupting qualifiers', () => {
    const rows = data.regions['1']
    expect(rows.some(r => r.footnotes.includes('5.110') && r.footnotes.includes('5.132'))).toBe(true)
    expect(rows.some(r => /\.1105|\.2205/.test(r.conditions ?? ''))).toBe(false)
  })
  it('filters documented government use without labelling generic services as military', () => {
    const rows = allocationRows(data.canada, 'ISED 2026')
    const govt = at(rows, 225e6)
    expect(govt.length).toBeGreaterThan(0)
    expect(govt.every(r => matchesService(r, 'government'))).toBe(true)
    expect(govt[0]!.note).toContain('not necessarily military')
    expect(allocationRows(data.regions['1'], 'ITU Region 1').some(r => matchesService(r, 'government'))).toBe(false)
    expect(rows.filter(r => matchesService(r, 'government')).some(r => r.note?.includes('military bases'))).toBe(true)
  })
  it('uses service designations rather than incidental words in footnotes for service filters', () => {
    const rows = allocationRows(data.regions['1'], 'ITU Region 1')
    expect(rows.filter(r => matchesService(r, 'aviation')).every(r => r.service?.includes('Aeronautical'))).toBe(true)
    expect(rows.filter(r => matchesService(r, 'time')).some(r => r.fromHz === 2498e3)).toBe(true)
    expect(frequencyLabel(8.3e3)).toBe('8.3 kHz')
    expect(frequencyLabel(125e6)).toBe('125 MHz')
    expect(frequencyLabel(3e12)).toBe('3000 GHz')
  })
})
