<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolLayout from '../components/ToolLayout.vue'
import NumField from '../components/NumField.vue'
import ResultRow from '../components/ResultRow.vue'
import { FREQ_UNITS } from '../lib/units'
import { lNetwork } from '../lib/station'

const rs = ref<number | null>(50), rl = ref<number | null>(200), f = ref<number | null>(14.2e6)
const err = ref('')
const n = computed(() => {
  err.value = ''
  if (!rs.value || !rl.value || !f.value) return null
  try { return lNetwork(rs.value, rl.value, f.value) } catch (e) { err.value = (e as Error).message; return null }
})
const uh = (h: number) => h * 1e6, pf = (c: number) => c * 1e12
</script>

<template>
  <ToolLayout id="l-network" :references="['ARRL Handbook, “Impedance matching networks”: L-network Q = √(R_high/R_low − 1), X_series = Q·R_low, X_shunt = R_high / Q.', 'Resistive impedances only. An antenna with reactance must have it cancelled first.']">
    <div class="cols">
      <div class="card stack">
        <NumField v-model="rs" label="Source resistance (radio side)" unit="Ω" :min="0" minExclusive />
        <NumField v-model="rl" label="Load resistance (antenna side)" unit="Ω" :min="0" minExclusive />
        <NumField v-model="f" label="Frequency" :units="FREQ_UNITS" unit="MHz" :min="0" minExclusive />
        <p v-if="err" class="notice" role="status">{{ err }}</p>
      </div>
      <div class="stack">
        <div class="card results" aria-live="polite">
          <ResultRow label="Network Q" :value="n?.q ?? null" :sig="4" />
          <ResultRow label="Series reactance" :value="n?.xSeries ?? null" unit="Ω" />
          <ResultRow label="Shunt reactance" :value="n?.xShunt ?? null" unit="Ω" :note="n ? `the shunt part goes across the ${n.shuntAcross === 'load' ? 'load (antenna)' : 'source (radio)'}` : ''" />
        </div>
        <div class="card results" v-if="n">
          <h3>Low-pass version (also filters harmonics)</h3>
          <ResultRow label="Series inductor" :value="uh(n.lowPass.L)" unit="µH" big />
          <ResultRow label="Shunt capacitor" :value="pf(n.lowPass.C)" unit="pF" big />
          <h3>High-pass version</h3>
          <ResultRow label="Series capacitor" :value="pf(n.highPass.C)" unit="pF" big />
          <ResultRow label="Shunt inductor" :value="uh(n.highPass.L)" unit="µH" big />
          <p class="hint">Use real parts with enough voltage and current rating for your power; trim on the bench with an analyser.</p>
        </div>
      </div>
    </div>
    <template #explain>
      <div class="formula">Q = √(R<sub>high</sub> / R<sub>low</sub> − 1)     X<sub>series</sub> = Q · R<sub>low</sub>     X<sub>shunt</sub> = R<sub>high</sub> / Q</div>
      <p>An L-network is two parts: one in series with the lower resistance side, one across the higher side. The reactances above become inductances and capacitances at your frequency. Choose the low-pass form when you also want to cut harmonics. It transforms the resistances only at the design frequency, and with a fairly narrow bandwidth for large ratios.</p>
    </template>
  </ToolLayout>
</template>
