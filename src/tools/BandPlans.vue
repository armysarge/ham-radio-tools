<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import ToolLayout from '../components/ToolLayout.vue'
import NumField from '../components/NumField.vue'
import { FREQ_UNITS, fmt } from '../lib/units'
import { ITU_BANDS, ITU_META } from '../data/reference'
import { BUNDLED_PACKS } from '../data/packs'
import { getPack, installedPacks, refreshPacks } from '../core/packs'
import { ageDays, type BandSegment } from '../lib/packs'

interface Row { band: string; fromHz: number; toHz: number; use: string; status?: string; modes?: string; power?: string; classes?: string; note?: string }
// source values: 'itu' | 'b:<bundled id>' | 'i:<installed id>'
const source = ref('itu')
const region = ref<1 | 2 | 3>(1)
const f = ref<number | null>(14.2e6)
const packRows = ref<Row[]>([])
const packErr = ref('')
onMounted(refreshPacks)

const bandPacks = computed(() => installedPacks.value.filter((p) => p.kind === 'band-plan'))
const bundled = computed(() => BUNDLED_PACKS.find((p) => source.value === 'b:' + p.id))
const installed = computed(() => bandPacks.value.find((p) => source.value === 'i:' + p.id))
const meta = computed(() => bundled.value ?? installed.value ?? null)
watch(source, async (v) => {
  packRows.value = []; packErr.value = ''
  if (v.startsWith('b:')) { packRows.value = bundled.value?.segments ?? []; return }
  if (v.startsWith('i:')) { try { packRows.value = ((await getPack<{ segments: BandSegment[] }>(v.slice(2)))?.data.segments ?? []) } catch (e) { packErr.value = (e as Error).message } }
})

const rows = computed<Row[]>(() => source.value === 'itu'
  ? ITU_BANDS.filter((b) => b.region === region.value).map((b) => ({ band: b.band, fromHz: b.fromHz, toHz: b.toHz, use: 'Amateur service', status: b.status, note: b.note }))
  : packRows.value)
const sorted = computed(() => [...rows.value].sort((a, b) => a.fromHz - b.fromHz))
const hits = computed(() => (f.value == null ? [] : sorted.value.filter((r) => f.value! >= r.fromHz && f.value! <= r.toHz)))
const hasClasses = computed(() => sorted.value.some((r) => r.classes))
const bandFilter = ref('all'), query = ref('')
const availableBands = computed(() => [...new Set(sorted.value.map(r => r.band))])
const filtered = computed(() => sorted.value.filter(r => (bandFilter.value === 'all' || r.band === bandFilter.value) && query.value.toLowerCase().split(/\s+/).filter(Boolean).every(term => [r.band, r.use, r.modes, r.classes, r.power, r.status, r.note].join(' ').toLowerCase().includes(term))))
const mhz = (hz: number) => fmt(hz / 1e6, 7)

// Fixed logarithmic axis makes allocations comparable across sources and regions.
const W = 860, L = 100, R = 20, CHART_MIN = 100e3, CHART_MAX = 1.3e9, TOP = 28, ROW = 22
const chartRows = computed(() => sorted.value.filter((r) => r.toHz <= 1.3e9))
const chartHeight = computed(() => TOP + chartRows.value.length * ROW + 34)
const axisY = computed(() => TOP + chartRows.value.length * ROW + 2)
const X = (hz: number) => L + ((Math.log10(hz) - Math.log10(CHART_MIN)) / (Math.log10(CHART_MAX) - Math.log10(CHART_MIN))) * (W - L - R)
const ticks = [[100e3, '0.1'], [1e6, '1'], [10e6, '10'], [100e6, '100'], [1e9, '1000']] as const
const chartFrequencyX = computed(() => f.value != null && f.value >= CHART_MIN && f.value <= CHART_MAX ? X(f.value) : null)
const selectedChartIndex = ref<number | null>(null)
const selectedChartRow = computed(() => selectedChartIndex.value == null ? null : chartRows.value[selectedChartIndex.value] ?? null)
function selectChartRow(i: number) { selectedChartIndex.value = i }
function showChartBand() { if (selectedChartRow.value) { bandFilter.value = selectedChartRow.value.band; query.value = '' } }
watch([source, region], () => { bandFilter.value = 'all'; query.value = ''; selectedChartIndex.value = null })
const colour = (s?: string) => (s?.startsWith('primary') || s?.startsWith('co-primary') ? 'var(--good)' : s?.startsWith('secondary') ? 'var(--warn)' : 'var(--accent)')
</script>

