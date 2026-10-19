<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import ToolLayout from '../components/ToolLayout.vue'
import NumField from '../components/NumField.vue'
import ResultRow from '../components/ResultRow.vue'
import DesignActions from '../components/DesignActions.vue'
import { FREQ_UNITS, LENGTH_UNITS, feetInches, fmt } from '../lib/units'
import { invertedV } from '../lib/antenna'
import { BANDS } from '../data/bands'
import { loadedParams, state } from '../core/store'

const p = loadedParams(useRoute(), 'inverted-v')
const f = ref<number | null>(Number(p?.f ?? 7.1e6))
const k = ref(Number(p?.k ?? 0.95))
const slope = ref(Number(p?.slope ?? 0.97))
const angle = ref(Number(p?.angle ?? 120))
const height = ref<number | null>(Number(p?.height ?? 12))
const name = ref('')
const svgEl = ref<SVGSVGElement>()

const r = computed(() => { try { return f.value && height.value ? invertedV(f.value, k.value, slope.value, angle.value, height.value) : null } catch { return null } })
const imperial = computed(() => state.units === 'imperial')
const dim = (m: number | null | undefined) => (m == null ? '—' : imperial.value ? feetInches(m) : `${m.toFixed(2)} m`)
const endWarn = computed(() => {
  if (!r.value) return ''
  if (r.value.endHeight <= 0) return 'The ends would be underground. Raise the apex, widen the angle, or use a shorter-wire band.'
  if (r.value.endHeight < 2.5) return `The ends are only ${dim(r.value.endHeight)} above ground. RF voltage is highest there: keep them out of reach (≥ 2.5 m / 8 ft) of people and pets.`
  return ''
})

// Drawing scale: fit the span and the apex height into the viewBox.
const G = 250, MID = 320
const sc = computed(() => (r.value && height.value ? Math.min(500 / r.value.span, 190 / height.value) : 1))
const apexY = computed(() => G - (height.value ?? 0) * sc.value)
const endX = computed(() => (r.value ? (r.value.span / 2) * sc.value : 0))
const endY = computed(() => (r.value ? G - Math.max(r.value.endHeight, 0) * sc.value : G))
</script>

