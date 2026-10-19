<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolLayout from '../components/ToolLayout.vue'
import NumField from '../components/NumField.vue'
import ResultRow from '../components/ResultRow.vue'
import { FREQ_UNITS, fmt } from '../lib/units'
import { fresnelRadius, linkBudget, minDetectableDbm, radioHorizonKm } from '../lib/station'

const txW = ref<number | null>(5), txGain = ref<number | null>(2.15), txLoss = ref<number | null>(1)
const d = ref<number | null>(20), f = ref<number | null>(145e6), other = ref<number | null>(0)
const rxGain = ref<number | null>(2.15), rxLoss = ref<number | null>(1)
const bw = ref<number | null>(2400), nf = ref<number | null>(10), snr = ref<number | null>(10)
const h1 = ref<number | null>(10), h2 = ref<number | null>(2)

const floor = computed(() => { try { return bw.value && nf.value != null && snr.value != null ? minDetectableDbm(bw.value, nf.value, snr.value) : null } catch { return null } })
const b = computed(() => {
  try {
    if ([txW.value, txGain.value, txLoss.value, d.value, f.value, other.value, rxGain.value, rxLoss.value, floor.value].some((v) => v == null)) return null
    return linkBudget({ txW: txW.value!, txGainDbi: txGain.value!, txLossDb: txLoss.value!, dKm: d.value!, fMHz: f.value! / 1e6, rxGainDbi: rxGain.value!, rxLossDb: rxLoss.value!, otherLossDb: other.value!, rxSensDbm: floor.value! })
  } catch { return null }
})
const horizon = computed(() => (h1.value != null && h2.value != null && h1.value >= 0 && h2.value >= 0 ? radioHorizonKm(h1.value, h2.value) : null))
const fres = computed(() => { try { return d.value && f.value ? fresnelRadius(d.value / 2, d.value, f.value / 1e9) : null } catch { return null } })
</script>

<template>
  <ToolLayout id="link-budget" :references="['Free-space path loss: FSPL(dB) = 20·log₁₀(d km) + 20·log₁₀(f MHz) + 32.44 (ITU-R P.525).', 'Thermal noise floor −174 dBm/Hz at 290 K (Boltzmann); radio horizon 3.57·√(k·h) with k = 4/3 (ITU-R P.834 standard atmosphere); first Fresnel radius 17.32·√(d₁d₂/(fD)).']">
    <div class="cols">
      <div class="stack">
        <div class="card stack">
          <NumField v-model="txW" label="Transmitter power" unit="W" :min="0" minExclusive />
          <NumField v-model="txGain" label="Transmit antenna gain" unit="dBi" hint="A dipole is 2.15 dBi; a simple whip is about 0–2 dBi." />
          <NumField v-model="txLoss" label="Transmit feedline and connector loss" unit="dB" :min="0" />
          <NumField v-model="f" label="Frequency" :units="FREQ_UNITS" unit="MHz" :min="0" minExclusive />
          <NumField v-model="d" label="Distance" unit="km" :min="0" minExclusive />
          <NumField v-model="other" label="Other losses (trees, walls, body, fading allowance)" unit="dB" :min="0" hint="Free space is the best case. Allow 10–20 dB for real life." />
        </div>
        <div class="card stack">
          <NumField v-model="rxGain" label="Receive antenna gain" unit="dBi" />
          <NumField v-model="rxLoss" label="Receive feedline and connector loss" unit="dB" :min="0" />
          <NumField v-model="bw" label="Receiver bandwidth" unit="Hz" :min="0" minExclusive hint="SSB about 2400 Hz, FM about 12500 Hz, CW about 500 Hz." />
          <NumField v-model="nf" label="Receiver noise figure" unit="dB" hint="Include external noise at HF, which is far above the receiver’s own." />
          <NumField v-model="snr" label="Signal-to-noise ratio you need" unit="dB" />
        </div>
      </div>
      <div class="stack">
        <div class="card results" aria-live="polite">
          <ResultRow label="Radiated power (EIRP)" :value="b?.eirpDbm ?? null" unit="dBm" />
          <ResultRow label="Free-space path loss" :value="b?.pathLossDb ?? null" unit="dB" />
          <ResultRow label="Signal at the receiver" :value="b?.rxDbm ?? null" unit="dBm" />
          <ResultRow label="Weakest usable signal" :value="floor" unit="dBm" note="noise floor plus the SNR you need" />
          <ResultRow label="Link margin" :value="b?.marginDb ?? null" unit="dB" big :note="b ? (b.marginDb >= 0 ? 'Positive: the signal should be usable' : 'Negative: not enough signal') : ''" />
        </div>
        <div class="card stack">
          <h3>Line of sight</h3>
          <NumField v-model="h1" label="Your antenna height above ground" unit="m" :min="0" />
          <NumField v-model="h2" label="Other antenna height above ground" unit="m" :min="0" />
          <ResultRow label="Radio horizon" :value="horizon" unit="km" note="standard atmosphere, flat terrain" />
          <ResultRow label="First Fresnel radius at mid-path" :value="fres" unit="m" note="keep about 60 % of this clear of obstacles" />
          <p v-if="horizon != null && d && d > horizon" class="notice" role="status">The distance is beyond the radio horizon ({{ fmt(horizon, 3) }} km): expect a weak or no signal unless a repeater, duct or ridge-top helps.</p>
        </div>
      </div>
    </div>
    <template #explain>
      <div class="formula">margin = P<sub>EIRP</sub> − FSPL − other + G<sub>rx</sub> − L<sub>rx</sub> − (−174 + 10·log₁₀(B) + NF + SNR)</div>
      <p>Everything is added in decibels: power out of the antenna, minus the spreading loss over distance, plus the receive antenna gain, minus losses, compared with the weakest signal your receiver can use. The result is a <strong>best-case free-space</strong> figure; it ignores terrain, ground reflections and the atmosphere, so treat the margin as an upper bound, not a promise. A real VHF path wants 10–20 dB of margin to cover fading.</p>
    </template>
  </ToolLayout>
</template>
