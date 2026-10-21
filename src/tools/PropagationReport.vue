<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolLayout from '../components/ToolLayout.vue'
import LocationInput from '../components/LocationInput.vue'
import NumField from '../components/NumField.vue'
import LineChart from '../components/LineChart.vue'
import WorldMap from '../components/WorldMap.vue'
import { KM_PER_MILE, greatCircle, path } from '../lib/geo'
import { encode } from '../lib/maidenhead'
import { fmt } from '../lib/units'
import { NOISE_ENVS, OP_MODES, REPORT_BANDS, RELIABILITY_BUCKETS, bucketOf, buildReport, type ReportCell } from '../lib/propReport'
import { state, station } from '../core/store'

const st = station()
const aLat = ref<number | null>(st?.lat ?? -25.7461), aLon = ref<number | null>(st?.lon ?? 28.1881)
const bLat = ref<number | null>(-1.2921), bLon = ref<number | null>(36.8219)
const aChars = ref<2 | 4 | 6 | 8>(6), bChars = ref<2 | 4 | 6 | 8>(6)
const isExample = !st

const month = ref(new Date().getMonth() + 1)
const ssn = ref<number | null>(60)
const power = ref<number | null>(100)
const modeId = ref('ssb')
const customSnr = ref<number | null>(10), customBw = ref<number | null>(2700)
const noiseId = ref('residential')
const txGain = ref<number | null>(5), rxGain = ref<number | null>(5)
const longPath = ref(false)
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const mode = computed(() => (modeId.value === 'custom' ? { bandwidthHz: customBw.value ?? 0, snrDb: customSnr.value ?? 0 } : OP_MODES.find((m) => m.id === modeId.value)!))
const modeName = computed(() => (modeId.value === 'custom' ? 'Custom' : OP_MODES.find((m) => m.id === modeId.value)!.name))
const geoOk = computed(() => [aLat, aLon, bLat, bLon].every((v) => v.value != null))

const swap = () => { [aLat.value, bLat.value] = [bLat.value, aLat.value]; [aLon.value, bLon.value] = [bLon.value, aLon.value] }

const err = ref('')
const report = computed(() => {
  err.value = ''
  try {
    if (!geoOk.value || ssn.value == null || !power.value || !mode.value.bandwidthHz || txGain.value == null || rxGain.value == null) return null
    return buildReport({
      tx: { lat: aLat.value!, lon: aLon.value! }, rx: { lat: bLat.value!, lon: bLon.value! }, month: month.value, ssn: ssn.value, txPowerW: power.value, mode: mode.value,
      noiseAt3MHz: NOISE_ENVS.find((n) => n.id === noiseId.value)!.value, txGainDb: txGain.value, rxGainDb: rxGain.value, longPath: longPath.value,
    })
  } catch (e) { err.value = (e as Error).message; return null }
})

// ---- geometry summary and map ----
const p = computed(() => (geoOk.value ? path(aLat.value!, aLon.value!, bLat.value!, bLon.value!) : null))
const route = computed(() => (geoOk.value ? greatCircle(aLat.value!, aLon.value!, bLat.value!, bLon.value!) : null))
const markers = computed(() => (geoOk.value ? [{ lat: aLat.value!, lon: aLon.value!, label: 'TX' }, { lat: bLat.value!, lon: bLon.value!, label: 'RX', accent: true }] : []))
const imperial = computed(() => state.units === 'imperial')
const dist = (km: number) => (imperial.value ? `${fmt(km / KM_PER_MILE, 4)} mi` : `${fmt(km, 4)} km`)
const pathKm = computed(() => (p.value ? (longPath.value ? p.value.longKm : p.value.shortKm) : null))
const bearing = computed(() => (p.value ? (longPath.value ? p.value.longBearing : p.value.shortBearing) : null))
const locator = (lat: number | null, lon: number | null, c: number) => (lat != null && lon != null ? encode(lat, lon, c as 2 | 4 | 6 | 8) : '')

