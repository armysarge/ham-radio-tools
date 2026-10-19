<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolLayout from '../components/ToolLayout.vue'
import NumField from '../components/NumField.vue'
import ResultRow from '../components/ResultRow.vue'
import WorldMap from '../components/WorldMap.vue'
import { dayPart, maxHopKm, mufMHz, sunAt, sunElevation, sunriseSunset, terminator } from '../lib/propagation'
import { station } from '../core/store'

const tab = ref<'bands' | 'muf' | 'sun'>('bands')

// ---- typical band use (reference, not a forecast) ----
const BANDS: [string, string, string][] = [
  ['160 m, 80 m', 'Night and around dawn and dusk', 'Daytime absorption by the D layer makes these bands local-only until the sun goes down; best in winter and at solar minimum.'],
  ['40 m', 'Night for DX, day for regional contacts', 'The all-rounder: open day and night, with a skip zone in the day.'],
  ['30 m', 'Day and night', 'CW and digital only; steady at any point in the solar cycle.'],
  ['20 m', 'Daytime and early evening', 'The main DX band; usually open most of the day when solar activity is average or high.'],
  ['17 m, 15 m', 'Daytime', 'Open when solar activity is moderate or high; dead at night, and can be empty for years at solar minimum.'],
  ['12 m, 10 m', 'Daytime, solar maximum', 'Open only near the top of the 11-year cycle, apart from sporadic-E openings in summer on 10 m.'],
  ['6 m', 'Summer days (sporadic E); rare F2 at solar maximum', 'Short, unpredictable openings of 1 000–2 000 km; trans-equatorial paths in the evening at times.'],
]

// ---- MUF ----
const fo = ref<number | null>(7), dist = ref<number | null>(2000), layer = ref<number | null>(300)
const muf = computed(() => { try { return fo.value && dist.value && layer.value ? mufMHz(fo.value, dist.value, layer.value) : null } catch { return null } })
const hopNote = computed(() => (layer.value && dist.value && dist.value > maxHopKm(layer.value) ? `One hop reaches at most ${maxHopKm(layer.value).toFixed(0)} km. A longer path uses two or more hops, and the lowest MUF along the path limits it.` : ''))

// ---- sun and grey line ----
const st = station()
const lat = ref<number | null>(st?.lat ?? -25.75), lon = ref<number | null>(st?.lon ?? 28.2)
const when = ref(new Date().toISOString().slice(0, 16))
const at = computed(() => { const d = new Date(when.value + ':00Z'); return Number.isNaN(d.getTime()) ? null : d })
const geoOk = computed(() => lat.value != null && lon.value != null && Math.abs(lat.value) <= 90 && Math.abs(lon.value) <= 180)
const sun = computed(() => {
  if (!at.value || !geoOk.value) return null
  const e = sunElevation(lat.value!, lon.value!, at.value), rs = sunriseSunset(lat.value!, lon.value!, at.value)
  return { e, part: dayPart(e), rs, s: sunAt(at.value) }
})
const hm = (d: Date) => d.toISOString().slice(11, 16) + ' UTC'
const line = computed(() => (at.value ? terminator(at.value) : null))
const markers = computed(() => [
  ...(sun.value ? [{ lat: sun.value.s.subLat, lon: sun.value.s.subLon, label: 'Sun overhead', accent: true }] : []),
  ...(geoOk.value ? [{ lat: lat.value!, lon: lon.value!, label: 'You' }] : []),
])
const useNow = () => { when.value = new Date().toISOString().slice(0, 16) }
</script>

