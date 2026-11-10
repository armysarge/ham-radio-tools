import { reactive, watch } from 'vue'
import type { ProjectData } from '../lib/project'
import { cleanSavedElements, type SavedElement } from '../lib/elementStore'
import { cleanMorseProgress, type MorseProgress } from '../lib/trainer'

export interface SavedLocation { id: string; name: string; lat: number; lon: number }
export interface SavedDesign { id: string; toolId: string; name: string; summary: string; params: Record<string, number | string>; saved: string }
interface State {
  theme: 'system' | 'light' | 'dark'
  units: 'metric' | 'imperial'
  textSize: 'normal' | 'large' | 'xlarge'
  callsign: string
  favorites: string[]
  navExpanded: string[]
  showAllRadioServices: boolean
  locations: SavedLocation[]
  stationId: string | null
  designs: SavedDesign[]
  elements: SavedElement[]
  elementsFetched: string | null // when the saved sets were last downloaded from CelesTrak (desktop), if ever
  morse: MorseProgress
  analytics: 'unset' | 'on' | 'off' // only offered in the demo build; never 'on' without an explicit click
}

const KEY = 'hrt:v1'
const defaults = (): State => ({ theme: 'system', units: 'metric', textSize: 'normal', callsign: '', favorites: [], navExpanded: [], showAllRadioServices: false, locations: [], stationId: null, designs: [], elements: [], elementsFetched: null, morse: cleanMorseProgress(), analytics: 'unset' })

// localStorage can be missing or throw (private windows, blocked storage); the app must still work without it.
function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    const loaded: State = { ...defaults(), ...(raw ? JSON.parse(raw) : {}) }
    loaded.showAllRadioServices = loaded.showAllRadioServices === true
    loaded.elements = cleanSavedElements(loaded.elements)
    loaded.elementsFetched = typeof loaded.elementsFetched === 'string' && !Number.isNaN(Date.parse(loaded.elementsFetched)) ? loaded.elementsFetched : null
    loaded.morse = cleanMorseProgress(loaded.morse)
    loaded.favorites = Array.isArray(loaded.favorites)
      ? [...new Set(loaded.favorites.filter(id => typeof id === 'string').map(id => id === 'diy-transformers' ? 'diy-components' : id))]
      : []
    return loaded
  } catch { return defaults() }
}

export const state = reactive<State>(load())
export const storageOk = (() => { try { localStorage.setItem('hrt:probe', '1'); localStorage.removeItem('hrt:probe'); return true } catch { return false } })()

watch(state, () => { try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* ignore */ } }, { deep: true })

const uid = () => Math.random().toString(36).slice(2, 10)

export const isFavorite = (id: string) => state.favorites.includes(id)
export function toggleFavorite(id: string) {
  const i = state.favorites.indexOf(id)
  if (i >= 0) state.favorites.splice(i, 1); else state.favorites.push(id)
}
export function saveLocation(name: string, lat: number, lon: number, asStation = false) {
  const loc = { id: uid(), name: name.trim() || 'Unnamed', lat, lon }
  state.locations.push(loc)
  if (asStation) state.stationId = loc.id
  return loc
}
export function deleteLocation(id: string) {
  state.locations = state.locations.filter((l) => l.id !== id)
  if (state.stationId === id) state.stationId = null
}
export const station = () => state.locations.find((l) => l.id === state.stationId) ?? null
export function saveDesign(d: Omit<SavedDesign, 'id' | 'saved'>) { state.designs.push({ ...d, id: uid(), saved: new Date().toISOString() }) }
export function deleteDesign(id: string) { state.designs = state.designs.filter((d) => d.id !== id) }

export function applyAppearance() {
  const dark = state.theme === 'dark' || (state.theme === 'system' && matchMedia?.('(prefers-color-scheme: dark)').matches)
  document.documentElement.dataset.resolved = dark ? 'dark' : 'light'
  document.documentElement.style.setProperty('--base', { normal: '16px', large: '18px', xlarge: '21px' }[state.textSize])
}

/** Parameters of the saved design named by `?load=<id>` for this tool, if any. */
export const loadedParams = (route: { query?: Record<string, unknown> } | undefined, toolId: string) =>
  state.designs.find((d) => d.id === route?.query?.load && d.toolId === toolId)?.params ?? null

export const projectData = (): ProjectData => ({ locations: state.locations, designs: state.designs, stationId: state.stationId })
export function setProjectData(d: ProjectData) { state.locations = d.locations; state.designs = d.designs; state.stationId = d.stationId }
