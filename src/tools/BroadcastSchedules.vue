<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import ToolLayout from '../components/ToolLayout.vue'
import { getPack, installedPacks, refreshPacks } from '../core/packs'
import { TIME_STATIONS, TIME_STATIONS_META } from '../data/timeStations'
import { BBC_META, BBC_SCHEDULE } from '../data/bbcSchedule'
import { ageDays, scheduleDateStatus, transmissionOnAirAt, type BroadcastEntry, type ScheduleValidity } from '../lib/packs'

const STALE_DAYS = 45
const source = ref('bundled:time')
const showAllNow = ref(false)
const mode = ref<'now' | 'all'>('now')
const q = ref(''), fromKhz = ref(''), toKhz = ref('')
const useNow = ref(true)
const manual = ref('1200'), manualDay = ref(1)
const clock = ref(new Date())
let timer = 0
onMounted(() => { void refreshPacks(); timer = window.setInterval(() => { clock.value = new Date() }, 15000) })
onUnmounted(() => clearInterval(timer))

const schedulePacks = computed(() => installedPacks.value.filter((p) => p.kind === 'broadcast-schedule'))
type Schedule = ScheduleValidity & { id: string; title: string; revision: string; source: string; entries: BroadcastEntry[]; error?: string }
const timeSchedule: Schedule = { id: 'bundled:time', title: 'Time & frequency stations (bundled)', ...TIME_STATIONS_META, entries: TIME_STATIONS }
const bbcSchedule: Schedule = { id: 'bbc:b26', ...BBC_META, entries: BBC_SCHEDULE }
const localSchedules = ref<Schedule[]>([])
const loadingLive = ref(false)
watch(schedulePacks, async (packs, _previous, onCleanup) => {
  let cancelled = false
  onCleanup(() => { cancelled = true })
  localSchedules.value = []
  loadingLive.value = packs.length > 0
  const loaded = await Promise.all(packs.map(async p => {
    try {
      const loaded = await getPack<{ entries: BroadcastEntry[] }>(p.id)
      if (!loaded) throw new Error('This schedule is no longer installed.')
      const { data, ...meta } = loaded
      return { ...meta, entries: data.entries }
    } catch (e) { return { ...p, entries: [], error: (e as Error).message } }
  }))
  if (!cancelled) { localSchedules.value = loaded; loadingLive.value = false }
}, { immediate: true })
const schedules = computed(() => [timeSchedule, bbcSchedule, ...localSchedules.value])
const selected = computed(() => schedules.value.find(s => s.id === source.value))
const entries = computed(() => selected.value?.entries ?? [])
const loading = computed(() => !selected.value && loadingLive.value)
const err = computed(() => selected.value?.error ?? (!selected.value && !loading.value ? 'This schedule is no longer installed. Choose another schedule.' : ''))

const pad = (n: number) => String(n).padStart(2, '0')
const isoDay = (d: Date) => (d.getUTCDay() === 0 ? 7 : d.getUTCDay())
const nowHhmm = computed(() => clock.value.getUTCHours() * 100 + clock.value.getUTCMinutes())
const hhmm = computed(() => (useNow.value ? nowHhmm.value : /^([01]\d|2[0-3])[0-5]\d$/.test(manual.value) ? +manual.value : null))
const day = computed(() => (useNow.value ? isoDay(clock.value) : manualDay.value))
const DAYS = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const timeErr = computed(() => (!useNow.value && hhmm.value === null ? 'Enter the time as four digits, 24-hour UTC, e.g. 0930.' : ''))

