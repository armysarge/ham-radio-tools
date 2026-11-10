<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ToolLayout from '../components/ToolLayout.vue'
import NumField from '../components/NumField.vue'
import ResultRow from '../components/ResultRow.vue'
import { dopplerFrequencies, look, parseTle, passes, periodMin, tleEpoch, trackPass } from '../lib/sat'
import { FREQ_UNITS } from '../lib/units'
import { SAT_FREQUENCIES, SAT_FREQ_META, centreHz, satFrequencyAgeDays } from '../data/satelliteFrequencies'
import { state, station } from '../core/store'
import { CELESTRAK_INTERVAL_MS, describeMerge, elementAgeDays, formatTle, mergeElements, MAX_FILE_BYTES, parseElementFile } from '../lib/elements'

const SAMPLE = `ISS (ZARYA)\n1 25544U 98067A   08264.51782528 -.00002182  00000-0 -11606-4 0  2927\n2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.72125391563537`
const text = ref('')
const canUpdate = typeof window !== 'undefined' && !!window.hrtDesktop?.fetchElements
const libFilter = ref(''), libSelected = ref(''), libMessage = ref(''), libError = ref(''), libBusy = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const library = computed(() => {
  const q = libFilter.value.trim().toLowerCase()
  return state.elements.filter((e) => !q || e.name.toLowerCase().includes(q) || String(e.norad).includes(q))
})
const ageText = (e: { epoch: string; norad: number; name: string; line1: string; line2: string; saved: string }) => {
  const d = Math.round(elementAgeDays(e, new Date()))
  return d <= 0 ? 'today' : `${d} day${d === 1 ? '' : 's'} old`
}
const fetchedAgeDays = computed(() => (state.elementsFetched ? Math.floor((Date.now() - Date.parse(state.elementsFetched)) / 86400000) : null))
function chooseSaved() {
  const e = state.elements.find((x) => String(x.norad) === libSelected.value)
  if (e) text.value = formatTle(e)
}
function applyMerge(sets: Parameters<typeof mergeElements>[1], rejected: number, prefix: string) {
  const { next, report } = mergeElements(state.elements, sets)
  state.elements = next
  libMessage.value = `${prefix}${describeMerge(report, rejected)}`
  if (libSelected.value) chooseSaved()
}
function saveCurrent() {
  libError.value = ''
  if (parsed.value.tle) applyMerge([parsed.value.tle], 0, 'Saved: ')
}
async function importFile(ev: Event) {
  const input = ev.target as HTMLInputElement, file = input.files?.[0]
  libError.value = ''; libMessage.value = ''
  if (!file) return
  try {
    if (file.size > MAX_FILE_BYTES) throw new Error('This file is larger than 2 MB, so it is probably not an element-set file.')
    const { sets, rejected } = parseElementFile(await file.text())
    if (!sets.length) throw new Error(rejected ? `No usable element sets: ${rejected} were damaged or incomplete.` : 'No element sets found. A file has two lines per satellite, starting “1 ” and “2 ”, with an optional name line above.')
    applyMerge(sets, rejected, `Imported ${file.name}: `)
  } catch (e) { libError.value = (e as Error).message } finally { input.value = '' }
}
async function updateFromCelestrak() {
  libError.value = ''; libMessage.value = ''
  const last = state.elementsFetched ? Date.parse(state.elementsFetched) : 0
  if (Date.now() - last < CELESTRAK_INTERVAL_MS) { libMessage.value = 'Your saved sets were downloaded less than 2 hours ago. CelesTrak refreshes every 2 hours, so there is nothing newer yet.'; return }
  libBusy.value = true
  try {
    const r = await window.hrtDesktop!.fetchElements!()
    if (r.error || !r.text) throw new Error(r.error || 'No data was returned.')
    const { sets, rejected } = parseElementFile(r.text)
    if (!sets.length) throw new Error('The download contained no usable element sets, so nothing was saved.')
    state.elementsFetched = r.retrievedAt ?? new Date().toISOString()
    applyMerge(sets, rejected, 'Updated from CelesTrak: ')
  } catch (e) { libError.value = (e as Error).message } finally { libBusy.value = false }
}
function removeSelected() {
  state.elements = state.elements.filter((e) => String(e.norad) !== libSelected.value)
  libSelected.value = ''; libMessage.value = 'Removed from the saved sets.'
}
const st = station()
const lat = ref<number | null>(st?.lat ?? -25.75), lon = ref<number | null>(st?.lon ?? 28.2), alt = ref<number | null>(0)
const start = ref(new Date().toISOString().slice(0, 16)), hours = ref<number | null>(24), minEl = ref<number | null>(10)

