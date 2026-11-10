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
      <div class="formula">
        <math display="block">
          <msub><mi>P</mi><mi>antenna</mi></msub><mo>=</mo><msub><mi>P</mi><mi>TX</mi></msub><mo>⋅</mo>
          <msup><mn>10</mn><mfrac><mrow><mo>−</mo><mi>L</mi></mrow><mn>10</mn></mfrac></msup>
        </math>
        <math display="block">
          <mi>EIRP</mi><mo>=</mo><msub><mi>P</mi><mi>antenna</mi></msub><mo>⋅</mo>
          <msup><mn>10</mn><mfrac><msub><mi>G</mi><mi>dBi</mi></msub><mn>10</mn></mfrac></msup>
        </math>
        <math display="block">
          <mi>ERP</mi><mo>=</mo>
          <mfrac><mi>EIRP</mi><msup><mn>10</mn><mfrac><mn>2.15</mn><mn>10</mn></mfrac></msup></mfrac>
        </math>
        <math display="block">
          <msub><mi>G</mi><mi>dBi</mi></msub><mo>=</mo><msub><mi>G</mi><mi>dBd</mi></msub><mo>+</mo><mn>2.15</mn>
        </math>
      </div>
      <p>P<sub>TX</sub> is transmitter output power and P<sub>antenna</sub> is the power reaching the antenna. The equations give both radiated powers in watts. L is total feed-system loss in dB. G<sub>dBi</sub> is gain relative to an isotropic radiator and G<sub>dBd</sub> is gain relative to an ideal half-wave dipole in free space.</p>
      <p>Real installation, ground and nearby objects change the antenna's gain. Enter antenna gain rather than directivity alone; gain must include antenna efficiency. Account for mismatch once, either in realised gain or the entered feed-system loss.</p>
      <div class="formula">
        <math display="block">
          <msub><mi>P</mi><mi>dBm</mi></msub><mo>=</mo><mn>10</mn><msub><mi>log</mi><mn>10</mn></msub><mo>(</mo>
          <mfrac><mi>P</mi><mrow><mn>1</mn><mi>mW</mi></mrow></mfrac>
          <mo>)</mo>
        </math>
      </div>
      <p>P<sub>dBm</sub> is the level relative to 1 mW, and P is any of the calculated powers. Results use your entered gain and loss. The calculator performs no antenna modelling or legal power-limit check.</p>
    </template>
  </ToolLayout>
</template>

<style scoped>
.power-chain { display: grid; text-align: center; gap: .4rem; overflow-wrap: anywhere; }
.power-chain > * { margin: 0; }
</style>
