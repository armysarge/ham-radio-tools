<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolLayout from '../components/ToolLayout.vue'
import NumField from '../components/NumField.vue'
import ResultRow from '../components/ResultRow.vue'
import LineChart from '../components/LineChart.vue'
import { FREQ_UNITS, fmt } from '../lib/units'
import { filterAttenuationDb, filterG, lowPassParts, type FilterKind } from '../lib/station'

const kind = ref<FilterKind>('chebyshev')
const order = ref(5)
const topo = ref<'pi' | 't'>('pi')
const fc = ref<number | null>(30e6), z0 = ref<number | null>(50), ripple = ref<number | null>(0.1)
const parts = computed(() => {
  try { return fc.value && z0.value ? lowPassParts(filterG(kind.value, order.value, ripple.value ?? 0.1), fc.value, z0.value, topo.value) : [] } catch { return [] }
})
const curve = computed<[number, number][]>(() => {
  if (!parts.value.length) return []
  return Array.from({ length: 60 }, (_, i) => { const r = 0.3 + (i * 2.7) / 59; return [r, Math.min(80, filterAttenuationDb(kind.value, order.value, r, ripple.value ?? 0.1))] as [number, number] })
})
const att2 = computed(() => (parts.value.length ? filterAttenuationDb(kind.value, order.value, 2, ripple.value ?? 0.1) : null))
const att3 = computed(() => (parts.value.length ? filterAttenuationDb(kind.value, order.value, 3, ripple.value ?? 0.1) : null))
const show = (p: { kind: string; value: number }) => (p.kind === 'C' ? `${fmt(p.value * 1e12, 4)} pF` : `${fmt(p.value * 1e6, 4)} µH`)
</script>

<template>
  <ToolLayout id="low-pass-filter" :references="['Zverev, Handbook of Filter Synthesis; Williams &amp; Taylor, Electronic Filter Design Handbook: Butterworth and Chebyshev prototype g-values.', 'ARRL Handbook, “RF Techniques”: low-pass filters for harmonic suppression.']">
    <div class="cols">
      <div class="card stack">
        <div class="seg" role="group" aria-label="Response">
          <button :aria-pressed="kind === 'butterworth'" @click="kind = 'butterworth'">Butterworth (flat)</button>
          <button :aria-pressed="kind === 'chebyshev'" @click="kind = 'chebyshev'">Chebyshev (steeper)</button>
        </div>
        <label class="field"><span class="lbl">Order (number of parts)</span><select v-model.number="order"><option v-for="n in [3, 5, 7, 9]" :key="n" :value="n">{{ n }}</option></select></label>
        <div class="seg" role="group" aria-label="Topology">
          <button :aria-pressed="topo === 'pi'" @click="topo = 'pi'">Pi (C-L-C…)</button>
          <button :aria-pressed="topo === 't'" @click="topo = 't'">T (L-C-L…)</button>
        </div>
        <NumField v-model="fc" label="Cutoff frequency" :units="FREQ_UNITS" unit="MHz" :min="0" minExclusive hint="Just above the highest frequency you want to pass." />
        <NumField v-model="z0" label="System impedance" unit="Ω" :min="0" minExclusive />
        <NumField v-if="kind === 'chebyshev'" v-model="ripple" label="Pass-band ripple" unit="dB" :min="0" minExclusive :max="3" />
      </div>
      <div class="stack">
        <div class="card results" aria-live="polite">
          <ResultRow v-for="(p, i) in parts" :key="i" :label="`${p.kind === 'C' ? 'C' : 'L'}${i + 1} (${p.position})`" :value="show(p)" big />
          <ResultRow label="Attenuation at 2 × cutoff" :value="att2" unit="dB" note="ideal parts" />
          <ResultRow label="Attenuation at 3 × cutoff" :value="att3" unit="dB" note="ideal parts" />
        </div>
        <div class="card" v-if="curve.length">
          <LineChart :points="curve" x-label="Frequency ÷ cutoff" y-label="Attenuation (dB)" title="Attenuation in dB against frequency as a multiple of the cutoff for this filter" />
          <p class="hint">Standard values are rarely exact: use the nearest, or parallel two capacitors, then check the cutoff with an analyser. Toroids for the inductors: see the Coils &amp; Toroids tool.</p>
        </div>
      </div>
    </div>
    <template #explain>
      <p>A ladder of alternating series inductors and shunt capacitors is scaled from a normalised “prototype” table to your cutoff and impedance: C = g / (2π·f<sub>c</sub>·Z₀) and L = g·Z₀ / (2π·f<sub>c</sub>). Odd orders give equal source and load impedance. A Chebyshev design falls away faster than a Butterworth of the same order, in return for a small ripple in the pass-band.</p>
      <p>The attenuation shown is for lossless parts at ideal values. Real coils have loss and stray capacitance, so the stop-band flattens out at high frequency; component tolerance moves the cutoff.</p>
    </template>
  </ToolLayout>
</template>
