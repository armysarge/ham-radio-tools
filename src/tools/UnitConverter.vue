<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ToolLayout from '../components/ToolLayout.vue'
import NumField from '../components/NumField.vue'
import ResultRow from '../components/ResultRow.vue'
import { QUANTITIES, convertUnit } from '../lib/conversions'
import { fmt } from '../lib/units'
import { state } from '../core/store'

const quantity = ref('length'), value = ref<number | null>(1)
const from = ref(state.units === 'imperial' ? 'ft' : 'm'), to = ref(state.units === 'imperial' ? 'm' : 'ft')
const group = computed(() => QUANTITIES.find(q => q.id === quantity.value)!)
const source = computed(() => group.value.units.find(u => u.id === from.value)!), target = computed(() => group.value.units.find(u => u.id === to.value)!)
watch(quantity, () => {
  const defaults: Record<string, [string, string]> = { length: state.units === 'imperial' ? ['ft', 'm'] : ['m', 'ft'], area: state.units === 'imperial' ? ['ft2', 'm2'] : ['m2', 'ft2'], frequency: ['MHz', 'kHz'], time: ['ms', 'us'], capacitance: ['nF', 'pF'], inductance: ['uH', 'mH'], energy: ['Wh', 'J'], temperature: state.units === 'imperial' ? ['F', 'C'] : ['C', 'F'] }
  ;[from.value, to.value] = defaults[quantity.value] ?? [group.value.units[0].id, group.value.units[1].id]
  value.value = quantity.value === 'temperature' ? 20 : 1
})
const result = computed(() => {
  if (value.value == null) return { value: null, error: '' }
  try { return { value: convertUnit(value.value, quantity.value, from.value, to.value), error: '' } }
  catch (error) { return { value: null, error: (error as Error).message } }
})
const canonical = computed(() => {
  if (result.value.value == null || value.value == null) return null
  return convertUnit(value.value, quantity.value, from.value, group.value.units[0].id)
})
const rows = computed(() => group.value.units.map(unit => {
  try { return { unit, value: value.value == null ? null : convertUnit(value.value, quantity.value, from.value, unit.id) } }
  catch { return { unit, value: null } }
}))
function swap() {
  if (result.value.value == null) return
  const converted = result.value.value
  ;[from.value, to.value] = [to.value, from.value]
  value.value = converted
}
const refs = ['NIST SP 811, Appendix B.8: SI and customary unit conversions, temperature offsets and SI prefixes. https://www.nist.gov/pml/special-publication-811/nist-guide-si-appendix-b-conversion-factors/nist-guide-si-appendix-b8', 'NIST revised conversion factors: international foot = 0.3048 m, international acre = 43560 ft². Legacy US survey-foot units are not used. https://www.nist.gov/pml/us-surveyfoot/revised-unit-conversion-factors']
</script>

<template>
  <ToolLayout id="unit-converter" :references="refs">
    <p class="muted">Convert station measurements and component values. Choose a quantity, enter a value and select its units. No network connection is used.</p>
    <div class="cols">
      <div class="card stack">
        <label class="field"><span class="lbl">Quantity</span><select v-model="quantity" aria-label="Quantity"><option v-for="q in QUANTITIES" :key="q.id" :value="q.id">{{ q.name }}</option></select></label>
        <label class="field"><span class="lbl">From unit</span><select v-model="from" aria-label="From unit"><option v-for="u in group.units" :key="u.id" :value="u.id">{{ u.label }}</option></select></label>
        <NumField v-model="value" label="Value to convert" :unit="source?.label" hint="Changing the source unit reinterprets this number. Swap preserves the converted quantity." />
        <label class="field"><span class="lbl">To unit</span><select v-model="to" aria-label="To unit"><option v-for="u in group.units" :key="u.id" :value="u.id">{{ u.label }}</option></select></label>
        <button :disabled="result.value == null" @click="swap">Swap units</button>
        <p v-if="result.error" class="err" role="alert">{{ result.error }}</p>
        <p v-if="quantity === 'length' || quantity === 'area'" class="hint">Feet and inches use international definitions. Legacy US survey feet are not included.</p>
        <p v-if="quantity === 'temperature'" class="hint">Temperatures are absolute readings, not temperature differences. Values below absolute zero are rejected.</p>
        <router-link v-if="quantity === 'power'" to="/tool/dbm-watts">Need logarithmic units? Open dBm, Watts &amp; dB.</router-link>
      </div>
      <div class="stack">
        <div class="card results conversion-result" aria-live="polite">
          <ResultRow label="Converted value" :value="result.value" :unit="target?.label" :sig="8" big />
          <p v-if="result.value != null" class="hint">{{ fmt(value, 8) }} {{ source.label }} = {{ fmt(result.value, 8) }} {{ target.label }}</p>
        </div>
        <div class="card">
          <h2>Same value in other units</h2>
          <div class="table-wrap"><table class="table"><thead><tr><th scope="col">Unit</th><th scope="col">Value</th></tr></thead><tbody><tr v-for="row in rows" :key="row.unit.id"><th scope="row">{{ row.unit.label }}</th><td class="mono">{{ fmt(row.value, 8) }}</td></tr></tbody></table></div>
          <p class="hint">Results use up to eight significant digits. A conversion does not make the original measurement more accurate.</p>
        </div>
      </div>
    </div>
    <template #explain>
      <div class="formula">Canonical value = input × source factor + source offset<br />Output = (canonical value − destination offset) / destination factor</div>
      <p v-if="canonical != null" class="formula">{{ fmt(value, 8) }} {{ source.label }} → {{ fmt(canonical, 8) }} {{ group.units[0].label }} → {{ fmt(result.value, 8) }} {{ target.label }}</p>
      <p>Linear factors and SI prefixes convert through a canonical unit: metres, square metres, hertz, seconds, watts, volts, amperes, ohms, farads, henries, joules or kelvins. Celsius and Fahrenheit also need an offset; °C = (°F − 32) × 5/9. One watt-hour is 3600 joules.</p>
      <p>Conversion factors use exact definitions where specified, evaluated with ordinary floating-point arithmetic. This tool does not calculate dBm, RMS/peak relationships, battery amp-hours from watt-hours, or the frequency–wavelength relationship; those need their dedicated calculators and assumptions.</p>
    </template>
  </ToolLayout>
</template>

<style scoped>
:deep(.copy) { min-height:44px; }
</style>
