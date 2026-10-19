<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolLayout from '../components/ToolLayout.vue'
import NumField from '../components/NumField.vue'
import ResultRow from '../components/ResultRow.vue'
import { POWER_UNITS } from '../lib/units'
import { dbToPowerRatio, dbToVoltageRatio, dbmToWatts, vrmsFromWatts, wattsToDbm } from '../lib/rf'

const watts = ref<number | null>(100)
const z = ref<number | null>(50)
const dbmIn = ref<number | null>(null)
const mode = ref<'w' | 'dbm'>('w')
const db = ref<number | null>(3)

const w = computed(() => (mode.value === 'w' ? watts.value : dbmIn.value == null ? null : dbmToWatts(dbmIn.value)))
const dbm = computed(() => (w.value != null && w.value > 0 ? wattsToDbm(w.value) : null))
const vrms = computed(() => (w.value != null && z.value != null ? vrmsFromWatts(w.value, z.value) : null))
</script>

<template>
  <ToolLayout id="dbm-watts" :references="['dBm is power relative to 1 mW: P(dBm) = 10·log₁₀(P / 1 mW).', 'Voltage ratio dB = 20·log₁₀(V₂/V₁) assumes equal impedances.']">
    <div class="cols">
      <div class="card stack">
        <h2>Power</h2>
        <div class="seg" role="group" aria-label="Enter power as">
          <button :aria-pressed="mode === 'w'" @click="mode = 'w'">Watts</button>
          <button :aria-pressed="mode === 'dbm'" @click="mode = 'dbm'">dBm</button>
        </div>
        <NumField v-if="mode === 'w'" v-model="watts" label="Power" :units="POWER_UNITS" :min="0" minExclusive />
        <NumField v-else v-model="dbmIn" label="Power level" unit="dBm" />
        <NumField v-model="z" label="Load impedance" unit="Ω" :min="0" minExclusive hint="Needed only for the voltage. 50 Ω is typical for amateur gear." />
      </div>
      <div class="card results" aria-live="polite">
        <ResultRow label="Power" :value="w" unit="W" big />
        <ResultRow label="Power" :value="w == null ? null : w * 1000" unit="mW" />
        <ResultRow label="Level" :value="dbm" unit="dBm" big />
        <ResultRow label="Level" :value="dbm == null ? null : dbm - 30" unit="dBW" />
        <ResultRow label="RMS voltage" :value="vrms" unit="V" :note="`across ${z ?? '?'} Ω`" />
        <ResultRow label="Peak voltage" :value="vrms == null ? null : vrms * Math.SQRT2" unit="V" note="sine wave" />
      </div>
    </div>

    <div class="cols" style="margin-top:1rem">
      <div class="card stack">
        <h2>Gain or loss in dB</h2>
        <NumField v-model="db" label="Change" unit="dB" hint="Negative = loss." />
      </div>
      <div class="card results">
        <ResultRow label="Power ratio" :value="db == null ? null : dbToPowerRatio(db)" unit="×" note="output ÷ input power" />
        <ResultRow label="Voltage ratio" :value="db == null ? null : dbToVoltageRatio(db)" unit="×" note="only if both voltages are across the same impedance" />
        <ResultRow label="100 W becomes" :value="db == null ? null : 100 * dbToPowerRatio(db)" unit="W" />
      </div>
    </div>
    <template #explain>
      <div class="formula">dBm = 10·log₁₀(P / 1 mW)     V<sub>rms</sub> = √(P·R)     dB = 10·log₁₀(P₂/P₁) = 20·log₁₀(V₂/V₁)</div>
      <p>Power dB is always valid. The 20·log voltage form assumes both voltages are measured across the same impedance; if the impedances differ, convert both to power first. 3 dB is ≈ ×2 power, 6 dB ≈ ×2 voltage.</p>
    </template>
  </ToolLayout>
</template>
