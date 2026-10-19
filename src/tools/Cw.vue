<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import ToolLayout from '../components/ToolLayout.vue'
import NumField from '../components/NumField.vue'
import { Keyer, MORSE, PROSIGNS, decodeSymbols, decodeTimings, encode, findTone, goertzel, renderWav, schedule, totalMs, type Tone } from '../lib/morse'
import { platform } from '../platform'

const tab = ref<'send' | 'decode' | 'listen' | 'table'>('send')
const TABS: ['send' | 'decode' | 'listen' | 'table', string][] = [['send', 'Send & play'], ['decode', 'Decode'], ['listen', 'Listen (microphone)'], ['table', 'Chart']]

// ---- send & play ----
const text = ref('CQ CQ DE W1AW K')
const wpm = ref<number | null>(18)
const charWpm = ref<number | null>(null) // blank = same as overall speed (no Farnsworth)
const freq = ref<number | null>(600)
const enc = computed(() => encode(text.value))
const speedErr = computed(() => (wpm.value && charWpm.value && charWpm.value < wpm.value ? 'Character speed must be at least the overall speed.' : ''))
const tones = computed<Tone[]>(() => { try { return wpm.value && !speedErr.value && enc.value.symbols ? schedule(enc.value.symbols, wpm.value, charWpm.value ?? wpm.value) : [] } catch { return [] } })
const seconds = computed(() => totalMs(tones.value) / 1000)

let ctx: AudioContext | null = null
const playing = ref(false)
let stopTimer = 0, osc: OscillatorNode | null = null
function stop() { clearTimeout(stopTimer); try { osc?.stop() } catch { /* already stopped */ } osc = null; playing.value = false }
async function play() {
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC || !tones.value.length || !freq.value) return
  stop(); ctx ??= new AC(); await ctx.resume()
  const g = ctx.createGain(); g.gain.value = 0; g.connect(ctx.destination)
  osc = ctx.createOscillator(); osc.frequency.value = freq.value; osc.connect(g); osc.start()
  let t = ctx.currentTime + 0.05
  for (const x of tones.value) { if (x.on) { g.gain.setTargetAtTime(0.5, t, 0.003); g.gain.setTargetAtTime(0, t + x.ms / 1000, 0.003) } t += x.ms / 1000 }
  playing.value = true
  stopTimer = window.setTimeout(stop, (t - ctx.currentTime) * 1000 + 100)
}
const download = () => freq.value && platform.saveFile('morse.wav', new Blob([renderWav(tones.value, freq.value) as BlobPart], { type: 'audio/wav' }))
onUnmounted(() => { stop(); stopListening(); void ctx?.close() })

// ---- decode typed / tapped ----
const typed = ref('-.-. --.- / -.. -..-')
const decodedTyped = computed(() => decodeSymbols(typed.value))
const taps = ref<Tone[]>([])
let lastEdge = 0, down = false
function tapDown() { const n = performance.now(); if (lastEdge && !down) taps.value.push({ on: false, ms: n - lastEdge }); lastEdge = n; down = true }
function tapUp() { if (!down) return; const n = performance.now(); taps.value.push({ on: true, ms: n - lastEdge }); lastEdge = n; down = false }
const tapped = computed(() => decodeTimings(taps.value))
const clearTaps = () => { taps.value = []; lastEdge = 0; down = false }

