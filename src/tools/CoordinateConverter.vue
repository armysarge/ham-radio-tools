<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ToolLayout from '../components/ToolLayout.vue'
import WorldMap from '../components/WorldMap.vue'
import ResultRow from '../components/ResultRow.vue'
import { parseCoordinate, formatCoordinate, type Axis, type CoordinateFormat } from '../lib/coordinates'
import { decode, encode, precisionInfo, type Precision } from '../lib/maidenhead'
import { saveLocation, station, state } from '../core/store'
import { platform } from '../platform'

const savedStation = station()
const latitude = ref(String(savedStation?.lat ?? 40)), longitude = ref(String(savedStation?.lon ?? -75))
const name = ref(''), saved = ref(''), origin = ref('')
const locator = ref(''), chars = ref<Precision>(6)
function read(text: string, axis: Axis) {
  try { return { value: parseCoordinate(text, axis), error: '' } }
  catch (error) { return { value: null, error: (error as Error).message } }
}
const lat = computed(() => read(latitude.value, 'lat')), lon = computed(() => read(longitude.value, 'lon'))
const point = computed(() => lat.value.value != null && lon.value.value != null ? { lat: lat.value.value, lon: lon.value.value } : null)
const grid = computed(() => point.value ? encode(point.value.lat, point.value.lon, chars.value) : '')
const cell = computed(() => grid.value ? decode(grid.value) : null)
const info = computed(() => precisionInfo(chars.value))
const locatorCell = computed(() => { try { return { cell: decode(locator.value), error: '' } } catch (error) { return { cell: null, error: locator.value ? (error as Error).message : '' } } })
const formats: { id: CoordinateFormat; name: string }[] = [{ id: 'dd', name: 'Decimal degrees' }, { id: 'ddm', name: 'Degrees & decimal minutes' }, { id: 'dms', name: 'Degrees, minutes & seconds' }]
watch([latitude, longitude], () => { saved.value = ''; origin.value = '' }, { flush: 'sync' })
function setPoint(a: number, b: number) { latitude.value = String(a); longitude.value = String(b) }
function useLocator() {
  const c = locatorCell.value.cell
  if (!c) return
  setPoint(c.centerLat, c.centerLon)
  chars.value = c.locator.length as Precision
  origin.value = `Using the centre of ${c.locator}, not an exact station position. The input locator describes an area.`
}
function useSaved(event: Event) {
  const location = state.locations.find(l => l.id === (event.target as HTMLSelectElement).value)
  if (location) { setPoint(location.lat, location.lon); name.value = location.name }
}
function save() {
  if (!point.value) return
  saveLocation(name.value || grid.value, point.value.lat, point.value.lon)
  saved.value = `Saved “${name.value || grid.value}”.`
}
function copy(format: CoordinateFormat) {
  if (point.value) void platform.copyText(`${formatCoordinate(point.value.lat, 'lat', format)}, ${formatCoordinate(point.value.lon, 'lon', format)}`)
}
const refs = ['NIST SP 811, Appendix B.8: angular units, degree/minute/second relationships. https://www.nist.gov/pml/special-publication-811/nist-guide-si-appendix-b-conversion-factors/nist-guide-si-appendix-b8', 'Maidenhead conversion uses the app’s tested IARU locator implementation; a locator represents an area, not a unique point.']
</script>

