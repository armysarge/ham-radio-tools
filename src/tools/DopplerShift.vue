<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolLayout from '../components/ToolLayout.vue'
import NumField from '../components/NumField.vue'
import ResultRow from '../components/ResultRow.vue'
import { dopplerShift, MAX_DOPPLER_SPEED } from '../lib/rf'
import { FREQ_UNITS, fmt, type Unit } from '../lib/units'

const speedUnits: Unit[] = [
  { label: 'm/s', factor: 1 }, { label: 'km/s', factor: 1000 },
  { label: 'km/h', factor: 1 / 3.6 }, { label: 'mph', factor: 0.44704 },
]
const frequency = ref<number | null>(435e6)
const speed = ref<number | null>(7500)
const approaching = ref(true)
const calculation = computed(() => {
  if (frequency.value == null || speed.value == null) return { result: null, error: '' }
  try {
    return { result: dopplerShift(frequency.value, approaching.value ? -speed.value : speed.value), error: '' }
  } catch (e) {
    return { result: null, error: (e as Error).message }
  }
})
const result = computed(() => calculation.value.result)
const shift = computed(() => result.value
  ? (result.value.shiftHz > 0 ? '+' : '') + fmt(result.value.shiftHz, 7)
  : null)
</script>

<template>
  <ToolLayout id="doppler-shift" :references="['Lunar Gravitational Field Estimation and Satellite Orbit Prediction, NASA Technical Reports Server, §4.3.7, equation (4.3.7-1).']">
    <div class="cols">
      <div class="card stack">
        <NumField v-model="frequency" label="Transmitted frequency" :units="FREQ_UNITS" unit="MHz" :min="0" minExclusive />
        <NumField v-model="speed" label="Line-of-sight speed" :units="speedUnits" unit="km/s" :min="0" :max="MAX_DOPPLER_SPEED"
          hint="Enter how fast the distance between transmitter and receiver changes." />
        <div class="seg" role="group" aria-label="Direction of motion">
          <button :aria-pressed="approaching" @click="approaching = true">Approaching</button>
          <button :aria-pressed="!approaching" @click="approaching = false">Receding</button>
        </div>
        <p v-if="calculation.error" class="err" role="alert">{{ calculation.error }}</p>
      </div>
      <div class="card results" aria-live="polite">
        <ResultRow label="Frequency shift" :value="shift" unit="Hz" />
        <ResultRow label="Received frequency" :value="result ? result.receivedHz / 1e6 : null" unit="MHz" :sig="10" />
      </div>
    </div>
    <template #explain>
      <div class="formula">
        <math display="block">
          <mi>Δ</mi><mi>f</mi><mo>≈</mo><mo>−</mo>
          <mfrac><mrow><msub><mi>f</mi><mi>TX</mi></msub><msub><mi>v</mi><mi>r</mi></msub></mrow><mi>c</mi></mfrac>
        </math>
        <math display="block">
          <msub><mi>f</mi><mi>RX</mi></msub><mo>≈</mo><msub><mi>f</mi><mi>TX</mi></msub><mo>+</mo><mi>Δ</mi><mi>f</mi>
        </math>
      </div>
      <p>f<sub>TX</sub> is the transmitted frequency, f<sub>RX</sub> is the received frequency, and Δf is the shift, all in hertz. v<sub>r</sub> is the signed rate of change in distance in metres per second. c is the speed of light in vacuum, 299&nbsp;792&nbsp;458 m/s.</p>
      <p>Approaching makes v<sub>r</sub> negative and raises the received frequency. Receding makes v<sub>r</sub> positive and lowers it. The first-order shift is zero when the distance is steady, even if there is sideways motion.</p>
      <p>This estimate applies to one radio path at a time, with line-of-sight speed up to 1% of the speed of light. For a satellite, use the range rate at the instant of interest.</p>
    </template>
  </ToolLayout>
</template>
