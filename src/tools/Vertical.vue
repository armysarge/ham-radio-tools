<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import ToolLayout from '../components/ToolLayout.vue'
import ModsPanel from '../components/ModsPanel.vue'
import NumField from '../components/NumField.vue'
import ResultRow from '../components/ResultRow.vue'
import DesignActions from '../components/DesignActions.vue'
import { FREQ_UNITS, feetInches, fmt } from '../lib/units'
import { vertical } from '../lib/antenna'
import { BANDS } from '../data/bands'
import { loadedParams, state } from '../core/store'

const p = loadedParams(useRoute(), 'vertical')
const f = ref<number | null>(Number(p?.f ?? 14.2e6))
const k = ref(Number(p?.k ?? 0.95))
const mode = ref<'elevated' | 'ground'>((p?.mode as 'elevated' | 'ground') ?? 'elevated')
const droop = ref(Number(p?.droop ?? 45))
const name = ref('')
const svgEl = ref<SVGSVGElement>()

const r = computed(() => { try { return f.value ? vertical(f.value, k.value, mode.value === 'elevated' ? droop.value : 0) : null } catch { return null } })
const imperial = computed(() => state.units === 'imperial')
const dim = (m: number | null | undefined) => (m == null ? '—' : imperial.value ? feetInches(m) : `${m.toFixed(2)} m`)

// drawing: radiator = RP pixels long, radials the same length
const RP = 110, GY = 250, FX = 320
const feedY = computed(() => (mode.value === 'elevated' ? GY - 20 - RP * Math.sin((droop.value * Math.PI) / 180) : GY))
const rx = computed(() => RP * Math.cos(((mode.value === 'elevated' ? droop.value : 0) * Math.PI) / 180))
const ry = computed(() => RP * Math.sin(((mode.value === 'elevated' ? droop.value : 0) * Math.PI) / 180))
</script>

