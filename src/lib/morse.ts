// International Morse (ITU-R M.1677-1): encoding, timing, WAV rendering, and decoding from key timings or audio.
export const MORSE: Record<string, string> = {
  A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..', J: '.---', K: '-.-', L: '.-..', M: '--',
  N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..',
  '0': '-----', '1': '.----', '2': '..---', '3': '...--', '4': '....-', '5': '.....', '6': '-....', '7': '--...', '8': '---..', '9': '----.',
  '.': '.-.-.-', ',': '--..--', '?': '..--..', "'": '.----.', '!': '-.-.--', '/': '-..-.', '(': '-.--.', ')': '-.--.-', '&': '.-...', ':': '---...',
  ';': '-.-.-.', '=': '-...-', '+': '.-.-.', '-': '-....-', '_': '..--.-', '"': '.-..-.', '$': '...-..-', '@': '.--.-.',
}
/** Prosigns are sent as one run-together character; type them as <AR>, <SK>, … */
export const PROSIGNS: Record<string, string> = { AR: '.-.-.', SK: '...-.-', BT: '-...-', KN: '-.--.', AS: '.-...', CT: '-.-.-', SN: '...-.', HH: '........' }
const REVERSE: Record<string, string> = {}
for (const [k, v] of Object.entries(MORSE)) REVERSE[v] = k
for (const [k, v] of Object.entries(PROSIGNS)) REVERSE[v] ??= `<${k}>`

export interface Encoded { symbols: string; unknown: string[] }
/** Text → dots and dashes: letters separated by a space, words by " / ". */
export function encode(text: string): Encoded {
  const unknown: string[] = []
  const words = text.toUpperCase().split(/\s+/).filter(Boolean).map((w) => {
    const letters: string[] = []
    for (const m of w.matchAll(/<([A-Z]{2})>|(.)/gu)) {
      const code = m[1] && PROSIGNS[m[1]] ? PROSIGNS[m[1]] : MORSE[m[2] ?? '']
      if (code) letters.push(code)
      else { const bad = m[0]; if (!unknown.includes(bad)) unknown.push(bad) }
    }
    return letters.join(' ')
  }).filter(Boolean)
  return { symbols: words.join(' / '), unknown }
}

/** Typed dots/dashes → text. Accepts . · - − _ ; letters split by space, words by "/" or two+ spaces. */
export function decodeSymbols(input: string): string {
  const norm = input.replace(/[·•]/g, '.').replace(/[−–—_]/g, '-').trim()
  return norm.split(/\s*\/\s*|\s{2,}/).map((w) => w.split(/\s+/).filter(Boolean).map((c) => REVERSE[c] ?? '?').join('')).join(' ')
}

export interface Tone { on: boolean; ms: number }
/**
 * Keying schedule. wpm = overall speed in PARIS words per minute (unit = 1200/wpm ms).
 * With `charWpm` > wpm, characters are sent fast and the gaps stretched (Farnsworth).
 */
export function schedule(symbols: string, wpm: number, charWpm = wpm): Tone[] {
  if (!(wpm > 0) || !(charWpm >= wpm)) throw new RangeError('Speed must be greater than 0, and character speed at least the overall speed')
  const u = 1200 / charWpm
  const g = charWpm === wpm ? u : (60000 / wpm - 37200 / charWpm) / 19 // stretched gap unit: (60c − 37.2s)/(19cs) seconds
  const out: Tone[] = []
  const gap = (units: number, unit: number) => { if (out.length) { const last = out[out.length - 1]; if (!last.on) last.ms += units * unit; else out.push({ on: false, ms: units * unit }) } }
  const words = symbols.split(/\s*\/\s*/).filter(Boolean)
  words.forEach((w, wi) => {
    if (wi) gap(7, g)
    w.split(/\s+/).filter(Boolean).forEach((ch, ci) => {
      if (ci) gap(3, g)
      ;[...ch].forEach((s, si) => { if (si) gap(1, u); out.push({ on: true, ms: (s === '-' ? 3 : 1) * u }) })
    })
  })
  return out
}
export const totalMs = (t: Tone[]) => t.reduce((a, x) => a + x.ms, 0)

