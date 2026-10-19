import { defineComponent, h, type Component } from 'vue'

export type Kind = 'analytical' | 'empirical' | 'reference'
/** Title of the “explain” section: only real calculators say “calculated”. */
export const EXPLAIN_LABEL: Record<Kind, string> = {
  analytical: 'How this is calculated',
  empirical: 'How this design estimate works',
  reference: 'How this works',
}
export const KIND_LABEL: Record<Kind, string> = { analytical: 'Analytical', empirical: 'Design estimate', reference: 'Reference' }

export const CATEGORIES = [
  { id: 'rf', name: 'RF & Electronics', blurb: 'Frequency, power, SWR and basic circuit maths' },
  { id: 'antenna', name: 'Antenna Design', blurb: 'Dimensioned designs with cut-and-trim guidance' },
  { id: 'maps', name: 'Maps & Grid Squares', blurb: 'Maidenhead locators, distance and bearing' },
  { id: 'station', name: 'Station & Logging', blurb: 'Feedlines, links, matching, filters, coils, power and your log' },
  { id: 'prop', name: 'Propagation & Satellites', blurb: 'Skip, grey line and satellite passes' },
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
  { id: 'components', title: 'Components: Colour Codes & Values', category: 'rf', kind: 'reference',
    summary: 'Resistor colour codes both ways, capacitor and SMD codes, standard E-series values, series/parallel, divider and LED resistor.',
    keywords: ['resistor', 'colour code', 'color code', 'capacitor', 'smd', 'e12', 'e24', 'e96', 'parallel', 'voltage divider', 'led', 'preferred values'], component: load(() => import('../tools/ComponentCodes.vue')) },
  { id: 'dipole', title: 'Half-wave Dipole', category: 'antenna', kind: 'empirical',
    summary: 'Wire lengths for a centre-fed dipole, with a live drawing and trimming guide.',
    keywords: ['wire', 'antenna', '468', 'hf', 'cut', 'trim'], component: load(() => import('../tools/Dipole.vue')) },
  { id: 'efhw', title: 'End-Fed Half-Wave (EFHW)', category: 'antenna', kind: 'empirical',
    summary: 'Wire length, harmonic bands, counterpoise and 49:1 / 64:1 transformer guidance for an end-fed half wave.',
    keywords: ['end fed', 'efhw', 'end-fed', '49:1', '64:1', 'random wire', 'multiband', 'transformer', 'unun'], component: load(() => import('../tools/Efhw.vue')) },
  { id: 'inverted-v', title: 'Inverted-V Dipole', category: 'antenna', kind: 'empirical',
    summary: 'Wire length, end height and span for a dipole hung from one centre support.',
    keywords: ['inverted v', 'apex', 'wire', 'single mast', 'hf'], component: load(() => import('../tools/InvertedV.vue')) },
  { id: 'vertical', title: 'Vertical Antenna (Quarter-wave Ground Plane)', category: 'antenna', kind: 'empirical',
    summary: 'Vertical antenna design: radiator and radial lengths for a quarter-wave ground-plane vertical, elevated or ground-mounted, with a drawing.',
    keywords: ['vertical', 'vertical antenna', 'ground plane', 'radial', 'monopole', 'whip', 'gp', 'quarter wave'], component: load(() => import('../tools/Vertical.vue')) },
  { id: 'jpole', title: 'J-Pole Vertical (VHF/UHF)', category: 'antenna', kind: 'empirical',
    summary: 'Dimensions, spacing and feed tap for a J-pole vertical in copper pipe or twin-lead, with a drawing and build notes.',
    keywords: ['j-pole', 'jpole', 'j pole', 'vertical', 'vhf', 'uhf', '2m', '70cm', 'copper pipe', 'slim jim', 'roll-up'], component: load(() => import('../tools/JPole.vue')) },
  { id: 'loop', title: 'Full-wave Loop', category: 'antenna', kind: 'empirical',
    summary: 'Perimeter and side lengths for a square, triangle or circular loop, plus a 75 Ω matching section.',
    keywords: ['quad', 'delta', 'loop', 'perimeter', 'quarter wave match'], component: load(() => import('../tools/Loop.vue')) },
  { id: 'feedline-loss', title: 'Feedline Loss', category: 'station', kind: 'analytical',
    summary: 'Cable loss from datasheet figures, length, frequency and SWR, and the power that reaches the antenna.',
    keywords: ['coax', 'rg-58', 'rg-213', 'lmr', 'attenuation', 'db per 100 ft', 'cable loss'], component: load(() => import('../tools/FeedlineLoss.vue')) },
  { id: 'link-budget', title: 'Link Budget & Path Loss', category: 'station', kind: 'analytical',
    summary: 'Free-space path loss, link margin, noise floor, radio horizon and Fresnel clearance.',
    keywords: ['fspl', 'path loss', 'range', 'margin', 'horizon', 'fresnel', 'line of sight', 'noise floor'], component: load(() => import('../tools/LinkBudget.vue')) },
  { id: 'l-network', title: 'L-network Matching', category: 'station', kind: 'analytical',
    summary: 'Inductor and capacitor values to match two resistances at a frequency, low-pass or high-pass.',
    keywords: ['matching', 'antenna tuner', 'transformer', 'impedance', 'q', 'l match'], component: load(() => import('../tools/LNetwork.vue')) },
  { id: 'low-pass-filter', title: 'Low-pass Filter Designer', category: 'station', kind: 'analytical',
    summary: 'Butterworth and Chebyshev pi or T harmonic filters with part values and an attenuation curve.',
    keywords: ['harmonic', 'filter', 'tvi', 'butterworth', 'chebyshev', 'lpf', 'cutoff'], component: load(() => import('../tools/LowPassFilter.vue')) },
  { id: 'coils', title: 'Coils & Toroids', category: 'station', kind: 'analytical',
    summary: 'Turns for a toroid from its AL value, and air-core coil turns by Wheeler’s formula.',
    keywords: ['inductor', 'toroid', 'balun', 'unun', 'amidon', 't50-2', 'ft240', 'turns', 'winding', 'choke'], component: load(() => import('../tools/Coils.vue')) },
  { id: 'power-planner', title: 'Battery & Solar Planner', category: 'station', kind: 'analytical',
    summary: 'Daily energy use, battery runtime and the solar panel and battery size for portable or field operation.',
    keywords: ['battery', 'solar', 'field day', 'portable', 'runtime', 'amp hours', 'lifepo4', 'off grid'], component: load(() => import('../tools/PowerPlanner.vue')) },
  { id: 'maidenhead', title: 'Grid Squares, Distance & Bearing', category: 'maps', kind: 'analytical',
    summary: 'Coordinates ↔ Maidenhead locators on an offline world map, with beam heading.',
    keywords: ['locator', 'qth', 'grid', 'bearing', 'distance', 'great circle', 'map', 'latitude'], component: load(() => import('../tools/Maidenhead.vue')) },
  { id: 'qrm-hunting', title: 'QRM Hunting', category: 'ops', kind: 'reference',
    summary: 'Step-by-step noise hunting, source signatures, a harmonic finder, and a DIY SDR sniffer loop.',
    keywords: ['interference', 'noise', 'rfi', 'sdr', 'birdies', 'plc', 'switching supply', 'loop', 'direction finding', 'qrm'], component: load(() => import('../tools/QrmHunting.vue')) },
  { id: 'broadcast-schedules', title: 'Broadcast Schedules & Time Stations', category: 'ops', kind: 'reference',
    summary: 'What is on air now on shortwave: bundled time stations plus dated, installable schedule packs.',
    keywords: ['shortwave', 'swl', 'wwv', 'chu', 'time signal', 'broadcast', 'schedule', 'eibi', 'on air'], component: load(() => import('../tools/BroadcastSchedules.vue')) },
  { id: 'itu-regulations', title: 'ITU Radio Regulations Explained', category: 'ops', kind: 'reference',
    summary: 'What the ITU Radio Regulations are, who changes them, the three Regions, primary vs secondary, and Article 25 for amateurs.',
    keywords: ['itu', 'treaty', 'wrc', 'region', 'article 5', 'article 25', 'allocation', 'primary', 'secondary', 'iaru', 'regulations'], component: load(() => import('../tools/ItuRegulations.vue')) },
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

export const CATEGORY_ICON: Record<string, string> = { rf: 'rf', antenna: 'antenna', maps: 'map', station: 'station', prop: 'sun', ops: 'ops' }
const TOOL_ICON: Record<string, string> = {
  'frequency-wavelength': 'wave', 'ohms-law': 'resistor', components: 'chip', 'dbm-watts': 'bars', swr: 'swr', 'reactance-resonance': 'coil', 'feedline-length': 'coax',
  dipole: 'dipole', efhw: 'endfed', 'inverted-v': 'invertedv', vertical: 'vertical', jpole: 'jpole', loop: 'loop', maidenhead: 'globe', 'qrm-hunting': 'search', 'broadcast-schedules': 'broadcast',
  'band-plans': 'plan', 'itu-regulations': 'scale', ctcss: 'pulse', abbreviations: 'list', constants: 'pi', cw: 'morse', callsign: 'badge', 'q-codes': 'q', phonetic: 'letterA',
  'feedline-loss': 'cable', 'link-budget': 'link', 'l-network': 'match', 'low-pass-filter': 'filter', coils: 'toroid', 'power-planner': 'battery',
}
export const iconFor = (id: string) => TOOL_ICON[id] ?? 'wave'
export const toolById = (id: string) => tools.find((t) => t.id === id)

export function searchTools(q: string): ToolDef[] {
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean)
  if (!terms.length) return tools
  return tools.filter((t) => {
    const hay = [t.title, t.summary, t.category, ...t.keywords].join(' ').toLowerCase()
    return terms.every((w) => hay.includes(w))
  })
}
