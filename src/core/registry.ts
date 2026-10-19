import { defineComponent, h, type Component } from 'vue'

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
// One shared page, several tools: bind a prop to it.
const withProps = (f: () => Promise<{ default: Component }>, props: Record<string, unknown>) => () =>
  f().then((m) => defineComponent({ render: () => h(m.default, props) }) as Component)

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
  { id: 'reactance-resonance', title: 'Reactance & Resonance', category: 'rf', kind: 'analytical',
    summary: 'Inductive and capacitive reactance, and the resonant frequency of an L and C.',
    keywords: ['inductor', 'capacitor', 'lc', 'tank', 'xl', 'xc', 'coil'], component: load(() => import('../tools/Reactance.vue')) },
  { id: 'feedline-length', title: 'Feedline Electrical Length', category: 'rf', kind: 'analytical',
    summary: 'Physical cable length for a quarter-wave, half-wave or custom electrical length.',
    keywords: ['coax', 'velocity factor', 'stub', 'phasing', 'quarter wave', 'cable'], component: load(() => import('../tools/Feedline.vue')) },
  { id: 'dipole', title: 'Half-wave Dipole', category: 'antenna', kind: 'empirical',
    summary: 'Wire lengths for a centre-fed dipole, with a live drawing and trimming guide.',
    keywords: ['wire', 'antenna', '468', 'hf', 'cut', 'trim'], component: load(() => import('../tools/Dipole.vue')) },
  { id: 'inverted-v', title: 'Inverted-V Dipole', category: 'antenna', kind: 'empirical',
    summary: 'Wire length, end height and span for a dipole hung from one centre support.',
    keywords: ['inverted v', 'apex', 'wire', 'single mast', 'hf'], component: load(() => import('../tools/InvertedV.vue')) },
  { id: 'vertical', title: 'Quarter-wave Vertical & Radials', category: 'antenna', kind: 'empirical',
    summary: 'Radiator and radial lengths for a ground-plane vertical, elevated or ground-mounted.',
    keywords: ['ground plane', 'radial', 'monopole', 'whip', 'gp'], component: load(() => import('../tools/Vertical.vue')) },
  { id: 'loop', title: 'Full-wave Loop', category: 'antenna', kind: 'empirical',
    summary: 'Perimeter and side lengths for a square, triangle or circular loop, plus a 75 Ω matching section.',
    keywords: ['quad', 'delta', 'loop', 'perimeter', 'quarter wave match'], component: load(() => import('../tools/Loop.vue')) },
  { id: 'maidenhead', title: 'Grid Squares, Distance & Bearing', category: 'maps', kind: 'analytical',
    summary: 'Coordinates ↔ Maidenhead locators on an offline world map, with beam heading.',
    keywords: ['locator', 'qth', 'grid', 'bearing', 'distance', 'great circle', 'map', 'latitude'], component: load(() => import('../tools/Maidenhead.vue')) },
  { id: 'qrm-hunting', title: 'QRM Hunting', category: 'ops', kind: 'reference',
    summary: 'Step-by-step noise hunting, source signatures, a harmonic finder, and a DIY SDR sniffer loop.',
    keywords: ['interference', 'noise', 'rfi', 'sdr', 'birdies', 'plc', 'switching supply', 'loop', 'direction finding', 'qrm'], component: load(() => import('../tools/QrmHunting.vue')) },
  { id: 'broadcast-schedules', title: 'Broadcast Schedules & Time Stations', category: 'ops', kind: 'reference',
    summary: 'What is on air now on shortwave: bundled time stations plus dated, installable schedule packs.',
    keywords: ['shortwave', 'swl', 'wwv', 'chu', 'time signal', 'broadcast', 'schedule', 'eibi', 'on air'], component: load(() => import('../tools/BroadcastSchedules.vue')) },
  { id: 'band-plans', title: 'Band Plans', category: 'ops', kind: 'reference',
    summary: 'ITU region amateur allocations, a “what is at this frequency?” lookup, and installable national plans.',
    keywords: ['allocation', 'region', 'frequency', 'iaru', 'itu', 'license', 'sub-band'], component: load(() => import('../tools/BandPlans.vue')) },
  { id: 'ctcss', title: 'CTCSS Tones', category: 'ops', kind: 'reference',
    summary: 'The 38 standard sub-audible repeater tones plus common extended tones.',
    keywords: ['pl', 'tone squelch', 'repeater', 'subaudible', 'dcs'], component: withProps(() => import('../tools/RefLists.vue'), { which: 'ctcss' }) },
  { id: 'abbreviations', title: 'Abbreviations', category: 'ops', kind: 'reference',
    summary: 'Common CW, operating and technical abbreviations, searchable.',
    keywords: ['73', 'cq', 'dx', 'rst', 'cw', 'shorthand', 'glossary'], component: withProps(() => import('../tools/RefLists.vue'), { which: 'abbreviations' }) },
  { id: 'constants', title: 'Constants & Rules of Thumb', category: 'ops', kind: 'reference',
    summary: 'Physical constants, exact unit conversions and the antenna rules of thumb, with their precision.',
    keywords: ['speed of light', 'boltzmann', 'noise', 'free space', 'impedance', 'codata', '468', 'permittivity'], component: withProps(() => import('../tools/RefLists.vue'), { which: 'constants' }) },
  { id: 'cw', title: 'CW (Morse): Send, Decode & Listen', category: 'ops', kind: 'reference',
    summary: 'Morse chart, text-to-Morse player with WAV download, tap or typed decoder, and an experimental microphone decoder.',
    keywords: ['morse', 'code', 'encoder', 'decoder', 'player', 'dit', 'dah', 'farnsworth', 'wpm', 'paris'], component: load(() => import('../tools/Cw.vue')) },
  { id: 'callsign', title: 'Callsign Lookup', category: 'ops', kind: 'reference',
    summary: 'Which country issued a call sign (ITU series), plus islands, DL/ prefixes and /P /MM suffixes.',
    keywords: ['prefix', 'country', 'dxcc', 'itu', 'where is', 'dx', 'portable'], component: load(() => import('../tools/CallsignLookup.vue')) },
  { id: 'q-codes', title: 'Q Codes', category: 'ops', kind: 'reference',
    summary: 'Common Q signals as questions and answers, with a quick filter.',
    keywords: ['qth', 'qsl', 'qrm', 'qrp', 'qsy', 'abbreviation'], component: load(() => import('../tools/QCodes.vue')) },
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
