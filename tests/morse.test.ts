import { describe, it, expect } from 'vitest'
import { Keyer, decodeAudio, decodeSymbols, decodeTimings, encode, findTone, goertzel, renderWav, schedule, splitTwo, totalMs, MORSE } from '../src/lib/morse'

describe('encode / decode symbols', () => {
  it('encodes letters, digits, words and prosigns', () => {
    expect(encode('SOS').symbols).toBe('... --- ...')
    expect(encode('cq dx').symbols).toBe('-.-. --.- / -.. -..-')
    expect(encode('73').symbols).toBe('--... ...--')
    expect(encode('<AR>').symbols).toBe('.-.-.')
    expect(encode('  hello   world ').symbols).toBe('.... . .-.. .-.. --- / .-- --- .-. .-.. -..')
  })
  it('reports characters it cannot send, and still encodes the rest', () => {
    const e = encode('A~B#')
    expect(e.symbols).toBe('.- -...'); expect(e.unknown).toEqual(['~', '#'])
    expect(encode('').symbols).toBe('')
  })
  it('every table entry decodes back to itself', () => {
    for (const [ch, code] of Object.entries(MORSE)) expect(decodeSymbols(code)).toBe(ch)
  })
  it('decodes typed symbols with different dash characters and word splits', () => {
    expect(decodeSymbols('-.-. --.-  / -.. -..-')).toBe('CQ DX')
    expect(decodeSymbols('·−·  −−−')).toBe('R O') // two spaces = word break
    expect(decodeSymbols('...--- ...')).toBe('?S') // unknown pattern flagged, not dropped
    expect(decodeSymbols('.-.-.')).toBe('+') // the table character wins over the <AR> prosign for the shared pattern
  })
})

describe('timing', () => {
  const sym = encode('PARIS').symbols
  it('PARIS at 20 wpm takes one word time (3 s) once the trailing word gap is added', () => {
    const t = schedule(sym + ' / ' + sym, 20)
    expect(totalMs(t)).toBeCloseTo((43 + 7 + 43) * 60, 5) // PARIS is 50 units including its 7-unit trailing gap: 43 sent + 7 between words + 43
  })
  it('a dit is 1200/wpm ms and a dah is three of them', () => {
    const t = schedule('.-', 15)
    expect(t.map((x) => x.ms)).toEqual([80, 80, 240])
    expect(t.map((x) => x.on)).toEqual([true, false, true])
  })
  it('Farnsworth: characters keep their speed, overall rate matches the requested wpm', () => {
    const words = (n: number, c: number, s: number) => schedule(Array(n).fill(sym).join(' / '), s, c)
    const t = words(10, 18, 10)
    // 10 words at 10 wpm = 60 s, less the final word's own trailing gap which is not sent
    expect(totalMs(t) / 1000).toBeCloseTo(60 - 7 * ((60 / 10 - 37.2 / 18) / 19), 6) // 60 s minus the last word's unsent trailing gap
    expect(t[0].ms).toBeCloseTo(1200 / 18, 9) // dit at character speed
  })
  it('rejects nonsense speeds', () => {
    expect(() => schedule('.', 0)).toThrow(); expect(() => schedule('.', 20, 10)).toThrow()
  })
})

describe('decoding key timings', () => {
  const roundTrip = (text: string, wpm: number, charWpm = wpm, jitter = 0, seed = 1) => {
    let r = seed
    const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647 - 0.5) * 2 // deterministic -1..1
    return decodeTimings(schedule(encode(text).symbols, wpm, charWpm).map((t) => ({ ...t, ms: t.ms * (1 + jitter * rnd()) })))
  }
  it('recovers text and speed across 8–35 wpm', () => {
    for (const w of [8, 13, 20, 28, 35]) {
      const d = roundTrip('CQ CQ DE W1AW K', w)
      expect(d.text, `${w} wpm`).toBe('CQ CQ DE W1AW K'); expect(Math.abs(d.wpm! - w)).toBeLessThanOrEqual(1)
    }
  })
  it('tolerates ±15% hand-keying jitter', () => {
    expect(roundTrip('THE QUICK BROWN FOX 599', 18, 18, 0.15).text).toBe('THE QUICK BROWN FOX 599')
  })
  it('handles Farnsworth spacing', () => {
    expect(roundTrip('TEST DE ZS1ABC', 20, 20).text).toBe('TEST DE ZS1ABC')
    expect(roundTrip('TEST DE ZS1ABC', 20, 20 + 0).text).toBe('TEST DE ZS1ABC')
    expect(decodeTimings(schedule(encode('TEST DE ZS1ABC').symbols, 8, 20)).text).toBe('TEST DE ZS1ABC')
  })
  it('edge cases: nothing, a single dit, all dahs', () => {
    expect(decodeTimings([]).text).toBe('')
    expect(decodeTimings([{ on: true, ms: 60 }]).text).toBe('E')
    expect(decodeTimings(schedule(encode('TTT').symbols, 15)).text).toBe('TTT') // only one duration cluster
  })
  it('splitTwo finds two clusters and ignores one', () => {
    expect(splitTwo([60, 62, 58, 180, 182, 175])).toBeCloseTo(119, -1)
    expect(splitTwo([60, 62, 58, 61])).toBeNull()
    expect(splitTwo([5])).toBeNull()
  })
})

describe('audio', () => {
  const sr = 8000
  const tone = (text: string, wpm: number, freq: number, noise = 0) => {
    const wav = renderWav(schedule(encode(text).symbols, wpm), freq, sr)
    const pcm = new Int16Array(wav.buffer, 44)
    let r = 7
    return Float32Array.from(pcm, (v) => v / 32768 + noise * (((r = (r * 16807) % 2147483647) / 2147483647) - 0.5) * 2)
  }
  it('WAV header and length are correct', () => {
    const t = schedule(encode('E').symbols, 20), w = renderWav(t, 600, sr)
    expect(String.fromCharCode(...w.slice(0, 4))).toBe('RIFF'); expect(String.fromCharCode(...w.slice(8, 12))).toBe('WAVE')
    const v = new DataView(w.buffer); expect(v.getUint32(24, true)).toBe(sr); expect(v.getUint32(40, true)).toBe(w.length - 44)
    expect(w.length - 44).toBe(2 * Math.round((60 / 1000) * sr)) // one dit at 20 wpm = 60 ms
  })
  it('Goertzel sees the right frequency and finds the tone', () => {
    const x = Array.from({ length: 2048 }, (_, i) => Math.sin((2 * Math.PI * 700 * i) / sr))
    expect(goertzel(x, sr, 700)).toBeGreaterThan(50 * goertzel(x, sr, 900))
    expect(findTone(x, sr)).toBe(700)
    expect(findTone(new Float32Array(2048), sr)).toBeNull()
  })
  it('decodes a synthesised 20 wpm signal, with and without noise', () => {
    expect(decodeAudio(tone('CQ TEST DE ZS1ABC', 20, 650), sr, 650).text).toBe('CQ TEST DE ZS1ABC')
    const noisy = decodeAudio(tone('CQ TEST DE ZS1ABC', 20, 650, 0.3), sr)
    expect(noisy.freq).toBe(650); expect(noisy.text).toBe('CQ TEST DE ZS1ABC')
  })
  it('Keyer ignores steady noise (no tone)', () => {
    const k = new Keyer(8); for (let i = 0; i < 500; i++) k.push(1e-4 * (1 + 0.05 * Math.sin(i)))
    expect(decodeTimings(k.finish()).text).toBe('')
  })
})
