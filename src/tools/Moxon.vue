<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import '../components/antenna-diagrams.css'
import ToolLayout from '../components/ToolLayout.vue'
import NumField from '../components/NumField.vue'
import ResultRow from '../components/ResultRow.vue'
import DesignActions from '../components/DesignActions.vue'
import AntennaBands from '../components/AntennaBands.vue'
import RadiationPattern from '../components/RadiationPattern.vue'
import { loadedParams, state } from '../core/store'
import { moxon } from '../lib/antenna'
import { FREQ_UNITS, LENGTH_UNITS, M_PER_IN, feetInches, fmt } from '../lib/units'

const saved = loadedParams(useRoute(), 'moxon')
const frequency = ref<number | null>(Number(saved?.f ?? 14.2e6))
const diameter = ref<number | null>(Number(saved?.diameter ?? 0.00163))
const svg = ref<SVGSVGElement>()
const design = computed(() => {
  if (frequency.value == null || diameter.value == null) return { result: null, error: '' }
  try {
    return { result: moxon(frequency.value, diameter.value), error: '' }
  } catch (error) {
    return { result: null, error: (error as Error).message }
  }
})
const result = computed(() => design.value.result)
const frequencyMHz = computed(() => fmt(frequency.value == null ? null : frequency.value / 1e6, 7))
const dimensions = [
  { key: 'width', label: 'A · Overall width' },
  { key: 'drivenTail', label: 'B · Driven tail' },
  { key: 'tipGap', label: 'C · Tip gap' },
  { key: 'reflectorTail', label: 'D · Reflector tail' },
  { key: 'depth', label: 'E · Overall depth' },
] as const

function dim(m: number | undefined) {
  if (m == null) return null
  if (state.units === 'imperial') return m < 1 ? fmt(m / M_PER_IN, 4) + ' in' : feetInches(m)
  return m < 1 ? fmt(m * 1000, 4) + ' mm' : fmt(m, 4) + ' m'
}

const left = 92, right = 448, top = 102, centre = 270
const drawing = computed(() => {
  const r = result.value
  if (!r) return null
  const scale = (right - left) / r.width
  const drivenTip = top + r.drivenTail * scale
  const reflectorTip = drivenTip + r.tipGap * scale
  const bottom = reflectorTip + r.reflectorTail * scale
  return { drivenTip, reflectorTip, bottom }
})
</script>