// ---- selection (keyboard navigable grid) ----
const sel = ref<{ b: number; h: number }>({ b: 4, h: 12 })
const cell = (b: number, h: number): ReportCell | null => report.value?.cells[b]?.[h] ?? null
const selected = computed(() => cell(sel.value.b, sel.value.h))
function move(db: number, dh: number) { sel.value = { b: Math.max(0, Math.min(REPORT_BANDS.length - 1, sel.value.b + db)), h: Math.max(0, Math.min(23, sel.value.h + dh)) } }
function onKey(e: KeyboardEvent) {
  const k: Record<string, [number, number]> = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] }
  if (k[e.key]) { e.preventDefault(); move(...k[e.key]) }
  else if (e.key === 'Home') { e.preventDefault(); sel.value = { ...sel.value, h: 0 } }
  else if (e.key === 'End') { e.preventDefault(); sel.value = { ...sel.value, h: 23 } }
}

const pct = (c: ReportCell | null) => (c?.reliability == null ? null : Math.round(c.reliability * 100))
const cls = (c: ReportCell | null) => (c?.reliability == null ? 'unav' : 'r' + bucketOf(c.reliability))
const hh = (h: number) => String(h).padStart(2, '0')
const tip = (c: ReportCell) => (c.result ? `${c.band} at ${hh(c.hour)}:00 UTC: reliability ${pct(c)} %, mode ${c.result.mode}, SNR margin ${fmt(c.marginDb, 3)} dB` : `${c.band} at ${hh(c.hour)}:00 UTC: no prediction`)
const best = computed(() => (report.value ? report.value.hours.map((_, h) => {
  let bi = -1, br = 0.2
  report.value!.cells.forEach((row, b) => { const r = row[h].reliability; if (r != null && r >= br) { br = r; bi = b } })
  return bi < 0 ? '–' : REPORT_BANDS[bi].name.replace(' ', '')
}) : []))
const mufPoints = computed<[number, number][]>(() => (report.value ? report.value.mufByHour.map(([h, m]) => [h, m] as [number, number]) : []))
</script>