const parsed = computed(() => {
  if (!text.value.trim()) return { tle: null, err: '' }
  try { return { tle: parseTle(text.value), err: '' } } catch (e) { return { tle: null, err: (e as Error).message } }
})
const from = computed(() => { const d = new Date(start.value + ':00Z'); return Number.isNaN(d.getTime()) ? null : d })
const obs = computed(() => (lat.value != null && lon.value != null && Math.abs(lat.value) <= 90 && Math.abs(lon.value) <= 180 ? { latDeg: lat.value, lonDeg: lon.value, altKm: (alt.value ?? 0) / 1000 } : null))
const age = computed(() => (parsed.value.tle && from.value ? (from.value.getTime() - tleEpoch(parsed.value.tle).getTime()) / 86400000 : null))
const downlink = ref<number | null>(null), uplink = ref<number | null>(null)
const preset = ref(''), linkId = ref('')
const entry = computed(() => SAT_FREQUENCIES.find((e) => String(e.norad) === preset.value))
const link = computed(() => entry.value?.links.find((l) => l.id === linkId.value))
function applyLink() {
  const l = link.value
  if (!l) return
  downlink.value = centreHz(l.downHz)
  uplink.value = l.upHz ? centreHz(l.upHz) : null
}
function choosePreset() { linkId.value = entry.value?.links[0].id ?? ''; applyLink() }
const catalogue = computed(() => (parsed.value.tle ? Number(parsed.value.tle.line1.slice(2, 7)) : null))
const listed = computed(() => SAT_FREQUENCIES.find((e) => e.norad === catalogue.value))
const operatorPages: Partial<Record<number, { label: string; url: string }>> = {
  25544: { label: 'ARISS station status and outages (ISS)', url: 'https://www.ariss.org/current-status-of-iss-stations.html' },
  24278: { label: 'JARL activation schedule (FO-29)', url: 'https://www.jarl.org/Japanese/3_Fuji/fuji3-202210.htm' },
}
const operatorPage = computed(() => operatorPages[entry.value?.norad ?? catalogue.value ?? 0])
const dataAge = computed(() => satFrequencyAgeDays(new Date()))
const mhzText = (r: [number, number]) => (r[0] === r[1] ? `${r[0] / 1e6}` : `${r[0] / 1e6}–${r[1] / 1e6}`)
const stepSec = ref(30)
const selected = ref(0)
const STALE_DAYS = 60
const stale = computed(() => age.value != null && Math.abs(age.value) > STALE_DAYS)
const result = computed(() => {
  const t = parsed.value.tle
  if (!t || stale.value || !from.value || !obs.value || !hours.value || minEl.value == null) return { list: [], err: '' }
  try { return { list: passes(t, obs.value, from.value, hours.value, minEl.value), err: '' } } catch (e) { return { list: [], err: (e as Error).message } }
})
watch(() => result.value.list, () => { selected.value = 0 })
const track = computed(() => {
  const t = parsed.value.tle, p = result.value.list[selected.value]
  if (!t || !p || !obs.value || downlink.value == null) return { rows: [], err: '' }
  try {
    return { rows: trackPass(t, obs.value, p, stepSec.value).map((pt) => ({ pt, f: dopplerFrequencies(downlink.value!, uplink.value, pt.rangeRateMps) })), err: '' }
  } catch (e) { return { rows: [], err: (e as Error).message } }
})
const mhz = (hz: number) => (hz / 1e6).toFixed(6)
const khz = (hz: number) => `${hz > 0 ? '+' : hz < 0 ? '−' : ''}${(Math.abs(hz) / 1000).toFixed(2)}`
const now = computed(() => (parsed.value.tle && !stale.value && obs.value && from.value ? look(parsed.value.tle, obs.value, from.value) : null))
const t = (d: Date) => d.toISOString().slice(5, 16).replace('T', ' ')
const dur = (a: Date, b: Date) => { const s = Math.round((b.getTime() - a.getTime()) / 1000); return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s` }
const compass = (az: number) => ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'][Math.round(az / 22.5) % 16]
</script>

<template>
  <ToolLayout id="satellite-passes" :references="['SGP4/SDP4 orbit propagation (Hoots &amp; Roehrich, Spacetrack Report No. 3; Vallado et al. 2006), via the satellite.js library (MIT), bundled with this app.', 'Element sets (TLEs) are published by CelesTrak, AMSAT and Space-Track. Paste or import a file, or request a CelesTrak update in the desktop app.', `Satellite frequencies: ${SAT_FREQ_META.source}, Libre Space Foundation, ${SAT_FREQ_META.sourceUrl}, licensed ${SAT_FREQ_META.license} (${SAT_FREQ_META.licenseUrl}). Snapshot retrieved ${SAT_FREQ_META.retrieved}.`]">
    <div class="cols">
      <div class="stack">
        <div class="card stack">
          <h3>Saved element sets</h3>
          <p class="hint">{{ state.elements.length ? `${state.elements.length} saved on this device and available offline.` : 'None saved yet. Save the set you paste, or import a file of sets.' }}<span v-if="state.elementsFetched"> Last downloaded from CelesTrak {{ new Date(state.elementsFetched).toISOString().slice(0, 16).replace('T', ' ') }} UTC.</span></p>
          <label v-if="state.elements.length > 12" class="field"><span class="lbl">Filter saved sets</span><input type="text" v-model="libFilter" placeholder="Name or catalogue number" /></label>
          <label v-if="state.elements.length" class="field"><span class="lbl">Saved element set</span>
            <select v-model="libSelected" @change="chooseSaved"><option value="">Choose a saved set…</option><option v-for="e in library" :key="e.norad" :value="String(e.norad)">{{ e.name }} (#{{ e.norad }}) · {{ ageText(e) }}</option></select></label>
          <div class="row" role="group" aria-label="Saved element set actions">
            <button class="ghost" :disabled="!parsed.tle" @click="saveCurrent">Save pasted set</button>
            <button class="ghost" @click="fileInput?.click()">Import file…</button>
            <button v-if="canUpdate" class="ghost" :disabled="libBusy" @click="updateFromCelestrak">{{ libBusy ? 'Updating…' : 'Update from CelesTrak' }}</button>
            <button class="ghost" :disabled="!libSelected" @click="removeSelected">Remove selected</button>
          </div>
          <input ref="fileInput" type="file" accept=".txt,.tle,.3le,text/plain" hidden aria-label="Import element-set file" @change="importFile" />
          <p v-if="libMessage" class="hint" role="status">{{ libMessage }}</p>
          <p v-if="libError" class="notice" role="alert">{{ libError }}</p>
          <p v-if="canUpdate && fetchedAgeDays != null && fetchedAgeDays > 7" class="notice" role="status">Your saved sets were last downloaded {{ fetchedAgeDays }} days ago. Update them before relying on passes.</p>
          <p v-if="!canUpdate" class="hint">To refresh, download a current amateur-satellite element file (for example from CelesTrak or AMSAT) and import it. Updating from CelesTrak with one click is available in the desktop app.</p>
          <p v-else class="hint">Update asks CelesTrak only when you press it, at most once every 2 hours. Imported files work too.</p>
        </div>
        <div class="card stack">
          <label class="field"><span class="lbl">Element set (TLE)</span>
            <textarea v-model="text" rows="5" spellcheck="false" placeholder="Paste the two TLE lines, with the name line above if you like"></textarea></label>
          <button class="ghost" @click="text = SAMPLE; start = '2008-09-20T12:30'; downlink = 145.8e6">Insert an old ISS sample</button>
          <p v-if="parsed.err" class="notice" role="status">{{ parsed.err }}</p>
          <p v-else-if="parsed.tle" class="hint">{{ parsed.tle.name }}: orbit {{ periodMin(parsed.tle).toFixed(1) }} min, element set from {{ tleEpoch(parsed.tle).toISOString().slice(0, 10) }}.</p>
          <p v-if="age != null && Math.abs(age) > 30 && !stale" class="notice" role="status">These elements are {{ Math.abs(Math.round(age)) }} days from the start time. Accuracy falls off after a few days for low orbits: get a fresh set, or expect passes to be minutes out.</p>
          <p v-if="stale" class="notice" role="status">These elements are {{ Math.abs(Math.round(age!)) }} days from the start time, too far for a meaningful prediction (limit {{ STALE_DAYS }} days). Paste a current element set, or set the start time near the epoch.</p>
        </div>
        <div class="card stack">
          <NumField v-model="lat" label="Your latitude" unit="°" :min="-90" :max="90" hint="North positive." />
          <NumField v-model="lon" label="Your longitude" unit="°" :min="-180" :max="180" hint="East positive." />
          <NumField v-model="alt" label="Height above sea level" unit="m" />
          <label class="field"><span class="lbl">Start (UTC)</span><input type="datetime-local" v-model="start" /></label>
          <NumField v-model="hours" label="Search ahead" unit="hours" :min="1" :max="240" />
          <NumField v-model="minEl" label="Minimum elevation" unit="°" :min="0" :max="80" hint="10° or more ignores passes that skim the horizon." />
        </div>
      </div>
      <div class="stack">
        <div class="card results" v-if="now" aria-live="polite">
          <ResultRow label="At the start time: elevation" :value="now.elDeg" unit="°" :note="now.elDeg < 0 ? 'below your horizon' : 'above your horizon'" />
          <ResultRow label="Azimuth" :value="now.azDeg" unit="°" :note="compass(now.azDeg)" />
          <ResultRow label="Range" :value="now.rangeKm" unit="km" />
        </div>
        <div class="card stack">
          <label class="field"><span class="lbl">Bundled frequency list</span>
            <select v-model="preset" @change="choosePreset"><option value="">Enter frequencies myself</option><option v-for="e in SAT_FREQUENCIES" :key="e.norad" :value="String(e.norad)">{{ e.name }}</option></select></label>
          <p v-if="listed && !preset" class="hint">{{ listed.name }} is in the list below: choose it to fill in the frequencies.</p>
          <label v-if="entry && entry.links.length > 1" class="field"><span class="lbl">Link</span>
            <select v-model="linkId" @change="applyLink"><option v-for="l in entry.links" :key="l.id" :value="l.id">{{ l.label }}</option></select></label>
          <template v-if="link">
            <p class="hint">{{ link.label }}: downlink {{ mhzText(link.downHz) }} MHz<span v-if="link.upHz">, uplink {{ mhzText(link.upHz) }} MHz</span>, {{ link.mode }}. <span v-if="link.linear">Linear transponder: the centre of the passband is used; adjust the frequencies to where you actually operate.</span> <span v-if="link.note">{{ link.note }}</span></p>
          </template>
          <p class="hint">Frequency source <a :href="SAT_FREQ_META.sourceUrl" target="_blank" rel="noopener noreferrer">{{ SAT_FREQ_META.source }}</a> (<a :href="SAT_FREQ_META.licenseUrl" target="_blank" rel="noopener noreferrer">{{ SAT_FREQ_META.license }}</a>), retrieved {{ SAT_FREQ_META.retrieved }} ({{ dataAge }} days old).</p>
          <p v-if="dataAge > SAT_FREQ_META.reviewEveryDays" class="notice" role="status">This frequency list is {{ dataAge }} days old (reviewed every {{ SAT_FREQ_META.reviewEveryDays }} days). Confirm frequencies and modes with the operator before using an old preset.</p>
          <p class="hint"><strong>Transponder activity.</strong> Current activity is unknown in this app. Check recent reports for the satellite and mode before transmitting. Reports may be missing or conflicting, and schedules can change.</p>
          <div class="row">
            <a href="https://status.amsat.org/" target="_blank" rel="noopener noreferrer">AMSAT OSCAR Satellite Status (online)</a>
            <a v-if="operatorPage" :href="operatorPage.url" target="_blank" rel="noopener noreferrer">{{ operatorPage.label }} (online)</a>
          </div>
          <NumField v-model="downlink" label="Satellite downlink frequency" :units="FREQ_UNITS" unit="MHz" :min="0" minExclusive hint="Optional. The nominal frequency the satellite transmits, to see Doppler along a pass." />
          <NumField v-model="uplink" label="Satellite uplink frequency" :units="FREQ_UNITS" unit="MHz" :min="0" minExclusive hint="Optional. The nominal frequency the satellite listens on." />
          <p class="hint">Confirm the satellite’s frequencies and modes with the operator before transmitting.</p>
        </div>
        <div class="card">
          <p v-if="result.err" class="notice" role="status">{{ result.err }}</p>
          <div v-else-if="result.list.length" class="table-wrap">
            <table class="table"><thead><tr><th>Rise (UTC)</th><th>Length</th><th>Peak</th><th>Path</th><th v-if="downlink != null"></th></tr></thead>
              <tbody><tr v-for="(p, i) in result.list" :key="p.aos.getTime()" :aria-current="downlink != null && i === selected ? 'true' : undefined"><td style="white-space:nowrap">{{ t(p.aos) }}</td><td style="white-space:nowrap">{{ dur(p.aos, p.los) }}</td><td style="white-space:nowrap">{{ p.maxElDeg.toFixed(0) }}° at {{ t(p.tca).slice(6) }}</td><td style="white-space:nowrap">{{ compass(p.aosAzDeg) }} → {{ compass(p.losAzDeg) }}</td><td v-if="downlink != null"><button class="ghost" :aria-pressed="i === selected" :aria-label="`Show Doppler for the pass rising ${t(p.aos)}`" @click="selected = i">Doppler</button></td></tr></tbody></table>
          </div>
          <p v-else-if="parsed.tle" class="hint">No passes above {{ minEl }}° in that time.</p>
          <p v-else class="hint">Paste an element set to see passes.</p>
        </div>
        <div v-if="track.rows.length" class="card stack">
          <h3>Doppler for the selected pass</h3>
          <label class="field"><span class="lbl">Table step</span>
            <select v-model.number="stepSec"><option :value="10">10 s</option><option :value="30">30 s</option><option :value="60">60 s</option></select></label>
          <div class="table-wrap">
            <table class="table"><caption class="hint">Tune the receiver to the downlink column; transmit on the uplink column. Range rate is positive when the satellite is moving away.</caption>
              <thead><tr><th scope="col">Time (UTC)</th><th scope="col">El</th><th scope="col">Az</th><th scope="col">Range rate (km/s)</th><th scope="col">Shift (kHz)</th><th scope="col">Tune downlink (MHz)</th><th v-if="uplink != null" scope="col">Transmit uplink (MHz)</th></tr></thead>
              <tbody><tr v-for="r in track.rows" :key="r.pt.time.getTime()" :style="r.pt.marker ? 'font-weight:700' : ''">
                <th scope="row" style="white-space:nowrap">{{ t(r.pt.time) }}:{{ String(r.pt.time.getUTCSeconds()).padStart(2, '0') }}<span v-if="r.pt.marker" class="muted"> {{ r.pt.marker }}</span></th>
                <td class="mono">{{ r.pt.elDeg.toFixed(0) }}°</td><td class="mono">{{ r.pt.azDeg.toFixed(0) }}° {{ compass(r.pt.azDeg) }}</td>
                <td class="mono">{{ (r.pt.rangeRateMps / 1000).toFixed(3) }}</td><td class="mono">{{ khz(r.f.shiftHz) }}</td>
                <td class="mono">{{ mhz(r.f.downlinkHz) }}</td><td v-if="uplink != null" class="mono">{{ mhz(r.f.uplinkHz!) }}</td></tr></tbody></table>
          </div>
        </div>
        <p v-if="track.err" class="notice" role="status">{{ track.err }}</p>
      </div>
    </div>
    <template #explain>
      <p>The element set describes the satellite’s orbit at a given moment. A standard model (SGP4) steps it forward in time, and the position is turned into an elevation and compass bearing from your location. A pass is listed when the elevation is above your minimum. A pass already under way at the end of the search window is not shown. The prediction is only as good as the element set: fresh ones are needed because drag and manoeuvres change orbits. If you already know the line-of-sight speed, use <RouterLink to="/tool/doppler-shift">Doppler Shift</RouterLink> to estimate the receive frequency separately.</p>
      <p>With a downlink frequency entered, each pass can show Doppler. The range rate is the change in distance to the satellite, taken from the predicted positions one second either side of each time. A satellite moving toward you raises the received frequency; moving away lowers it. The same rate pre-compensates the uplink so that the satellite receives your nominal uplink frequency. The result is first-order and ignores your own ground motion and the satellite’s own oscillator error. Linear transponders and tuning offsets are not modelled; adjust by ear and trust the satellite’s published frequencies over this table.</p>
    </template>
  </ToolLayout>
</template>
