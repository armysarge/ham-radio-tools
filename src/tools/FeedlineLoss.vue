<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolLayout from '../components/ToolLayout.vue'
import NumField from '../components/NumField.vue'
import ResultRow from '../components/ResultRow.vue'
import LineChart from '../components/LineChart.vue'
import { FREQ_UNITS, LENGTH_UNITS, fmt } from '../lib/units'
import { dbToFraction, lossWithSwr, matchedLossDb } from '../lib/station'
import { state } from '../core/store'

// Approximate datasheet figures at 100 MHz, rounded. Edit the number if your cable's datasheet says otherwise.
const CABLES: [string, number][] = [['RG-174', 10], ['RG-58', 5], ['RG-8X (mini-8)', 3.7], ['RG-213 / RG-8', 2.0], ['LMR-400 type', 1.3], ['My own cable (enter below)', 3]]
const choice = ref(1)
const ref100 = ref<number | null>(5)
const refHz = ref<number | null>(100e6)
const f = ref<number | null>(14.2e6)
const len = ref<number | null>(20)
const swr = ref<number | null>(1.5)
const watts = ref<number | null>(100)
function pick() { if (choice.value < CABLES.length - 1) ref100.value = CABLES[choice.value][1] }

const imperial = computed(() => state.units === 'imperial')
const res = computed(() => {
  try {
    if (!ref100.value || !refHz.value || !f.value || len.value == null || swr.value == null || swr.value < 1) return null
    const matched = matchedLossDb(ref100.value, refHz.value, f.value, len.value)
    const total = lossWithSwr(matched, swr.value)
    return { matched, total, extra: total - matched, eff: dbToFraction(total) * 100 }
  } catch { return null }
})
const curve = computed<[number, number][]>(() => {
  if (!ref100.value || !refHz.value || len.value == null || swr.value == null || swr.value < 1) return []
  return Array.from({ length: 40 }, (_, i) => { const hz = 1e6 * 500 ** (i / 39); return [hz / 1e6, lossWithSwr(matchedLossDb(ref100.value!, refHz.value!, hz, len.value!), swr.value!)] as [number, number] })
})
const marker = computed<[number, number] | null>(() => (res.value && f.value && f.value >= 1e6 && f.value <= 500e6 ? [f.value / 1e6, res.value.total] : null))
</script>

<template>
  <ToolLayout id="feedline-loss" :references="['ARRL Antenna Book, “Transmission lines”: matched loss scales with length and (for conductor-dominated cable) with √frequency; total loss with SWR = 10·log₁₀((a² − ρ²) / (a(1 − ρ²))), a = 10^(matched dB/10).', 'Cable figures: typical manufacturer datasheet values (rounded); the datasheet for your cable decides.']">
    <div class="cols">
      <div class="stack">
        <div class="card stack">
          <label class="field"><span class="lbl">Cable</span>
            <select v-model.number="choice" @change="pick"><option v-for="(c, i) in CABLES" :key="c[0]" :value="i">{{ c[0] }}</option></select></label>
          <NumField v-model="ref100" label="Datasheet loss" unit="dB per 100 ft" :min="0" minExclusive hint="At the reference frequency below. Approximate for the presets: use your cable’s datasheet if you have it." />
          <NumField v-model="refHz" label="…at this reference frequency" :units="FREQ_UNITS" unit="MHz" :min="0" minExclusive />
        </div>
        <div class="card stack">
          <NumField v-model="f" label="Operating frequency" :units="FREQ_UNITS" unit="MHz" :min="0" minExclusive />
          <NumField v-model="len" label="Cable length" :units="LENGTH_UNITS" :unit="imperial ? 'ft' : 'm'" :min="0" />
          <NumField v-model="swr" label="SWR at the antenna" unit=": 1" :min="1" hint="Measured at the antenna end if you can. 1.0 means a perfect match." />
          <NumField v-model="watts" label="Transmitter power" unit="W" :min="0" minExclusive />
        </div>
      </div>
      <div class="stack">
        <div class="card results" aria-live="polite">
          <ResultRow label="Loss, perfectly matched" :value="res?.matched ?? null" unit="dB" />
          <ResultRow label="Extra loss from the mismatch" :value="res?.extra ?? null" unit="dB" />
          <ResultRow label="Total feedline loss" :value="res?.total ?? null" unit="dB" big />
          <ResultRow label="Power reaching the antenna" :value="res && watts ? watts * res.eff / 100 : null" unit="W" big :note="res ? `${fmt(res.eff, 3)} % of ${watts} W` : ''" />
          <p v-if="res && res.total > 3" class="notice" role="status">More than half your power is lost in the cable. A thicker, lower-loss cable or a shorter run would help (see “What to build it from” in the antenna tools).</p>
        </div>
        <div class="card" v-if="curve.length">
          <LineChart :points="curve" :marker="marker" log-x x-label="Frequency (MHz)" y-label="Total loss (dB)" title="Total feedline loss in dB versus frequency from 1 to 500 MHz for this cable, length and SWR" />
          <p class="hint">Loss climbs with frequency: a cable that is fine on 40 m can be poor on 2 m.</p>
        </div>
      </div>
    </div>
    <template #explain>
      <div class="formula">loss(f) = loss<sub>ref</sub> · √(f / f<sub>ref</sub>) · length / 100 ft       total = 10·log₁₀((a² − ρ²) / (a·(1 − ρ²)))</div>
      <p>Cable loss is quoted in dB per 100 ft (or per 100 m) at a few frequencies. This tool scales one datasheet point with the square root of frequency, which suits HF and VHF where the conductors dominate; at UHF and above the real cable loses more than this predicts, so enter your datasheet figure <em>at your frequency</em> and use that as the reference.</p>
      <p>A mismatch makes the signal travel up and down the line more than once, so it adds loss on top of the matched figure; the extra is small on a low-loss line and large on a lossy one. The SWR must be the value <strong>at the antenna</strong>: a meter at the radio reads lower than the truth on a lossy line. This is a calculation from your inputs; real cables age, kink and get wet.</p>
    </template>
  </ToolLayout>
</template>
