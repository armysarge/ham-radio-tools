<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolLayout from '../components/ToolLayout.vue'
import NumField from '../components/NumField.vue'
import ResultRow from '../components/ResultRow.vue'
import { radiatedPower } from '../lib/station'
import { POWER_UNITS, fmt } from '../lib/units'
const power = ref<number | null>(100), loss = ref<number | null>(3), gain = ref<number | null>(6)
const reference = ref<'dBi' | 'dBd'>('dBi')
const calculation = computed(() => {
  if (power.value === null || loss.value === null || gain.value === null) return { result: null, error: '' }
  try { return { result: radiatedPower(power.value, loss.value, gain.value, reference.value), error: '' } }
  catch (e) { return { result: null, error: (e as Error).message } }
})
const result = computed(() => calculation.value.result)
</script>

<template>
  <ToolLayout id="radiated-power" :references="['Texas Instruments SWRA048 (May 2005), §1.1: ERP/EIRP definitions and nominal 2.15 dB reference conversion. Used for engineering definitions, not current regulatory limits.']">
    <div class="cols">
      <div class="card stack">
        <NumField v-model="power" label="Transmitter output power" :units="POWER_UNITS" unit="W" :min="0" minExclusive hint="At the transmitter connector. Use the same power basis throughout, such as average or PEP." />
        <NumField v-model="loss" label="Feed-system loss" unit="dB" :min="0" hint="Total loss before the antenna: feedline, connectors, filters and any mismatch allowance. Do not count the same loss twice." />
        <NumField v-model="gain" label="Antenna gain" :unit="reference" hint="Use measured or documented gain for the direction of interest; normally the maximum-gain direction." />
        <label class="field"><span class="lbl">Gain reference</span><select v-model="reference"><option value="dBi">dBi · isotropic radiator</option><option value="dBd">dBd · half-wave dipole</option></select></label>
        <p class="hint">Changing the reference reinterprets the entered gain. For the same antenna, 6 dBi = 3.85 dBd.</p>
      </div>
      <div class="stack">
        <p v-if="calculation.error" class="err" role="alert">{{ calculation.error }}</p>
        <div class="card results" aria-live="polite">
          <ResultRow label="Power at antenna" :value="result?.antennaW ?? null" unit="W" />
          <ResultRow label="EIRP" :value="result?.eirpW ?? null" unit="W" big note="Isotropic reference" />
          <ResultRow label="EIRP in dBm" :value="result?.eirpDbm ?? null" unit="dBm" />
          <ResultRow label="ERP" :value="result?.erpW ?? null" unit="W" big note="Half-wave dipole reference" />
          <ResultRow label="ERP in dBm" :value="result?.erpDbm ?? null" unit="dBm" />
        </div>
        <div v-if="result" class="card stack power-chain" aria-label="Power calculation chain">
          <span>Transmitter · {{ fmt(power!, 4) }} W</span><span aria-hidden="true">↓</span>
          <span>Feed system · −{{ fmt(loss!, 4) }} dB</span><span aria-hidden="true">↓</span>
          <span>Antenna input · {{ fmt(result.antennaW, 4) }} W</span><span aria-hidden="true">↓</span>
          <span>Directional gain · {{ fmt(result.gainDbi, 4) }} dBi → {{ fmt(result.eirpW, 4) }} W EIRP</span>
        </div>
        <p class="hint">ERP and EIRP describe equivalent power in a specified direction. They are not total radiated watts or a range prediction. Gain redirects energy; it does not create transmitter power.</p>
      </div>
    </div>
    <template #explain>
      <p>P<sub>antenna</sub> = P<sub>TX</sub> × 10<sup>−loss/10</sup></p>
      <p>EIRP = P<sub>antenna</sub> × 10<sup>G(dBi)/10</sup> &nbsp; · &nbsp; ERP = EIRP ÷ 10<sup>2.15/10</sup></p>
      <p>G(dBi) = G(dBd) + 2.15. This nominal conversion references an ideal half-wave dipole in free space. Real installation, ground and nearby objects change the antenna's gain. Enter antenna gain rather than directivity alone; gain must include antenna efficiency. Account for mismatch once, either in realised gain or the entered feed-system loss.</p>
      <p>For logarithmic power, dBm = 10 log₁₀(P in watts) + 30. Results use your entered gain and loss; no antenna model or legal power-limit check is performed.</p>
    </template>
  </ToolLayout>
</template>

<style scoped>
.power-chain { display: grid; text-align: center; gap: .4rem; overflow-wrap: anywhere; }
.power-chain > * { margin: 0; }
</style>
