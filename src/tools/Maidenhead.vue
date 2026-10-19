<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolLayout from '../components/ToolLayout.vue'
import ResultRow from '../components/ResultRow.vue'
import LocationInput from '../components/LocationInput.vue'
import WorldMap from '../components/WorldMap.vue'
import { decode, encode, precisionInfo, type Precision } from '../lib/maidenhead'
import { KM_PER_MILE, KM_PER_NM, greatCircle, path } from '../lib/geo'
import { fmt } from '../lib/units'
import { state, station } from '../core/store'

const st = station()
const aLat = ref<number | null>(st?.lat ?? 48.14666), aLon = ref<number | null>(st?.lon ?? 11.60833)
const bLat = ref<number | null>(41.714775), bLon = ref<number | null>(-72.72726)
const chars = ref<Precision>(6)
const isExample = !st

const ok = (a: number | null, b: number | null) => a != null && b != null
const aOk = computed(() => ok(aLat.value, aLon.value)), bOk = computed(() => ok(bLat.value, bLon.value))
const aLoc = computed(() => (aOk.value ? encode(aLat.value!, aLon.value!, chars.value) : ''))
const bLoc = computed(() => (bOk.value ? encode(bLat.value!, bLon.value!, chars.value) : ''))
const aCell = computed(() => (aLoc.value ? decode(aLoc.value) : null))
const info = computed(() => precisionInfo(chars.value))
const ewKm = computed(() => (aCell.value ? info.value.lonDeg * 111.195 * Math.cos((aCell.value.centerLat * Math.PI) / 180) : null))
const p = computed(() => (aOk.value && bOk.value ? path(aLat.value!, aLon.value!, bLat.value!, bLon.value!) : null))
const route = computed(() => (p.value && aOk.value && bOk.value ? greatCircle(aLat.value!, aLon.value!, bLat.value!, bLon.value!) : null))
const markers = computed(() => [
  ...(aOk.value ? [{ lat: aLat.value!, lon: aLon.value!, label: 'You' }] : []),
  ...(bOk.value ? [{ lat: bLat.value!, lon: bLon.value!, label: 'Them', accent: true }] : []),
])
function pick(lat: number, lon: number) { bLat.value = +lat.toFixed(5); bLon.value = +lon.toFixed(5) }

const imperial = computed(() => state.units === 'imperial')
const dist = (km: number) => (imperial.value ? `${fmt(km / KM_PER_MILE, 2)} miles` : `${fmt(km, 2)} km`)
const deg = (v: number | null) => (v == null ? '—' : `${fmt(v, 4)}°`)
// compass arrow endpoint for a bearing
const arrow = (b: number | null) => (b == null ? null : { x: 100 + 72 * Math.sin((b * Math.PI) / 180), y: 100 - 72 * Math.cos((b * Math.PI) / 180) })
</script>