function filterEntries(list: BroadcastEntry[]) {
  const t = q.value.trim().toLowerCase(), lo = fromKhz.value ? Number(fromKhz.value) : null, hi = toKhz.value ? Number(toKhz.value) : null
  return list.filter((e) =>
    (!t || [e.station, e.language, e.country, e.target, e.note].join(' ').toLowerCase().includes(t)) &&
    (lo === null || Number.isNaN(lo) || e.freqKhz >= lo) && (hi === null || Number.isNaN(hi) || e.freqKhz <= hi),
  ).sort((a, b) => a.freqKhz - b.freqKhz || a.startUtc.localeCompare(b.startUtc))
}
const filteredEntries = computed(() => filterEntries(entries.value))
const dateStatus = computed(() => scheduleDateStatus(selected.value ?? {}, clock.value))
const dateRangeActive = computed(() => dateStatus.value === 'current')
const rows = computed(() => filteredEntries.value.filter(e => mode.value === 'all' || (dateRangeActive.value && hhmm.value !== null && transmissionOnAirAt(e, hhmm.value, day.value))))
const liveSchedules = computed(() => schedules.value.map(s => {
  const status = scheduleDateStatus(s, clock.value)
  const groups = new Map<string, { station: string; details: string; frequencies: Set<number> }>()
  for (const e of status === 'current' ? filterEntries(s.entries) : []) {
    if (!transmissionOnAirAt(e, nowHhmm.value, isoDay(clock.value))) continue
    const details = [e.country, e.language, e.target, e.note].filter(Boolean).join(' · ')
    const key = JSON.stringify([e.station, e.country, e.language, e.target, e.note])
    const group = groups.get(key) ?? { station: e.station, details, frequencies: new Set<number>() }
    group.frequencies.add(e.freqKhz)
    groups.set(key, group)
  }
  return { ...s, status, stale: s.id !== timeSchedule.id && ageDays(s.revision, clock.value) > STALE_DAYS,
    groups: [...groups.entries()].map(([key, g]) => ({ key, station: g.station, details: g.details, frequencies: [...g.frequencies].join(', ') })) }
}))
const LIMIT = 300
const age = computed(() => (selected.value ? ageDays(selected.value.revision, clock.value) : 0))
const t4 = (s: string) => `${s.slice(0, 2)}:${s.slice(2)}`
const dayText = (d: string) => (d === 'daily' ? 'daily' : [...d].map((x) => DAYS[+x].slice(0, 2)).join(' '))
</script>

