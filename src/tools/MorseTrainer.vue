<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref } from 'vue'
import ToolLayout from '../components/ToolLayout.vue'
import NumField from '../components/NumField.vue'
import ResultRow from '../components/ResultRow.vue'
import { state, storageOk } from '../core/store'
import { encode, schedule } from '../lib/morse'
import {
  activeMorseStreak, gradeCopy, guidedCopy, KOCH_ORDER, kochChars, nextMorseLesson,
  practiceDay, randomGroups, readyForNext, recordMorseRound, type MorseMode,
} from '../lib/trainer'

const mode = ref<MorseMode>('lesson')
const freeLesson = ref(2)
const charWpm = ref<number | null>(18), wpm = ref<number | null>(8), pitch = ref<number | null>(600)
const groups = ref<number | null>(10)
const today = ref(practiceDay())
const clock = window.setInterval(() => { today.value = practiceDay() }, 60_000)
const progress = computed(() => state.morse)
const lesson = computed(() => nextMorseLesson(progress.value))
const level = computed(() => mode.value === 'free' ? freeLesson.value : lesson.value)
const chars = computed(() => kochChars(level.value))
const introduction = computed(() => progress.value.mastered === KOCH_ORDER.length ? [] : chars.value.slice(level.value === 2 ? 0 : -1))
const streak = computed(() => activeMorseStreak(progress.value, today.value))
const dailyDone = computed(() => progress.value.dailyDay === today.value)
const words = ['HI', 'THE', 'TEST', 'SET', 'TIME', 'HOME', 'MIST', 'TONE', 'ANT', 'CQ', 'DE', '73', 'RST', '599', 'TNX', 'RIG', 'CALL', 'NAME', 'QTH', 'WATTS', 'BEAM', 'DIPOLE', 'RADIO', 'SIGNAL', 'NOISE']
const availableWords = computed(() => {
  const learned = kochChars(lesson.value)
  return words.filter(word => [...word].every(character => learned.includes(character)))
})

const modeInfo = {
  lesson: { title: 'Guided lesson', description: 'Hear the new sounds, then copy three short groups. Two rounds in a row at 90% unlock the next character.' },
  review: { title: 'Review missed characters', description: 'Copy a new mix that brings back the sounds you missed.' },
  daily: { title: 'Daily signal', description: 'Copy one round at 90% or better today to earn a daily clear and 20 bonus XP.' },
  sprint: { title: 'Speed sprint', description: 'Copy at 90% or better with the overall speed two words per minute faster.' },
  words: { title: 'On-air words', description: 'Listen for whole words and common radio abbreviations drawn from your current characters.' },
  free: { title: 'Free practice', description: 'Choose any character set and round length to practise at your own pace. Guided progress is recorded in the lessons and challenges.' },
} satisfies Record<MorseMode, { title: string; description: string }>
const challenges = computed(() => [
  { id: 'daily' as const, status: dailyDone.value ? 'Cleared today' : '90% accuracy · bonus XP', disabled: dailyDone.value },
  { id: 'sprint' as const, status: (wpm.value ?? 0) > 58 ? 'Set overall speed to 58 WPM or below' : '90% accuracy · +2 overall WPM', disabled: (wpm.value ?? 0) > 58 },
  { id: 'words' as const, status: availableWords.value.length >= 4 ? '90% accuracy · words and radio abbreviations' : 'Unlock more characters to play', disabled: availableWords.value.length < 4 },
])
const badges = computed(() => [
  { name: 'First copy', goal: 'Score your first round', earned: progress.value.rounds >= 1 },
  { name: 'Clean copy', goal: 'Score 100% in a round', earned: progress.value.perfectRounds >= 1 },
  { name: 'Warm ears', goal: 'Master the first seven characters', earned: progress.value.mastered >= 7 },
  { name: 'Alphabet', goal: 'Master all 26 letters', earned: progress.value.mastered >= 26 },
  { name: 'Full copy', goal: 'Master all 41 characters', earned: progress.value.mastered >= KOCH_ORDER.length },
  { name: 'Regular operator', goal: 'Score ten rounds', earned: progress.value.rounds >= 10 },
  { name: 'Daily operator', goal: 'Clear three daily signals', earned: progress.value.dailyWins >= 3 },
  { name: 'Quick copy', goal: 'Clear a speed sprint', earned: progress.value.sprintWins >= 1 },
  { name: 'On-air copy', goal: 'Clear an on-air words round', earned: progress.value.wordWins >= 1 },
])
const settings = computed(() => {
  if (charWpm.value == null || wpm.value == null || pitch.value == null || charWpm.value < wpm.value) return null
  return { charWpm: charWpm.value, wpm: wpm.value, pitch: pitch.value }
})
const speedError = computed(() => wpm.value != null && charWpm.value != null && charWpm.value < wpm.value)
const badGroupCount = computed(() => mode.value === 'free' && !Number.isInteger(groups.value))
const modeAvailable = computed(() => {
  if (mode.value === 'review') return progress.value.reviewChars.length > 0
  return !challenges.value.find(challenge => challenge.id === mode.value)?.disabled
})