<template>
  <ToolLayout id="maidenhead" :references="[
    'Maidenhead Locator System (IARU/VHF Managers Handbook): field 20°×10°, square 2°×1°, subsquare 5′×2.5′, extended square 30″×15″.',
    'Great-circle distance: haversine formula on a sphere of mean radius 6371.0088 km (IUGG). Bearing: forward azimuth on the sphere.',
    'Basemap: Natural Earth 1:110m countries (public domain) via the world-atlas package (ISC).']">
    <div v-if="isExample" class="notice" style="margin-bottom:1rem">
      The “You” point starts at an <strong>example location</strong> (Munich). Enter yours and use “Save this location” → “Use as my station” to remember it.
    </div>
    <WorldMap :markers="markers" :route="route" :cell="aCell" @pick="pick" />

    <div class="cols" style="margin-top:1rem;grid-template-columns:repeat(auto-fit,minmax(300px,1fr))">
      <div class="stack">
        <div class="seg" role="group" aria-label="Locator length">
          <button v-for="n in [4, 6, 8]" :key="n" :aria-pressed="chars === n" @click="chars = n as Precision">{{ n }} characters</button>
        </div>
        <p class="hint" style="margin-top:0">{{ chars }} characters = a {{ info.name }}, {{ fmt(info.latDeg * 60, 3) }}′ high × {{ fmt(info.lonDeg * 60, 3) }}′ wide — about {{ dist(info.nsKm) }} north–south{{ ewKm != null ? ` and ${dist(ewKm)} east–west here` : '' }}.</p>
        <LocationInput v-model:lat="aLat" v-model:lon="aLon" v-model:chars="chars" title="You" />
        <LocationInput v-model:lat="bLat" v-model:lon="bLon" v-model:chars="chars" title="Other station" />
      </div>

      <div class="stack">
        <div class="card results" aria-live="polite">
          <h2>Your grid square</h2>
          <ResultRow label="Locator" :value="aLoc || null" big />
          <ResultRow label="Cell centre latitude" :value="aCell?.centerLat ?? null" unit="°" :sig="7" note="the middle of the square, not your exact position" />
          <ResultRow label="Cell centre longitude" :value="aCell?.centerLon ?? null" unit="°" :sig="7" />
          <ResultRow label="Cell edges (S–N)" :value="aCell ? `${fmt(aCell.south, 6)} … ${fmt(aCell.north, 6)}` : null" unit="°" />
          <ResultRow label="Cell edges (W–E)" :value="aCell ? `${fmt(aCell.west, 6)} … ${fmt(aCell.east, 6)}` : null" unit="°" />
          <ResultRow label="Other station locator" :value="bLoc || null" />
        </div>
        <div class="card results" aria-live="polite">
          <h2>Path to the other station</h2>
          <p v-if="!p" class="muted">Enter both locations to see distance and bearing.</p>
          <template v-else>
            <ResultRow label="Short path" :value="imperial ? p.shortKm / KM_PER_MILE : p.shortKm" :unit="imperial ? 'miles' : 'km'" big />
            <ResultRow label="" :value="imperial ? p.shortKm : p.shortKm / KM_PER_MILE" :unit="imperial ? 'km' : 'miles'" />
            <ResultRow label="" :value="p.shortKm / KM_PER_NM" unit="nautical miles" />
            <ResultRow label="Short-path beam heading" :value="p.shortBearing == null ? 'undefined' : fmt(p.shortBearing, 4)" :unit="p.shortBearing == null ? '' : '° true'" big />
            <ResultRow label="Long path" :value="imperial ? p.longKm / KM_PER_MILE : p.longKm" :unit="imperial ? 'miles' : 'km'" />
            <ResultRow label="Long-path beam heading" :value="p.longBearing == null ? 'undefined' : fmt(p.longBearing, 4)" :unit="p.longBearing == null ? '' : '° true'" />
            <p v-if="p.shortBearing == null" class="notice">{{ p.shortKm < 1 ? 'Same point: there is no direction to point.' : 'Exact opposite sides of the Earth: every direction is equally short.' }}</p>
          </template>
          <svg v-if="p" class="diagram" viewBox="0 0 200 200" style="max-width:220px;margin:auto" role="img"
            :aria-label="`Compass: short path ${deg(p.shortBearing)}, long path ${deg(p.longBearing)}, true bearings`">
            <circle cx="100" cy="100" r="78" class="dg-ground" fill="none" />
            <text v-for="[t, x, y] in [['N', 100, 16], ['E', 188, 105], ['S', 100, 196], ['W', 12, 105]]" :key="t as string" class="dg-text" :x="x" :y="y" text-anchor="middle">{{ t }}</text>
            <line v-if="arrow(p.longBearing)" class="dg-dim" x1="100" y1="100" :x2="arrow(p.longBearing)!.x" :y2="arrow(p.longBearing)!.y" stroke-dasharray="6 4" />
            <line v-if="arrow(p.shortBearing)" class="dg-wire" x1="100" y1="100" :x2="arrow(p.shortBearing)!.x" :y2="arrow(p.shortBearing)!.y" />
            <circle cx="100" cy="100" r="4" class="dg-solid" />
          </svg>
          <p v-if="p" class="hint" style="text-align:center">Solid = short path, dashed = long path (true north, not magnetic).</p>
        </div>
      </div>
    </div>
    <template #explain>
      <p><strong>Locator ↔ coordinates.</strong> The world is split into 18×18 “fields” (letters A–R), each into 10×10 “squares” (digits), each into 24×24 “subsquares” (letters A–X), each into 10×10 “extended squares” (digits). A locator names a <em>cell</em>, so converting it back gives the cell’s centre, which can be off by up to half the cell size from where you actually are. Points exactly on a cell edge belong to the cell to their north-east; longitude 180° wraps to −180° and latitude 90° belongs to the northernmost row.</p>
      <div class="formula">a = sin²(Δφ/2) + cos φ₁·cos φ₂·sin²(Δλ/2)     d = 2R·asin(√a)     θ = atan2( sin Δλ·cos φ₂ , cos φ₁·sin φ₂ − sin φ₁·cos φ₂·cos Δλ )</div>
      <p>Long path = Earth circumference − short path, heading = short heading + 180°. Distances use a spherical Earth (R = 6371.0088 km), which can differ from ellipsoidal results by up to about 0.5%. Headings are true bearings; subtract/add your local magnetic declination for a compass. At a pole every direction is south (north pole) or north (south pole). Basemap: 1:110m country outlines — fine for locating a continent or country, not for street-level work; detailed packs are planned.</p>
    </template>
  </ToolLayout>
</template>