<template>
  <ToolLayout id="vertical" :references="[
    'ARRL Antenna Book — quarter-wave ground-plane vertical; radiator length ≈ 234 / f(MHz) feet (k ≈ 0.95).',
    'Brown, Lewis & Epstein (1937), ground systems for vertical antennas; ARRL guidance on elevated vs. ground-mounted radials.']">
    <div class="cols">
      <div class="stack">
        <div class="card stack">
          <div class="seg" role="group" aria-label="Band presets">
            <button v-for="[b, mhz] in BANDS" :key="b" :aria-pressed="f === mhz * 1e6" @click="f = mhz * 1e6">{{ b }}</button>
          </div>
          <NumField v-model="f" label="Design frequency" :units="FREQ_UNITS" unit="MHz" :min="100e3" :max="1e9" />
          <div class="seg" role="group" aria-label="Radial system">
            <button :aria-pressed="mode === 'elevated'" @click="mode = 'elevated'">Elevated radials</button>
            <button :aria-pressed="mode === 'ground'" @click="mode = 'ground'">On or in the ground</button>
          </div>
          <label v-if="mode === 'elevated'" class="field"><span class="lbl">Radial droop = {{ droop }}° below horizontal</span>
            <input v-model.number="droop" type="range" min="0" max="60" step="1" aria-label="Radial droop" />
            <span class="hint">0° is flat. Drooping about 45° raises the feed impedance toward 50 Ω.</span></label>
          <label class="field"><span class="lbl">End-effect factor k = {{ k.toFixed(3) }}</span><input v-model.number="k" type="range" min="0.92" max="0.99" step="0.001" aria-label="End-effect factor" /></label>
        </div>
        <div class="card results" aria-live="polite">
          <ResultRow label="Vertical radiator" :value="r ? dim(r.radiator) : null" big />
          <ResultRow :label="mode === 'elevated' ? 'Each radial (resonant)' : 'Each radial (minimum)'" :value="r ? dim(r.radial) : null" big />
          <ResultRow label="Suggested radials" :value="mode === 'elevated' ? '2–4 (4 is better)' : '16 or more'" />
          <ResultRow v-if="mode === 'elevated' && r" label="Radial ends hang below feed point by" :value="dim(r.radialDrop)" note="keep ends out of reach" />
          <ResultRow v-if="mode === 'elevated' && r" label="Radial reach from the mast" :value="dim(r.radialReach)" />
        </div>
      </div>
      <div class="stack">
        <div class="card">
          <svg ref="svgEl" class="diagram dg-big" viewBox="0 0 640 290" role="img" :aria-label="`Quarter-wave vertical: radiator ${dim(r?.radiator)}, radials ${dim(r?.radial)}`">
            <line class="dg-ground" x1="10" :y1="GY" x2="630" :y2="GY" />
            <path class="dg-wire" :d="`M${FX} ${feedY} V${feedY - RP}`" />
            <template v-if="mode === 'elevated'">
              <path class="dg-wire" :d="`M${FX} ${feedY} l${-rx} ${ry} M${FX} ${feedY} l${rx} ${ry}`" style="stroke-width:3" />
              <path class="dg-ground" :d="`M${FX} ${feedY} V${GY}`" stroke-dasharray="4 4" />
            </template>
            <template v-else>
              <path class="dg-wire" :d="`M${FX} ${GY} h${-RP} M${FX} ${GY} h${RP}`" style="stroke-width:3" />
              <path class="dg-wire" :d="`M${FX} ${GY} l${-RP * 0.7} 14 M${FX} ${GY} l${RP * 0.7} 14 M${FX} ${GY} l${-RP * 0.4} 26 M${FX} ${GY} l${RP * 0.4} 26`" style="stroke-width:2;opacity:.6" />
            </template>
            <circle class="dg-solid" :cx="FX" :cy="feedY" r="6" /><text class="dg-text" :x="FX + 12" :y="feedY - 6">feed</text>
            <line class="dg-dim" :x1="FX + 40" :y1="feedY" :x2="FX + 40" :y2="feedY - RP" /><line class="dg-dim" :x1="FX + 32" :y1="feedY" :x2="FX + 48" :y2="feedY" /><line class="dg-dim" :x1="FX + 32" :y1="feedY - RP" :x2="FX + 48" :y2="feedY - RP" />
            <text class="dg-dimtext" :x="FX + 56" :y="feedY - RP / 2">{{ dim(r?.radiator) }}</text>
            <text class="dg-dimtext" :x="FX - rx - 6" :y="feedY + ry + 6" text-anchor="end">radial {{ dim(r?.radial) }}</text>
          </svg>
          <p class="hint">Side view, to scale for the angles entered. Sloping radials show 2 of the 4 suggested; ground radials show a spread.</p>
        </div>
        <DesignActions v-model:name="name" tool-id="vertical" :default-name="`Vertical ${f ? fmt(f / 1e6) : ''} MHz`" :svg="svgEl" :file="`vertical-${f ? fmt(f / 1e6) : 'x'}MHz.svg`"
          :disabled="!r" :summary="`${f ? fmt(f / 1e6) : ''} MHz, ${dim(r?.radiator)}, ${mode}`" :params="{ f: f ?? 0, k, mode, droop }" />
      </div>
    </div>
    <ModsPanel antenna="vertical" />

    <template #explain>
      <div class="formula">radiator = radial = k · c / (4f)      k ≈ 0.95  (234 ÷ f<sub>MHz</sub> feet)</div>
      <p>A quarter-wave vertical uses the ground, or a set of radials, as the other half of a dipole. <strong>These are empirical design estimates, not simulations</strong>: the tool makes no claim about gain, take-off angle or bandwidth.</p>
      <ul>
        <li><strong>Elevated radials</strong> are resonant (about ¼ wavelength) and work well in small numbers. Horizontal radials give roughly 35 Ω; sloping them about 45° brings the impedance up toward 50 Ω.</li>
        <li><strong>Ground-mounted radials</strong> need many (16 or more is the commonly advised minimum, more is better) because each carries little current; their length is less critical than their number.</li>
        <li><strong>Surroundings:</strong> nearby metal, soil quality and conductor thickness shift resonance — cut the radiator long and trim while watching SWR.</li>
      </ul>
    </template>
  </ToolLayout>
</template>
