<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolLayout from '../components/ToolLayout.vue'
import NumField from '../components/NumField.vue'
import ResultRow from '../components/ResultRow.vue'
import LineChart from '../components/LineChart.vue'
import { FREQ_UNITS, type Unit } from '../lib/units'
import { capacitiveReactance, inductiveReactance, resonantFreq } from '../lib/rf'

const L_UNITS: Unit[] = [{ label: 'µH', factor: 1e-6 }, { label: 'nH', factor: 1e-9 }, { label: 'mH', factor: 1e-3 }, { label: 'H', factor: 1 }]
const C_UNITS: Unit[] = [{ label: 'pF', factor: 1e-12 }, { label: 'nF', factor: 1e-9 }, { label: 'µF', factor: 1e-6 }]
const f = ref<number | null>(7.1e6)
const l = ref<number | null>(10e-6)
const c = ref<number | null>(100e-12)

const xl = computed(() => (f.value && l.value ? inductiveReactance(f.value, l.value) : null))
const xc = computed(() => (f.value && c.value ? capacitiveReactance(f.value, c.value) : null))
const f0 = computed(() => (l.value && c.value ? resonantFreq(l.value, c.value) : null))
const z0 = computed(() => (l.value && c.value ? Math.sqrt(l.value / c.value) : null))
const net = computed(() => (xl.value != null && xc.value != null ? xl.value - xc.value : null))

// X vs frequency from 0.25·f0 to 4·f0: inductive reactance rises, capacitive falls, they cross at f0.
const curves = computed(() => {
  if (!f0.value || !l.value || !c.value) return null
  const pts = (fn: (f: number) => number) => Array.from({ length: 50 }, (_, i) => { const fr = f0.value! * 0.25 * 16 ** (i / 49); return [fr / 1e6, fn(fr)] as [number, number] })
  return { xl: pts((fr) => inductiveReactance(fr, l.value!)), xc: pts((fr) => capacitiveReactance(fr, c.value!)) }
})
</script>

<template>
  <ToolLayout id="reactance-resonance" :references="['X_L = 2πfL;  X_C = 1/(2πfC);  f₀ = 1/(2π√LC) — any circuits text, e.g. ARRL Handbook “Electrical Fundamentals”.']">
    <div class="cols">
      <div class="card stack">
        <NumField v-model="f" label="Frequency" :units="FREQ_UNITS" unit="MHz" :min="0" minExclusive />
        <NumField v-model="l" label="Inductance L" :units="L_UNITS" unit="µH" :min="0" minExclusive />
        <NumField v-model="c" label="Capacitance C" :units="C_UNITS" unit="pF" :min="0" minExclusive />
      </div>
      <div class="stack">
        <div class="card results" aria-live="polite">
          <ResultRow label="Resonant frequency f₀" :value="f0 == null ? null : f0 / 1e6" unit="MHz" big />
          <ResultRow label="Inductive reactance X_L" :value="xl" unit="Ω" note="at the frequency entered" />
          <ResultRow label="Capacitive reactance X_C" :value="xc" unit="Ω" />
          <ResultRow label="Net reactance (X_L − X_C)" :value="net" unit="Ω" :note="net == null ? '' : net > 0 ? 'inductive' : net < 0 ? 'capacitive' : 'resonant'" />
          <ResultRow label="Characteristic reactance at f₀" :value="z0" unit="Ω" note="√(L/C): X_L = X_C there" />
        </div>
        <div class="card" v-if="curves">
          <LineChart :points="curves.xl" :points2="curves.xc" log-x x-label="Frequency (MHz)" y-label="Reactance (Ω)" title="Inductive reactance rising and capacitive reactance falling with frequency, crossing at resonance" />
          <p class="hint">Solid: X_L. Dashed: X_C. They cross at f₀.</p>
        </div>
      </div>
    </div>
    <template #explain>
      <div class="formula">X_L = 2π·f·L     X_C = 1 / (2π·f·C)     f₀ = 1 / (2π·√(L·C))</div>
      <p>Ideal components only. Real coils have resistance and self-capacitance, and real capacitors have inductance, so a part’s behaviour departs from these formulas well below its self-resonant frequency. Values are for a lossless series or parallel LC; Q and bandwidth are not computed.</p>
    </template>
  </ToolLayout>
</template>