<template>
  <ToolLayout id="broadcast-schedules" :references="[`${TIME_STATIONS_META.source} (bundled time stations, revision ${TIME_STATIONS_META.revision}).`, 'Programme schedules: whichever source the installed pack names.']">
    <div class="card stack">
      <label class="field"><span id="schedule-label" class="lbl">Schedule</span>
        <select v-model="source" aria-labelledby="schedule-label"><option :value="timeSchedule.id">{{ timeSchedule.title }}</option>
          <option :value="bbcSchedule.id">{{ BBC_META.title }} (bundled)</option>
          <option v-for="p in schedulePacks" :key="p.id" :value="p.id">{{ p.title }} (installed)</option></select></label>
      <div v-if="selected" class="notice" :style="age > STALE_DAYS && source !== timeSchedule.id ? 'border-left-color:var(--bad)' : ''" role="status">
        Data: {{ selected.source }} · revision <strong>{{ selected.revision }}</strong> ({{ age }} days old).
        <template v-if="source === timeSchedule.id"> {{ TIME_STATIONS_META.note }}</template>
        <template v-else-if="age > STALE_DAYS"> <strong>This schedule is more than {{ STALE_DAYS }} days old.</strong> Broadcasters change frequencies and times each season and often each month; look for a newer pack.</template>
      </div>
      <p v-if="selected?.validFrom" class="hint">Valid {{ selected.validFrom }} through {{ selected.validUntil }} inclusive, UTC.</p>
      <p v-if="source === bbcSchedule.id" class="hint">Revision is our transcription/review date. The BBC reference lists shortwave, medium wave and a DRM digital transmission. <a :href="BBC_META.sourceUrl" target="_blank" rel="noopener noreferrer">BBC source page</a> (opens the web only when clicked).</p>
      <p v-if="!dateRangeActive" class="notice" role="status">{{ dateStatus === 'expired' ? 'This schedule has expired.' : 'This schedule is not yet in effect.' }} Choose Everything to browse its reference rows.</p>
      <p v-if="source === timeSchedule.id && !schedulePacks.length" class="hint" style="margin:0">BBC's dated frequency schedule is also bundled. For other broadcasters, install a schedule pack in <router-link to="/settings">Settings &amp; content</router-link> — you can convert a text schedule file there.</p>
      <p v-if="err" class="err" role="alert">{{ err }}</p>
    </div>

    <section class="card now-section" aria-label="On the air now">
      <div class="now-heading"><h2>On the air now:</h2><time :datetime="clock.toISOString()" class="mono">{{ pad(clock.getUTCHours()) }}:{{ pad(clock.getUTCMinutes()) }} UTC · {{ DAYS[isoDay(clock)] }} · {{ clock.toISOString().slice(0, 10) }}</time></div>
      <p class="hint">All bundled schedules and installed broadcast packs · scheduled activity, not confirmed reception. Uses the device’s current UTC clock, even when browsing another time below. Station/frequency filters below apply here too. The Schedule dropdown controls only the detailed table.</p>
      <p v-if="loadingLive" role="status">Loading installed schedules… Bundled schedules remain available below.</p>
      <div v-for="s in liveSchedules" :key="s.id" class="live-source">
        <h3>{{ s.title }}</h3>
        <p class="hint">{{ s.source }} · revision {{ s.revision }}<template v-if="s.validFrom"> · Valid {{ s.validFrom }}–{{ s.validUntil }} inclusive, UTC</template></p>
        <p v-if="s.error" class="err" role="alert">Schedule unavailable: {{ s.error }}</p>
        <p v-else-if="s.status !== 'current'" class="notice">{{ s.status === 'expired' ? 'This schedule has expired.' : 'This schedule is not yet in effect.' }}</p>
        <template v-else>
        <p v-if="s.stale" class="notice">This schedule is more than {{ STALE_DAYS }} days old. Check for a newer pack before relying on these entries.</p>
        <p v-if="!s.groups.length" class="empty">Nothing is scheduled from this source at the current UTC time with these filters.</p>
        <ul class="now-grid">
          <li v-for="g in s.groups.slice(0, showAllNow ? LIMIT : 6)" :key="g.key">
            <strong>{{ g.station }}</strong><div class="mono now-frequencies">{{ g.frequencies }} kHz</div><p v-if="g.details" class="hint">{{ g.details }}</p>
          </li>
        </ul>
        <p v-if="s.groups.length > LIMIT && showAllNow" class="hint">Showing the first {{ LIMIT }} station groups from this source. Narrow the station or frequency filters to see others.</p>
        </template>
      </div>
      <button v-if="liveSchedules.some(s => s.groups.length > 6)" :aria-expanded="showAllNow" @click="showAllNow = !showAllNow">{{ showAllNow ? 'Show fewer stations' : 'Show more stations from all sources' }}</button>
    </section>

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
      <div class="card schedule-results" aria-live="polite">
        <p v-if="!dateRangeActive && mode === 'all'" class="notice">{{ dateStatus === 'expired' ? 'Archive' : 'Upcoming reference' }} · These rows are available for reference outside the schedule’s validity window.</p>
        <p v-if="loading" role="status">Loading the selected schedule…</p>
        <p v-else-if="!rows.length" class="empty" style="margin:0">{{ !dateRangeActive && mode === 'now' ? 'Time matching is available during this schedule’s validity window.' : entries.length ? 'Nothing matches. Try a wider frequency range, clear the search, or switch to “Everything”.' : 'This schedule has no rows loaded.' }}</p>
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
      <p>For schedules with a published validity window, the start and end dates apply to the entire UTC day. Outside that window, Everything retains labelled reference rows. Time matching uses the device’s current UTC date, including when you choose a manual time and weekday.</p>
      <p>Broadcast programme schedules change with the seasons (late March and late October) and many stations change monthly, so a schedule is only good for a while. That is why they are installed as <strong>dated packs</strong>: the app shows the pack’s revision date, warns when it is more than {{ STALE_DAYS }} days old, and never goes online to refresh itself. Download an updated schedule file whenever you are online, then convert and install it under Settings &amp; content.</p>
      <p>“On the air now” combines all bundled schedules and every installed broadcast pack using the device’s current UTC time. Each source has its own revision, validity dates and warnings. The dropdown selects the detailed table, where “On air at…” can use your chosen time and weekday. Transmissions include their start time and end just before their listed end time. Weekdays identify the UTC start day. A Sunday 23:00–01:00 transmission is still scheduled at 00:30 Monday. Equal start and end times represent an all-day row on its selected weekdays.</p>
      <p>Rows with unusual day patterns (“irr”, ranges) are treated as daily and say so in the details. A schedule match does not confirm reception, transmitter availability, seasonal validity, propagation or signal strength. No network requests or live receiver observations are used.</p>
    </template>
  </ToolLayout>
</template>

<style scoped>
.now-section { margin-top: 1rem; }
.now-heading { display: flex; align-items: baseline; flex-wrap: wrap; gap: .5rem 1rem; justify-content: space-between; }
.now-heading h2 { margin: 0; }
.now-heading time { font-size: .9rem; }
.now-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr)); gap: .75rem; list-style: none; margin: 1rem 0; padding: 0; }
.now-grid li { min-width: 0; border: 1px solid var(--line); border-radius: 8px; padding: .75rem; overflow-wrap: anywhere; }
.now-grid p { margin: .3rem 0 0; }
.now-frequencies { margin-top: .4rem; color: var(--accent); }
.live-source { border-top: 1px solid var(--line); margin-top: 1rem; padding-top: .5rem; }
</style>