<template>
  <ToolLayout id="propagation-report" :references="[
    'Prediction engine: DVOACAP by Alex Shovkoplyas VE3NEA (MIT), a Delphi reimplementation of the VOACAP / ITS HF propagation model, ported to TypeScript for this app. VOACAP is the NTIA / ITS (US) model; ionospheric maps are the CCIR/URSI coefficient sets.',
    'Noise: ITU-R P.372 (atmospheric, galactic, man-made). Smoothed sunspot number: SIDC/SILSO or NOAA SWPC publish the current value; this app never goes online to fetch it.',
    'Checked against DVOACAP’s own sample output: over 8 000 values agree to the printed digit (see tests/voacap.test.ts).']">
    <p v-if="isExample" class="notice" role="status" style="margin-bottom:1rem">The stations start at example places (Pretoria and Nairobi). Enter your own, or save a location as “my station” to start from it.</p>

    <div class="cols" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr))">
      <LocationInput title="Transmitting station" v-model:lat="aLat" v-model:lon="aLon" v-model:chars="aChars" />
      <LocationInput title="Receiving station" v-model:lat="bLat" v-model:lon="bLon" v-model:chars="bChars" />
    </div>
    <div style="margin:.75rem 0;display:flex;gap:.5rem;flex-wrap:wrap;align-items:center">
      <button class="ghost" @click="swap">⇄ Swap stations</button>
      <span v-if="p && pathKm != null" class="muted">{{ locator(aLat, aLon, aChars) }} → {{ locator(bLat, bLon, bChars) }} · {{ dist(pathKm) }} {{ longPath ? 'long' : 'short' }} path · bearing {{ fmt(bearing, 4) }}°</span>
    </div>

    <div class="card stack">
      <h2>Prediction settings</h2>
      <div class="cols" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr))">
        <label class="field"><span class="lbl">Month</span><select v-model.number="month"><option v-for="(m, i) in MONTHS" :key="m" :value="i + 1">{{ m }}</option></select></label>
        <NumField v-model="ssn" label="Sunspot number (SSN)" :min="0" :max="300" hint="12-month smoothed (R12). Look up the current value when you are online and enter it here." />
        <NumField v-model="power" label="Transmitter power" unit="W" :min="0" minExclusive />
        <label class="field"><span class="lbl">Operating mode</span>
          <select v-model="modeId"><option v-for="m in OP_MODES" :key="m.id" :value="m.id">{{ m.name }} ({{ m.snrDb }} dB in {{ m.bandwidthHz }} Hz)</option><option value="custom">Custom…</option></select></label>
      </div>
      <div class="cols" v-if="modeId === 'custom'" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr))">
        <NumField v-model="customSnr" label="Required SNR" unit="dB" hint="In the bandwidth below." />
        <NumField v-model="customBw" label="Bandwidth" unit="Hz" :min="0" minExclusive />
      </div>
      <details>
        <summary style="cursor:pointer;min-height:36px">More settings: antennas, noise and path</summary>
        <div class="cols" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr));margin-top:.5rem">
          <NumField v-model="txGain" label="Transmit antenna gain" unit="dBi" hint="A constant, not a pattern. Typical peak values: isotropic 0, vertical 0–2, wire dipole about 5, 3-element Yagi about 10 dBi." />
          <NumField v-model="rxGain" label="Receive antenna gain" unit="dBi" />
          <label class="field"><span class="lbl">Noise environment at the receiver</span><select v-model="noiseId"><option v-for="n in NOISE_ENVS" :key="n.id" :value="n.id">{{ n.name }}</option></select></label>
          <label style="display:flex;gap:.5rem;align-items:center;min-height:44px"><input v-model="longPath" type="checkbox" /> Use the long path (the other way round the world)</label>
        </div>
      </details>
    </div>

    <p v-if="err" class="notice" role="alert" style="margin-top:1rem">{{ err }}</p>
    <p v-else-if="!report" class="notice" role="status" style="margin-top:1rem">Enter both locations and valid settings to see the report.</p>

    <template v-if="report">
      <div class="card stack" style="margin-top:1rem">
        <h2>Band reliability by UTC hour</h2>
        <p class="muted" style="margin:0">Each cell is the predicted share of days this month on which a {{ modeName }} signal reaches the required signal-to-noise ratio. Click or use the arrow keys to see the details of a cell.</p>
        <p v-if="report.distanceKm >= 7000" class="notice" role="status" style="margin:0">This path is 7 000 km or longer, so the long-path part of the DVOACAP model is used. It has been checked for sanity (finite, in-range answers everywhere) but not against reference output the way shorter paths have, so treat the colours with extra caution.</p>
        <div class="legend" aria-label="Colour key"><span class="muted">Reliability:</span>
          <span v-for="(b, i) in RELIABILITY_BUCKETS" :key="b" class="chip" :class="'r' + i">{{ b }}</span><span class="chip unav">Unavailable</span></div>
        <div class="table-wrap">
          <table class="heat" role="grid" tabindex="0" :aria-label="`Reliability by band and UTC hour, ${MONTHS[month - 1]}`" :aria-activedescendant="`cell-${sel.b}-${sel.h}`" @keydown="onKey">
            <thead><tr><th scope="col">Band / UTC</th><th v-for="h in report.hours" :key="h" scope="col">{{ hh(h) }}</th></tr></thead>
            <tbody>
              <tr v-for="(b, bi) in REPORT_BANDS" :key="b.name">
                <th scope="row">{{ b.name }} ({{ b.mhz.toFixed(1) }} MHz)</th>
                <td v-for="h in report.hours" :id="`cell-${bi}-${h}`" :key="h" role="gridcell" :class="[cls(report.cells[bi][h]), { sel: sel.b === bi && sel.h === h }]"
                  :title="tip(report.cells[bi][h])" :aria-selected="sel.b === bi && sel.h === h" @click="sel = { b: bi, h }">{{ pct(report.cells[bi][h]) ?? '–' }}%</td>
              </tr>
              <tr class="bestrow"><th scope="row">Best band</th><td v-for="(n, h) in best" :key="h">{{ n }}</td></tr>
            </tbody>
          </table>
        </div>
        <div class="detail" v-if="selected" aria-live="polite">
          <strong>{{ selected.band }} · {{ hh(selected.hour) }}:00 UTC</strong>
          <template v-if="selected.result">
            <span>Reliability <b>{{ pct(selected) }} %</b></span>
            <span>Service probability <b>{{ Math.round(selected.result.serviceProb * 100) }} %</b></span>
            <span>Median SNR <b>{{ fmt(selected.result.snrDb - report.bw, 3) }} dB</b> in {{ mode.bandwidthHz }} Hz ({{ selected.marginDb! >= 0 ? '+' : '' }}{{ fmt(selected.marginDb, 3) }} dB against the {{ fmt(mode.snrDb, 3) }} dB needed)</span>
            <span>Path mode <b>{{ selected.result.mode }}</b> · take-off {{ fmt(selected.result.takeOffDeg, 3) }}° · delay {{ fmt(selected.result.delayMs, 3) }} ms</span>
            <span>Circuit MUF <b>{{ fmt(report.mufByHour[selected.hour][1], 3) }} MHz</b> · on-the-day MUF probability {{ Math.round(selected.result.mufDay * 100) }} %</span>
          </template>
          <span v-else>No prediction for this cell.</span>
        </div>
      </div>

      <div class="cols" style="margin-top:1rem;grid-template-columns:repeat(auto-fit,minmax(320px,1fr))">
        <div class="card">
          <h3>Circuit MUF by UTC hour</h3>
          <LineChart :points="mufPoints" x-label="UTC hour" y-label="MHz" title="Predicted maximum usable frequency of the circuit against UTC hour" />
          <p class="hint">Frequencies above the MUF mostly fail; the best are usually 10–15 % below it.</p>
        </div>
        <div class="card"><WorldMap :markers="markers" :route="route" /></div>
      </div>
    </template>

    <template #explain>
      <p>This report runs <strong>DVOACAP</strong>, a re-implementation of the VOACAP model used by broadcasters and the US government. For each UTC hour it builds the ionosphere along the path from stored monthly maps, finds which layers and hops can carry each frequency, adds up absorption, ground and spreading losses, compares the signal with the noise at the receiver, and then says how often in the month the result meets the required signal-to-noise ratio. “Reliability” is that fraction of days; “service probability” also allows for the model’s own uncertainty.</p>
      <p><strong>What it is not.</strong> It predicts a monthly <em>median</em> for the sunspot number you enter, not today’s conditions: flares, storms and sporadic E (which the model leaves out) can change the real band completely. Antennas are a single constant gain (5 dBi each by default, about a wire dipole; type 0 for the isotropic reference), with no pattern or take-off angle dependence, and the ionospheric maps have limited resolution in some regions. The engine reproduces DVOACAP’s published output to the printed digit; paths of 7 000 km and more use the long-path model, which has been checked for sanity but not against a reference. Treat the colours as a planning guide for choosing a band and a time.</p>
      <p>The required signal-to-noise ratio comes from the operating mode: the SNR in the mode’s own bandwidth plus 10·log₁₀(bandwidth) gives the figure the model works in (a 1 Hz bandwidth). The thresholds are practical rules of thumb; choose “Custom” to use your own.</p>
    </template>
  </ToolLayout>
