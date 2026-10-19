// Morse practice: Koch method lessons and scoring.

/** Character order of the G4FON Koch trainer (two characters first, one more per lesson). */
export const KOCH_ORDER = 'KMURESNAPTLWI.JZ=FOY,VG5/Q92H38B?47C1D60X'.split('')
export const kochChars = (lesson: number) => {
  if (!Number.isInteger(lesson) || lesson < 2 || lesson > KOCH_ORDER.length) throw new RangeError(`Lesson must be a whole number from 2 to ${KOCH_ORDER.length}`)
  return KOCH_ORDER.slice(0, lesson)
}

/** Random groups from a character set, joined by spaces. `rng` is injectable for tests. */
export function randomGroups(chars: string[], groupLen: number, count: number, rng: () => number = Math.random): string {
  if (!chars.length || groupLen < 1 || count < 1) throw new RangeError('Need characters, a group length and a count of at least 1')
  return Array.from({ length: count }, () => Array.from({ length: groupLen }, () => chars[Math.floor(rng() * chars.length)]).join('')).join(' ')
}

const norm = (s: string) => s.toUpperCase().replace(/\s+/g, '')
/** Minimum single-character edits (insert, delete, change) between what was sent and what was typed. */
export function editDistance(a: string, b: string) {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const row = [i]
    for (let j = 1; j <= b.length; j++) row.push(Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)))
    prev = row
  }
  return prev[b.length]
}
/** Copy accuracy 0–100: 100 × (1 − edits / characters sent). A dropped character costs one, not a whole shifted line. */
export function copyAccuracy(sent: string, typed: string) {
  const a = norm(sent), b = norm(typed)
  if (!a.length) return 0
  return Math.max(0, 100 * (1 - editDistance(a, b) / a.length))
}
/** Koch rule of thumb: add the next character once you copy at least 90 % correctly. */
export const readyForNext = (accuracyPct: number) => accuracyPct >= 90
