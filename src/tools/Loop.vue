<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import ToolLayout from '../components/ToolLayout.vue'
import ModsPanel from '../components/ModsPanel.vue'
import MaterialsPanel from '../components/MaterialsPanel.vue'
import NumField from '../components/NumField.vue'
import ResultRow from '../components/ResultRow.vue'
import DesignActions from '../components/DesignActions.vue'
import { FREQ_UNITS, feetInches, fmt } from '../lib/units'
import { loop, type LoopShape } from '../lib/antenna'
import { physicalLengthForDegrees } from '../lib/rf'
import { BANDS } from '../data/bands'
import { loadedParams, state } from '../core/store'

const p = loadedParams(useRoute(), 'loop')
const f = ref<number | null>(Number(p?.f ?? 14.2e6))
const k = ref(Number(p?.k ?? 1.0218))
const shape = ref<LoopShape>((p?.shape as LoopShape) ?? 'square')
const vf = ref<number | null>(Number(p?.vf ?? 0.66))
const name = ref('')
const svgEl = ref<SVGSVGElement>()

const r = computed(() => { try { return f.value ? loop(f.value, k.value, shape.value) : null } catch { return null } })
const match = computed(() => { try { return f.value && vf.value ? physicalLengthForDegrees(f.value, vf.value, 90) : null } catch { return null } })
const imperial = computed(() => state.units === 'imperial')
const dim = (m: number | null | undefined) => (m == null || Number.isNaN(m) ? '—' : imperial.value ? feetInches(m) : `${m.toFixed(2)} m`)
const SHAPES: [LoopShape, string][] = [['square', 'Square'], ['triangle', 'Triangle'], ['circle', 'Circle']]
</script>

