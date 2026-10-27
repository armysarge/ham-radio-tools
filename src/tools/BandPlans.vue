<script setup lang="ts">
import { computed, onMounted, ref, shallowRef, watch } from 'vue'
import ToolLayout from '../components/ToolLayout.vue'
import NumField from '../components/NumField.vue'
import { state } from '../core/store'
import { FREQ_UNITS, fmt } from '../lib/units'
import { ITU_BANDS, ITU_META } from '../data/reference'
import { BUNDLED_PACKS } from '../data/packs'
import { getPack, installedPacks, refreshPacks } from '../core/packs'
import { ageDays, type BandSegment } from '../lib/packs'

import { allocationRows, matchesService, frequencyLabel, COUNTRY_REGIONS, SERVICE_FILTERS, FREQUENCY_RANGES, ITU_ALLOCATION_URL, CANADA_ALLOCATION_URL, type AllocationData, type AllocationRow as Row } from '../lib/allocations'

const allData = shallowRef<AllocationData | null>(null)
const dataError = ref('')
watch(() => state.showAllRadioServices, async enabled => {
  if (!enabled || allData.value) return
  dataError.value = ''
  try { allData.value = (await import('../data/allocations.json')).default as AllocationData }
  catch { dataError.value = 'Could not load the bundled all-service data. Reload the app or reinstall its complete files.' }
}, { immediate: true })
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
watch(source, async (v, _old, onCleanup) => {
  let cancelled = false
  onCleanup(() => { cancelled = true })
  packRows.value = []; packErr.value = ''
  if (v.startsWith('b:')) { packRows.value = bundled.value?.segments ?? []; return }
  if (v.startsWith('i:')) { try { const pack = await getPack<{ segments: BandSegment[] }>(v.slice(2)); if (!cancelled) packRows.value = pack?.data.segments ?? [] } catch (e) { if (!cancelled) packErr.value = (e as Error).message } }
})

const frameworkRegion = computed(() => source.value === 'itu' ? region.value : COUNTRY_REGIONS[bundled.value?.id ?? ''])
const nationalCanada = computed(() => bundled.value?.id === 'ca-ised-rbr4')
const baseRows = computed<Row[]>(() => source.value === 'itu'
  ? ITU_BANDS.filter(b => b.region === region.value).map(b => ({ band: b.band, fromHz: b.fromHz, toHz: b.toHz, use: 'Amateur service', service: 'Amateur', status: b.status, note: b.note }))
  : packRows.value.map(r => ({ ...r, service: bundled.value ? 'Amateur' : undefined, origin: bundled.value ? 'National amateur licence details' : 'Installed pack' })))
const rows = computed<Row[]>(() => {
  if (!state.showAllRadioServices) return baseRows.value
  if (!allData.value) return []
  if (nationalCanada.value) return [...allocationRows(allData.value.canada, 'ISED 2026'), ...baseRows.value]
  const regional = frameworkRegion.value ? allocationRows(allData.value.regions[String(frameworkRegion.value)] ?? [], `ITU Region ${frameworkRegion.value} · 2024`) : []
  if (source.value === 'itu') return regional
  return [...regional, ...baseRows.value]
})
const sorted = computed(() => [...rows.value].sort((a, b) => a.fromHz - b.fromHz || a.toHz - b.toHz || a.use.localeCompare(b.use)))
const hits = computed(() => f.value == null ? [] : sorted.value.filter(r => f.value! >= r.fromHz && (state.showAllRadioServices ? f.value! < r.toHz : f.value! <= r.toHz)))
const hasClasses = computed(() => sorted.value.some(r => r.classes))
const bandFilter = ref('all'), query = ref(''), serviceFilter = ref('all'), frequencyRange = ref('all'), onlyHits = ref(false), page = ref(1)
const availableBands = computed(() => [...new Set(sorted.value.map(r => r.band))])
const range = computed(() => FREQUENCY_RANGES.find(r => r.id === frequencyRange.value) ?? FREQUENCY_RANGES[0]!)
const filtered = computed(() => sorted.value.filter(r => (bandFilter.value === 'all' || r.band === bandFilter.value) &&
  (!state.showAllRadioServices || (matchesService(r, serviceFilter.value) && (frequencyRange.value === 'all' || r.toHz > range.value.from && r.fromHz < range.value.to) && (!onlyHits.value || hits.value.includes(r)))) &&
  query.value.toLowerCase().split(/\s+/).filter(Boolean).every(term => [r.band, r.use, r.modes, r.classes, r.power, r.status, r.note, r.origin].join(' ').toLowerCase().includes(term))))