interface Timing { charWpm: number; wpm: number; pitch: number }
interface Round extends Timing { text: string; mode: MorseMode; lesson: number }
const round = ref<Round | null>(null)
const typed = ref('')
const scored = ref<{ accuracy: number; missed: string[]; xp: number; advanced: boolean; won: boolean } | null>(null)
const ready = ref(false), playing = ref(false), audioError = ref('')
const title = ref<HTMLElement>()
const copyInput = ref<HTMLTextAreaElement>()
const practiceChars = computed(() => kochChars(round.value?.lesson ?? level.value))

let context: AudioContext | null = null
let oscillator: OscillatorNode | null = null, gain: GainNode | null = null
let timer = 0, playback = 0
function stop() {
  playback++
  clearTimeout(timer)
  if (oscillator) {
    try { oscillator.stop() } catch { /* The node can already be stopped. */ }
    oscillator.disconnect()
  }
  gain?.disconnect()
  oscillator = gain = null
  playing.value = false
}

async function play(text: string, timing: Timing, finished?: () => void) {
  stop()
  const token = playback
  playing.value = true
  audioError.value = ''
  try {
    const Audio = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Audio) throw new Error('Audio unavailable')
    const tones = schedule(encode(text).symbols, timing.wpm, timing.charWpm)
    context ??= new Audio()
    await context.resume()
    if (token !== playback) return
    gain = context.createGain()
    gain.gain.value = 0
    gain.connect(context.destination)
    oscillator = context.createOscillator()
    oscillator.frequency.value = timing.pitch
    oscillator.connect(gain)
    oscillator.start()
    let at = context.currentTime + 0.2
    for (const tone of tones) {
      const end = at + tone.ms / 1000
      if (tone.on) {
        gain.gain.setTargetAtTime(0.45, at, 0.003)
        gain.gain.setTargetAtTime(0, end, 0.003)
      }
      at = end
    }
    timer = window.setTimeout(() => { stop(); finished?.() }, (at - context.currentTime) * 1000 + 80)
  } catch {
    if (token === playback) {
      stop()
      audioError.value = 'Audio could not play. Check your device audio and try again.'
    }
  }
}