<template>
  <ToolLayout id="propagation" :references="['Sun position: NOAA Global Monitoring Laboratory general solar position calculations (accurate to about a minute; no refraction model beyond the standard 0.833°).', 'MUF = foF2 × sec θ (secant law), see the ARRL Antenna Book “Radio Wave Propagation”. Band summaries: typical behaviour, not a forecast.']">
    <div class="seg" role="group" aria-label="Section" style="margin-bottom:1rem">
      <button :aria-pressed="tab === 'bands'" @click="tab = 'bands'">Bands by time</button>
      <button :aria-pressed="tab === 'muf'" @click="tab = 'muf'">MUF estimate</button>
      <button :aria-pressed="tab === 'sun'" @click="tab = 'sun'">Sun &amp; grey line</button>
    </div>

    <div v-if="tab === 'bands'" class="card">
      <div class="table-wrap"><table class="table"><thead><tr><th>Band</th><th>Usually best</th><th>Notes</th></tr></thead>
        <tbody><tr v-for="b in BANDS" :key="b[0]"><td><strong>{{ b[0] }}</strong></td><td>{{ b[1] }}</td><td>{{ b[2] }}</td></tr></tbody></table></div>
      <p class="hint">This is general behaviour, not a prediction. Today’s conditions depend on solar activity and the state of the ionosphere: check the solar flux and a live forecast when you have a connection.</p>
    </div>

    <div v-else-if="tab === 'muf'" class="cols">
      <div class="card stack">
        <NumField v-model="fo" label="F2 critical frequency (foF2)" unit="MHz" :min="0" minExclusive hint="Not known offline: take it from an ionosonde or forecast. Typical: 3–5 MHz at night, 5–12 MHz by day depending on the solar cycle." />
        <NumField v-model="dist" label="Path distance (one hop)" unit="km" :min="0" minExclusive />
        <NumField v-model="layer" label="Layer height" unit="km" :min="100" :max="600" hint="About 300 km for the F2 layer by day." />
      </div>
      <div class="card results" aria-live="polite">
        <ResultRow label="Angle of incidence at the layer" :value="muf?.incidenceDeg ?? null" unit="°" />
        <ResultRow label="Secant factor" :value="muf?.secant ?? null" />
        <ResultRow label="Maximum usable frequency (MUF)" :value="muf?.muf ?? null" unit="MHz" big />
        <ResultRow label="Optimum working frequency (about 85 % of MUF)" :value="muf ? muf.muf * 0.85 : null" unit="MHz" />
        <p v-if="hopNote" class="notice" role="status">{{ hopNote }}</p>
        <p class="hint">Above the MUF the signal passes through the layer; the useful window is below it and above the lowest frequency that survives D-layer absorption (not calculated here).</p>
      </div>
    </div>

    <div v-else class="stack">
      <div class="cols">
        <div class="card stack">
          <NumField v-model="lat" label="Latitude" unit="°" :min="-90" :max="90" />
          <NumField v-model="lon" label="Longitude" unit="°" :min="-180" :max="180" />
          <label class="field"><span class="lbl">Date and time (UTC)</span><input type="datetime-local" v-model="when" /></label>
          <button class="ghost" @click="useNow">Use the time now</button>
        </div>
        <div class="card results" aria-live="polite">
          <ResultRow label="Sun elevation" :value="sun?.e ?? null" unit="°" />
          <ResultRow label="At your location it is" :value="sun?.part ?? null" big :note="sun?.part === 'grey line' ? 'twilight: low bands often peak and long paths open along this line' : ''" />
          <template v-if="sun && 'rise' in sun.rs">
            <ResultRow label="Sunrise" :value="hm(sun.rs.rise)" /><ResultRow label="Sunset" :value="hm(sun.rs.set)" />
          </template>
          <ResultRow v-else-if="sun" label="Sunrise and sunset" :value="(sun.rs as { none: string }).none" />
        </div>
      </div>
      <div class="card"><WorldMap :markers="markers" :route="line" /><p class="hint">The line is the day/night boundary (the “grey line”); the sun is overhead at the marked point.</p></div>
    </div>

    <template #explain>
      <p>The sun’s position follows from the date and time using standard astronomical formulae, so the sunrise, sunset and grey line need no data from anywhere else. The MUF is the secant law: a wave sent up at a steeper angle needs a lower frequency to be bent back, and the flatter the angle (the longer the hop), the higher the frequency that still returns. It needs the layer’s critical frequency, which changes hourly and is not something this tool can know. Use it for the shape of the answer, not the number.</p>
    </template>
  </ToolLayout>
</template>