// ---- listen (microphone) ----
const listening = ref(false), micErr = ref(''), heard = ref(''), heardWpm = ref<number | null>(null), tonePitch = ref<number | null>(null), level = ref(0)
const lockHz = ref<number | null>(null)
let stream: MediaStream | null = null, actx: AudioContext | null = null, timer = 0
async function startListening() {
  micErr.value = ''
  if (!navigator.mediaDevices?.getUserMedia) { micErr.value = 'This browser cannot access a microphone here (it needs a secure page such as localhost or an installed app).'; return }
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } })
  } catch { micErr.value = 'Microphone access was refused or no microphone was found. Nothing is recorded or sent anywhere.'; return }
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  actx = new AC(); const an = actx.createAnalyser(); an.fftSize = 1024; actx.createMediaStreamSource(stream).connect(an)
  const buf = new Float32Array(an.fftSize), sr = actx.sampleRate
  const keyer = new Keyer(10); let last = performance.now(), found = 0, current: number | null = lockHz.value, ticks = 0
  listening.value = true; heard.value = ''; tonePitch.value = null
  timer = window.setInterval(() => {
    an.getFloatTimeDomainData(buf)
    const now = performance.now(), dt = now - last; last = now
    if (!current) { // looking for a steady tone between 300 and 1200 Hz
      const f = findTone(buf, sr); level.value = f ? 1 : 0
      found = f ? found + 1 : 0
      if (found > 8 && f) { current = f; tonePitch.value = f }
      return
    }
    const p = goertzel(buf, sr, current); level.value = Math.min(1, Math.sqrt(p) * 8)
    keyer.push(p, dt)
    if (keyer.events.length > 600) keyer.events.splice(0, keyer.events.length - 400)
    if (++ticks % 25 === 0) { const d = decodeTimings(keyer.finish()); heard.value = d.text; heardWpm.value = d.wpm }
  }, 10)
}
function stopListening() { clearInterval(timer); stream?.getTracks().forEach((t) => t.stop()); void actx?.close(); stream = actx = null; listening.value = false }

// ---- chart ----
const shown = (sym: string) => [...sym].map((c) => (c === '.' ? '• ' : c === '-' ? '▬ ' : c === '/' ? '⁄' : c)).join('').trim()
const glyph = (code: string) => [...code].map((c) => (c === '.' ? '•' : '▬')).join(' ')
const chart = [...Object.entries(MORSE), ...Object.entries(PROSIGNS).map(([k, v]) => [`<${k}>`, v] as [string, string])]
const q = ref('')
const chartRows = computed(() => chart.filter(([k, v]) => !q.value.trim() || k.toLowerCase().includes(q.value.trim().toLowerCase()) || v.includes(q.value.trim())))
</script>