<template>
  <ToolLayout id="band-plans" :references="[`${ITU_META.source} (bundled, revision ${ITU_META.revision}).`, 'National plans: each one lists its own official source, licence and revision date below the selector. Installed packs: see Settings & content.']">
    <div class="notice" style="margin-bottom:1rem">{{ source === 'itu' ? ITU_META.note : 'National band tables are summaries of the regulator’s own document, compiled on the revision date shown. Regulations change: confirm anything that matters against the source linked below, and against your own licence.' }}</div>
    <div class="band-plan-layout">
      <div class="card stack">
        <label class="field"><span class="lbl">Band plan</span>
          <select v-model="source">
            <option value="itu">ITU regions (overview)</option>
            <optgroup label="Countries (bundled)"><option v-for="p in BUNDLED_PACKS" :key="p.id" :value="'b:' + p.id">{{ p.jurisdiction ?? p.title }}</option></optgroup>
            <optgroup v-if="bandPacks.length" label="Installed from file"><option v-for="p in bandPacks" :key="p.id" :value="'i:' + p.id">{{ p.title }}</option></optgroup>
          </select></label>
        <div v-if="source === 'itu'" class="seg" role="group" aria-label="ITU region">
          <button v-for="r in [1, 2, 3]" :key="r" :aria-pressed="region === r" @click="region = r as 1 | 2 | 3">Region {{ r }}</button>
        </div>
        <p v-if="source === 'itu'" class="hint" style="margin:0">Region 1: Europe, Africa, Middle East. Region 2: the Americas. Region 3: most of Asia and Oceania. <router-link to="/tool/itu-regulations">What are the ITU Radio Regulations?</router-link></p>
        <div v-else-if="meta" class="hint" style="margin:0">
          <strong>{{ meta.title }}</strong><br />{{ meta.source }}<br />Revision {{ meta.revision }} ({{ ageDays(meta.revision) }} days old) · Licence: {{ 'license' in meta ? meta.license : '' }}
          <template v-if="meta.sourceUrl && /^https?:\/\//i.test(meta.sourceUrl)"><br /><a :href="meta.sourceUrl" target="_blank" rel="noopener noreferrer">Open the official source</a> (opens the web; the app itself stays offline)</template>
        </div>
        <details v-if="meta?.notes" class="explain" style="margin:0"><summary>Read first: scope and limits of this table</summary><p>{{ meta.notes }}</p></details>
        <p v-if="packErr" class="err" role="alert">{{ packErr }}</p>
        <NumField v-model="f" label="What is at this frequency?" :units="FREQ_UNITS" unit="MHz" :min="0" minExclusive />
        <div aria-live="polite">
          <p v-if="!hits.length" class="muted" style="margin:0">Not inside any amateur allocation in this plan.</p>
          <div v-for="h in hits" :key="h.band + h.fromHz" class="notice" style="margin-bottom:.5rem">
            <strong>{{ h.band }}</strong> · {{ mhz(h.fromHz) }}–{{ mhz(h.toHz) }} MHz<br />{{ h.use }}{{ h.status ? ' · ' + h.status : '' }}{{ h.modes ? ' · ' + h.modes : '' }}{{ h.power ? ' · ' + h.power : '' }}
            <span v-if="h.classes"><br />Who: {{ h.classes }}</span><span v-if="h.note"><br />{{ h.note }}</span>
          </div>
        </div>
      </div>
      <div class="stack">
        <details class="card allocation-chart" v-if="chartRows.length">
          <summary>View allocation chart</summary>
          <p class="hint chart-intro">Each bar is one allocation. The horizontal axis is logarithmic: equal spacing means a tenfold frequency change. Select a bar for its details.</p>
          <div class="chart-legend" aria-label="Allocation status legend"><span><i class="primary-key"></i>Primary</span><span><i class="secondary-key"></i>Secondary</span><span><i class="other-key"></i>Other or shared</span><span><i class="frequency-key"></i>Your frequency</span></div>
          <div class="chart-scroll">
            <svg class="allocation-svg" :viewBox="`0 0 ${W} ${chartHeight}`" role="img" aria-label="Amateur frequency allocations from 0.1 to 1300 megahertz on a logarithmic scale">
              <g v-for="[hz, label] in ticks" :key="hz">
                <line class="chart-grid" :x1="X(hz)" :x2="X(hz)" y1="12" :y2="axisY" />
                <text class="chart-axis-label" :x="X(hz)" :y="axisY + 18" text-anchor="middle">{{ label }} MHz</text>
              </g>
              <g v-for="(r, i) in chartRows" :key="`${r.band}:${r.fromHz}:${r.toHz}:${i}`" class="chart-row" :class="{ selected: selectedChartIndex === i }" role="button" tabindex="0" :aria-pressed="selectedChartIndex === i" :aria-label="`${r.band}, ${mhz(r.fromHz)} to ${mhz(r.toHz)} megahertz, ${r.status || 'status unspecified'}. Select for details.`" @click="selectChartRow(i)" @keydown.enter="selectChartRow(i)" @keydown.space.prevent="selectChartRow(i)">
                <title>{{ r.band }} · {{ mhz(r.fromHz) }}–{{ mhz(r.toHz) }} MHz · {{ r.status || 'status unspecified' }}</title>
                <text class="chart-band-label" x="6" :y="TOP + i * ROW + 14">{{ r.band }}</text>
                <rect class="chart-hit" :x="L" :y="TOP + i * ROW" :width="W - L - R" :height="ROW" />
                <rect class="allocation-bar" :x="X(r.fromHz)" :y="TOP + i * ROW + 4" :width="X(r.toHz) - X(r.fromHz)" height="14" rx="2" :fill="colour(r.status)" />
              </g>
              <line v-if="chartFrequencyX != null" class="chart-frequency" :x1="chartFrequencyX" :x2="chartFrequencyX" y1="8" :y2="axisY" />
              <line class="chart-axis" :x1="L" :x2="W - R" :y1="axisY" :y2="axisY" />
            </svg>
          </div>
          <div v-if="selectedChartRow" class="selected-allocation" aria-live="polite">
            <div><strong>{{ selectedChartRow.band }} · {{ mhz(selectedChartRow.fromHz) }}–{{ mhz(selectedChartRow.toHz) }} MHz</strong><br /><span class="muted">{{ selectedChartRow.use }}{{ selectedChartRow.status ? ` · ${selectedChartRow.status}` : '' }}</span><p v-if="selectedChartRow.note" class="hint">{{ selectedChartRow.note }}</p></div>
            <button type="button" aria-label="Show this band in the table" @click="showChartBand">Show this band in the table</button>
          </div>
        </details>
        <div class="card" v-if="sorted.length">
          <div class="band-filters">
            <label class="field"><span class="lbl">Show a band</span><select v-model="bandFilter" aria-label="Filter by band"><option value="all">All bands</option><option v-for="b in availableBands" :key="b" :value="b">{{ b }}</option></select></label>
            <label class="field"><span class="lbl">Filter uses, classes or notes</span><input v-model="query" type="search" placeholder="e.g. CW, Technician, secondary" /></label>
          </div>
          <p class="hint">{{ filtered.length }} of {{ sorted.length }} segments. The frequency lookup above always searches the full plan.</p>
          <div v-if="filtered.length" class="table-wrap"><table class="table band-table">
            <caption class="sr-only">Frequency allocations for {{ meta?.title ?? `ITU Region ${region}` }}</caption>
            <thead><tr><th>Band</th><th>From–to (MHz)</th><th>Use</th><th v-if="hasClasses">Who</th><th>Status</th></tr></thead>
            <tbody><tr v-for="(r, i) in filtered" :key="r.band + r.fromHz + i" :class="{ 'frequency-hit': hits.includes(r) }"><th scope="row">{{ r.band }}</th><td class="mono">{{ mhz(r.fromHz) }}–{{ mhz(r.toHz) }}</td>
              <td>{{ r.use }}{{ r.modes ? ' · ' + r.modes : '' }}<div v-if="r.note || r.power" class="hint">{{ [r.power, r.note].filter(Boolean).join(' · ') }}</div></td>
              <td v-if="hasClasses">{{ r.classes }}</td><td>{{ r.status ?? '' }}</td></tr></tbody>
          </table></div>
          <p v-else class="empty" role="status">No segments match these filters. Choose another band or clear your search.</p>
        </div>
        <div v-else class="empty">This plan has no segments loaded.</div>
      </div>
    </div>
    <div class="card" style="margin-top:1rem">
      <h3>More countries</h3>
      <p class="muted" style="margin:0">Bundled: {{ BUNDLED_PACKS.map((p) => p.jurisdiction ?? p.title).join(', ') }}. Other countries and regional (IARU) mode band plans can be added as dated <strong>packs</strong> (JSON files) in <router-link to="/settings">Settings &amp; content</router-link>. The app never downloads them itself. A format example is in <span class="mono">docs/packs/example-band-plan.json</span>.</p>
    </div>
    <template #explain>
      <p>ITU Region allocations set the broad framework; each country’s regulator then decides which parts amateurs may use, with which modes, power and licence class. “Primary” services are protected from interference by secondary ones; “shared” rows have several services on equal footing or conditions in the footnotes.</p>
      <p>The ITU overview lists the main amateur bands only. The national tables are the regulator’s own frequency limits, powers and classes; <strong>they are not</strong> the voluntary mode sub-band plans (where CW, digital and SSB sit inside a band), which come from the IARU or the national society.</p>
    </template>
  </ToolLayout>