<template>
  <ToolLayout id="inverted-v" :references="[
    'ARRL Antenna Book — inverted-V dipole: legs sloping from a centre support; shorten the wire about 2–5% vs. a flat dipole.',
    'Included-angle geometry is plain trigonometry; lengths are empirical estimates, not simulated.']">
    <div class="cols">
      <div class="stack">
        <div class="card stack">
          <div class="seg" role="group" aria-label="Band presets">
            <button v-for="[b, mhz] in BANDS" :key="b" :aria-pressed="f === mhz * 1e6" @click="f = mhz * 1e6">{{ b }}</button>
          </div>
          <NumField v-model="f" label="Design frequency" :units="FREQ_UNITS" unit="MHz" :min="100e3" :max="1e9" />
          <NumField v-model="height" label="Apex height above ground" :units="LENGTH_UNITS" :unit="imperial ? 'ft' : 'm'" :min="0" minExclusive hint="Height of the centre support / feed point." />
          <label class="field"><span class="lbl">Included angle at apex = {{ angle }}°</span>
            <input v-model.number="angle" type="range" min="60" max="180" step="1" aria-label="Included angle" />
            <span class="hint">180° is a flat dipole. 90–120° is typical.</span></label>
          <details><summary style="cursor:pointer;min-height:44px;display:flex;align-items:center">Advanced factors</summary>
            <label class="field"><span class="lbl">End-effect factor k = {{ k.toFixed(3) }}</span><input v-model.number="k" type="range" min="0.92" max="0.99" step="0.001" aria-label="End-effect factor" /></label>
            <label class="field"><span class="lbl">Sloping-leg factor = {{ slope.toFixed(3) }}</span><input v-model.number="slope" type="range" min="0.94" max="1" step="0.001" aria-label="Sloping-leg factor" /></label>
          </details>
        </div>
        <div class="card results" aria-live="polite">
          <ResultRow label="Total wire" :value="r ? dim(r.total) : null" big />
          <ResultRow label="Each leg" :value="r ? dim(r.leg) : null" big />
          <ResultRow label="Cut each leg to start" :value="r ? dim(r.leg * 1.05) : null" note="5% long, then trim as for a dipole" />
          <ResultRow label="Horizontal span (end to end)" :value="r ? dim(r.span) : null" note="space needed for the end supports" />
          <ResultRow label="End height above ground" :value="r ? dim(r.endHeight) : null" />
          <p v-if="endWarn" class="notice" role="alert">{{ endWarn }}</p>
        </div>
      </div>
      <div class="stack">
        <div class="card">
          <svg ref="svgEl" class="diagram dg-big" viewBox="0 0 640 290" role="img" :aria-label="`Inverted-V: legs ${dim(r?.leg)}, ${angle} degree apex, span ${dim(r?.span)}`">
            <line class="dg-ground" x1="10" y1="250" x2="630" y2="250" />
            <line class="dg-ground" :x1="MID" :y1="250" :x2="MID" :y2="apexY" />
            <path v-if="r" class="dg-wire" :d="`M${MID - endX} ${endY} L${MID} ${apexY} L${MID + endX} ${endY}`" />
            <rect class="dg-solid" :x="MID - 8" :y="apexY - 5" width="16" height="12" rx="3" />
            <path class="dg-ground" :d="`M${MID - endX} ${endY} v${Math.max(250 - endY, 0)} M${MID + endX} ${endY} v${Math.max(250 - endY, 0)}`" stroke-dasharray="4 4" />
            <text class="dg-text" :x="MID" :y="apexY - 12" text-anchor="middle">feed point</text>
            <text class="dg-dimtext" :x="MID - endX / 2 - 8" :y="(apexY + endY) / 2 - 8" text-anchor="end">{{ dim(r?.leg) }}</text>
            <text class="dg-dimtext" :x="MID + endX / 2 + 8" :y="(apexY + endY) / 2 - 8">{{ dim(r?.leg) }}</text>
            <text class="dg-dimtext" :x="MID + 14" :y="apexY + 40">{{ angle }}°</text>
            <line class="dg-dim" :x1="MID - endX" y1="272" :x2="MID + endX" y2="272" /><line class="dg-dim" :x1="MID - endX" y1="264" :x2="MID - endX" y2="280" /><line class="dg-dim" :x1="MID + endX" y1="264" :x2="MID + endX" y2="280" />
            <text class="dg-dimtext" :x="MID" y="288" text-anchor="middle">span {{ dim(r?.span) }}</text>
          </svg>
          <p class="hint">Side view, drawn to scale from the numbers entered (wire thickness exaggerated).</p>
        </div>
        <DesignActions v-model:name="name" tool-id="inverted-v" :default-name="`Inverted-V ${f ? fmt(f / 1e6) : ''} MHz`" :svg="svgEl" :file="`inverted-v-${f ? fmt(f / 1e6) : 'x'}MHz.svg`"
          :disabled="!r" :summary="`${f ? fmt(f / 1e6) : ''} MHz, ${angle}°, ${dim(r?.total)}`" :params="{ f: f ?? 0, k, slope, angle, height: height ?? 0 }" />
      </div>
    </div>
    <template #explain>
      <div class="formula">L<sub>total</sub> = k · s · c / (2f)     span = 2·(L/2)·sin(θ/2)     drop = (L/2)·cos(θ/2)</div>
      <p>An inverted-V is a dipole hung from a single high support. k ≈ 0.95 is the usual end-effect factor and s ≈ 0.97 an allowance for the sloping legs; both are <strong>empirical</strong>. The tool does not simulate the antenna, so it makes no claim about SWR bandwidth, gain or pattern.</p>
      <ul>
        <li><strong>Feed impedance:</strong> lowering the legs brings the feed impedance below a flat dipole’s ~70 Ω; many builders report roughly 50 Ω near a 90–120° angle, but this varies with height and ground and is not calculated here.</li>
        <li><strong>Ends:</strong> keep the high-voltage ends well out of reach and insulated.</li>
        <li><strong>Trim:</strong> cut long, measure, and shorten both legs equally — see the half-wave dipole tool’s trim helper.</li>
      </ul>
    </template>
  </ToolLayout>
</template>