function clearRound() {
  stop()
  round.value = null
  typed.value = ''
  scored.value = null
  ready.value = false
  audioError.value = ''
}
function choose(next: MorseMode, focus = false) {
  if (next === mode.value) return
  clearRound()
  mode.value = next
  if (focus) title.value?.focus()
}
function hear(character: string) {
  if (settings.value) void play(character, settings.value)
}
function replay() {
  if (!round.value || scored.value) return
  ready.value = false
  void play(round.value.text, round.value, () => { ready.value = true })
}
function start() {
  today.value = practiceDay()
  if (!settings.value || !modeAvailable.value || badGroupCount.value || playing.value) return
  const current = mode.value
  let text: string
  if (current === 'free') text = randomGroups(chars.value, 5, groups.value!)
  else if (current === 'words') text = randomGroups(availableWords.value, 1, 4)
  else {
    const focus = current === 'review' ? progress.value.reviewChars
      : current === 'lesson' ? (level.value === 2 ? chars.value : Array(3).fill(chars.value.at(-1)!)) : []
    text = guidedCopy(chars.value, focus)
  }
  const speed = settings.value.wpm + (current === 'sprint' ? 2 : 0)
  clearRound()
  round.value = { text, mode: current, lesson: level.value, ...settings.value, wpm: speed, charWpm: Math.max(speed, settings.value.charWpm) }
  replay()
  void nextTick(() => copyInput.value?.focus())
}
function submit() {
  const current = round.value
  if (!current || !ready.value || playing.value || scored.value || !typed.value.trim()) return
  today.value = practiceDay()
  const result = gradeCopy(current.text, typed.value)
  const before = progress.value
  const after = recordMorseRound(before, { ...current, ...result }, today.value)
  state.morse = after
  scored.value = { ...result, xp: after.xp - before.xp, advanced: after.mastered > before.mastered, won: readyForNext(result.accuracy) }
}
onUnmounted(() => { clearInterval(clock); stop(); void context?.close().catch(() => {}) })
</script>

