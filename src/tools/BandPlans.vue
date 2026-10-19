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
const mhz = (hz: number) => fmt(hz / 1e6, 7)

// log-scale bar chart of the allocations (HF/VHF only, so the chart stays readable)
const W = 600, L = 70
const chartRows = computed(() => sorted.value.filter((r) => r.toHz <= 1.3e9))
const lo = computed(() => Math.log10(Math.min(...chartRows.value.map((r) => r.fromHz), 1.8e6) * 0.95))
const hi = computed(() => Math.log10(Math.max(...chartRows.value.map((r) => r.toHz), 450e6) * 1.05))
const X = (hz: number) => L + ((Math.log10(hz) - lo.value) / (hi.value - lo.value)) * (W - L - 10)
const bands = computed(() => [...new Set(chartRows.value.map((r) => r.band))])
const colour = (s?: string) => (s?.startsWith('primary') || s?.startsWith('co-primary') ? 'var(--good)' : s?.startsWith('secondary') ? 'var(--warn)' : 'var(--accent)')
</script>

<template>
  <ToolLayout id="band-plans" :references="[`${ITU_META.source} (bundled, revision ${ITU_META.revision}).`, 'National plans: each one lists its own official source, licence and revision date below the selector. Installed packs: see Settings & content.']">
    <div class="notice" style="margin-bottom:1rem">{{ source === 'itu' ? ITU_META.note : 'National band tables are summaries of the regulator’s own document, compiled on the revision date shown. Regulations change: confirm anything that matters against the source linked below, and against your own licence.' }}</div>
    <div class="cols">
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
        <div class="card" v-if="chartRows.length">
          <svg class="diagram" :viewBox="`0 0 ${W} ${bands.length * 22 + 30}`" role="img" aria-label="Amateur allocations on a logarithmic frequency scale">
            <g v-for="(b, i) in bands" :key="b">
              <text class="dg-tick" x="4" :y="22 + i * 22 + 4">{{ b }}</text>
              <rect v-for="r in chartRows.filter((x) => x.band === b)" :key="r.fromHz" :x="X(r.fromHz)" :y="14 + i * 22" :width="Math.max(X(r.toHz) - X(r.fromHz), 3)" height="14" rx="2" :fill="colour(r.status)" />
            </g>
            <line v-if="f && f > 0" stroke="var(--wire)" stroke-width="2" :x1="X(f)" :x2="X(f)" y1="4" :y2="bands.length * 22 + 20" />
          </svg>
          <p class="hint">Bars span each allocation up to 1.3 GHz (log scale). Green = primary, amber = secondary, accent = other; the orange line is your frequency.</p>
        </div>
        <div class="card" v-if="sorted.length">
          <div class="table-wrap"><table class="table">
            <thead><tr><th>Band</th><th>From–to (MHz)</th><th>Use</th><th v-if="hasClasses">Who</th><th>Status</th></tr></thead>
            <tbody><tr v-for="r in sorted" :key="r.band + r.fromHz"><td>{{ r.band }}</td><td class="mono">{{ mhz(r.fromHz) }}–{{ mhz(r.toHz) }}</td>
              <td>{{ r.use }}{{ r.modes ? ' · ' + r.modes : '' }}<div v-if="r.note || r.power" class="hint">{{ [r.power, r.note].filter(Boolean).join(' · ') }}</div></td>
              <td v-if="hasClasses">{{ r.classes }}</td><td>{{ r.status ?? '' }}</td></tr></tbody>
          </table></div>
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