</template>
<style scoped>
.band-plan-layout{display:grid;gap:1rem;grid-template-columns:minmax(260px,320px) minmax(0,1fr)}
.band-plan-layout>*{min-width:0}
.band-filters{display:grid;grid-template-columns:minmax(130px,1fr) minmax(160px,2fr);gap:1rem}
.band-table{min-width:580px}
.band-table th,.band-table td{vertical-align:top;padding:.85rem .7rem;line-height:1.6}
.band-table thead th{background:var(--panel2);white-space:nowrap}
.band-table tbody th{color:var(--accent);white-space:nowrap}
.band-table .mono{white-space:nowrap}
.band-table .hint{margin-top:.4rem;max-width:65ch}
.frequency-hit{background:color-mix(in srgb,var(--accent) 9%,var(--panel))}
.allocation-chart summary{cursor:pointer;font-weight:600;min-height:28px}
.chart-intro{margin:.55rem 0}
.chart-legend{display:flex;flex-wrap:wrap;gap:.5rem 1rem;font-size:.82rem;color:var(--muted);margin-bottom:.25rem}
.chart-legend span{display:inline-flex;align-items:center;gap:.35rem}
.chart-legend i{display:inline-block;width:.75rem;height:.75rem;border-radius:2px;background:var(--accent)}
.chart-legend .primary-key{background:var(--good)}.chart-legend .secondary-key{background:var(--warn)}.chart-legend .frequency-key{height:2px;border-radius:0;background:var(--wire)}
.chart-scroll{max-height:440px;overflow:auto;border:1px solid var(--line);border-radius:8px;background:var(--panel)}
.allocation-svg{display:block;width:100%;min-width:680px;height:auto}
.chart-grid{stroke:var(--line);stroke-dasharray:3 4;stroke-width:1}
.chart-axis{stroke:var(--muted);stroke-width:1}
.chart-axis-label,.chart-band-label{fill:var(--muted);font:12px var(--font)}
.chart-row{cursor:pointer;outline:none}
.chart-row .chart-hit{fill:transparent;pointer-events:all}
.chart-row:hover .chart-hit,.chart-row:focus .chart-hit{fill:color-mix(in srgb,var(--accent) 8%,transparent)}
.chart-row .allocation-bar{transition:filter .12s,stroke .12s;vector-effect:non-scaling-stroke;pointer-events:none}
.chart-row:hover .allocation-bar{filter:brightness(1.12)}
.chart-row:focus .allocation-bar,.chart-row.selected .allocation-bar{stroke:var(--ink);stroke-width:2}
.chart-frequency{stroke:var(--wire);stroke-width:2;stroke-dasharray:5 3;pointer-events:none;vector-effect:non-scaling-stroke}
.selected-allocation{display:flex;align-items:center;justify-content:space-between;gap:.75rem;margin-top:.6rem;padding:.65rem;background:var(--panel2);border-radius:8px}
.selected-allocation .hint{margin:.35rem 0 0}
@media(max-width:540px){.selected-allocation{align-items:stretch;flex-direction:column}.selected-allocation button{width:100%}}
@media(max-width:1100px){.band-plan-layout{grid-template-columns:1fr}.band-filters{grid-template-columns:1fr 2fr}}
@media(max-width:480px){.band-filters{grid-template-columns:1fr}}
</style>
