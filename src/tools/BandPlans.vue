<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import ToolLayout from '../components/ToolLayout.vue'
import NumField from '../components/NumField.vue'
import { FREQ_UNITS, fmt } from '../lib/units'
import { ITU_BANDS, ITU_META } from '../data/reference'
import { getPack, installedPacks, refreshPacks } from '../core/packs'
import { ageDays, type BandSegment } from '../lib/packs'

interface Row { band: string; fromHz: number; toHz: number; use: string; status?: string; modes?: string; power?: string; note?: string }
const source = ref('itu')
const region = ref<1 | 2 | 3>(1)
const f = ref<number | null>(14.2e6)
const packRows = ref<Row[]>([])
const packErr = ref('')
onMounted(refreshPacks)

const bandPacks = computed(() => installedPacks.value.filter((p) => p.kind === 'band-plan'))
const pack = computed(() => bandPacks.value.find((p) => p.id === source.value))
watch(source, async (id) => {
  packRows.value = []; packErr.value = ''
  if (id === 'itu') return
  try { packRows.value = ((await getPack<{ segments: BandSegment[] }>(id))?.data.segments ?? []) } catch (e) { packErr.value = (e as Error).message }
})

const rows = computed<Row[]>(() => source.value === 'itu'
  ? ITU_BANDS.filter((b) => b.region === region.value).map((b) => ({ band: b.band, fromHz: b.fromHz, toHz: b.toHz, use: 'Amateur service', status: b.status, note: b.note }))
  : packRows.value)
const sorted = computed(() => [...rows.value].sort((a, b) => a.fromHz - b.fromHz))
const hits = computed(() => (f.value == null ? [] : sorted.value.filter((r) => f.value! >= r.fromHz && f.value! <= r.toHz)))
const mhz = (hz: number) => fmt(hz / 1e6, 7)

// log-scale bar chart of the allocations
const W = 600, L = 70
const lo = computed(() => Math.log10(Math.min(...sorted.value.map((r) => r.fromHz), 1.8e6) * 0.95))
const hi = computed(() => Math.log10(Math.max(...sorted.value.map((r) => r.toHz), 450e6) * 1.05))
const X = (hz: number) => L + ((Math.log10(hz) - lo.value) / (hi.value - lo.value)) * (W - L - 10)
const bands = computed(() => [...new Set(sorted.value.map((r) => r.band))])
const colour = (s?: string) => (s === 'primary' ? 'var(--good)' : s === 'secondary' ? 'var(--warn)' : 'var(--accent)')
</script>

<template>
  <ToolLayout id="band-plans" :references="[`${ITU_META.source} (bundled, revision ${ITU_META.revision}).`, 'Installed packs: see each pack’s source and revision in Settings & content.']">
    <div class="notice" style="margin-bottom:1rem">{{ ITU_META.note }}</div>
    <div class="cols">
      <div class="card stack">
        <label class="field"><span class="lbl">Band plan</span>
          <select v-model="source"><option value="itu">ITU regions (bundled)</option><option v-for="p in bandPacks" :key="p.id" :value="p.id">{{ p.title }} (installed)</option></select></label>
        <div v-if="source === 'itu'" class="seg" role="group" aria-label="ITU region">
          <button v-for="r in [1, 2, 3]" :key="r" :aria-pressed="region === r" @click="region = r as 1 | 2 | 3">Region {{ r }}</button>
        </div>
        <p v-if="source === 'itu'" class="hint" style="margin:0">Region 1: Europe, Africa, Middle East. Region 2: the Americas. Region 3: most of Asia and Oceania.</p>
        <p v-else-if="pack" class="hint" style="margin:0">{{ pack.source }} · revision {{ pack.revision }} ({{ ageDays(pack.revision) }} days old){{ pack.jurisdiction ? ' · ' + pack.jurisdiction : '' }}</p>
        <p v-if="packErr" class="err" role="alert">{{ packErr }}</p>
        <NumField v-model="f" label="What is at this frequency?" :units="FREQ_UNITS" unit="MHz" :min="0" minExclusive />
        <div aria-live="polite">
          <p v-if="!hits.length" class="muted" style="margin:0">Not inside any amateur allocation in this plan.</p>
          <div v-for="h in hits" :key="h.band + h.fromHz" class="notice" style="margin-bottom:.5rem">
            <strong>{{ h.band }}</strong> · {{ mhz(h.fromHz) }}–{{ mhz(h.toHz) }} MHz<br />{{ h.use }}{{ h.status ? ' · ' + h.status : '' }}{{ h.modes ? ' · ' + h.modes : '' }}{{ h.power ? ' · ' + h.power : '' }}<span v-if="h.note"><br />{{ h.note }}</span>
          </div>
        </div>
      </div>
      <div class="stack">
        <div class="card" v-if="sorted.length">
          <svg class="diagram" :viewBox="`0 0 ${W} ${bands.length * 22 + 30}`" role="img" aria-label="Amateur allocations on a logarithmic frequency scale">
            <g v-for="(b, i) in bands" :key="b">
              <text class="dg-tick" x="4" :y="22 + i * 22 + 4">{{ b }}</text>
              <rect v-for="r in sorted.filter((x) => x.band === b)" :key="r.fromHz" :x="X(r.fromHz)" :y="14 + i * 22" :width="Math.max(X(r.toHz) - X(r.fromHz), 3)" height="14" rx="2" :fill="colour(r.status)" />
            </g>
            <line v-if="f && f > 0" class="dg-mark" stroke="var(--wire)" stroke-width="2" :x1="X(f)" :x2="X(f)" y1="4" :y2="bands.length * 22 + 20" />
          </svg>
          <p class="hint">Bars span each allocation (log scale). Green = primary, amber = secondary, accent = shared/other; the orange line is your frequency.</p>
        </div>
        <div class="card" v-if="sorted.length">
          <div class="table-wrap"><table class="table">
            <thead><tr><th>Band</th><th>From–to (MHz)</th><th>Use</th><th>Status</th></tr></thead>
            <tbody><tr v-for="r in sorted" :key="r.band + r.fromHz"><td>{{ r.band }}</td><td class="mono">{{ mhz(r.fromHz) }}–{{ mhz(r.toHz) }}</td>
              <td>{{ r.use }}{{ r.modes ? ' · ' + r.modes : '' }}<div v-if="r.note || r.power" class="hint">{{ [r.power, r.note].filter(Boolean).join(' · ') }}</div></td><td>{{ r.status ?? '' }}</td></tr></tbody>
          </table></div>
        </div>
        <div v-else class="empty">This plan has no segments loaded.</div>
      </div>
    </div>
    <div class="card" style="margin-top:1rem">
      <h3>Local (national) band plans</h3>
      <p class="muted" style="margin:0">National plans differ from the ITU overview and change over time, so they are installed as dated <strong>packs</strong> (JSON files) in <router-link to="/settings">Settings &amp; content</router-link>. Each pack names its jurisdiction, source and revision date; the app never downloads one itself. No national packs are bundled yet.</p>
    </div>
    <template #explain>
      <p>ITU Region allocations set the broad framework; each country’s regulator then decides which parts amateurs may use, with which modes, power and licence class. “Primary” services are protected from interference by secondary ones; “shared” rows have several services on equal footing or conditions in the footnotes.</p>
      <p>The bundled table lists the main amateur bands only, simplified from Article 5. It is <strong>not</strong> a substitute for your licence conditions, and it does not include sub-band plans (CW/digital/phone segments), which are voluntary IARU or national band plans supplied through packs.</p>
    </template>
  </ToolLayout>
</template>