<template>
  <ToolLayout id="coordinate-converter" :references="refs">
    <p class="muted">Paste decimal degrees, degrees/minutes or DMS. South and west are negative; a hemisphere letter also works. This changes notation, not the geographic datum.</p>
    <div class="cols">
      <div class="card stack">
        <label v-if="state.locations.length" class="field"><span class="lbl">Saved location</span><select aria-label="Saved location to convert" @change="useSaved"><option value="">Choose…</option><option v-for="l in state.locations" :key="l.id" :value="l.id">{{ l.name }}</option></select></label>
        <label class="field"><span class="lbl">Latitude</span><input v-model="latitude" aria-label="Latitude to convert" type="text" spellcheck="false" :aria-invalid="!!lat.error" aria-describedby="latitude-conversion-help" /><span id="latitude-conversion-help" class="hint">Examples: −25.75, 25 45 S, 25° 45′ 00″ S. Range ±90°.</span><span v-if="lat.error" class="err" role="alert">{{ lat.error }}</span></label>
        <label class="field"><span class="lbl">Longitude</span><input v-model="longitude" aria-label="Longitude to convert" type="text" spellcheck="false" :aria-invalid="!!lon.error" aria-describedby="longitude-conversion-help" /><span id="longitude-conversion-help" class="hint">Examples: 28.25, 28 15 E, 28° 15′ 00″ E. Range ±180°.</span><span v-if="lon.error" class="err" role="alert">{{ lon.error }}</span></label>
        <div class="locator-input">
          <label class="field"><span class="lbl">Or start with a Maidenhead locator</span><input v-model="locator" aria-label="Locator to convert" placeholder="e.g. FN31pr" type="text" class="mono" spellcheck="false" :aria-invalid="!!locatorCell.error" /></label>
          <p v-if="locatorCell.error" class="err" role="alert">{{ locatorCell.error }}</p>
          <button :disabled="!locatorCell.cell" @click="useLocator">Use locator centre</button>
        </div>
        <label class="field"><span class="lbl">Location name</span><input v-model="name" aria-label="Location name" type="text" placeholder="Field site…" /></label>
        <button :disabled="!point" @click="save">Save location</button>
        <p v-if="saved" role="status">{{ saved }}</p>
        <p class="hint">{{ savedStation ? 'Starts at your saved station.' : 'Starts at an example: 40° N, 75° W.' }} Saving adds a location locally; it does not replace your station.</p>
      </div>
      <div class="stack">
        <p v-if="origin" class="notice" role="status">{{ origin }}</p>
        <div v-if="point" class="card coordinate-results" aria-live="polite">
          <p class="mono signed-pair">{{ point.lat.toFixed(6) }}, {{ point.lon.toFixed(6) }}</p>
          <section v-for="format in formats" :key="format.id" class="coordinate-format">
            <div class="format-heading"><h2>{{ format.name }}</h2><button @click="copy(format.id)">Copy {{ format.id.toUpperCase() }}</button></div>
            <p class="mono">{{ formatCoordinate(point.lat, 'lat', format.id) }}<br />{{ formatCoordinate(point.lon, 'lon', format.id) }}</p>
          </section>
          <p class="hint">Rounded display digits do not establish positional accuracy. Calculations and saved locations retain the unrounded input.</p>
        </div>
        <p v-else class="empty">Enter a valid latitude and longitude to see converted coordinates.</p>
        <div class="card">
          <label class="field"><span class="lbl">Locator precision</span><select v-model.number="chars" aria-label="Locator precision"><option v-for="n in [4, 6, 8]" :key="n" :value="n">{{ n }} characters</option></select></label>
          <ResultRow label="Containing cell" :value="grid || null" />
          <p class="hint">{{ info.name }}: {{ info.latDeg * 60 }}′ north–south × {{ info.lonDeg * 60 }}′ east–west. The outline is the cell boundary; the marker is your input point. At +180° longitude the locator wraps to −180°; at +90° latitude it uses the northernmost row.</p>
        </div>
      </div>
    </div>
    <div style="margin-top:1rem"><WorldMap :markers="point ? [{ ...point, label: 'Position' }] : []" :cell="cell" @pick="(a, b) => setPoint(+a.toFixed(6), +b.toFixed(6))" /></div>
    <template #explain>
      <div class="formula">
        <math display="block">
          <mi>θ</mi><mo>=</mo><mi>s</mi><mo>(</mo>
          <mi>D</mi><mo>+</mo><mfrac><mi>M</mi><mn>60</mn></mfrac><mo>+</mo><mfrac><mi>S</mi><mn>3600</mn></mfrac><mo>)</mo>
        </math>
        <math display="block">
          <mn>1</mn><mo>°</mo><mo>=</mo><mn>60</mn><mo>′</mo><mo>=</mo><mn>3600</mn><mo>″</mo>
        </math>
      </div>
      <p>θ is the coordinate in decimal degrees. Use unsigned degrees D, arcminutes M and arcseconds S. The sign s is +1 for north or east and −1 for south or west.</p>
      <p>Minutes and seconds are each less than 60. Only the smallest supplied field may have a fractional part. A sign and hemisphere must agree: −25 S is valid; −25 N is contradictory.</p>
      <p>Assume WGS84 coordinates for the map and saved station. This tool does not convert between datums, project UTM coordinates or find street addresses. DMS is rounded to 0.01″ and decimal minutes to 0.0001′ for display; rounding carries into the next minute or degree.</p>
    </template>
  </ToolLayout>
</template>

<style scoped>
.locator-input { border-top:1px solid var(--line); padding-top:1rem; }
.locator-input button { margin-top:.5rem; }
.signed-pair { overflow-wrap:anywhere; margin:0 0 .75rem; font-size:1.1rem; }
.coordinate-format { border-top:1px solid var(--line); padding-top:.75rem; margin-top:.75rem; }
.coordinate-format p { margin:.5rem 0; overflow-wrap:anywhere; }
.format-heading { display:flex; align-items:center; justify-content:space-between; gap:.5rem; flex-wrap:wrap; }
.format-heading h2 { margin:0; font-size:1rem; }
:deep(.copy) { min-height:44px; }
</style>
