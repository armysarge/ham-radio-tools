<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolLayout from '../components/ToolLayout.vue'
import NumField from '../components/NumField.vue'
import ResultRow from '../components/ResultRow.vue'
import LineChart from '../components/LineChart.vue'
import { fromGamma, fromLoad, fromReturnLoss, fromSwr, fromVoltageExtrema, standingWaveEnvelope, type Match } from '../lib/rf'
import { fmt } from '../lib/units'

type Src = 'swr' | 'rl' | 'gamma' | 'load' | 'voltage'
const src = ref<Src>('swr')
const swr = ref<number | null>(1.5), rl = ref<number | null>(14), gamma = ref<number | null>(0.2)
const load = ref<number | null>(75), z0 = ref<number | null>(50)
const vmax = ref<number | null>(3), vmin = ref<number | null>(1)

function solve(): Match | null {
  switch (src.value) {
    case 'swr': return swr.value == null ? null : fromSwr(swr.value)
    case 'rl': return rl.value == null ? null : fromReturnLoss(rl.value)
    case 'gamma': return gamma.value == null ? null : fromGamma(gamma.value)
    case 'voltage': return vmax.value == null || vmin.value == null ? null : fromVoltageExtrema(vmax.value, vmin.value)
    default: return load.value == null || z0.value == null ? null : fromLoad(load.value, z0.value)
  }
}
const calculation = computed(() => {
  try {
    return { match: solve(), error: '' }
  } catch (e) { return { match: null, error: (e as Error).message } }
})
const m = computed(() => calculation.value.match)
const envelope = computed<[number, number][]>(() => m.value ? Array.from({ length: 201 }, (_, i) => [i / 200, standingWaveEnvelope(m.value!.gamma, i / 200)]) : [])
const minimum = computed(() => m.value ? 1 / m.value.swr : 0)
const curve: [number, number][] = Array.from({ length: 91 }, (_, i) => { const s = 1 + i * 0.1; return [s, fromSwr(s).mismatchLossDb] })
const marker = computed<[number, number] | null>(() => (m.value && m.value.swr <= 10 ? [m.value.swr, m.value.mismatchLossDb] : null))
const SRC: [Src, string][] = [['swr', 'SWR'], ['rl', 'Return loss'], ['gamma', '|Γ|'], ['load', 'Load resistance'], ['voltage', 'Voltage maxima/minima']]
</script>

