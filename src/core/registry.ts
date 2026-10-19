import type { Component } from 'vue'

export type Kind = 'analytical' | 'empirical' | 'reference'
export const KIND_LABEL: Record<Kind, string> = { analytical: 'Analytical', empirical: 'Design estimate', reference: 'Reference' }

export const CATEGORIES = [
  { id: 'rf', name: 'RF & Electronics', blurb: 'Frequency, power, SWR and basic circuit maths' },
  { id: 'antenna', name: 'Antenna Design', blurb: 'Dimensioned designs with cut-and-trim guidance' },
  { id: 'maps', name: 'Maps & Grid Squares', blurb: 'Maidenhead locators, distance and bearing' },
  { id: 'ops', name: 'Operating References', blurb: 'Quick lookups for on-air use' },
] as const
export type CategoryId = (typeof CATEGORIES)[number]['id']

export interface ToolDef {
  id: string // URL slug; also the key for favorites and saved designs
  title: string
  summary: string
  category: CategoryId
  kind: Kind
  keywords: string[]
  component: () => Promise<Component> // lazy so each tool is its own chunk
}

const load = (f: () => Promise<{ default: Component }>) => f as () => Promise<Component>

// To add a tool: create src/tools/MyTool.vue (wrap it in <ToolLayout>) and add one entry here.
export const tools: ToolDef[] = [
  { id: 'frequency-wavelength', title: 'Frequency ↔ Wavelength', category: 'rf', kind: 'analytical',
    summary: 'Convert frequency, wavelength and period, with optional velocity factor.',
    keywords: ['lambda', 'mhz', 'period', 'meter band', 'velocity factor'], component: load(() => import('../tools/FrequencyWavelength.vue')) },
  { id: 'ohms-law', title: "Ohm's Law & Power", category: 'rf', kind: 'analytical',
    summary: 'Enter any two of voltage, current, resistance or power to get the rest.',
    keywords: ['volts', 'amps', 'watts', 'resistance', 'ohm'], component: load(() => import('../tools/OhmsLaw.vue')) },
  { id: 'dbm-watts', title: 'dBm, Watts & dB', category: 'rf', kind: 'analytical',
    summary: 'Convert watts, dBm and voltage; work out dB gain or loss from ratios.',
    keywords: ['decibel', 'power', 'gain', 'loss', 'milliwatt'], component: load(() => import('../tools/DbmWatts.vue')) },
  { id: 'swr', title: 'SWR & Return Loss', category: 'rf', kind: 'analytical',
    summary: 'SWR, reflection coefficient, return loss and mismatch loss from any one of them.',
    keywords: ['standing wave', 'reflection', 'gamma', 'mismatch', 'vswr'], component: load(() => import('../tools/Swr.vue')) },
  { id: 'dipole', title: 'Half-wave Dipole', category: 'antenna', kind: 'empirical',
    summary: 'Wire lengths for a centre-fed dipole, with a live drawing and trimming guide.',
    keywords: ['wire', 'antenna', '468', 'hf', 'cut', 'trim'], component: load(() => import('../tools/Dipole.vue')) },
  { id: 'maidenhead', title: 'Grid Squares, Distance & Bearing', category: 'maps', kind: 'analytical',
    summary: 'Coordinates ↔ Maidenhead locators on an offline world map, with beam heading.',
    keywords: ['locator', 'qth', 'grid', 'bearing', 'distance', 'great circle', 'map', 'latitude'], component: load(() => import('../tools/Maidenhead.vue')) },
  { id: 'phonetic', title: 'Phonetic Alphabet', category: 'ops', kind: 'reference',
    summary: 'ICAO/ITU spelling alphabet and digits, large and searchable.',
    keywords: ['nato', 'alpha', 'bravo', 'spelling', 'callsign'], component: load(() => import('../tools/Phonetic.vue')) },
]

export const toolById = (id: string) => tools.find((t) => t.id === id)

export function searchTools(q: string): ToolDef[] {
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean)
  if (!terms.length) return tools
  return tools.filter((t) => {
    const hay = [t.title, t.summary, t.category, ...t.keywords].join(' ').toLowerCase()
    return terms.every((w) => hay.includes(w))
  })
}
