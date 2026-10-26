<script setup lang="ts">
import { computed, ref } from 'vue'
import ValueInput from './ValueInput.vue'
import ResultRow from './ResultRow.vue'
import { divider, formatValue, parseValue } from '../lib/components'
import { fmt } from '../lib/units'
const vinText = ref('5'), r1Text = ref('10k'), r2Text = ref('10k')
const calculation = computed(() => {
  let vin: number, r1: number, r2: number
  try { vin = parseValue(vinText.value); r1 = parseValue(r1Text.value); r2 = parseValue(r2Text.value) }
  catch { return { result: null, error: '' } }
  try { return { result: { ...divider(vin, r1, r2), vin, r1, r2 }, error: '' } }
  catch (e) { return { result: null, error: (e as Error).message } }
})
const result = computed(() => calculation.value.result)
</script>

<template>
  <div class="voltage-divider">
    <div class="divider-inputs">
      <ValueInput v-model="vinText" label="Input voltage" unit="V" :min="0" hint="Non-negative DC voltage; for example 5 or 3300m." />
      <ValueInput v-model="r1Text" label="R1 (top)" unit="Ω" :min="0" hint="Engineering notation supported: 10k, 4k7, 2M2." />
      <ValueInput v-model="r2Text" label="R2 (bottom)" unit="Ω" :min="0" />
    </div>
    <p v-if="calculation.error" class="err" role="alert">{{ calculation.error }}</p>
    <div v-if="result" class="divider-output">
      <svg class="diagram divider-diagram" viewBox="0 0 420 320" role="img" aria-label="Unloaded voltage divider: input feeds R1, output is the junction of R1 and R2, R2 returns to ground">
        <g fill="none" stroke="var(--accent)" stroke-width="2.5">
          <path d="M180 40 V70 M180 130 V190 M180 250 V280 M180 160 H340 M160 280 H200 M166 287 H194 M174 294 H186" />
          <rect v-if="result.r1" x="163" y="70" width="34" height="60" rx="2" /><path v-else d="M180 70 V130" />
          <rect v-if="result.r2" x="163" y="190" width="34" height="60" rx="2" /><path v-else d="M180 190 V250" />
          <circle cx="180" cy="40" r="4" fill="var(--panel)" /><circle cx="180" cy="160" r="4" fill="var(--accent)" /><circle cx="340" cy="160" r="4" fill="var(--panel)" />
        </g>
        <g fill="var(--ink)" font-size="18" font-family="var(--font)">
          <text x="70" y="35">Vin</text><text x="70" y="58">{{ fmt(result.vin) }} V</text>
          <text x="220" y="94">R1</text><text x="220" y="118">{{ formatValue(result.r1) }}</text>
          <text x="220" y="214">R2</text><text x="220" y="238">{{ formatValue(result.r2) }}</text>
          <text x="310" y="130" text-anchor="middle">Vout</text><text x="310" y="188" text-anchor="middle">{{ fmt(result.vout) }} V</text>
          <text x="70" y="293">0 V / GND</text>
        </g>
      </svg>
      <div class="results divider-results" aria-live="polite">
        <ResultRow label="Output voltage" :value="result.vout" unit="V" big />
        <ResultRow label="Current through the divider" :value="result.current < 1 ? result.current * 1000 : result.current" :unit="result.current < 1 ? 'mA' : 'A'" />
        <ResultRow label="Output / input ratio" :value="result.ratio * 100" unit="%" />
        <ResultRow label="Source resistance seen by the load" :value="formatValue(result.thevenin)" />
      </div>
      <p class="divider-formula"><span>V<sub>out</sub> = V<sub>in</sub> ×</span><span class="fraction"><span>R₂</span><span>R₁ + R₂</span></span></p>
    </div>
    <p class="hint">Ideal, unloaded divider: Vout is measured across R2 relative to ground. Connecting a load changes the result. This is not a regulated supply; component tolerance and resistor power ratings are not modelled.</p>
  </div>
</template>

<style scoped>
.divider-inputs { display: grid; gap: .75rem; }
.divider-formula { display: flex; gap: .5rem; align-items: center; justify-content: center; padding: .75rem; background: var(--panel2); border-radius: 8px; }
.fraction { display: inline-grid; text-align: center; }
.fraction > :first-child { border-bottom: 1px solid currentColor; }
.fraction > span { padding: .1rem .4rem; }
.divider-output { min-width: 0; }
.standalone-divider { display: grid; grid-template-columns: minmax(240px, 320px) minmax(0, 1fr); gap: 1rem; align-items: start; }
.standalone-divider > .hint { grid-column: 1 / -1; }
@media (max-width: 800px) { .standalone-divider { display: block; } }
</style>