<template>
  <ToolLayout id="cw" :references="['ITU-R M.1677-1, International Morse code.', 'PARIS timing standard and Farnsworth spacing: ARRL (unit = 1200/wpm ms; gap stretch = (60c − 37.2s)/(19cs) s).']">
    <div class="seg" role="tablist" aria-label="CW tools" style="margin-bottom:1rem">
      <button v-for="[k, t] in TABS" :key="k" role="tab" :aria-selected="tab === k" :aria-pressed="tab === k" @click="tab = k">{{ t }}</button>
    </div>

    <div v-if="tab === 'send'" class="cols">
      <div class="card stack">
        <label class="field"><span class="lbl">Text to send</span><textarea v-model="text" rows="3" style="width:100%;padding:.5rem;border:1.5px solid var(--line);border-radius:8px;background:var(--panel);color:inherit;font:inherit" aria-label="Text to send" /></label>
        <p v-if="enc.unknown.length" class="err" role="alert">Cannot be sent in Morse and was skipped: {{ enc.unknown.join(' ') }}</p>
        <p class="hint" style="margin:0">Prosigns go in angle brackets, e.g. &lt;AR&gt; &lt;SK&gt;.</p>
        <NumField v-model="wpm" label="Speed" unit="WPM" :min="1" :max="60" hint="PARIS standard: 20 WPM = a dit lasts 60 ms." />
        <NumField v-model="charWpm" label="Character speed (Farnsworth, optional)" unit="WPM" :min="1" :max="60" hint="Leave blank to use the same speed. Faster characters with longer gaps help learning." />
        <p v-if="speedErr" class="err" role="alert">{{ speedErr }}</p>
        <NumField v-model="freq" label="Tone pitch" unit="Hz" :min="200" :max="2000" />
      </div>
      <div class="stack">
        <div class="card stack">
          <div class="mono" style="font-size:1.4rem;line-height:1.8;word-break:break-word" aria-live="polite">{{ enc.symbols ? shown(enc.symbols) : '—' }}</div>
          <p class="muted" style="margin:0">{{ seconds ? `Takes ${seconds.toFixed(1)} s at this speed.` : 'Nothing to send yet.' }}</p>
          <div class="seg">
            <button class="primary" :disabled="!tones.length || playing" @click="play">▶ Play</button>
            <button :disabled="!playing" @click="stop">■ Stop</button>
            <button :disabled="!tones.length" @click="download">Download WAV</button>
          </div>
          <p class="hint" style="margin:0">Sound is generated on this device. Browsers only start audio after you press a button.</p>
        </div>
      </div>
    </div>

    <div v-else-if="tab === 'decode'" class="cols">
      <div class="card stack">
        <h2>From dots and dashes</h2>
        <label class="field"><span class="lbl">Type . and - (space between letters, / between words)</span>
          <input v-model="typed" type="text" class="mono" autocomplete="off" spellcheck="false" /></label>
        <p class="mono" style="font-size:1.6rem;margin:0" aria-live="polite">{{ decodedTyped || '—' }}</p>
      </div>
      <div class="card stack">
        <h2>Tap it out</h2>
        <p class="muted" style="margin:0">Hold the big button for a dit or dah. Speed is worked out from your own timing, so any steady rhythm works.</p>
        <button class="primary" style="min-height:96px;font-size:1.3rem;touch-action:none" @pointerdown.prevent="tapDown" @pointerup.prevent="tapUp" @pointerleave="tapUp" @keydown.space.prevent="tapDown" @keyup.space.prevent="tapUp">Hold to key</button>
        <p class="mono" style="font-size:1.4rem;margin:0" aria-live="polite">{{ tapped.text || '—' }} <span v-if="tapped.wpm" class="muted" style="font-size:.9rem">≈ {{ tapped.wpm }} WPM</span></p>
        <button @click="clearTaps">Clear</button>
      </div>
    </div>

    <div v-else-if="tab === 'listen'" class="stack">
      <div class="notice"><strong>Experimental.</strong> Listens through a microphone for one steady tone (300–1200 Hz) and decodes it. Works best on clean, steady CW at 8–30 WPM; fading, noise and hand-keyed irregular timing cause errors. Audio is analysed live on this device and is never recorded, stored or sent.</div>
      <div class="card stack">
        <NumField v-model="lockHz" label="Tone to listen for (optional)" unit="Hz" :min="200" :max="2000" hint="Leave blank to detect the pitch automatically." :disabled="listening" />
        <div class="seg">
          <button class="primary" :disabled="listening" @click="startListening">🎤 Start listening</button>
          <button :disabled="!listening" @click="stopListening">■ Stop</button>
        </div>
        <p v-if="micErr" class="err" role="alert">{{ micErr }}</p>
        <div v-if="listening" aria-live="polite">
          <p class="muted" style="margin:0">{{ tonePitch || lockHz ? `Locked on ${tonePitch ?? lockHz} Hz` : 'Waiting for a steady tone…' }} <span v-if="heardWpm">· ≈ {{ heardWpm }} WPM</span></p>
          <div style="height:10px;background:var(--panel2);border-radius:5px;margin:.4rem 0"><div :style="{ width: level * 100 + '%', height: '100%', background: 'var(--accent)', borderRadius: '5px' }" /></div>
          <p class="mono" style="font-size:1.4rem;margin:0;word-break:break-word">{{ heard || '…' }}</p>
        </div>
      </div>
    </div>

    <div v-else class="card stack">
      <label class="field"><span class="lbl">Filter</span><input v-model="q" type="text" placeholder="e.g. Q, 5, -..-" autocomplete="off" /></label>
      <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr))">
        <div v-for="[k, v] in chartRows" :key="k" class="card" style="padding:.5rem .8rem">
          <span class="mono" style="font-size:1.4rem;font-weight:700;color:var(--accent)">{{ k }}</span>
          <div class="mono" style="font-size:1.1rem">{{ glyph(v) }}</div>
        </div>
      </div>
      <p v-if="!chartRows.length" class="empty">No character matches “{{ q }}”.</p>
    </div>

    <template #explain>
      <div class="formula">dit = 1200 / WPM ms     dah = 3 dits     gap: 1 inside a letter, 3 between letters, 7 between words</div>
      <p>The word “PARIS” is exactly 50 units long, which defines words per minute. <strong>Farnsworth</strong> keeps each character at a faster speed but stretches the gaps so the overall speed drops: gap unit = (60c − 37.2s) / (19·c·s) seconds for character speed c and overall speed s.</p>
      <p><strong>Decoding</strong> works out the dit length from your own timing by splitting the key-down times into short and long groups, then the gaps into letter and word groups, so no speed has to be set. It copes with about ±15% timing wobble in tests; sloppy hand-keying, QSB and QRM will still cause errors. Microphone decoding is experimental. It uses the Goertzel algorithm (power at one frequency) with an adaptive threshold.</p>
    </template>
  </ToolLayout>
</template>
