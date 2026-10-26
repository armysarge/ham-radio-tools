<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolLayout from '../components/ToolLayout.vue'
import NumField from '../components/NumField.vue'
import ResultRow from '../components/ResultRow.vue'
import LineChart from '../components/LineChart.vue'
import FilterCircuit from '../components/FilterCircuit.vue'
import { FREQ_UNITS, fmt } from '../lib/units'
import { filterAttenuationDb, filterG, lowPassParts, highPassParts, type FilterKind } from '../lib/station'

const props = defineProps<{ highPass?: boolean }>()
const kind = ref<FilterKind>('chebyshev')
const order = ref(5)
const topo = ref<'pi' | 't'>('pi')
const fc = ref<number | null>(30e6), z0 = ref<number | null>(50), ripple = ref<number | null>(0.1)
const calculation = computed(() => {
  if (fc.value === null || z0.value === null || (kind.value === 'chebyshev' && ripple.value === null)) return { parts: [], error: '' }
  try {
    const parts = (props.highPass ? highPassParts : lowPassParts)(filterG(kind.value, order.value, ripple.value ?? 0.1), fc.value, z0.value, topo.value)
    if (!parts.every(p => Number.isFinite(p.value) && p.value > 0)) throw new RangeError('Values exceed the supported numeric range')
    return { parts, error: '' }
  } catch (e) { return { parts: [], error: (e as Error).message } }
})
const parts = computed(() => calculation.value.parts)
const attenuation = (ratio: number) => filterAttenuationDb(kind.value, order.value, props.highPass ? 1 / ratio : ratio, ripple.value ?? 0.1)
const curve = computed<[number, number][]>(() => {
  if (!parts.value.length) return []
  return Array.from({ length: 120 }, (_, i) => { const r = 0.1 + (i * 2.9) / 119; return [r, Math.min(80, attenuation(r))] as [number, number] })
})
const att2 = computed(() => parts.value.length ? attenuation(props.highPass ? 0.5 : 2) : null)
const att3 = computed(() => parts.value.length ? attenuation(props.highPass ? 1 / 3 : 3) : null)
const show = (p: { kind: string; value: number }) => (p.kind === 'C' ? `${fmt(p.value * 1e12, 4)} pF` : `${fmt(p.value * 1e6, 4)} µH`)
</script>

<template>
  <ToolLayout :id="highPass ? 'high-pass-filter' : 'low-pass-filter'" :references="['Zverev, Handbook of Filter Synthesis; Williams &amp; Taylor, Electronic Filter Design Handbook: Butterworth and Chebyshev prototype g-values.', 'Analog Devices, Basic Linear Design, Chapter 8, §§8.5–8.6 (pp. 8.55 and 8.65): frequency transformations and passive LC filters.']">
    <div class="cols">
      <div class="card stack">
        <div class="seg" role="group" aria-label="Response">
          <button :aria-pressed="kind === 'butterworth'" @click="kind = 'butterworth'">Butterworth (flat)</button>
          <button :aria-pressed="kind === 'chebyshev'" @click="kind = 'chebyshev'">Chebyshev (steeper)</button>
        </div>
        <label class="field"><span class="lbl">Order (number of parts)</span><select v-model.number="order"><option v-for="n in [3, 5, 7, 9]" :key="n" :value="n">{{ n }}</option></select></label>
        <div class="seg" role="group" aria-label="Topology">
          <button :aria-pressed="topo === 'pi'" @click="topo = 'pi'">{{ highPass ? 'Pi (L-C-L…)' : 'Pi (C-L-C…)' }}</button>
          <button :aria-pressed="topo === 't'" @click="topo = 't'">{{ highPass ? 'T (C-L-C…)' : 'T (L-C-L…)' }}</button>
        </div>
        <NumField v-model="fc" label="Cutoff frequency" :units="FREQ_UNITS" unit="MHz" :min="0" minExclusive :hint="highPass ? 'Below the lowest frequency you want to pass.' : 'Above the highest frequency you want to pass.'" />
        <p class="hint">{{ kind === 'butterworth' ? 'Cutoff is the −3.01 dB point.' : 'Cutoff is the pass-band ripple edge, not the −3 dB point.' }} Equal resistive source and load are assumed.</p>
        <NumField v-model="z0" label="System impedance" unit="Ω" :min="0" minExclusive />
        <NumField v-if="kind === 'chebyshev'" v-model="ripple" label="Pass-band ripple" unit="dB" :min="0" minExclusive :max="3" />
      </div>
      <div class="stack">
        <p v-if="calculation.error" class="err" role="alert">{{ calculation.error }}</p>
        <div v-if="parts.length" class="card"><FilterCircuit :parts="parts" :impedance="z0!" /></div>
        <div class="card results" aria-live="polite">
          <ResultRow v-for="(p, i) in parts" :key="i" :label="`${p.kind === 'C' ? 'C' : 'L'}${i + 1} (${p.position})`" :value="show(p)" big />
          <ResultRow :label="highPass ? 'Attenuation at ½ × cutoff' : 'Attenuation at 2 × cutoff'" :value="att2" unit="dB" note="ideal parts" />
          <ResultRow :label="highPass ? 'Attenuation at ⅓ × cutoff' : 'Attenuation at 3 × cutoff'" :value="att3" unit="dB" note="ideal parts" />
        </div>
        <div class="card" v-if="curve.length">
          <LineChart :points="curve" x-label="Frequency ÷ cutoff" y-label="Attenuation (dB)" title="Attenuation in dB against frequency as a multiple of the cutoff for this filter" />
          <p class="hint">Curve clipped at 80 dB. {{ highPass ? 'A high-pass filter rejects lower frequencies; it does not suppress transmitter harmonics.' : 'A low-pass filter rejects higher frequencies, including harmonics.' }}</p>
          <p class="hint">Standard values are rarely exact: use the nearest, or parallel two capacitors, then check the cutoff with an analyser. Toroids for the inductors: see the Coils &amp; Toroids tool.</p>
        </div>
      </div>
    </div>
    <template #explain>
      <p>The ladder is scaled from normalised prototype values g to your cutoff and impedance. This designer supports odd orders with equal source/load terminations. A Chebyshev response trades pass-band ripple for a steeper transition than Butterworth.</p>
      <p v-if="highPass">High-pass: series C = 1 / (2π f<sub>c</sub> Z₀ g); shunt L = Z₀ / (2π f<sub>c</sub> g). The low-pass response is evaluated at f<sub>c</sub>/f, exchanging low and high frequencies.</p>
      <p v-else>Low-pass: shunt C = g / (2π f<sub>c</sub> Z₀); series L = g Z₀ / (2π f<sub>c</sub>).</p>
      <p>Butterworth attenuation A = 10 log₁₀(1 + x<sup>2n</sup>). Chebyshev A = 10 log₁₀(1 + ε²T<sub>n</sub>(x)²), where ε² = 10<sup>ripple/10</sup> − 1 and T<sub>n</sub> is the Chebyshev polynomial. x = {{ highPass ? 'f꜀/f' : 'f/f꜀' }}.</p>
      <p>The attenuation shown is for lossless parts at ideal values. Real coils have loss and stray capacitance, so the stop-band flattens out at high frequency; component tolerance moves the cutoff.</p>
      <p>Use RF-rated parts and a short, low-inductance ground return. These values do not specify safe transmitter power, capacitor voltage rating, coil current or core material. Check the built filter with suitable instruments before use.</p>
    </template>
  </ToolLayout>
</template>
