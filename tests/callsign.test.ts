import { describe, it, expect } from 'vitest'
import { BLOCKS } from '../src/data/callsigns'
import { blockHolder, lookup } from '../src/lib/callsign'

const holder = (c: string) => lookup(c).issuedBy?.holder

describe('block holders', () => {
  it('well-known calls', () => {
    const cases: [string, string][] = [
      ['W1AW', 'United States'], ['K1ABC', 'United States'], ['AB1XYZ', 'United States'], ['N0CALL', 'United States'], ['AL7XX', 'United States'],
      ['G4ABC', 'United Kingdom'], ['M0ABC', 'United Kingdom'], ['2E0ABC', 'United Kingdom'], ['DL1ABC', 'Germany'], ['DJ5XX', 'Germany'], ['F5ABC', 'France'], ['I2ABC', 'Italy'],
      ['EA3ABC', 'Spain'], ['PA3ABC', 'Netherlands'], ['ON4ABC', 'Belgium'], ['OZ1ABC', 'Denmark'], ['SM5ABC', 'Sweden'], ['LA1ABC', 'Norway'], ['OH2ABC', 'Finland'], ['SP9ABC', 'Poland'],
      ['OK1ABC', 'Czech Republic'], ['OE1ABC', 'Austria'], ['HB9ABC', 'Switzerland'], ['9A1ABC', 'Croatia'], ['YO3ABC', 'Romania'], ['LZ1ABC', 'Bulgaria'], ['SV1ABC', 'Greece'],
      ['UA3ABC', 'Russia'], ['RA3ABC', 'Russia'], ['UR5ABC', 'Ukraine'], ['EI2ABC', 'Ireland'], ['CT1ABC', 'Portugal'], ['TA1ABC', 'Türkiye'],
      ['JA1ABC', 'Japan'], ['7K1ABC', 'Japan'], ['HL1ABC', 'South Korea'], ['BY1ABC', 'China'], ['BV2ABC', 'Taiwan'], ['VU2ABC', 'India'], ['9M2ABC', 'Malaysia'], ['9V1ABC', 'Singapore'],
      ['VK2ABC', 'Australia'], ['ZL1ABC', 'New Zealand'], ['VE3ABC', 'Canada'], ['XE1ABC', 'Mexico'], ['LU1ABC', 'Argentina'], ['PY2ABC', 'Brazil'], ['CE3ABC', 'Chile'],
      ['ZS6ABC', 'South Africa'], ['ZR1ABC', 'South Africa'], ['V51ABC', 'Namibia'], ['A22ABC', 'Botswana'], ['7P8ABC', 'Lesotho'], ['Z21ABC', 'Zimbabwe'], ['5Z4ABC', 'Kenya'], ['5H3ABC', 'Tanzania'],
      ['5N0ABC', 'Nigeria'], ['CN8ABC', 'Morocco'], ['SU1ABC', 'Egypt'], ['4X1ABC', 'Israel'], ['A61ABC', 'United Arab Emirates'], ['HZ1ABC', 'Saudi Arabia'], ['9K2ABC', 'Kuwait'],
      ['3DA0ABC', 'Eswatini'], ['3D2ABC', 'Fiji'], ['3B8ABC', 'Mauritius'], ['3A2ABC', 'Monaco'], ['T77ABC', 'San Marino'], ['HV1ABC', 'Vatican City'], ['C31ABC', 'Andorra'], ['LX1ABC', 'Luxembourg'],
    ]
    for (const [c, country] of cases) expect(holder(c), c).toBe(country)
  })
  it('splits shared two-letter blocks by the third character', () => {
    expect(blockHolder('SSA')).toBe('Egypt'); expect(blockHolder('SSN')).toBe('Sudan'); expect(blockHolder('3DM')).toBe('Eswatini'); expect(blockHolder('3DN')).toBe('Fiji')
  })
  it('unallocated series are reported, not guessed', () => {
    expect(lookup('QA1ABC').status).toBe('not-allocated')
    expect(lookup('1A1ABC').status).toBe('not-allocated')
  })
  it('table is well formed: ordered ranges, known shape, no overlaps', () => {
    const seen: string[] = []
    for (const [f, t, h] of BLOCKS) {
      expect(h.length).toBeGreaterThan(1); expect(f.length).toBe(t.length); expect([1, 2]).toContain(f.length); expect(f <= t, `${f}-${t}`).toBe(true)
      if (f.length === 2) { for (let c = f.charCodeAt(1); c <= t.charCodeAt(1) || f[0] !== t[0]; c++) { if (f[0] !== t[0]) break; seen.push(f[0] + String.fromCharCode(c)) } }
    }
    expect(new Set(seen).size).toBe(seen.length) // a two-character start belongs to at most one entry within a single first letter
  })
})

describe('entities, prefixes and suffixes', () => {
  it('finds island groups and home nations', () => {
    expect(lookup('KH6ABC').issuedBy).toMatchObject({ holder: 'United States', entity: 'Hawaii' })
    expect(lookup('KL7ABC').issuedBy?.entity).toBe('Alaska')
    expect(lookup('GM3ABC').issuedBy?.entity).toBe('Scotland')
    expect(lookup('2W0ABC').issuedBy?.entity).toBe('Wales')
    expect(lookup('FM5ABC').issuedBy?.entity).toBe('Martinique')
    expect(lookup('EA8ABC').issuedBy?.entity).toBe('Canary Islands')
    expect(lookup('VP9ABC').issuedBy?.entity).toBe('Bermuda')
    expect(lookup('W1AW').issuedBy?.entity).toBeNull() // mainland: no sub-entity
  })
  it('an operating prefix overrides the issuing country without hiding it', () => {
    const r = lookup('dl/w1aw')
    expect(r.call).toBe('W1AW'); expect(r.issuedBy?.holder).toBe('United States'); expect(r.operating?.holder).toBe('Germany')
    expect(lookup('VP9/W1AW').operating?.entity).toBe('Bermuda')
    expect(lookup('W1AW/DL').operating?.holder).toBe('Germany') // prefix after the call
  })
  it('recognises portable, mobile, maritime and call-area suffixes', () => {
    const p = lookup('ZS6ABC/P'); expect(p.suffix).toBe('P'); expect(p.operating).toBeNull(); expect(p.notes.join(' ')).toMatch(/portable/)
    expect(lookup('G4ABC/MM').notes.join(' ')).toMatch(/maritime mobile/)
    expect(lookup('W1AW/AM').notes.join(' ')).toMatch(/aeronautical/)
    expect(lookup('K1ABC/7').suffix).toBe('7')
    const both = lookup('ON/G4ABC/P'); expect(both.call).toBe('G4ABC'); expect(both.operating?.holder).toBe('Belgium'); expect(both.suffix).toBe('P')
  })
  it('handles bad input without throwing', () => {
    expect(lookup('').status).toBe('invalid'); expect(lookup('   ').status).toBe('invalid'); expect(lookup('W1AW!').status).toBe('invalid')
    expect(lookup('A/B/C/D').status).toBe('invalid'); expect(lookup('/').status).toBe('invalid')
    expect(lookup('DL').issuedBy?.holder).toBe('Germany') // a bare prefix still resolves
    expect(lookup(' w1aw ').call).toBe('W1AW')
  })
})