/** 16-bit mono PCM WAV of a keying schedule, with 5 ms raised-cosine edges to avoid key clicks. */
export function renderWav(tones: Tone[], freq = 600, sampleRate = 8000): Uint8Array {
  const edge = Math.round(sampleRate * 0.005)
  const counts = tones.map((t) => Math.round((t.ms / 1000) * sampleRate))
  const n = counts.reduce((a, b) => a + b, 0)
  const data = new Int16Array(n)
  let pos = 0
  tones.forEach((t, i) => {
    const c = counts[i]
    if (t.on) for (let k = 0; k < c; k++) {
      const env = Math.min(1, k / edge, (c - 1 - k) / edge)
      data[pos + k] = Math.round(0.7 * 32767 * Math.sin(Math.PI / 2 * Math.max(0, env)) ** 2 * Math.sin((2 * Math.PI * freq * (pos + k)) / sampleRate))
    }
    pos += c
  })
  const buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf)
  const str = (o: number, s: string) => [...s].forEach((ch, i) => v.setUint8(o + i, ch.charCodeAt(0)))
  str(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); str(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true)
  v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); str(36, 'data'); v.setUint32(40, n * 2, true)
  new Int16Array(buf, 44).set(data)
  return new Uint8Array(buf)
}

// ---- decoding from timings ----
/** Best split of positive values into a low and a high group; returns the threshold, or null if they form one cluster (ratio < minRatio). */
export function splitTwo(values: number[], minRatio = 1.8): number | null {
  const v = [...values].sort((a, b) => a - b)
  if (v.length < 2) return null
  let best = -1, bestCost = Infinity
  for (let i = 1; i < v.length; i++) {
    const a = v.slice(0, i), b = v.slice(i)
    const ma = a.reduce((x, y) => x + y, 0) / a.length, mb = b.reduce((x, y) => x + y, 0) / b.length
    const cost = a.reduce((s, x) => s + (x - ma) ** 2, 0) + b.reduce((s, x) => s + (x - mb) ** 2, 0)
    if (cost < bestCost) { bestCost = cost; best = i }
  }
  const lo = v.slice(0, best), hi = v.slice(best)
  const ml = lo.reduce((x, y) => x + y, 0) / lo.length, mh = hi.reduce((x, y) => x + y, 0) / hi.length
  return mh / ml >= minRatio ? (Math.max(...lo) + Math.min(...hi)) / 2 : null
}

export interface Decoded { text: string; wpm: number | null; dit: number | null }
/** Decode on/off key timings of unknown speed (ms). Handles Farnsworth spacing by clustering the gaps. */
export function decodeTimings(tones: Tone[]): Decoded {
  const ons = tones.filter((t) => t.on).map((t) => t.ms)
  if (!ons.length) return { text: '', wpm: null, dit: null }
  const split = splitTwo(ons)
  const dashLimit = split ?? Infinity
  const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length
  const offs = tones.filter((t, i) => !t.on && i > 0 && i < tones.length - 1).map((t) => t.ms)
  let dit = mean(ons.filter((m) => m < dashLimit))
  if (split === null) {
    // One cluster of key-downs: all dits, or all dahs. The spacing decides — gaps inside a letter are one dit long.
    const gapSplit = splitTwo(offs)
    if (gapSplit !== null) { const unit = mean(offs.filter((m) => m < gapSplit)); if (dit / unit > 2) dit = unit }
    else if (offs.length && dit > 0.8 * mean(offs)) dit /= 3 // equal key-down and gap lengths: gaps are 3 units, so the key-downs are dahs
  }
  const intra = (m: number) => m < 2 * dit
  const longGaps = offs.filter((m) => !intra(m))
  const wordLimit = splitTwo(longGaps, 1.8) ?? (longGaps.length && Math.min(...longGaps) >= 5 * dit ? 0 : Infinity)
  let text = '', cur = ''
  const flush = () => { if (cur) { text += REVERSE[cur] ?? '?'; cur = '' } }
  tones.forEach((t, i) => {
    if (t.on) cur += t.ms >= (split ?? 2 * dit) ? '-' : '.'
    else if (i > 0 && i < tones.length - 1 && !intra(t.ms)) { flush(); if (t.ms >= wordLimit) text += ' ' }
  })
  flush()
  return { text: text.trim(), wpm: Math.round(1200 / dit), dit }
}