<template>
  <ToolLayout id="loop" :references="[
    'ARRL Antenna Book — full-wave loop: circumference (ft) ≈ 1005 / f(MHz); feed impedance roughly 100–120 Ω.',
    'Quarter-wave 75 Ω section as an impedance transformer toward 50 Ω: Z_in = Z_line² / Z_load.']">
    <div class="cols">
      <div class="stack">
        <div class="card stack">
          <div class="seg" role="group" aria-label="Band presets">
            <button v-for="[b, mhz] in BANDS" :key="b" :aria-pressed="f === mhz * 1e6" @click="f = mhz * 1e6">{{ b }}</button>
          </div>
          <NumField v-model="f" label="Design frequency" :units="FREQ_UNITS" unit="MHz" :min="100e3" :max="1e9" />
          <div class="seg" role="group" aria-label="Loop shape">
            <button v-for="[s, t] in SHAPES" :key="s" :aria-pressed="shape === s" @click="shape = s">{{ t }}</button>
          </div>
          <label class="field"><span class="lbl">Loop factor k = {{ k.toFixed(4) }}</span>
            <input v-model.number="k" type="range" min="1" max="1.05" step="0.0005" aria-label="Loop factor" />
            <span class="hint">1.0218 matches the 1005 ÷ f(MHz) feet rule. Insulated wire resonates lower, so start slightly long.</span></label>
        </div>
        <div class="card results" aria-live="polite">
          <ResultRow label="Total wire (perimeter)" :value="r ? dim(r.perimeter) : null" big />
          <ResultRow v-if="shape === 'circle'" label="Diameter" :value="r ? dim(r.diameter) : null" big />
          <template v-else>
            <ResultRow label="Each side" :value="r ? dim(r.side) : null" big />
            <ResultRow v-if="shape === 'triangle'" label="Height (apex to base)" :value="r ? dim(r.height) : null" />
          </template>
          <ResultRow label="Cut the wire to start" :value="r ? dim(r.perimeter * 1.03) : null" note="3% long, then trim" />
        </div>
        <div class="card stack">
          <h3>Matching section (optional)</h3>
          <p class="muted" style="margin:0">A full-wave loop is typically around 100–120 Ω. A quarter-wave of 75 Ω coax between the loop and a 50 Ω line is a common way to bring that near 50 Ω.</p>
          <NumField v-model="vf" label="Velocity factor of the 75 Ω coax" :min="0" :max="1" minExclusive hint="Typical solid-PE coax is 0.66; check the datasheet." />
          <div class="results"><ResultRow label="Quarter-wave section" :value="match == null ? null : dim(match)" big /></div>
        </div>
      </div>
      <div class="stack">
        <div class="card">
          <svg ref="svgEl" class="diagram dg-big" viewBox="0 0 640 300" role="img" :aria-label="`Full-wave ${shape} loop, perimeter ${dim(r?.perimeter)}`">
            <template v-if="shape === 'square'">
              <rect class="dg-wire" x="220" y="40" width="200" height="200" fill="none" />
              <text class="dg-dimtext" x="320" y="30" text-anchor="middle">{{ dim(r?.side) }}</text>
              <text class="dg-dimtext" x="210" y="145" text-anchor="end">{{ dim(r?.side) }}</text>
              <circle class="dg-solid" cx="320" cy="240" r="6" /><text class="dg-text" x="320" y="268" text-anchor="middle">feed (bottom centre)</text>
            </template>
            <template v-else-if="shape === 'triangle'">
              <path class="dg-wire" d="M320 40 L430 235 L210 235 Z" fill="none" />
              <text class="dg-dimtext" x="396" y="122">{{ dim(r?.side) }}</text>
              <text class="dg-dimtext" x="244" y="122" text-anchor="end">{{ dim(r?.side) }}</text>
              <text class="dg-dimtext" x="320" y="262" text-anchor="middle">{{ dim(r?.side) }}</text>
              <circle class="dg-solid" cx="320" cy="235" r="6" /><text class="dg-text" x="320" y="286" text-anchor="middle">feed (base centre)</text>
            </template>
            <template v-else>
              <circle class="dg-wire" cx="320" cy="140" r="100" fill="none" />
              <line class="dg-dim" x1="220" y1="140" x2="420" y2="140" /><text class="dg-dimtext" x="320" y="132" text-anchor="middle">⌀ {{ dim(r?.diameter) }}</text>
              <circle class="dg-solid" cx="320" cy="240" r="6" /><text class="dg-text" x="320" y="268" text-anchor="middle">feed (bottom)</text>
            </template>
          </svg>
          <p class="hint">Shapes are drawn for illustration; proportions follow the numbers. Hung in a vertical plane, bottom feed gives horizontal polarisation; side feed gives vertical.</p>
        </div>
        <DesignActions v-model:name="name" tool-id="loop" :default-name="`${shape} loop ${f ? fmt(f / 1e6) : ''} MHz`" :svg="svgEl" :file="`loop-${f ? fmt(f / 1e6) : 'x'}MHz.svg`"
          :disabled="!r" :summary="`${f ? fmt(f / 1e6) : ''} MHz, ${shape}, ${dim(r?.perimeter)}`" :params="{ f: f ?? 0, k, shape, vf: vf ?? 0.66 }" />
      </div>
    </div>
    <MaterialsPanel antenna="loop" />
    <ModsPanel antenna="loop" />

    <template #explain>
      <div class="formula">perimeter = k · c / f      k ≈ 1.0218  (1005 ÷ f<sub>MHz</sub> feet)</div>
      <p>A full-wave loop is about one wavelength of wire (slightly more, because of the wire’s end-effects and the closed shape). The numbers are an <strong>empirical design estimate</strong>, not a simulation: shape, wire size, height and nearby objects shift resonance, and gain or radiation patterns are not computed. Square, triangle and circle differ little in resonant length for a given perimeter; the circle encloses the most area.</p>
      <p>Quarter-wave transformer: Z<sub>in</sub> = Z<sub>line</sub>² / Z<sub>load</sub>, so 75 Ω² / ~110 Ω ≈ 51 Ω. It is valid only at the design frequency, so bandwidth is limited.</p>
    </template>
  </ToolLayout>
</template>