<template>
  <ToolLayout id="moxon" :references="['L. B. Cebik, W4RNL, “Designing Moxon Rectangles by Equation and by Model,” AntenneX, September 2000.']">
    <div class="cols">
      <div class="stack">
        <div class="card stack">
          <NumField v-model="frequency" label="Design frequency" :units="FREQ_UNITS" unit="MHz" :min="0" minExclusive />
          <NumField v-model="diameter" label="Conductor diameter" :units="LENGTH_UNITS" :unit="state.units === 'imperial' ? 'in' : 'mm'" :min="0" minExclusive
            hint="Use the bare wire diameter or tubing outside diameter. Use the same diameter throughout both elements." />
          <p v-if="design.error" class="err" role="alert">{{ design.error }}</p>
          <p class="hint">The model covers conductor diameters from 0.001% to 1% of the wavelength. It gives starting dimensions for a single band and a nominal 50 Ω feed.</p>
        </div>
        <DesignActions tool-id="moxon" :default-name="'Moxon ' + frequencyMHz + ' MHz'" :svg="svg" :file="'moxon-' + frequencyMHz + 'MHz.svg'"
          :disabled="!result" :summary="frequencyMHz + ' MHz, width ' + (dim(result?.width) ?? '—')" :params="{ f: frequency ?? 0, diameter: diameter ?? 0 }" />
      </div>
      <div class="card stack">
        <h2>Plan view and dimensions</h2>
        <svg v-if="drawing && result" ref="svg" class="diagram antenna-drawing" viewBox="0 0 540 318" role="img"
          aria-label="Moxon plan view with a centre-fed driven element, reflector and two insulated tip gaps">
          <desc>{{ frequencyMHz }} MHz. {{ dimensions.map(({ key, label }) => label + ' ' + dim(result?.[key])).join('. ') }}.</desc>
          <text class="dg-text" x="270" y="28" text-anchor="middle">↑ Forward</text>
          <text class="dg-text" x="270" y="77" text-anchor="middle">Feed point</text>
          <path class="dg-dim" d="M270 83V95" />
          <path class="dg-wire" :d="`M${left} ${drawing.drivenTip} V${top} H${centre - 6} M${centre + 6} ${top} H${right} V${drawing.drivenTip}`" />
          <path class="dg-wire" :d="`M${left} ${drawing.reflectorTip} V${drawing.bottom} H${right} V${drawing.reflectorTip}`" />
          <circle class="dg-solid" :cx="centre - 6" :cy="top" r="3.5" />
          <circle class="dg-solid" :cx="centre + 6" :cy="top" r="3.5" />
          <text class="dg-text" x="270" :y="drawing.bottom + 29" text-anchor="middle">Reflector</text>
          <path class="dg-dim" :d="`M46 ${top} V${drawing.bottom} M40 ${top} H52 M40 ${drawing.bottom} H52 M${left} 278 H${right} M${left} 272 V284 M${right} 272 V284`" />
          <text class="dg-dimtext" x="25" :y="(top + drawing.bottom) / 2 + 8" text-anchor="middle">E</text>
          <text class="dg-dimtext" x="270" y="307" text-anchor="middle">A</text>
          <path class="dg-dim" :d="`M481 ${top} V${drawing.bottom} M475 ${top} H487 M475 ${drawing.drivenTip} H487 M475 ${drawing.reflectorTip} H487 M475 ${drawing.bottom} H487`" />
          <text class="dg-dimtext" x="505" :y="(top + drawing.drivenTip) / 2 + 8" text-anchor="middle">B</text>
          <text class="dg-dimtext" x="505" :y="(drawing.drivenTip + drawing.reflectorTip) / 2 + 8" text-anchor="middle">C</text>
          <text class="dg-dimtext" x="505" :y="(drawing.reflectorTip + drawing.bottom) / 2 + 8" text-anchor="middle">D</text>
        </svg>
        <div class="results" aria-live="polite">
          <ResultRow v-for="{ key, label } in dimensions" :key="key" :label="label" :value="dim(result?.[key])" />
          <ResultRow label="Each driven half to feed centre" :value="dim(result ? result.width / 2 + result.drivenTail : undefined)" />
          <ResultRow label="Total reflector conductor" :value="dim(result ? result.width + 2 * result.reflectorTail : undefined)" />
        </div>
        <p class="hint">Measure along the conductor centreline. The centre feed gap is schematic. Subtract half the actual feed gap from each driven half before allowing for bends and connections.</p>
      </div>
    </div>
    <section class="card stack" style="margin-top:1rem">
      <h2>Build and tune</h2>
      <p>Support both elements symmetrically. Use insulating spacers to keep the two tip gaps equal and electrically isolated. Keep metal supports clear of the elements.</p>
      <p>Feed the split driven element with 50 Ω coax and a 1:1 current choke. Check the assembled antenna with an analyser in its intended position and trim symmetrically. Conductor insulation, supports and nearby objects can shift the match.</p>
    </section>
    <AntennaBands antenna="moxon" />
    <RadiationPattern kind="moxon" />
    <template #explain>
      <div class="formula">
        <math display="block">
          <mi>λ</mi><mo>=</mo><mfrac><msub><mi>c</mi><mn>0</mn></msub><mi>f</mi></mfrac>
        </math>
        <math display="block">
          <mi>x</mi><mo>=</mo><msub><mi>log</mi><mn>10</mn></msub><mo>(</mo><mfrac><mi>d</mi><mi>λ</mi></mfrac><mo>)</mo>
        </math>
        <math display="block">
          <msub><mi>ℓ</mi><mi>i</mi></msub><mo>=</mo><mi>λ</mi><mo>(</mo>
          <msub><mi>a</mi><mi>i</mi></msub><msup><mi>x</mi><mn>2</mn></msup><mo>+</mo>
          <msub><mi>b</mi><mi>i</mi></msub><mi>x</mi><mo>+</mo><msub><mi>c</mi><mi>i</mi></msub><mo>)</mo>
        </math>
        <math display="block">
          <mi>E</mi><mo>=</mo><mi>B</mi><mo>+</mo><mi>C</mi><mo>+</mo><mi>D</mi>
        </math>
      </div>
      <p>c<sub>0</sub> is the speed of light, f is design frequency, and d is conductor diameter. Cebik fitted separate coefficients for each dimension ℓ<sub>i</sub> from A to D using uniform-diameter antenna models. D uses a linear fit. The dimensions target a near-50 Ω feed in free space. Gain, bandwidth and installed SWR require modelling or measurement.</p>
    </template>
  </ToolLayout>
</template>