// ---- audio ----
/** Power of one frequency in a block of samples (Goertzel algorithm). */
export function goertzel(samples: ArrayLike<number>, sampleRate: number, freq: number): number {
  const w = (2 * Math.PI * freq) / sampleRate, c = 2 * Math.cos(w)
  let s1 = 0, s2 = 0
  for (let i = 0; i < samples.length; i++) { const s = samples[i] + c * s1 - s2; s2 = s1; s1 = s }
  return (s1 * s1 + s2 * s2 - c * s1 * s2) / samples.length ** 2
}
/** Strongest tone between lo and hi Hz (25 Hz steps) in a block, or null if nothing stands out. */
export function findTone(samples: ArrayLike<number>, sampleRate: number, lo = 300, hi = 1200): number | null {
  let best = 0, bestP = 0, sum = 0, n = 0
  for (let f = lo; f <= hi; f += 25) { const p = goertzel(samples, sampleRate, f); sum += p; n++; if (p > bestP) { bestP = p; best = f } }
  return bestP > 6 * (sum / n) && bestP > 1e-6 ? best : null
}

/** Turns a stream of tone-power frames into on/off events with an adaptive threshold and hysteresis. */
export class Keyer {
  private noise = Infinity; private peak = 0; private on = false; private since = 0; private t = 0
  events: Tone[] = []
  constructor(private frameMs: number) {}
  /** Keep the learned noise/peak levels but forget events: lets an offline decode start with a primed threshold. */
  restart() { this.events = []; this.on = false; this.since = 0; this.t = 0 }
  push(power: number, dtMs = this.frameMs) {
    this.t += dtMs
    this.peak = Math.max(power, this.peak * 0.9995)
    this.noise = Math.min(power, this.noise === Infinity ? power : this.noise * 1.0005 + 1e-12)
    const span = this.peak - this.noise
    const hi = this.noise + 0.5 * span, lo = this.noise + 0.3 * span
    const now = this.peak > 3 * this.noise && span > 1e-9 ? (this.on ? power > lo : power > hi) : false
    if (now !== this.on) { this.events.push({ on: this.on, ms: this.t - this.since }); this.on = now; this.since = this.t }
  }
  /** Close the open interval and return all events (leading silence is dropped). */
  finish(): Tone[] {
    const out = [...this.events, { on: this.on, ms: this.t - this.since }]
    while (out.length && !out[0].on) out.shift()
    return out
  }
}
/** Offline helper: decode a whole recording. Used by tests and by "decode a WAV/recording". */
export function decodeAudio(samples: ArrayLike<number>, sampleRate: number, freq?: number, frameMs = 8): Decoded & { freq: number | null } {
  const frame = Math.round((sampleRate * frameMs) / 1000), win = frame * 2
  const f = freq ?? findTone(Array.from({ length: Math.min(samples.length, sampleRate) }, (_, i) => samples[i]), sampleRate)
  if (!f) return { text: '', wpm: null, dit: null, freq: null }
  const k = new Keyer(frameMs)
  const feed = () => { for (let i = 0; i + win <= samples.length; i += frame) k.push(goertzel(Array.prototype.slice.call(samples, i, i + win), sampleRate, f)) }
  feed(); k.restart(); feed() // first pass learns the noise floor and peak, so a signal that starts at once is not missed
  return { ...decodeTimings(k.finish()), freq: f }
}