const PAGE_SIZE = 80
const pages = computed(() => state.showAllRadioServices ? Math.max(1, Math.ceil(filtered.value.length / PAGE_SIZE)) : 1)
const displayed = computed(() => state.showAllRadioServices ? filtered.value.slice((page.value-1)*PAGE_SIZE, page.value*PAGE_SIZE) : filtered.value)
const mhz = (hz: number) => fmt(hz / 1e6, 7)
const W = 1000, R = 20, TOP = 28, ROW = 22
const L = computed(() => state.showAllRadioServices ? 190 : 100)
const chartMin = computed(() => state.showAllRadioServices ? range.value.from : 100e3)
const chartMax = computed(() => state.showAllRadioServices ? range.value.to : 1.3e9)
const chartRows = computed(() => state.showAllRadioServices ? displayed.value : sorted.value.filter(r => r.toHz <= 1.3e9))
const chartHeight = computed(() => TOP + chartRows.value.length * ROW + 34)
const axisY = computed(() => TOP + chartRows.value.length * ROW + 2)
const X = (hz: number) => L.value + (Math.log10(Math.min(chartMax.value, Math.max(chartMin.value, hz))) - Math.log10(chartMin.value)) / (Math.log10(chartMax.value) - Math.log10(chartMin.value)) * (W-L.value-R)
const ticks = computed<[number, string][]>(() => state.showAllRadioServices
  ? [...new Set([range.value.from, ...[1e3, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9, 1e10, 1e11, 1e12, 3e12].filter(f => f >= range.value.from && f <= range.value.to), range.value.to])].sort((a,b) => a-b).map(hz => [hz, frequencyLabel(hz)])
  : [[100e3, '0.1 MHz'], [1e6, '1 MHz'], [10e6, '10 MHz'], [100e6, '100 MHz'], [1e9, '1000 MHz']])
const chartFrequencyX = computed(() => f.value != null && f.value >= chartMin.value && f.value <= chartMax.value ? X(f.value) : null)
const selectedChartIndex = ref<number | null>(null)
const selectedChartRow = computed(() => selectedChartIndex.value == null ? null : chartRows.value[selectedChartIndex.value] ?? null)
function selectChartRow(i: number) { selectedChartIndex.value = i }
function showChartBand() { if (selectedChartRow.value) { bandFilter.value = selectedChartRow.value.band; query.value = '' } }
watch([source, region, () => state.showAllRadioServices], () => { bandFilter.value = 'all'; query.value = ''; serviceFilter.value = 'all'; frequencyRange.value = 'all'; onlyHits.value = false; selectedChartIndex.value = null; page.value = 1 })
watch([filtered], () => { page.value = 1; selectedChartIndex.value = null })
watch(page, () => { selectedChartIndex.value = null })
const colour = (s?: string) => (s?.startsWith('primary') || s?.startsWith('co-primary') ? 'var(--good)' : s?.startsWith('secondary') ? 'var(--warn)' : 'var(--accent)')
</script>

