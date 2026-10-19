import { describe, it, expect } from 'vitest'
import { applyImport, exportProject, parseProject, type ProjectData } from '../src/lib/project'

const TOOLS = ['dipole', 'loop']
const sample = (): ProjectData => ({
  locations: [{ id: 'l1', name: 'Home', lat: 48.14666, lon: 11.60833 }, { id: 'l2', name: 'Field Day', lat: -33.9, lon: 151.2 }],
  designs: [{ id: 'd1', toolId: 'dipole', name: '40 m dipole', summary: '7.1 MHz', params: { f: 7.1e6, k: 0.95 }, saved: '2026-10-19T08:00:00.000Z' }],
  stationId: 'l1',
})

describe('project export/import', () => {
  it('round-trips exactly', () => {
    const file = exportProject(sample(), new Date('2026-10-19T09:00:00Z'))
    expect(JSON.parse(file)).toMatchObject({ format: 'ham-radio-tools-project', version: 1, exported: '2026-10-19T09:00:00.000Z' })
    const p = parseProject(file, TOOLS)
    expect(p.invalid).toEqual([])
    expect(p.data).toEqual(sample())
  })

  it('rejects files that are not projects, with readable messages', () => {
    expect(() => parseProject('not json', TOOLS)).toThrow(/not valid JSON/)
    expect(() => parseProject('[]', TOOLS)).toThrow(/not a Ham Radio Tools project/)
    expect(() => parseProject('{"format":"something-else","version":1}', TOOLS)).toThrow(/not a Ham Radio Tools project/)
    expect(() => parseProject('{"format":"ham-radio-tools-project","version":99}', TOOLS)).toThrow(/newer version/)
    expect(() => parseProject('{"format":"ham-radio-tools-project"}', TOOLS)).toThrow(/newer version|version/)
    expect(() => parseProject(' '.repeat(6 * 1024 * 1024), TOOLS)).toThrow(/larger than 5 MB/)
  })

  it('skips invalid entries individually and says why', () => {
    const f = JSON.stringify({
      format: 'ham-radio-tools-project', version: 1, stationId: 'bad',
      locations: [{ id: 'a', name: 'ok', lat: 10, lon: 20 }, { id: 'b', name: 'too far north', lat: 91, lon: 0 }, { id: 'c', name: 'lon', lat: 0, lon: 181 }, { id: 'd', name: 'nan', lat: 'x', lon: 0 }, 'junk', { name: 'no id', lat: 0, lon: 0 }],
      designs: [{ id: 'x', toolId: 'warp-drive', name: 'unknown tool', params: {} }, { id: 'y', toolId: 'dipole', name: 'no params' }, { id: 'z', toolId: 'loop', name: 'fine', params: { f: 14.2e6, shape: 'square', bad: null, inf: null }, saved: 'garbage' }],
    })
    const p = parseProject(f, TOOLS)
    expect(p.data.locations.map((l) => l.id)).toEqual(['a'])
    expect(p.data.designs).toHaveLength(1)
    expect(p.data.designs[0].params).toEqual({ f: 14.2e6, shape: 'square' })
    expect(p.data.designs[0].saved).toBe(new Date(0).toISOString()) // unparseable date is replaced, not trusted
    expect(p.data.stationId).toBeNull() // pointed at a location that does not exist
    expect(p.invalid).toHaveLength(7)
    expect(p.invalid.join('\n')).toMatch(/warp-drive/)
  })

  it('merge never overwrites existing items and keeps the current station', () => {
    const current: ProjectData = { locations: [{ id: 'l1', name: 'My edited home', lat: 1, lon: 2 }], designs: [], stationId: 'l1' }
    const incoming = parseProject(exportProject(sample()), TOOLS)
    const { next, report } = applyImport(current, incoming, 'merge')
    expect(next.locations.find((l) => l.id === 'l1')!.name).toBe('My edited home')
    expect(next.locations.map((l) => l.id)).toEqual(['l1', 'l2'])
    expect(next.designs).toHaveLength(1)
    expect(next.stationId).toBe('l1')
    expect(report).toMatchObject({ addedLocations: 1, addedDesigns: 1, skippedExisting: 1 })
    // importing the same file twice adds nothing
    const again = applyImport(next, incoming, 'merge')
    expect(again.report).toMatchObject({ addedLocations: 0, addedDesigns: 0, skippedExisting: 3 })
  })

  it('merge adopts the file station only when none is set; replace discards stored items', () => {
    const empty: ProjectData = { locations: [], designs: [], stationId: null }
    expect(applyImport(empty, parseProject(exportProject(sample()), TOOLS), 'merge').next.stationId).toBe('l1')
    const current: ProjectData = { locations: [{ id: 'old', name: 'Old', lat: 0, lon: 0 }], designs: [], stationId: 'old' }
    const { next } = applyImport(current, parseProject(exportProject(sample()), TOOLS), 'replace')
    expect(next.locations.map((l) => l.id)).toEqual(['l1', 'l2'])
    expect(next.stationId).toBe('l1')
  })

  it('does not mutate the stored data when merging', () => {
    const current = sample(); const before = JSON.stringify(current)
    applyImport(current, parseProject(exportProject({ ...sample(), locations: [{ id: 'n', name: 'n', lat: 0, lon: 0 }], designs: [] }), TOOLS), 'merge')
    expect(JSON.stringify(current)).toBe(before)
  })
})
