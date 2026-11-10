// Morse practice: Koch method lessons and scoring.

/** Start with pure dits and dahs, then teach mixed letters, digits and punctuation. */
export const KOCH_ORDER = 'ETMISOHANURDWKGBVFLPJCXYZQ0123456789.,=/?'.split('')
export const kochChars = (lesson: number) => {
  if (!Number.isInteger(lesson) || lesson < 2 || lesson > KOCH_ORDER.length) throw new RangeError(`Lesson must be a whole number from 2 to ${KOCH_ORDER.length}`)
  return KOCH_ORDER.slice(0, lesson)
}

/** Random groups from a character set, joined by spaces. `rng` is injectable for tests. */
export function randomGroups(chars: string[], groupLen: number, count: number, rng: () => number = Math.random): string {
  if (!chars.length || groupLen < 1 || count < 1) throw new RangeError('Need characters, a group length and a count of at least 1')
  return Array.from({ length: count }, () => Array.from({ length: groupLen }, () => chars[Math.floor(rng() * chars.length)]).join('')).join(' ')
}

/** Three groups of five with each focus entry guaranteed a slot. */
export function guidedCopy(chars: string[], focus: string[], rng: () => number = Math.random): string {
  const length = 15
  if (focus.length > length || (!chars.length && focus.length < length)) throw new RangeError('Need enough characters to fill three groups of five')
  const symbols = Array.from({ length }, (_, i) => i < focus.length ? focus[i] : chars[Math.floor(rng() * chars.length)])
  for (let i = length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const symbol = symbols[i]
    symbols[i] = symbols[j]
    symbols[j] = symbol
  }
  return [symbols.slice(0, 5), symbols.slice(5, 10), symbols.slice(10)].map((group) => group.join('')).join(' ')
}

const norm = (s: string) => s.toUpperCase().replace(/\s+/g, '')
function countEdits(a: string, b: string, rows?: number[][]) {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j)
  rows?.push(prev)
  for (let i = 1; i <= a.length; i++) {
    const row = [i]
    for (let j = 1; j <= b.length; j++) row.push(Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)))
    rows?.push(row)
    prev = row
  }
  return prev[b.length]
}
/** Minimum single-character edits (insert, delete, change) between what was sent and what was typed. */
export const editDistance = (a: string, b: string) => countEdits(a, b)

const accuracyPct = (edits: number, length: number) => length ? Math.max(0, 100 * (1 - edits / length)) : 0

/** Copy accuracy 0–100: 100 × (1 − edits / characters sent). A dropped character costs one, not a whole shifted line. */
export function copyAccuracy(sent: string, typed: string) {
  const a = norm(sent), b = norm(typed)
  return a.length ? accuracyPct(countEdits(a, b), a.length) : 0
}

/** Report expected symbols omitted or replaced along the shortest edit path. */
export function gradeCopy(sent: string, typed: string): { accuracy: number; missed: string[] } {
  const a = norm(sent), b = norm(typed)
  const rows: number[][] = []
  const edits = countEdits(a, b, rows)
  const missed: string[] = []
  let i = a.length, j = b.length
  while (i > 0) {
    const expected = a[i - 1]
    const same = expected === b[j - 1]
    if (j > 0 && rows[i][j] === rows[i - 1][j - 1] + (same ? 0 : 1)) {
      if (!same) missed.push(expected)
      i--
      j--
    } else if (rows[i][j] === rows[i - 1][j] + 1) {
      missed.push(expected)
      i--
    } else {
      j--
    }
  }
  return { accuracy: accuracyPct(edits, a.length), missed: [...new Set(missed.reverse())] }
}

/** Koch rule of thumb: add the next character once you copy at least 90 % correctly. */
export const readyForNext = (accuracyPct: number) => accuracyPct >= 90

export type MorseMode = 'lesson' | 'review' | 'daily' | 'sprint' | 'words' | 'free'

