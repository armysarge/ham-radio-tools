import type { BandSegment } from './packs'

export interface AllocationFact { fromHz: number; toHz: number; service: string; status: string; footnotes: string[]; conditions?: string; page?: number }
export interface AllocationData { regions: Record<string, AllocationFact[]>; canada: AllocationFact[] }
export interface AllocationRow extends BandSegment { origin?: string; service?: string; government?: boolean; allocation?: boolean }
export const COUNTRY_REGIONS: Record<string, 1 | 2 | 3> = {
  'us-fcc-part97': 2, 'ca-ised-rbr4': 2, 'za-icasa-annexure-i': 1,
  'de-bnetza-afuv': 1, 'au-acma-class-licence': 3, 'jp-mic-notification-80': 3, 'br-anatel-ato-926': 2,
}
export const ITU_ALLOCATION_URL = 'https://search.itu.int/history/HistoryDigitalCollectionDocLibrary/1.49.48.en.101.pdf'
export const CANADA_ALLOCATION_URL = 'https://ised-isde.canada.ca/site/spectrum-management-telecommunications/en/spectrum-allocation/canadian-table-frequency-allocations-sf10759'
export const SERVICE_FILTERS = [
  ['all', 'All services'], ['amateur', 'Amateur'], ['aviation', 'Aviation / air'], ['maritime', 'Maritime'],
  ['broadcast', 'Broadcasting'], ['fixed', 'Fixed links'], ['mobile', 'Mobile / land mobile'],
  ['satellite', 'Satellite'], ['navigation', 'Navigation'], ['radar', 'Radiolocation / radar'],
  ['science', 'Science / weather'], ['time', 'Time standards'], ['government', 'Government / defence (documented)'], ['unallocated', 'Not allocated'],
] as const
export const FREQUENCY_RANGES = [
  { id: 'all', title: 'Whole spectrum', from: 1e3, to: 3e12 },
  { id: 'vlf', title: 'VLF · 3–30 kHz', from: 3e3, to: 30e3 }, { id: 'lf', title: 'LF · 30–300 kHz', from: 30e3, to: 300e3 },
  { id: 'mf', title: 'MF · 0.3–3 MHz', from: .3e6, to: 3e6 }, { id: 'hf', title: 'HF · 3–30 MHz', from: 3e6, to: 30e6 },
  { id: 'vhf', title: 'VHF · 30–300 MHz', from: 30e6, to: 300e6 }, { id: 'uhf', title: 'UHF · 0.3–3 GHz', from: .3e9, to: 3e9 },
  { id: 'shf', title: 'SHF · 3–30 GHz', from: 3e9, to: 30e9 }, { id: 'ehf', title: 'EHF · 30–300 GHz', from: 30e9, to: 300e9 },
  { id: 'above', title: 'Above 300 GHz', from: 300e9, to: 3e12 },
]
export function frequencyLabel(hz: number) {
  const scale = hz >= 1e9 ? 1e9 : hz >= 1e6 ? 1e6 : 1e3
  return `${Number((hz / scale).toPrecision(10))} ${scale === 1e9 ? 'GHz' : scale === 1e6 ? 'MHz' : 'kHz'}`
}
export function allocationRows(facts: AllocationFact[], origin: string): AllocationRow[] {
  return facts.map(r => ({ band: `${frequencyLabel(r.fromHz)}–${frequencyLabel(r.toHz)}`, fromHz: r.fromHz, toHz: r.toHz,
    use: [r.service, r.conditions].filter(Boolean).join(' '), service: r.service, status: r.status, origin, allocation: true,
    government: origin === 'ISED 2026' && r.footnotes.includes('C5'),
    note: [r.footnotes.length ? `Source-cell footnotes: ${r.footnotes.join(', ')}. Check their conditions in the source.` : '',
      r.page ? `ITU Volume 1 PDF page ${r.page}.` : '', origin === 'ISED 2026' && r.footnotes.includes('C5') ? 'C5: exclusive Government of Canada use; not necessarily military.' : '',
      origin === 'ISED 2026' && r.footnotes.includes('C16A') ? 'C16A: government fixed/mobile use has priority near major military bases, subject to the footnote.' : '',
      origin === 'ISED 2026' && r.footnotes.includes('C17') ? 'C17: secondary aeronautical telemetry may be authorized near certain military bases, subject to the footnote.' : ''].filter(Boolean).join(' '),
  }))
}
export function matchesService(row: AllocationRow, filter: string) {
  const name = (row.service ?? row.use).toLowerCase()
  switch (filter) {
    case 'amateur': return name.includes('amateur')
    case 'aviation': return name.includes('aeronautical')
    case 'maritime': return name.includes('maritime')
    case 'broadcast': return name.includes('broadcast')
    case 'fixed': return name.includes('fixed')
    case 'mobile': return name.includes('mobile')
    case 'satellite': return name.includes('satellite')
    case 'navigation': return name.includes('navigation')
    case 'radar': return name.includes('radiolocation') || name.includes('radiodetermination')
    case 'science': return /meteorological|astronomy|research|exploration|space operation/.test(name)
    case 'time': return name.includes('time signal')
    case 'government': return !!row.government || /C16A:|C17:/.test(row.note ?? '')
    case 'unallocated': return row.status === 'unallocated'
    default: return true
  }
}
