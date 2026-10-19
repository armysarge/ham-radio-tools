<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import ToolLayout from '../components/ToolLayout.vue'
import NumField from '../components/NumField.vue'
import { clockIn, formatHms, idRemainingMs, parseUtc } from '../lib/timers'

const now = ref(Date.now())
let tick = 0
onMounted(() => { tick = window.setInterval(() => { now.value = Date.now(); check() }, 1000) })
onUnmounted(() => { clearInterval(tick); void ctx?.close() })

const local = Intl.DateTimeFormat().resolvedOptions().timeZone
const zones = ref<string[]>(['Africa/Johannesburg', 'Europe/London', 'America/New_York'])
const newZone = ref(''), zoneErr = ref('')
const clocks = computed(() => [{ name: 'UTC', ...clockIn('UTC', now.value)! }, { name: `Local (${local})`, ...clockIn(local, now.value)! }, ...zones.value.map((z) => ({ name: z, ...clockIn(z, now.value)! }))])
function addZone() {
  zoneErr.value = ''; const z = newZone.value.trim()
  if (!clockIn(z, 0)) { zoneErr.value = `“${z}” is not a time zone name this browser knows. Use the form Region/City, e.g. Asia/Tokyo.`; return }
  if (!zones.value.includes(z)) zones.value.push(z); newZone.value = ''
}

// ---- ID reminder ----
const interval = ref<number | null>(10), lastId = ref<number | null>(null), flash = ref(false)
const remaining = computed(() => (lastId.value && interval.value ? idRemainingMs(lastId.value, interval.value, now.value) : null))
let ctx: AudioContext | null = null, beeped = false
function beep() {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    ctx ??= new AC(); const o = ctx.createOscillator(), g = ctx.createGain(); g.gain.value = 0.2; o.connect(g); g.connect(ctx.destination); o.frequency.value = 880; o.start(); o.stop(ctx.currentTime + 0.4)
  } catch { /* sound is optional */ }
}
function check() { if (remaining.value != null && remaining.value <= 0) { flash.value = true; if (!beeped) { beeped = true; beep() } } }
const identified = () => { lastId.value = Date.now(); flash.value = false; beeped = false }
const stopId = () => { lastId.value = null; flash.value = false; beeped = false }

// ---- countdown ----
const target = ref('')
const targetMs = computed(() => parseUtc(target.value))
const left = computed(() => (targetMs.value == null ? null : targetMs.value - now.value))
</script>

<template>
  <ToolLayout id="clock" :references="['UTC from your device’s clock: it is only as accurate as that clock is set, so check it against a time station if timing matters (see Broadcast Schedules).', 'Station identification: most licences require your call sign at the start, end and about every 10 minutes. Check the rule that applies to you.']">
    <div class="cols">
      <div class="stack">
        <div class="card stack">
          <div v-for="c in clocks" :key="c.name" class="result"><div>{{ c.name }}<div class="hint">{{ c.date }}</div></div><div><span class="val mono" :style="c.name === 'UTC' ? 'font-size:1.6rem' : ''">{{ c.time }}</span></div></div>
          <div style="display:flex;gap:.5rem;flex-wrap:wrap;align-items:end">
            <label class="field" style="flex:1;min-width:12rem"><span class="lbl">Add a time zone</span><input v-model="newZone" placeholder="e.g. Asia/Tokyo" @keyup.enter="addZone" /></label>
            <button class="ghost" @click="addZone">Add</button>
          </div>
          <p v-if="zoneErr" class="notice" role="status">{{ zoneErr }}</p>
        </div>
      </div>
      <div class="stack">
        <div class="card stack" :style="flash ? 'outline:3px solid var(--accent)' : ''">
          <h3>Station ID reminder</h3>
          <NumField v-model="interval" label="Remind me every" unit="minutes" :min="1" :max="60" />
          <p v-if="remaining != null" class="mono" style="font-size:1.4rem" aria-live="polite">{{ remaining <= 0 ? 'Time to identify now' : 'Next ID in ' + formatHms(remaining) }}</p>
          <p v-else class="hint">Press the button each time you give your call sign.</p>
          <div style="display:flex;gap:.5rem;flex-wrap:wrap"><button @click="identified">I just identified</button><button class="ghost" @click="stopId" :disabled="lastId == null">Stop</button></div>
          <p class="hint">Beeps once when due; keep this tab open. Browsers may silence sound until you have pressed a button on the page.</p>
        </div>
        <div class="card stack">
          <h3>Countdown (contest start or end, UTC)</h3>
          <label class="field"><span class="lbl">Date and time, in UTC</span><input type="datetime-local" v-model="target" /></label>
          <p v-if="target && targetMs == null" class="notice" role="status">That is not a valid date and time.</p>
          <p v-else-if="left != null" class="mono" style="font-size:1.4rem" aria-live="polite">{{ left <= 0 ? 'The time has passed' : formatHms(left) + ' to go' }}</p>
        </div>
      </div>
    </div>
    <template #explain>
      <p>The clocks use your device’s own clock and the time zone database built into your browser, so they work offline. The date and time boxes are treated as <strong>UTC</strong>, not your local time, because contests and nets are scheduled in UTC. Nothing here is sent anywhere.</p>
    </template>
  </ToolLayout>
</template>