<template>
  <ToolLayout id="swr" :references="['Keysight FieldFox Online Supplemental Help, “About Display Formats”, VSWR or SWR: Vmax/Vmin and the 3 V / 1 V example (reviewed 2026-10-26).', 'ARRL Antenna Book, “Transmission Lines” — reflection coefficient, SWR, return loss.', 'Pozar, Microwave Engineering, §2.3 (Γ = (Z_L − Z₀)/(Z_L + Z₀)).']">
    <p class="muted">VSWR means voltage standing-wave ratio: the SWR normally quoted for an antenna feedline. They are the same ratio here, not two different performance measures.</p>
    <div class="cols">
      <div class="card stack">
        <div class="seg" role="group" aria-label="Start from">
          <button v-for="[k, t] in SRC" :key="k" :aria-pressed="src === k" @click="src = k">{{ t }}</button>
        </div>
        <NumField v-if="src === 'swr'" v-model="swr" label="SWR" unit=": 1" :min="1" hint="1.0 is a perfect match." />
        <NumField v-else-if="src === 'rl'" v-model="rl" label="Return loss" unit="dB" :min="0" hint="Higher is better. 0 dB = everything reflected." />
        <NumField v-else-if="src === 'gamma'" v-model="gamma" label="Reflection coefficient magnitude |Γ|" :min="0" :max="1" />
        <template v-else-if="src === 'voltage'">
          <NumField v-model="vmax" label="Maximum voltage Vmax" unit="V" :min="0" minExclusive />
          <NumField v-model="vmin" label="Minimum voltage Vmin" unit="V" :min="0" hint="Use maxima and minima along the same line, at the same frequency and power, with the same convention (both RMS or both peak)." />
          <p class="hint">These are spatial voltage extrema, not forward and reflected readings from a directional wattmeter. Do not probe a transmitting feedline with an ordinary multimeter.</p>
        </template>
        <template v-else>
          <NumField v-model="load" label="Load resistance" unit="Ω" :min="0" hint="Resistive only. Antennas with reactance need a full impedance analyser." />
          <NumField v-model="z0" label="Line impedance Z₀" unit="Ω" :min="0" minExclusive />
        </template>
      </div>
      <div class="stack">
        <p v-if="calculation.error" class="err" role="alert">{{ calculation.error }}</p>
        <div class="card results" aria-live="polite">
          <ResultRow label="SWR / VSWR" :value="m?.swr ?? null" unit=": 1" big />
          <p v-if="src === 'voltage' && m" class="hint">VSWR = {{ fmt(vmax) }} V ÷ {{ fmt(vmin) }} V = {{ fmt(m.swr) }} : 1</p>
          <ResultRow label="Return loss" :value="m?.returnLossDb ?? null" unit="dB" />
          <ResultRow label="Reflection coefficient |Γ|" :value="m?.gamma ?? null" :sig="3" />
          <ResultRow label="Mismatch loss" :value="m?.mismatchLossDb ?? null" unit="dB" note="Reduction in accepted power relative to incident power at this interface" />
          <ResultRow label="Power reflected" :value="m?.reflectedPct ?? null" unit="%" />
        </div>
        <div v-if="envelope.length" class="card">
          <h2>Standing-wave voltage envelope</h2>
          <LineChart :points="envelope" :points2="[[0, minimum], [1, minimum]]" x-label="Distance along line (wavelengths)" y-label="Voltage ÷ Vmax" title="Normalised standing-wave voltage envelope" />
          <p class="hint">Vmax = 1 and Vmin = {{ fmt(minimum) }} on this relative scale. The dashed line marks Vmin. Maxima repeat every ½ line wavelength; the origin is chosen at a maximum. This is a magnitude envelope, not an instantaneous RF waveform.</p>
        </div>
        <div class="card">
          <LineChart :points="curve" :marker="marker" x-label="SWR" y-label="Mismatch loss (dB)" title="Mismatch loss in dB versus SWR from 1 to 10" />
          <p class="hint">At 2:1, about 11.1% of incident power is reflected and mismatch loss is about 0.51 dB. Reflection does not by itself mean this power is dissipated as heat; actual station losses depend on the line, source and tuner.</p>
        </div>
      </div>
    </div>
    <template #explain>
      <p>VSWR = V<sub>max</sub> / V<sub>min</sub> = (1 + |Γ|) / (1 − |Γ|)</p>
      <p>|Γ| = (VSWR − 1) / (VSWR + 1) &nbsp; · &nbsp; RL = −20 log₁₀|Γ| &nbsp; · &nbsp; ML = −10 log₁₀(1 − |Γ|²)</p>
      <p>A matched line has equal nonzero extrema, VSWR 1:1 and infinite return loss. A zero minimum with a nonzero maximum represents ideal total reflection: infinite VSWR, 0 dB return loss and 100% reflected power. Zero for both voltages gives no defined ratio.</p>
      <p>The illustrative envelope assumes a uniform lossless line and a single frequency. With g = |Γ| and u = distance / line wavelength, V/V<sub>max</sub> = √[cos²(2πu) + ((1 − g)/(1 + g))² sin²(2πu)]. Unknown reflection phase shifts the envelope along the line; it does not change VSWR. The drawing does not locate voltage peaks on your installation.</p>
      <p>Assumes a lossless line, so values are those at the load. Feedline loss makes the SWR measured at the radio look better than at the antenna, and it adds its own loss on top of the mismatch loss shown here. “Power reflected” is |Γ|², not what a tuner or amplifier necessarily sees.</p>
    </template>
  </ToolLayout>
</template>