</template>

<style scoped>
.legend { display: flex; flex-wrap: wrap; gap: .4rem; align-items: center; }
.chip { font-size: .72rem; font-weight: 700; padding: .12rem .55rem; border-radius: 999px; }
.heat { border-collapse: separate; border-spacing: 0; width: 100%; min-width: 800px; font-size: .74rem; }
.heat th, .heat td { text-align: center; padding: .45rem .1rem; border: 1px solid var(--bg); }
.heat thead th { background: var(--panel2); position: sticky; top: 0; }
.heat tbody th { text-align: left; white-space: nowrap; padding-left: .6rem; background: var(--panel2); position: sticky; left: 0; z-index: 1; }
.heat td { font-weight: 700; cursor: pointer; min-width: 1.85rem; transition: transform .1s; }
.heat td:hover { transform: scale(1.06); position: relative; z-index: 2; }
.heat td.sel { outline: 3px solid var(--ink); outline-offset: -3px; }
.heat:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
.bestrow td { background: var(--panel); font-weight: 600; font-size: .72rem; cursor: default; }
.r0 { background: #b3263a; color: #fff; } .r1 { background: #e07b00; color: #111; } .r2 { background: #f2b705; color: #111; }
.r3 { background: #9fcfb0; color: #111; } .r4 { background: #1f8a4c; color: #fff; } .unav { background: #55606a; color: #fff; }
.detail { display: grid; gap: .25rem; padding: .75rem 1rem; background: var(--panel2); border-radius: 8px; border-left: 4px solid var(--accent); }
</style>
