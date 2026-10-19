import { reactive, watch } from 'vue'

export interface SavedLocation { id: string; name: string; lat: number; lon: number }
export interface SavedDesign { id: string; toolId: string; name: string; summary: string; params: Record<string, number | string>; saved: string }
interface State {
  theme: 'system' | 'light' | 'dark'
  units: 'metric' | 'imperial'
  textSize: 'normal' | 'large' | 'xlarge'
  favorites: string[]
  locations: SavedLocation[]
  stationId: string | null
  designs: SavedDesign[]
}

const KEY = 'hrt:v1'
const defaults = (): State => ({ theme: 'system', units: 'metric', textSize: 'normal', favorites: [], locations: [], stationId: null, designs: [] })

// localStorage can be missing or throw (private windows, blocked storage); the app must still work without it.
function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    return { ...defaults(), ...(raw ? JSON.parse(raw) : {}) }
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
  document.documentElement.style.setProperty('--base', { normal: '17px', large: '19px', xlarge: '22px' }[state.textSize])
}

/** Parameters of the saved design named by `?load=<id>` for this tool, if any. */
export const loadedParams = (route: { query?: Record<string, unknown> } | undefined, toolId: string) =>
  state.designs.find((d) => d.id === route?.query?.load && d.toolId === toolId)?.params ?? null
