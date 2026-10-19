<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import ToolLayout from '../components/ToolLayout.vue'
import NumField from '../components/NumField.vue'
import ResultRow from '../components/ResultRow.vue'
import { encode, schedule } from '../lib/morse'
import { copyAccuracy, kochChars, randomGroups, readyForNext, KOCH_ORDER } from '../lib/trainer'

const lesson = ref(2), charWpm = ref<number | null>(20), wpm = ref<number | null>(12), pitch = ref<number | null>(600)
const groups = ref<number | null>(10)
const sent = ref(''), typed = ref(''), shown = ref(false), playing = ref(false), err = ref('')
const chars = computed(() => kochChars(lesson.value))
const speedErr = computed(() => (wpm.value && charWpm.value && charWpm.value < wpm.value ? 'Character speed must be at least the overall speed.' : ''))
const result = computed(() => (sent.value && typed.value.trim() ? copyAccuracy(sent.value, typed.value) : null))

let ctx: AudioContext | null = null, osc: OscillatorNode | null = null, timer = 0
function stop() { clearTimeout(timer); try { osc?.stop() } catch { /* already stopped */ } osc = null; playing.value = false }
async function start() {
  err.value = ''; shown.value = false; typed.value = ''
  if (speedErr.value || !wpm.value || !charWpm.value || !pitch.value || !groups.value) return
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) { err.value = 'This browser cannot play sound here.'; return }
  stop(); sent.value = randomGroups(chars.value, 5, groups.value)
  const tones = schedule(encode(sent.value).symbols, wpm.value, charWpm.value)
  ctx ??= new AC(); await ctx.resume()
  const g = ctx.createGain(); g.gain.value = 0; g.connect(ctx.destination)
  osc = ctx.createOscillator(); osc.frequency.value = pitch.value; osc.connect(g); osc.start()
  let t = ctx.currentTime + 0.4
  for (const x of tones) { if (x.on) { g.gain.setTargetAtTime(0.5, t, 0.003); g.gain.setTargetAtTime(0, t + x.ms / 1000, 0.003) } t += x.ms / 1000 }
  playing.value = true; timer = window.setTimeout(stop, (t - ctx.currentTime) * 1000 + 100)
}
onUnmounted(() => { stop(); void ctx?.close() })
</script>

<template>
  <ToolLayout id="morse-trainer" :references="['Koch method: Ludwig Koch, 1930s; G4FON Koch trainer character order. Farnsworth timing: characters at full speed, gaps stretched to the overall speed.', 'Rule of thumb: add the next character once you copy at least 90 % correctly.']">
    <div class="cols">
      <div class="card stack">
        <label class="field"><span class="lbl">Lesson (characters learned)</span>
          <select v-model.number="lesson"><option v-for="n in KOCH_ORDER.length - 1" :key="n" :value="n + 1">{{ n + 1 }} characters: new letter {{ KOCH_ORDER[n] }}</option></select></label>
        <p class="hint">Practising: <strong>{{ chars.join(' ') }}</strong></p>
        <NumField v-model="charWpm" label="Character speed" unit="WPM" :min="5" :max="60" hint="Keep this fast (15–20) even if you are a beginner: it trains you to hear whole characters." />
        <NumField v-model="wpm" label="Overall (effective) speed" unit="WPM" :min="3" :max="60" />
        <NumField v-model="pitch" label="Tone pitch" unit="Hz" :min="300" :max="1200" />
        <NumField v-model="groups" label="Groups of five" :min="1" :max="40" />
        <p v-if="speedErr" class="notice" role="status">{{ speedErr }}</p>
        <div style="display:flex;gap:.5rem;flex-wrap:wrap">
          <button @click="start" :disabled="!!speedErr">{{ playing ? 'Play a new set' : 'Play' }}</button>
          <button class="ghost" @click="stop" :disabled="!playing">Stop</button>
        </div>
        <p v-if="err" class="notice" role="status">{{ err }}</p>
      </div>
      <div class="stack">
        <div class="card stack">
          <label class="field"><span class="lbl">What you copied</span>
            <textarea v-model="typed" rows="6" autocapitalize="characters" spellcheck="false" placeholder="Type what you heard, a space between groups"></textarea></label>
          <button class="ghost" @click="shown = true" :disabled="!sent">Check my copy</button>
        </div>
        <div class="card results" v-if="shown && sent" aria-live="polite">
          <ResultRow label="Accuracy" :value="result" unit="%" big :note="result == null ? 'Type something first' : readyForNext(result) ? 'Good enough to add the next character' : 'Keep practising this lesson'" />
          <p class="mono">Sent: {{ sent }}</p><p class="mono">You typed: {{ typed.toUpperCase().trim() }}</p>
        </div>
        <p class="hint">Everything runs on this device. The text is random each time, so you learn the sounds, not the sequence.</p>
      </div>
    </div>
    <template #explain>
      <p>Koch training starts with just two characters sent fast, so you hear each as a rhythm instead of counting dits and dahs. You copy random groups until you reach about 90 %, then add one character. Farnsworth spacing keeps the characters fast but leaves longer gaps between them, so you have time to think. Accuracy is the number of single-character edits needed to turn your copy into what was sent.</p>
    </template>
  </ToolLayout>
</template>