<template>
  <ToolLayout id="morse-trainer" :references="[
    'Matrix207, How to Learn Morse Code (2014), step 4: introduce simple sounds first.',
    'Long Island CW Club, The Koch Method (2022): progressive sound-first teaching and a roughly 90% threshold.',
    'ARRL, A Standard for Morse Timing Using the Farnsworth Technique: stretch the gaps between characters and words.',
    'Roediger and Karpicke (2006), Test-Enhanced Learning, doi:10.1111/j.1467-9280.2006.01693.x. Retrieval practice research with prose materials.',
    'Cepeda et al. (2006), Distributed Practice in Verbal Recall Tasks, doi:10.1037/0033-2909.132.3.354. General retention research.',
  ]">
    <div class="trainer-layout">
      <div class="stack">
        <section class="card stack training-round" aria-label="Morse practice round">
          <div class="seg" role="group" aria-label="Practice mode">
            <button :aria-pressed="mode === 'lesson'" @click="choose('lesson')">Lesson</button>
            <button :aria-pressed="mode === 'review'" :disabled="!progress.reviewChars.length && mode !== 'review'" @click="choose('review')">Review</button>
            <button :aria-pressed="mode === 'free'" @click="choose('free')">Free practice</button>
          </div>
          <div class="trainer-heading">
            <h2 ref="title" tabindex="-1">{{ modeInfo[mode].title }}</h2>
            <span class="speed-readout">{{ round?.wpm ?? wpm ?? '—' }} WPM overall</span>
          </div>
          <p>{{ modeInfo[mode].description }}</p>
          <p v-if="mode === 'lesson' && progress.mastered === KOCH_ORDER.length" class="hint">All 41 characters mastered. Keep copying here or try a challenge.</p>
          <div v-if="mode === 'lesson' && !round && introduction.length" class="trainer-intro">
            <p>Listen to each sound before your first copy round.</p>
            <div class="seg">
              <button v-for="character in introduction" :key="character" :disabled="!settings || playing" @click="hear(character)">Hear {{ character }}</button>
            </div>
          </div>
          <template v-if="mode === 'free'">
            <label class="field"><span class="lbl">Character set</span>
              <select v-model.number="freeLesson" @change="clearRound">
                <option v-for="n in KOCH_ORDER.length - 1" :key="n" :value="n + 1">{{ n + 1 }} characters, through {{ KOCH_ORDER[n] }}</option>
              </select>
            </label>
            <NumField v-model="groups" label="Groups of five" :min="1" :max="40" />
            <p v-if="badGroupCount && groups != null" class="err" role="alert">Enter a whole number of groups.</p>
          </template>
          <p v-if="mode === 'review'" class="hint">
            <template v-if="progress.reviewChars.length">Focus sounds <strong>{{ progress.reviewChars.join(' ') }}</strong></template>
            <template v-else>Review queue cleared. Return to your lesson or try a challenge.</template>
          </p>
          <p v-else class="hint">Practising <strong class="practice-characters">{{ practiceChars.join(' ') }}</strong></p>
          <div class="seg">
            <button class="primary" :disabled="!settings || !modeAvailable || badGroupCount || playing" @click="scored?.advanced ? clearRound() : start()">
              {{ scored?.advanced ? 'Continue lessons' : round ? 'New round' : 'Start round' }}
            </button>
            <button v-if="round && !scored" :disabled="playing" @click="replay">Replay round</button>
            <button v-if="playing" @click="stop">Stop audio</button>
          </div>
          <p v-if="!settings" class="hint">Check the speeds and tone under Practice settings.</p>
          <p v-if="audioError" class="err" role="alert">{{ audioError }}</p>
          <p v-if="playing" role="status" class="hint">Playing Morse audio…</p>
          <template v-if="round">
            <label class="field"><span class="lbl">What you copied</span>
              <textarea ref="copyInput" v-model="typed" rows="4" maxlength="400" autocapitalize="characters" spellcheck="false" :readonly="!!scored"
                placeholder="Type the characters you hear" @keydown.ctrl.enter.prevent="submit"></textarea>
            </label>
            <p class="hint">If you miss a character, keep listening. Spaces do not affect the score.</p>
            <button v-if="!scored" :disabled="!ready || playing || !typed.trim()" @click="submit">Check my copy</button>
          </template>
          <div v-if="scored && round" class="trainer-feedback" aria-live="polite">
            <ResultRow label="Copy accuracy" :value="scored.accuracy" unit="%" big />
            <p v-if="scored.xp">+{{ scored.xp }} XP</p>
            <p v-if="scored.advanced">{{ progress.mastered === KOCH_ORDER.length ? 'You mastered the full character set.' : 'Next character unlocked.' }}</p>
            <p v-else-if="round.mode === 'lesson' && progress.mastered < KOCH_ORDER.length">{{ progress.passes }} of 2 passing rounds for this lesson.</p>
            <p v-else-if="round.mode === 'daily' || round.mode === 'sprint' || round.mode === 'words'">{{ scored.won ? 'Challenge cleared.' : 'Try another round to reach 90%.' }}</p>
            <p>Sent <strong class="mono">{{ round.text }}</strong></p>
            <p v-if="scored.missed.length">Review <strong>{{ scored.missed.join(' ') }}</strong></p>
            <button v-if="scored.missed.length && progress.reviewChars.length && mode !== 'review' && mode !== 'free'" @click="choose('review')">Practise missed sounds</button>
          </div>
        </section>
        <details class="explain">
          <summary>Practice settings</summary>
          <div class="stack trainer-settings">
            <NumField v-model="charWpm" label="Character speed" unit="WPM" :min="5" :max="60" hint="Try 18 WPM to hear each character as a single rhythm." />
            <NumField v-model="wpm" label="Overall speed" unit="WPM" :min="3" :max="60" hint="Start with room to think. Raise this gradually as you copy comfortably." />
            <NumField v-model="pitch" label="Tone pitch" unit="Hz" :min="300" :max="1200" />
            <p v-if="speedError" class="err" role="alert">Character speed must be at least the overall speed.</p>
          </div>
        </details>
      </div>
      <div class="stack">
        <section class="card stack trainer-progress" aria-label="Morse progress">
          <h2>Your progress</h2>
          <div>
            <p><strong>{{ progress.mastered }} / {{ KOCH_ORDER.length }}</strong> characters mastered</p>
            <progress :value="progress.mastered" :max="KOCH_ORDER.length" aria-label="Characters mastered" />
          </div>
          <dl class="trainer-stats">
            <div><dt>XP</dt><dd>{{ progress.xp }}</dd></div>
            <div><dt>Day streak</dt><dd>{{ streak }}</dd></div>
            <div><dt>Rounds</dt><dd>{{ progress.rounds }}</dd></div>
          </dl>
          <p class="hint">Short practice on several days gives you chances to recall the sounds again. {{ storageOk ? 'Progress stays on this device.' : 'This browser can keep progress for this visit.' }}</p>
        </section>
        <section class="card stack trainer-challenges" aria-label="Morse challenges">
          <h2>Challenges</h2>
          <div v-for="challenge in challenges" :key="challenge.id" class="trainer-challenge">
            <button :disabled="challenge.disabled" :aria-pressed="mode === challenge.id" @click="choose(challenge.id, true)">{{ modeInfo[challenge.id].title }}</button>
            <p class="hint">{{ challenge.status }}</p>
          </div>
        </section>
        <section class="card stack trainer-badges" aria-label="Morse badges">
          <div class="trainer-heading">
            <h2>Badges</h2>
            <span class="muted">{{ badges.filter(badge => badge.earned).length }} / {{ badges.length }} earned</span>
          </div>
          <ul>
            <li v-for="badge in badges" :key="badge.name">
              <span class="badge-mark" :class="{ earned: badge.earned }" aria-hidden="true">{{ badge.earned ? '✓' : '○' }}</span>
              <div><strong>{{ badge.name }}</strong><p class="hint">{{ badge.earned ? 'Earned' : badge.goal }}</p></div>
            </li>
          </ul>
        </section>
      </div>
    </div>
    <template #explain>
      <p>Start with the contrasting sounds of E and T. Next come M and I, then other repeated sounds before mixed rhythms. The guided lessons use a Koch-style progression. Listen for the whole rhythm, copy it, then check your work. Farnsworth timing keeps that rhythm intact while giving you longer gaps between characters and words.</p>
      <p>The score counts character insertions, omissions and substitutions, ignoring spaces. Review revisits missed sounds, and the word challenge gives you practice hearing them in context. The daily challenge encourages practice on separate days. The character order, badge rules and two-round threshold are choices for this trainer.</p>
      <p>For the chart, a keying exercise or a decoder, open <RouterLink to="/tool/cw">CW Send, Decode &amp; Listen</RouterLink>.</p>
    </template>
  </ToolLayout>
