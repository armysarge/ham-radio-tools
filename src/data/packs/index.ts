import { parsePack, type BandSegment, type Pack } from '../../lib/packs'

// National band plans compiled by scripts/build-packs.mjs from official texts. They ship inside the app, so they work
// offline from the first start; each one still carries its source, licence and revision date.
const files = import.meta.glob('./*.json', { eager: true, import: 'default' }) as Record<string, unknown>

export interface BundledPack { id: string; title: string; jurisdiction?: string; source: string; sourceUrl?: string; revision: string; license: string; notes?: string; segments: BandSegment[] }
export const BUNDLED_PACKS: BundledPack[] = Object.values(files)
  .map((f) => {
    const { pack } = parsePack(JSON.stringify(f))
    const p = pack as Pack<{ segments: BandSegment[] }>
    return { id: p.id, title: p.title, jurisdiction: p.jurisdiction, source: p.source, sourceUrl: p.sourceUrl, revision: p.revision, license: p.license, notes: p.notes, segments: p.data.segments }
  })
  .sort((a, b) => (a.jurisdiction ?? a.title).localeCompare(b.jurisdiction ?? b.title))
