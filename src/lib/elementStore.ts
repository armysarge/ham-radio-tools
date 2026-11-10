// Light-weight shape and loading check for saved element sets. Kept free of the orbit library so the app store
// (loaded at startup) does not pull satellite.js into the main bundle; element parsing lives in ./elements.
export const MAX_SETS = 1000
export interface SavedElement { norad: number; name: string; line1: string; line2: string; epoch: string; saved: string }

/** Validate sets loaded from storage; anything malformed is dropped. Full TLE checks happen when a set is imported. */
export function cleanSavedElements(raw: unknown): SavedElement[] {
  if (!Array.isArray(raw)) return []
  const out: SavedElement[] = []
  const seen = new Set<number>()
  for (const e of raw.slice(0, MAX_SETS)) {
    if (typeof e !== 'object' || e === null) continue
    const { norad, name, line1, line2, epoch, saved } = e as Record<string, unknown>
    if (typeof norad !== 'number' || !Number.isInteger(norad) || seen.has(norad) || typeof name !== 'string' || typeof line1 !== 'string' || typeof line2 !== 'string' || typeof epoch !== 'string' || typeof saved !== 'string') continue
    if (line1.length !== 69 || line2.length !== 69 || !line1.startsWith('1 ') || !line2.startsWith('2 ') || Number.isNaN(Date.parse(epoch))) continue
    seen.add(norad)
    out.push({ norad, name: name.slice(0, 80), line1, line2, epoch, saved })
  }
  return out
}
