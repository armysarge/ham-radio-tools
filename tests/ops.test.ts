import { describe, it, expect } from 'vitest'
import * as L from '../src/lib/log'
import * as T from '../src/lib/trainer'
import * as K from '../src/lib/timers'

const q = (o: Partial<L.Qso> = {}): L.Qso => ({ id: 'a', call: 'zs6shz', date: '2026-10-19', time: '14:05', freqMHz: 14.2, mode: 'SSB', rstSent: '59', rstRcvd: '57', name: 'Jos\u00e9', grid: 'kg33', comment: 'caf\u00e9, 73', ...o })

describe('ADIF', () => {
  it('band from frequency', () => { expect(L.bandOf(14.2)).toBe('20m'); expect(L.bandOf(145.5)).toBe('2m'); expect(L.bandOf(5.3)).toBe('60m'); expect(L.bandOf(13)).toBe(''); expect(L.bandOf(null)).toBe('') })
  it('writes length-prefixed ASCII fields', () => {
    const a = L.toAdif([q()], 'zs6shz', '0.2.0')
    expect(a).toContain('<CALL:6>ZS6SHZ'); expect(a).toContain('<QSO_DATE:8>20261019'); expect(a).toContain('<TIME_ON:6>140500'); expect(a).toContain('<BAND:3>20m')
    expect(a).toContain('<GRIDSQUARE:4>KG33'); expect(a).toContain('<NAME:4>Jose'); expect(a).toContain('<COMMENT:8>cafe, 73'); expect(a).toContain('<EOH>'); expect(a.trim().endsWith('<EOR>')).toBe(true)
    expect(a).not.toMatch(/[^\x00-\x7f]/)
  })
  it('round-trips and tolerates other programs’ files', () => {
    const recs = L.parseAdif(L.toAdif([q(), q({ call: 'DL1ABC' })], 'zs6shz', '0.2.0'))
    expect(recs).toHaveLength(2); const back = L.fromAdif(recs[1], 'x')!
    expect(back).toMatchObject({ call: 'DL1ABC', date: '2026-10-19', time: '14:05', freqMHz: 14.2, mode: 'SSB', grid: 'KG33' })
    const other = L.parseAdif('hdr <adif_ver:5>3.1.0 <eoh>\n<call:5:s>K1ABC<qso_date:8:d>20200101 <time_on:4>0930 <freq:6>7.0740 <mode:3>FT8<eor>')
    expect(other).toEqual([{ CALL: 'K1ABC', QSO_DATE: '20200101', TIME_ON: '0930', FREQ: '7.0740', MODE: 'FT8' }]); expect(L.fromAdif(other[0], 'y')!.time).toBe('09:30')
    expect(L.fromAdif({ CALL: 'X' }, 'z')).toBeNull(); expect(L.parseAdif('')).toEqual([])
  })
  it('writes FT4 and PSK31 as submodes and reads them back', () => {
    const a = L.toAdif([q({ mode: 'FT4' }), q({ mode: 'PSK31', call: 'K1ABC' })], 'zs6shz', '0.2.0')
    expect(a).toContain('<MODE:4>MFSK <SUBMODE:3>FT4'); expect(a).toContain('<MODE:3>PSK <SUBMODE:6>BPSK31')
    expect(L.parseAdif(a).map((r) => L.fromAdif(r, 'x')!.mode)).toEqual(['FT4', 'PSK31'])
  })
  it('sanitises damaged or hostile records', () => {
    expect(L.sanitizeQso(null)).toBeNull(); expect(L.sanitizeQso({ call: 5, date: '2026-01-01' })).toBeNull(); expect(L.sanitizeQso({ call: 'K1ABC', date: 'soon' })).toBeNull()
    const q = L.sanitizeQso({ call: 'k1abc', date: '2026-01-01', time: 'x', freqMHz: -3, comment: 'x'.repeat(999), mode: { a: 1 } })!
    expect(q.call).toBe('K1ABC'); expect(q.time).toBe('00:00'); expect(q.freqMHz).toBeNull(); expect(q.comment).toHaveLength(200); expect(q.mode).toBe(''); expect(q.id).toBeTruthy()
  })
  it('flags duplicates by call, band, mode and day', () => {
    const log = [q({ call: 'DL1ABC' })]
    expect(L.isDuplicate(log, { call: 'dl1abc', date: '2026-10-19', freqMHz: 14.25, mode: 'SSB' })).toBe(true)
    expect(L.isDuplicate(log, { call: 'DL1ABC', date: '2026-10-19', freqMHz: 7.1, mode: 'SSB' })).toBe(false); expect(L.isDuplicate(log, { call: 'DL1ABC', date: '2026-10-20', freqMHz: 14.2, mode: 'SSB' })).toBe(false)
  })
})
describe('Koch trainer', () => {
  it('order and groups', () => {
    expect(new Set(T.KOCH_ORDER).size).toBe(41)
    expect(T.KOCH_ORDER.join('')).toMatch(/^ETMISOH[A-Z]{19}\d{10}[.,=/?]{5}$/)
    expect(T.kochChars(2)).toEqual(['E', 'T']); expect(() => T.kochChars(1)).toThrow(); expect(() => T.kochChars(42)).toThrow()
    let i = 0; const rng = () => [0, 0.99][i++ % 2]
    expect(T.randomGroups(['A', 'B'], 3, 2, rng)).toBe('ABA BAB'); expect(() => T.randomGroups([], 3, 2)).toThrow()
  })
  it('accuracy counts edits, not shifts', () => {
    expect(T.copyAccuracy('ABC DEF', 'abcdef')).toBe(100); expect(T.copyAccuracy('ABCDEF', 'ABDEF')).toBeCloseTo(83.33, 1); expect(T.copyAccuracy('ABCD', '')).toBe(0)
    expect(T.readyForNext(90)).toBe(true); expect(T.readyForNext(89.9)).toBe(false); expect(T.editDistance('KITTEN', 'SITTING')).toBe(3)
  })
  it('guarantees every focus symbol, including repeats, in three five-character groups', () => {
    const groups = T.guidedCopy(['E'], ['T', 'M', 'T'], () => 0)
    expect(groups).toMatch(/^[ETM]{5} [ETM]{5} [ETM]{5}$/)
    expect(groups.match(/T/g)).toHaveLength(2)
    expect(groups.match(/M/g)).toHaveLength(1)
    expect(groups).not.toBe(T.guidedCopy(['E'], ['T', 'M', 'T'], () => 0.99))
  })
  it('identifies omitted and substituted symbols without blaming expected symbols for insertions', () => {
    expect(T.gradeCopy('ABC DEF', 'abdef').missed).toEqual(['C'])
    expect(T.gradeCopy('ET ET', 'exex')).toEqual({ accuracy: 50, missed: ['T'] })
    expect(T.gradeCopy('ET', 'eXt')).toEqual({ accuracy: 50, missed: [] })
  })
  it('sanitizes persisted progress', () => {
    expect(T.cleanMorseProgress(null)).toEqual({
      mastered: 0, passes: 0, xp: 0, rounds: 0, perfectRounds: 0, streak: 0,
      lastDay: null, dailyDay: null, dailyWins: 0, sprintWins: 0, wordWins: 0, reviewChars: [],
    })
    expect(T.cleanMorseProgress({
      mastered: 1, passes: 7, xp: -10, rounds: '15', perfectRounds: Infinity,
      lastDay: '2026-02-30', dailyDay: '2024-02-29', reviewChars: ['T', 'T', '!', 'Z', 'e', 1],
    })).toMatchObject({ mastered: 0, passes: 1, xp: 0, rounds: 0, perfectRounds: 0, lastDay: null, dailyDay: '2024-02-29', reviewChars: ['T', 'E'] })
    expect(T.nextMorseLesson(T.cleanMorseProgress({ mastered: 100 }))).toBe(41)
  })
  it('requires two passing current lessons and resets a pass after a failed current lesson', () => {
    const initial = T.cleanMorseProgress()
    const lesson = (progress: T.MorseProgress, accuracy: number, count = 2) => T.recordMorseRound(progress, { mode: 'lesson', lesson: count, accuracy, missed: [] }, '2026-10-19')
    const firstPass = lesson(initial, 90)
    expect(T.nextMorseLesson(initial)).toBe(2)
    expect(initial).toMatchObject({ mastered: 0, passes: 0, xp: 0, rounds: 0 })
    expect(firstPass).toMatchObject({ mastered: 0, passes: 1, xp: 14, rounds: 1 })
    expect(lesson(firstPass, 100, 3)).toMatchObject({ mastered: 0, passes: 1 })
    expect(lesson(firstPass, 89)).toMatchObject({ mastered: 0, passes: 0 })
    const mastered = lesson(firstPass, 100)
    expect(mastered).toMatchObject({ mastered: 2, passes: 0, xp: 29, rounds: 2, perfectRounds: 1 })
    expect(T.nextMorseLesson(mastered)).toBe(3)
    expect(lesson(T.cleanMorseProgress({ mastered: 41 }), 100, 41)).toMatchObject({ mastered: 41, passes: 0 })
  })
  it('refreshes up to six unique mistakes and removes cleared characters after a review', () => {
    const initial = T.cleanMorseProgress({ mastered: 7, reviewChars: ['E', 'T', 'I', 'M', 'S', 'O'] })
    const daily = T.recordMorseRound(initial, { mode: 'daily', lesson: 8, accuracy: 80, missed: ['H', 'T', 'H', 'Z'] }, '2026-10-19')
    expect(daily.reviewChars).toEqual(['H', 'T', 'E', 'I', 'M', 'S'])
    const sprint = T.recordMorseRound(daily, { mode: 'sprint', lesson: 8, accuracy: 100, missed: [] }, '2026-10-19')
    expect(sprint.reviewChars).toEqual(daily.reviewChars)
    const review = T.recordMorseRound(sprint, { mode: 'review', lesson: 8, accuracy: 80, missed: ['M', 'M'] }, '2026-10-19')
    expect(review.reviewChars).toEqual(['M'])
  })
  it('awards one daily bonus per day and tracks scored wins by mode', () => {
    const initial = T.cleanMorseProgress({ passes: 1 })
    const day = '2026-10-19'
    const daily = { mode: 'daily' as const, lesson: 2, accuracy: 100, missed: [] }
    const loss = T.recordMorseRound(initial, { ...daily, accuracy: 89, missed: ['T'] }, day)
    expect(loss).toMatchObject({ dailyWins: 0, dailyDay: null, xp: 13 })
    const win = T.recordMorseRound(loss, daily, day)
    expect(win).toMatchObject({ dailyWins: 1, dailyDay: day, xp: 48, rounds: 2, perfectRounds: 1, passes: 1 })
    const repeat = T.recordMorseRound(win, daily, day)
    expect(repeat).toMatchObject({ dailyWins: 1, xp: 63, rounds: 3, perfectRounds: 2 })
    const tomorrow = T.recordMorseRound(repeat, daily, '2026-10-20')
    expect(tomorrow).toMatchObject({ dailyWins: 2, dailyDay: '2026-10-20', xp: 98 })
    const sprint = T.recordMorseRound(win, { ...daily, mode: 'sprint' }, day)
    const words = T.recordMorseRound(sprint, { ...daily, mode: 'words' }, day)
    expect(words).toMatchObject({ dailyWins: 1, sprintWins: 1, wordWins: 1, passes: 1 })
    expect(T.recordMorseRound(words, { ...daily, mode: 'free' }, '2026-10-20')).toBe(words)
  })
  it('continues a streak across adjacent local calendar days and restarts after a gap', () => {
    const newYear = T.practiceDay(new Date(2027, 0, 1, 0, 1))
    expect(newYear).toBe('2027-01-01')
    const initial = T.cleanMorseProgress({ lastDay: '2026-12-31', streak: 4 })
    expect(T.activeMorseStreak(initial, newYear)).toBe(4)
    const round = { mode: 'lesson' as const, lesson: 2, accuracy: 0, missed: ['E', 'T'] }
    const dayOne = T.recordMorseRound(initial, round, newYear)
    expect(dayOne).toMatchObject({ xp: 5, streak: 5, lastDay: newYear })
    expect(T.recordMorseRound(dayOne, round, newYear).streak).toBe(5)
    expect(T.activeMorseStreak(dayOne, '2027-01-03')).toBe(0)
    expect(T.recordMorseRound(dayOne, round, '2027-01-03').streak).toBe(1)
  })
})
describe('clock and timers', () => {
  it('formats and parses', () => {
    expect(K.formatHms(3661000)).toBe('01:01:01'); expect(K.formatHms(90061000)).toBe('1d 01:01:01'); expect(K.formatHms(-5)).toBe('00:00:00')
    expect(K.parseUtc('2026-10-19T14:05')).toBe(Date.UTC(2026, 9, 19, 14, 5)); expect(K.parseUtc('nonsense')).toBeNull(); expect(K.parseUtc('2026-13-40T99:00')).toBeNull()
    expect(K.idRemainingMs(1000, 10, 1000 + 9 * 60000)).toBe(60000); expect(K.idRemainingMs(0, 10, 11 * 60000)).toBe(-60000)
  })
  it('shows a zone and rejects a bad one', () => {
    const c = K.clockIn('Africa/Johannesburg', Date.UTC(2026, 9, 19, 12, 0, 0))!
    expect(c.time).toBe('14:00:00'); expect(c.date).toContain('2026-10-19'); expect(K.clockIn('Not/AZone', 0)).toBeNull()
  })
})
