<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolLayout from '../components/ToolLayout.vue'
import NumField from '../components/NumField.vue'
import ResultRow from '../components/ResultRow.vue'
import LineChart from '../components/LineChart.vue'
import { fromGamma, fromLoad, fromReturnLoss, fromSwr } from '../lib/rf'

type Src = 'swr' | 'rl' | 'gamma' | 'load'
const src = ref<Src>('swr')
const swr = ref<number | null>(1.5), rl = ref<number | null>(14), gamma = ref<number | null>(0.2)
const load = ref<number | null>(75), z0 = ref<number | null>(50)

const m = computed(() => {
  try {
    switch (src.value) {
      case 'swr': return swr.value == null ? null : fromSwr(swr.value)
      case 'rl': return rl.value == null ? null : fromReturnLoss(rl.value)
      case 'gamma': return gamma.value == null ? null : fromGamma(gamma.value)
      default: return load.value == null || z0.value == null ? null : fromLoad(load.value, z0.value)
    }
  } catch { return null }
})
const curve: [number, number][] = Array.from({ length: 91 }, (_, i) => { const s = 1 + i * 0.1; return [s, fromSwr(s).mismatchLossDb] })
const marker = computed<[number, number] | null>(() => (m.value && m.value.swr <= 10 ? [m.value.swr, m.value.mismatchLossDb] : null))
const SRC: [Src, string][] = [['swr', 'SWR'], ['rl', 'Return loss'], ['gamma', '|Γ|'], ['load', 'Load resistance']]
</script>

<template>
  <ToolLayout id="swr" :references="['ARRL Antenna Book, “Transmission Lines” — reflection coefficient, SWR, return loss.', 'Pozar, Microwave Engineering, §2.3 (Γ = (Z_L − Z₀)/(Z_L + Z₀)).']">
    <div class="cols">
      <div class="card stack">
        <div class="seg" role="group" aria-label="Start from">
          <button v-for="[k, t] in SRC" :key="k" :aria-pressed="src === k" @click="src = k">{{ t }}</button>
        </div>
        <NumField v-if="src === 'swr'" v-model="swr" label="SWR" unit=": 1" :min="1" hint="1.0 is a perfect match." />
        <NumField v-else-if="src === 'rl'" v-model="rl" label="Return loss" unit="dB" :min="0" hint="Higher is better. 0 dB = everything reflected." />
        <NumField v-else-if="src === 'gamma'" v-model="gamma" label="Reflection coefficient magnitude |Γ|" :min="0" :max="1" />
        <template v-else>
          <NumField v-model="load" label="Load resistance" unit="Ω" :min="0" hint="Resistive only. Antennas with reactance need a full impedance analyser." />
          <NumField v-model="z0" label="Line impedance Z₀" unit="Ω" :min="0" minExclusive />
        </template>
      </div>
      <div class="stack">
        <div class="card results" aria-live="polite">
          <ResultRow label="SWR" :value="m?.swr ?? null" unit=": 1" big />
          <ResultRow label="Return loss" :value="m?.returnLossDb ?? null" unit="dB" />
          <ResultRow label="Reflection coefficient |Γ|" :value="m?.gamma ?? null" :sig="3" />
          <ResultRow label="Mismatch loss" :value="m?.mismatchLossDb ?? null" unit="dB" note="power lost to the mismatch alone" />
          <ResultRow label="Power reflected" :value="m?.reflectedPct ?? null" unit="%" />
        </div>
        <div class="card">
          <LineChart :points="curve" :marker="marker" x-label="SWR" y-label="Mismatch loss (dB)" title="Mismatch loss in dB versus SWR from 1 to 10" />
          <p class="hint">Most of the loss happens above SWR 3; SWR 2:1 wastes only about 0.5 dB at the load.</p>
        </div>
      </div>
    </div>
    <template #explain>
      <div class="formula">|Γ| = (SWR − 1)/(SWR + 1)     RL = −20·log₁₀|Γ|     ML = −10·log₁₀(1 − |Γ|²)</div>
      <p>Assumes a lossless line, so values are those at the load. Feedline loss makes the SWR measured at the radio look better than at the antenna, and it adds its own loss on top of the mismatch loss shown here. “Power reflected” is |Γ|², not what a tuner or amplifier necessarily sees.</p>
    </template>
  </ToolLayout>
</template>