export interface MorseProgress {
  mastered: number
  passes: number
  xp: number
  rounds: number
  perfectRounds: number
  streak: number
  lastDay: string | null
  dailyDay: string | null
  dailyWins: number
  sprintWins: number
  wordWins: number
  reviewChars: string[]
}

export const nextMorseLesson = (progress: MorseProgress) => Math.min(KOCH_ORDER.length, Math.max(2, progress.mastered + 1))

const count = (value: unknown, max = Number.MAX_SAFE_INTEGER) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(0, Math.floor(value))) : 0

const dayStamp = (day: string) => Date.parse(`${day}T00:00:00Z`)
function cleanDay(value: unknown) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const stamp = dayStamp(value)
  return Number.isFinite(stamp) && new Date(stamp).toISOString().slice(0, 10) === value ? value : null
}

function reviewQueue(values: unknown[], lesson: number) {
  const chars = kochChars(lesson)
  const symbols = values.map((value) => typeof value === 'string' ? value.toUpperCase() : '')
  return [...new Set(symbols.filter((symbol) => chars.includes(symbol)))].slice(0, 6)
}

export function cleanMorseProgress(raw?: unknown): MorseProgress {
  const data = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
  const mastered = count(data.mastered, KOCH_ORDER.length)
  const progress: MorseProgress = {
    mastered: mastered >= 2 ? mastered : 0,
    passes: mastered < KOCH_ORDER.length ? count(data.passes, 1) : 0,
    xp: count(data.xp),
    rounds: count(data.rounds),
    perfectRounds: count(data.perfectRounds),
    streak: count(data.streak),
    lastDay: cleanDay(data.lastDay),
    dailyDay: cleanDay(data.dailyDay),
    dailyWins: count(data.dailyWins),
    sprintWins: count(data.sprintWins),
    wordWins: count(data.wordWins),
    reviewChars: [],
  }
  if (Array.isArray(data.reviewChars)) progress.reviewChars = reviewQueue(data.reviewChars, nextMorseLesson(progress))
  return progress
}

export function practiceDay(date = new Date()): string {
  const year = String(date.getFullYear()).padStart(4, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function activeMorseStreak(progress: MorseProgress, day: string): number {
  if (!progress.lastDay) return 0
  const elapsed = dayStamp(day) - dayStamp(progress.lastDay)
  return elapsed === 0 || elapsed === 86_400_000 ? progress.streak : 0
}

export function recordMorseRound(
  progress: MorseProgress,
  { mode, lesson, accuracy, missed }: { mode: MorseMode; lesson: number; accuracy: number; missed: string[] },
  day: string,
): MorseProgress {
  if (mode === 'free' || !Number.isFinite(accuracy) || accuracy < 0 || accuracy > 100 || !cleanDay(day)) return progress
  const passed = readyForNext(accuracy)
  const dailyWin = mode === 'daily' && passed && progress.dailyDay !== day
  const currentLesson = nextMorseLesson(progress)
  const next = {
    ...progress,
    xp: progress.xp + 5 + Math.floor(accuracy / 10) + (dailyWin ? 20 : 0),
    rounds: progress.rounds + 1,
    perfectRounds: progress.perfectRounds + Number(accuracy === 100),
    streak: activeMorseStreak(progress, day) + Number(progress.lastDay !== day),
    lastDay: day,
    dailyDay: dailyWin ? day : progress.dailyDay,
    dailyWins: progress.dailyWins + Number(dailyWin),
    sprintWins: progress.sprintWins + Number(mode === 'sprint' && passed),
    wordWins: progress.wordWins + Number(mode === 'words' && passed),
    reviewChars: mode === 'review'
      ? reviewQueue(missed, currentLesson)
      : reviewQueue([...missed, ...progress.reviewChars], currentLesson),
  }
  if (mode === 'lesson' && lesson === currentLesson && progress.mastered < KOCH_ORDER.length) {
    if (passed && progress.passes === 1) {
      next.mastered = lesson
      next.passes = 0
    } else {
      next.passes = Number(passed)
    }
  }
  return next
}
