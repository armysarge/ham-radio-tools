<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolLayout from '../components/ToolLayout.vue'
import NumField from '../components/NumField.vue'
import ResultRow from '../components/ResultRow.vue'
import { look, parseTle, passes, periodMin, tleEpoch } from '../lib/sat'
import { station } from '../core/store'

const SAMPLE = `ISS (ZARYA)\n1 25544U 98067A   08264.51782528 -.00002182  00000-0 -11606-4 0  2927\n2 25544  51.6416 247.4627 0006703 130.5360 325.0288 15.72125391563537`
const text = ref('')
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
const STALE_DAYS = 60
const stale = computed(() => age.value != null && Math.abs(age.value) > STALE_DAYS)
const result = computed(() => {
  const t = parsed.value.tle
  if (!t || stale.value || !from.value || !obs.value || !hours.value || minEl.value == null) return { list: [], err: '' }
  try { return { list: passes(t, obs.value, from.value, hours.value, minEl.value), err: '' } } catch (e) { return { list: [], err: (e as Error).message } }
})
const now = computed(() => (parsed.value.tle && !stale.value && obs.value && from.value ? look(parsed.value.tle, obs.value, from.value) : null))
const t = (d: Date) => d.toISOString().slice(5, 16).replace('T', ' ')
const dur = (a: Date, b: Date) => { const s = Math.round((b.getTime() - a.getTime()) / 1000); return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s` }
const compass = (az: number) => ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'][Math.round(az / 22.5) % 16]
</script>

<template>
  <ToolLayout id="satellite-passes" :references="['SGP4/SDP4 orbit propagation (Hoots &amp; Roehrich, Spacetrack Report No. 3; Vallado et al. 2006), via the satellite.js library (MIT), bundled with this app.', 'Element sets (TLEs) are published by CelesTrak, AMSAT and Space-Track. This tool does not download them: paste the two lines yourself.']">
    <div class="cols">
      <div class="stack">
        <div class="card stack">
          <label class="field"><span class="lbl">Element set (TLE)</span>
            <textarea v-model="text" rows="5" spellcheck="false" placeholder="Paste the two TLE lines, with the name line above if you like"></textarea></label>
          <button class="ghost" @click="text = SAMPLE; start = '2008-09-20T12:30'">Insert an old ISS sample</button>
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
        <div class="card">
          <p v-if="result.err" class="notice" role="status">{{ result.err }}</p>
          <div v-else-if="result.list.length" class="table-wrap">
            <table class="table"><thead><tr><th>Rise (UTC)</th><th>Length</th><th>Peak</th><th>Path</th></tr></thead>
              <tbody><tr v-for="p in result.list" :key="p.aos.getTime()"><td style="white-space:nowrap">{{ t(p.aos) }}</td><td style="white-space:nowrap">{{ dur(p.aos, p.los) }}</td><td style="white-space:nowrap">{{ p.maxElDeg.toFixed(0) }}° at {{ t(p.tca).slice(6) }}</td><td style="white-space:nowrap">{{ compass(p.aosAzDeg) }} → {{ compass(p.losAzDeg) }}</td></tr></tbody></table>
          </div>
          <p v-else-if="parsed.tle" class="hint">No passes above {{ minEl }}° in that time.</p>
          <p v-else class="hint">Paste an element set to see passes.</p>
        </div>
      </div>
    </div>
    <template #explain>
      <p>The element set describes the satellite’s orbit at a given moment. A standard model (SGP4) steps it forward in time, and the position is turned into an elevation and compass bearing from your location. A pass is listed when the elevation is above your minimum. A pass already under way at the end of the search window is not shown. The prediction is only as good as the element set: fresh ones are needed because drag and manoeuvres change orbits. Doppler shift is not calculated.</p>
    </template>
  </ToolLayout>
</template>
