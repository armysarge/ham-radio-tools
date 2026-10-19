<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import ToolLayout from '../components/ToolLayout.vue'
import NumField from '../components/NumField.vue'
import ResultRow from '../components/ResultRow.vue'
import { ohm, type OhmKey } from '../lib/rf'

const vals = reactive<Record<OhmKey, number | null>>({ v: 13.8, i: null, r: 4, p: null })
// The two most recently edited quantities are the inputs; the other two are computed.
const order = ref<OhmKey[]>(['r', 'v'])
const names: Record<OhmKey, [string, string]> = { v: ['Voltage', 'V'], i: ['Current', 'A'], r: ['Resistance', 'Ω'], p: ['Power', 'W'] }
const keys: OhmKey[] = ['v', 'i', 'r', 'p']
const U = { v: [{ label: 'V', factor: 1 }, { label: 'mV', factor: 1e-3 }, { label: 'kV', factor: 1e3 }],
  i: [{ label: 'A', factor: 1 }, { label: 'mA', factor: 1e-3 }],
  r: [{ label: 'Ω', factor: 1 }, { label: 'kΩ', factor: 1e3 }, { label: 'MΩ', factor: 1e6 }],
  p: [{ label: 'W', factor: 1 }, { label: 'mW', factor: 1e-3 }, { label: 'kW', factor: 1e3 }] }

function edit(k: OhmKey, v: number | null) {
  order.value = [k, ...order.value.filter((x) => x !== k)].slice(0, 2)
  vals[k] = v
}
const solved = computed(() => {
  const [a, b] = order.value
  const x = vals[a], y = vals[b]
  if (x == null || y == null) return { err: 'Enter values in two of the four boxes.', r: null }
  try { return { err: '', r: ohm(a, x, b, y) } } catch (e) { return { err: (e as Error).message, r: null } }
})
const shownValue = (k: OhmKey) => (order.value.includes(k) ? vals[k] : solved.value.r ? solved.value.r[k] : null)
</script>

<template>
  <ToolLayout id="ohms-law" :references="['Ohm’s law: V = I·R; electrical power P = V·I (any DC or RMS AC resistive circuit).']">
    <div class="cols">
      <div class="card stack">
        <p class="muted" style="margin:0">Type into any <strong>two</strong> boxes. The other two are worked out for you.</p>
        <NumField v-for="k in keys" :key="k" :label="names[k][0]" :model-value="shownValue(k)" :units="U[k]" :unit="names[k][1]"
          :min="0" :disabled="false" :hint="order.includes(k) ? 'You entered this' : 'Calculated'" @update:model-value="edit(k, $event)" />
      </div>
      <div class="stack">
        <div class="card results" aria-live="polite">
          <p v-if="solved.err" class="notice">{{ solved.err }}</p>
          <template v-for="k in keys" :key="k">
            <ResultRow :label="names[k][0]" :value="solved.r ? solved.r[k] : null" :unit="names[k][1]" :note="order.includes(k) ? 'entered' : 'calculated'" :big="!order.includes(k)" />
          </template>
        </div>
        <div class="card">
          <svg class="diagram" viewBox="-30 0 350 170" role="img" aria-label="Simple circuit: a voltage source driving a resistor, with current I">
            <path class="dg-wire" d="M60 40 H260 V130 H60 Z" />
            <rect x="145" y="25" width="50" height="30" fill="var(--panel)" class="dg-wire" />
            <text class="dg-text" x="170" y="20" text-anchor="middle">R = {{ solved.r ? solved.r.r.toPrecision(3) : '?' }} Ω</text>
            <line class="dg-wire" x1="45" y1="70" x2="75" y2="70" /><line class="dg-wire" x1="52" y1="100" x2="68" y2="100" />
            <text class="dg-dimtext" x="30" y="90" text-anchor="end">{{ solved.r ? solved.r.v.toPrecision(3) : '?' }} V</text>
            <text class="dg-dimtext" x="172" y="152" text-anchor="middle">I = {{ solved.r ? solved.r.i.toPrecision(3) : '?' }} A → P = {{ solved.r ? solved.r.p.toPrecision(3) : '?' }} W</text>
          </svg>
        </div>
      </div>
    </div>
    <template #explain>
      <div class="formula">V = I × R     P = V × I = I² × R = V² / R</div>
      <p>Any two quantities fix the other two. Voltage and power must be non-negative here; the tool treats AC values as RMS values in a purely resistive circuit. Reactive loads (coils, capacitors, antennas off resonance) need impedance, not just resistance.</p>
    </template>
  </ToolLayout>
</template>