<template>
  <ToolLayout id="band-plans" :references="state.showAllRadioServices ? ['ITU Radio Regulations 2024, Volume 1 Article 5; numeric limits, standardized service designations, priority and footnote identifiers. Country-specific footnotes require separate review.', 'ISED Canadian Table of Frequency Allocations 2026, source modified 2026-10-15; includes documented C5 government-use designation.'] : [`${ITU_META.source} (bundled, revision ${ITU_META.revision}).`, 'National plans: each one lists its own official source, licence and revision date below the selector. Installed packs: see Settings & content.']">
    <div class="card" style="margin-bottom:1rem"><label><input v-model="state.showAllRadioServices" type="checkbox" aria-label="Show all radio services" /> Show all radio services</label><p class="hint" style="margin-bottom:0">Include aviation, maritime, broadcasting, satellite, mobile, scientific and other allocations in this lookup, list and chart. Your choice is saved on this device.</p></div>
    <div v-if="state.showAllRadioServices" class="notice" style="margin-bottom:1rem">
      <template v-if="!allData && !dataError">Loading bundled allocation data…</template>
      <template v-else-if="nationalCanada">ISED 2026 national all-service allocations, source modified 2026-10-15. National amateur licence details are retained.</template>
      <template v-else-if="source === 'itu'">ITU Radio Regulations 2024: all-service regional framework, with source-cell footnote references. National exceptions are not automatically applied.</template>
      <template v-else-if="frameworkRegion">Other services use the ITU Region {{ frameworkRegion }} framework (2024), not a {{ bundled?.jurisdiction }} national all-service table. National amateur licence details supplement the regional allocations; each row labels its origin.</template>
      <template v-else>This installed pack has no known regional scope. Only its own rows can be shown; no country's or region's data is guessed.</template>
      <p class="hint" style="margin-bottom:0">Military users can share fixed, mobile, satellite and navigation services. Government/defence filtering uses explicit source designations only; government does not mean military-only. Allocations are not operating channel assignments.</p>
      <p><a :href="nationalCanada ? CANADA_ALLOCATION_URL : ITU_ALLOCATION_URL" target="_blank" rel="noopener noreferrer">Official all-service source</a> (opens only when clicked).</p>
    </div>
    <p v-if="dataError && state.showAllRadioServices" class="err" role="alert">{{ dataError }}</p>
    <div v-if="!state.showAllRadioServices" class="notice" style="margin-bottom:1rem">{{ source === 'itu' ? ITU_META.note : 'National band tables are summaries of the regulator’s own document, compiled on the revision date shown. Regulations change: confirm anything that matters against the source linked below, and against your own licence.' }}</div>
    <div class="band-plan-layout">
      <div class="card stack">
        <label class="field"><span class="lbl">Band plan</span>
          <select v-model="source" aria-label="Band plan">
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
        <div class="frequency-results" aria-live="polite">
          <p v-if="!hits.length" class="muted" style="margin:0">{{ state.showAllRadioServices ? 'No allocation matches in the available data.' : 'Not inside any amateur allocation in this plan.' }}</p>
          <div v-for="h in hits" :key="h.band + h.fromHz + h.use + h.origin + h.status + h.note" class="notice" style="margin-bottom:.5rem">
            <strong>{{ h.allocation ? h.use : h.band }}</strong> · {{ mhz(h.fromHz) }}–{{ mhz(h.toHz) }} MHz<br /><template v-if="!h.allocation">{{ h.use }}</template><span v-if="h.origin"> · {{ h.origin }}</span>{{ h.status ? ' · ' + h.status : '' }}{{ h.modes ? ' · ' + h.modes : '' }}{{ h.power ? ' · ' + h.power : '' }}
            <span v-if="h.classes"><br />Who: {{ h.classes }}</span><span v-if="h.note"><br />{{ h.note }}</span>
          </div>
        </div>
      </div>
      <div class="stack">
        <details class="card allocation-chart" v-if="chartRows.length">
          <summary>View allocation chart</summary>
          <p class="hint chart-intro">Each bar is one service allocation; shared bands can appear on several rows. {{ state.showAllRadioServices ? 'The chart uses the filters and page below; the whole-spectrum axis starts at 1 kHz.' : '' }} The horizontal axis is logarithmic: equal spacing means a tenfold frequency change. Select a bar for its details.</p>
          <div class="chart-legend" aria-label="Allocation status legend"><span><i class="primary-key"></i>Primary</span><span><i class="secondary-key"></i>Secondary</span><span><i class="other-key"></i>Other or shared</span><span><i class="frequency-key"></i>Your frequency</span></div>
          <div class="chart-scroll">
            <svg class="allocation-svg" :class="{ 'all-services-chart': state.showAllRadioServices }" :viewBox="`0 0 ${W} ${chartHeight}`" role="img" :aria-label="state.showAllRadioServices ? 'Radio-service frequency allocations on a logarithmic scale' : 'Amateur frequency allocations from 0.1 to 1300 megahertz on a logarithmic scale'">
              <g v-for="[hz, label] in ticks" :key="hz">
                <line class="chart-grid" :x1="X(hz)" :x2="X(hz)" y1="12" :y2="axisY" />
                <text class="chart-axis-label" :x="X(hz)" y="20" text-anchor="middle">{{ label }}</text>
                <text class="chart-axis-label" :x="X(hz)" :y="axisY + 18" text-anchor="middle">{{ label }}</text>
              </g>
              <g v-for="(r, i) in chartRows" :key="`${r.band}:${r.fromHz}:${r.toHz}:${i}`" class="chart-row" :class="{ selected: selectedChartIndex === i }" role="button" tabindex="0" :aria-pressed="selectedChartIndex === i" :aria-label="`${r.band}, ${r.use}, ${mhz(r.fromHz)} to ${mhz(r.toHz)} megahertz, ${r.status || 'status unspecified'}. Select for details.`" @click="selectChartRow(i)" @keydown.enter="selectChartRow(i)" @keydown.space.prevent="selectChartRow(i)">
                <title>{{ r.band }} · {{ mhz(r.fromHz) }}–{{ mhz(r.toHz) }} MHz · {{ r.status || 'status unspecified' }}</title>
                <text class="chart-band-label" x="6" :y="TOP + i * ROW + 14">{{ state.showAllRadioServices ? (r.use.length > 24 ? r.use.slice(0, 23) + '…' : r.use) : r.band }}</text>
                <rect class="chart-hit" :x="L" :y="TOP + i * ROW" :width="W - L - R" :height="ROW" />
                <rect class="allocation-bar" :x="X(r.fromHz)" :y="TOP + i * ROW + 4" :width="X(r.toHz) - X(r.fromHz)" height="14" rx="2" :fill="colour(r.status)" />
              </g>
              <line v-if="chartFrequencyX != null" class="chart-frequency" :x1="chartFrequencyX" :x2="chartFrequencyX" y1="8" :y2="axisY" />
              <line class="chart-axis" :x1="L" :x2="W - R" :y1="axisY" :y2="axisY" />
            </svg>
          </div>
          <div v-if="selectedChartRow" class="selected-allocation" aria-live="polite">
            <div><strong>{{ selectedChartRow.allocation ? selectedChartRow.use : selectedChartRow.band }} · {{ mhz(selectedChartRow.fromHz) }}–{{ mhz(selectedChartRow.toHz) }} MHz</strong><br /><span class="muted">{{ selectedChartRow.origin ? selectedChartRow.origin + ' - ' : '' }}{{ selectedChartRow.allocation ? '' : selectedChartRow.use }}{{ selectedChartRow.status ? ` · ${selectedChartRow.status}` : '' }}</span><p v-if="selectedChartRow.note" class="hint">{{ selectedChartRow.note }}</p></div>
            <button type="button" aria-label="Show this band in the table" @click="showChartBand">Show this band in the table</button>
          </div>
        </details>
        <div class="card" v-if="sorted.length">
          <div v-if="state.showAllRadioServices" class="band-filters" style="margin-bottom:1rem">
            <label class="field"><span class="lbl">Radio service</span><select v-model="serviceFilter" aria-label="Filter by service"><option v-for="[id, label] in SERVICE_FILTERS" :key="id" :value="id">{{ label }}</option></select></label>
            <label class="field"><span class="lbl">Frequency range</span><select v-model="frequencyRange" aria-label="Frequency range"><option v-for="r in FREQUENCY_RANGES" :key="r.id" :value="r.id">{{ r.title }}</option></select></label>
            <label><input v-model="onlyHits" type="checkbox" /> Only show frequency matches</label>
          </div>
          <div class="band-filters">
            <label class="field"><span class="lbl">Show a band</span><select v-model="bandFilter" aria-label="Filter by band"><option value="all">All bands</option><option v-for="b in availableBands" :key="b" :value="b">{{ b }}</option></select></label>
            <label class="field"><span class="lbl">Filter uses, classes or notes</span><input v-model="query" type="search" placeholder="e.g. aviation, satellite, CW, C5" /></label>
          </div>
          <p class="hint">{{ filtered.length }} of {{ sorted.length }} segments. The frequency lookup above always searches the full plan.</p>
          <div v-if="state.showAllRadioServices && pages > 1" class="allocation-pages" aria-label="Allocation pages"><button :disabled="page === 1" @click="page--">Previous allocations</button><span>Page {{ page }} of {{ pages }} · {{ PAGE_SIZE }} rows per page</span><button :disabled="page === pages" @click="page++">Next allocations</button></div>
          <div v-if="filtered.length" class="table-wrap"><table class="table band-table">
            <caption class="sr-only">Frequency allocations for {{ meta?.title ?? `ITU Region ${region}` }}</caption>
            <thead><tr><th>Band</th><th>From–to (MHz)</th><th>Use</th><th v-if="hasClasses">Who</th><th>Status</th><th v-if="state.showAllRadioServices">Source</th></tr></thead>
            <tbody><tr v-for="(r, i) in displayed" :key="r.band + r.fromHz + i" :class="{ 'frequency-hit': hits.includes(r) }"><th scope="row">{{ r.band }}</th><td class="mono">{{ mhz(r.fromHz) }}–{{ mhz(r.toHz) }}</td>
              <td>{{ r.use }}{{ r.modes ? ' · ' + r.modes : '' }}<div v-if="r.note || r.power" class="hint">{{ [r.power, r.note].filter(Boolean).join(' · ') }}</div></td>
              <td v-if="hasClasses">{{ r.classes }}</td><td>{{ r.status ?? '' }}</td><td v-if="state.showAllRadioServices" class="hint">{{ r.origin }}</td></tr></tbody>
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
      <p v-if="state.showAllRadioServices">A spectrum allocation identifies radio services that may use a range under specified conditions. It does not list every channel, station or operator. ITU 2024 supplies the international regional framework; ISED 2026 supplies national Canadian rows. Other bundled countries retain their national amateur details alongside explicitly labelled ITU regional service rows. The framework does not automatically apply country exceptions or replace national rules. Service intervals use start-inclusive/end-exclusive matching so an exact boundary is not assigned to both neighbours. Source-cell footnote identifiers are retained for checking against the official source.</p>
      <template v-else>
      <p>ITU Region allocations set the broad framework; each country’s regulator then decides which parts amateurs may use, with which modes, power and licence class. “Primary” services are protected from interference by secondary ones; “shared” rows have several services on equal footing or conditions in the footnotes.</p>
      <p>The ITU overview lists the main amateur bands only. The national tables are the regulator’s own frequency limits, powers and classes; <strong>they are not</strong> the voluntary mode sub-band plans (where CW, digital and SSB sit inside a band), which come from the IARU or the national society.</p>
      </template>
    </template>
  </ToolLayout>
</template>
<style scoped>
.allocation-pages{display:flex;flex-wrap:wrap;gap:.6rem;align-items:center;justify-content:space-between;margin:.6rem 0}
.band-plan-layout{display:grid;gap:1rem;grid-template-columns:minmax(260px,320px) minmax(0,1fr)}
.band-plan-layout>*{min-width:0}
.band-plan-layout>.card{align-self:start}
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
.all-services-chart{min-width:1000px}
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