</template>

<style scoped>
.trainer-layout { display:grid; grid-template-columns:minmax(0,1.35fr) minmax(280px,1fr); gap:1rem; align-items:start; }
.trainer-heading { display:flex; align-items:baseline; justify-content:space-between; flex-wrap:wrap; gap:.35rem 1rem; }
.trainer-heading h2,.trainer-progress h2,.trainer-challenges h2 { margin:0; }
.training-round p,.trainer-progress p,.trainer-challenge p,.trainer-badges li p { margin-block:0; }
.training-round .stack > p,.training-round > p,.trainer-progress > p { margin-top:1rem; }
.trainer-intro { border-inline-start:3px solid var(--accent); padding-inline-start:.75rem; }
.trainer-intro .seg { margin-top:.6rem; }
.trainer-intro button { min-width:5rem; }
.speed-readout,.practice-characters { font-family:var(--mono); }
.speed-readout { color:var(--muted); font-size:.85rem; }
.trainer-feedback { background:var(--panel2); border-radius:var(--radius); padding:.75rem; }
.trainer-feedback p,.trainer-feedback button { margin-top:.45rem; overflow-wrap:anywhere; }
.trainer-settings { padding-block:.65rem; }
.trainer-progress progress { display:block; width:100%; margin-top:.4rem; accent-color:var(--accent); }
.trainer-stats { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:.5rem; }
.trainer-stats dt { color:var(--muted); font-size:.85rem; }
.trainer-stats dd { margin:0; font:600 1.25rem var(--mono); overflow-wrap:anywhere; }
.trainer-challenge button { width:100%; text-align:left; }
.trainer-challenge p { margin-top:.25rem; }
.trainer-badges ul { list-style:none; padding:0; display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:.75rem; }
.trainer-badges li { display:flex; align-items:start; gap:.45rem; }
.badge-mark { display:grid; place-items:center; width:1.6rem; height:1.6rem; border:1.5px solid var(--line); border-radius:50%; flex:none; }
.badge-mark.earned { color:var(--accent-ink); background:var(--accent); border-color:var(--accent); }
@media (max-width:900px) { .trainer-layout { grid-template-columns:minmax(0,1fr); } }
</style>
