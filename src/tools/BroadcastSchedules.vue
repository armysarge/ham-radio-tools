<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import ToolLayout from '../components/ToolLayout.vue'
import { getPack, installedPacks, refreshPacks } from '../core/packs'
import { TIME_STATIONS, TIME_STATIONS_META } from '../data/timeStations'
import { ageDays, onAirAt, runsOnDay, type BroadcastEntry } from '../lib/packs'

const STALE_DAYS = 45
const source = ref('time')
const entries = ref<BroadcastEntry[]>(TIME_STATIONS)
const err = ref('')
const mode = ref<'now' | 'all'>('now')
const q = ref(''), fromKhz = ref(''), toKhz = ref('')
const useNow = ref(true)
const manual = ref('1200'), manualDay = ref(1)
const clock = ref(new Date())
let timer = 0
onMounted(() => { void refreshPacks(); timer = window.setInterval(() => { clock.value = new Date() }, 15000) })
onUnmounted(() => clearInterval(timer))

const schedulePacks = computed(() => installedPacks.value.filter((p) => p.kind === 'broadcast-schedule'))
const pack = computed(() => schedulePacks.value.find((p) => p.id === source.value))
watch(source, async (id) => {
  err.value = ''
  if (id === 'time') { entries.value = TIME_STATIONS; return }
  entries.value = []
  try { entries.value = (await getPack<{ entries: BroadcastEntry[] }>(id))?.data.entries ?? [] } catch (e) { err.value = (e as Error).message }
})

const pad = (n: number) => String(n).padStart(2, '0')
const isoDay = (d: Date) => (d.getUTCDay() === 0 ? 7 : d.getUTCDay())
const nowHhmm = computed(() => clock.value.getUTCHours() * 100 + clock.value.getUTCMinutes())
const hhmm = computed(() => (useNow.value ? nowHhmm.value : /^([01]\d|2[0-3])[0-5]\d$/.test(manual.value) ? +manual.value : null))
const day = computed(() => (useNow.value ? isoDay(clock.value) : manualDay.value))
const DAYS = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const timeErr = computed(() => (!useNow.value && hhmm.value === null ? 'Enter the time as four digits, 24-hour UTC, e.g. 0930.' : ''))

const rows = computed(() => {
  const t = q.value.trim().toLowerCase(), lo = fromKhz.value ? Number(fromKhz.value) : null, hi = toKhz.value ? Number(toKhz.value) : null
  return entries.value.filter((e) =>
    (mode.value === 'all' || (hhmm.value !== null && onAirAt(e.startUtc, e.endUtc, hhmm.value) && runsOnDay(e.days, day.value))) &&
    (!t || [e.station, e.language, e.country, e.target, e.note].join(' ').toLowerCase().includes(t)) &&
    (lo === null || Number.isNaN(lo) || e.freqKhz >= lo) && (hi === null || Number.isNaN(hi) || e.freqKhz <= hi),
  ).sort((a, b) => a.freqKhz - b.freqKhz || a.startUtc.localeCompare(b.startUtc))
})
const LIMIT = 300
const meta = computed(() => (source.value === 'time' ? { revision: TIME_STATIONS_META.revision, source: TIME_STATIONS_META.source } : pack.value ? { revision: pack.value.revision, source: pack.value.source } : null))
const age = computed(() => (meta.value ? ageDays(meta.value.revision) : 0))
const t4 = (s: string) => `${s.slice(0, 2)}:${s.slice(2)}`
const dayText = (d: string) => (d === 'daily' ? 'daily' : [...d].map((x) => DAYS[+x].slice(0, 2)).join(' '))
</script>

