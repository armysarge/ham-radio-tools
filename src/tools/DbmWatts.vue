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
      <div class="formula">
        <math display="block">
          <msub><mi>P</mi><mi>dBm</mi></msub><mo>=</mo><mn>10</mn><msub><mi>log</mi><mn>10</mn></msub><mo>(</mo>
          <mfrac><mi>P</mi><mrow><mn>1</mn><mi>mW</mi></mrow></mfrac>
          <mo>)</mo>
        </math>
        <math display="block">
          <msub><mi>V</mi><mi>rms</mi></msub><mo>=</mo>
          <msqrt><mi>P</mi><mi>R</mi></msqrt>
        </math>
        <math display="block">
          <mi>Δ</mi><mi>L</mi><mo>=</mo><mn>10</mn><msub><mi>log</mi><mn>10</mn></msub><mo>(</mo>
          <mfrac><msub><mi>P</mi><mn>2</mn></msub><msub><mi>P</mi><mn>1</mn></msub></mfrac>
          <mo>)</mo>
        </math>
        <math display="block">
          <mi>Δ</mi><mi>L</mi><mo>=</mo><mn>20</mn><msub><mi>log</mi><mn>10</mn></msub><mo>(</mo>
          <mfrac><msub><mi>V</mi><mn>2</mn></msub><msub><mi>V</mi><mn>1</mn></msub></mfrac>
          <mo>)</mo>
        </math>
      </div>
      <p>P<sub>dBm</sub> is the power level relative to 1 mW. For the voltage calculation use power P in watts, load resistance R in ohms and RMS voltage V<sub>rms</sub> in volts. ΔL is the level difference in dB. Subscript 1 is the reference and 2 is the comparison. Use matching units in each ratio.</p>
      <p>The voltage-ratio equation assumes both voltages are measured across the same impedance. If the impedances differ, convert both to power first. A 3 dB increase roughly doubles the power and a 6 dB increase roughly doubles the voltage.</p>
    </template>
  </ToolLayout>
</template>