<template>
  <ToolLayout id="broadcast-schedules" :references="[`${TIME_STATIONS_META.source} (bundled time stations, revision ${TIME_STATIONS_META.revision}).`, 'Programme schedules: whichever source the installed pack names.']">
    <div class="card stack">
      <label class="field"><span class="lbl">Schedule</span>
        <select v-model="source"><option value="time">Time &amp; frequency stations (bundled)</option>
          <option v-for="p in schedulePacks" :key="p.id" :value="p.id">{{ p.title }} (installed)</option></select></label>
      <div v-if="meta" class="notice" :style="age > STALE_DAYS && source !== 'time' ? 'border-left-color:var(--bad)' : ''" role="status">
        Data: {{ meta.source }} · revision <strong>{{ meta.revision }}</strong> ({{ age }} days old).
        <template v-if="source === 'time'"> {{ TIME_STATIONS_META.note }}</template>
        <template v-else-if="age > STALE_DAYS"> <strong>This schedule is more than {{ STALE_DAYS }} days old.</strong> Broadcasters change frequencies and times each season and often each month; look for a newer pack.</template>
      </div>
      <p v-if="source === 'time' && !schedulePacks.length" class="hint" style="margin:0">Programme schedules (shortwave broadcasters, utility stations) change monthly, so none are bundled. Install a dated schedule pack in <router-link to="/settings">Settings &amp; content</router-link> — you can convert a text schedule file there.</p>
      <p v-if="err" class="err" role="alert">{{ err }}</p>
    </div>

    <div class="cols" style="margin-top:1rem">
      <div class="card stack">
        <div class="seg" role="group" aria-label="Show">
          <button :aria-pressed="mode === 'now'" @click="mode = 'now'">On air at…</button>
          <button :aria-pressed="mode === 'all'" @click="mode = 'all'">Everything</button>
        </div>
        <template v-if="mode === 'now'">
          <p style="margin:0" aria-live="polite"><strong class="mono" style="font-size:1.4rem">{{ useNow ? `${pad(clock.getUTCHours())}:${pad(clock.getUTCMinutes())}` : (manual.length === 4 ? manual.slice(0, 2) + ':' + manual.slice(2) : manual) }} UTC</strong> · {{ DAYS[day] }}</p>
          <label><input v-model="useNow" type="checkbox" /> Use the current time</label>
          <template v-if="!useNow">
            <label class="field"><span class="lbl">Time (UTC, HHMM)</span><input v-model="manual" type="text" class="mono" inputmode="numeric" maxlength="4" /></label>
            <label class="field"><span class="lbl">Day</span><select v-model.number="manualDay"><option v-for="d in 7" :key="d" :value="d">{{ DAYS[d] }}</option></select></label>
            <p v-if="timeErr" class="err" role="alert">{{ timeErr }}</p>
          </template>
          <p class="hint" style="margin:0">The clock comes from this device; make sure it is correct. UTC is shown whatever your local time zone is.</p>
        </template>
        <label class="field"><span class="lbl">Search station, language, country</span><input v-model="q" type="text" autocomplete="off" placeholder="e.g. WWV, English, Canada" /></label>
        <div class="cols" style="grid-template-columns:1fr 1fr">
          <label class="field"><span class="lbl">From (kHz)</span><input v-model="fromKhz" type="text" inputmode="decimal" placeholder="e.g. 5000" /></label>
          <label class="field"><span class="lbl">To (kHz)</span><input v-model="toKhz" type="text" inputmode="decimal" placeholder="e.g. 6000" /></label>
        </div>
      </div>
      <div class="card" aria-live="polite">
        <p v-if="!rows.length" class="empty" style="margin:0">{{ entries.length ? 'Nothing matches. Try a wider frequency range, clear the search, or switch to “Everything”.' : 'This schedule has no rows loaded.' }}</p>
        <template v-else>
          <p class="muted" style="margin-top:0">{{ rows.length }} {{ rows.length === 1 ? 'transmission' : 'transmissions' }}{{ rows.length > LIMIT ? ` (showing the first ${LIMIT}; narrow the search)` : '' }}</p>
          <div class="table-wrap"><table class="table">
            <thead><tr><th>kHz</th><th>UTC</th><th>Days</th><th>Station</th><th>Details</th></tr></thead>
            <tbody><tr v-for="(e, i) in rows.slice(0, LIMIT)" :key="i">
              <td class="mono">{{ e.freqKhz }}</td><td class="mono">{{ e.startUtc === e.endUtc ? 'all day' : `${t4(e.startUtc)}–${t4(e.endUtc)}` }}</td><td>{{ dayText(e.days) }}</td>
              <td>{{ e.station }}</td><td class="hint">{{ [e.country, e.language, e.target, e.note].filter(Boolean).join(' · ') }}</td></tr></tbody>
          </table></div>
        </template>
      </div>
    </div>

    <template #explain>
      <p>Broadcast programme schedules change with the seasons (late March and late October) and many stations change monthly, so a schedule is only good for a while. That is why they are installed as <strong>dated packs</strong>: the app shows the pack’s revision date, warns when it is more than {{ STALE_DAYS }} days old, and never goes online to refresh itself. Download an updated schedule file whenever you are online, then convert and install it under Settings &amp; content.</p>
      <p>“On air” compares the UTC time and weekday you choose with each row’s start and end (end exclusive, wrapping past midnight). Rows with unusual day patterns (“irr”, ranges) are treated as daily and say so in the details. Propagation and signal strength are not predicted.</p>
    </template>
  </ToolLayout>
</template>
