<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolLayout from '../components/ToolLayout.vue'
import NumField from '../components/NumField.vue'
import ResultRow from '../components/ResultRow.vue'
import { dailyEnergy, runtimeHours, solarSizing } from '../lib/station'

const volts = ref<number | null>(12.8)
const loads = ref([
  { name: 'Transmit', amps: 20 as number | null, hours: 0.5 as number | null },
  { name: 'Receive', amps: 1.2 as number | null, hours: 5 as number | null },
  { name: 'Standby / other', amps: 0.2 as number | null, hours: 18 as number | null },
])
const capacity = ref<number | null>(100), usable = ref<number | null>(80)
const sun = ref<number | null>(4), eff = ref<number | null>(70), days = ref<number | null>(2)

const energy = computed(() => {
  try {
    if (!volts.value || loads.value.some((l) => l.amps == null || l.hours == null)) return null
    return dailyEnergy(loads.value.map((l) => ({ amps: l.amps!, hoursPerDay: l.hours! })), volts.value)
  } catch { return null }
})
const hours = computed(() => { try { return energy.value && capacity.value && usable.value && energy.value.avgAmps > 0 ? runtimeHours(capacity.value, usable.value / 100, energy.value.avgAmps) : null } catch { return null } })
const solar = computed(() => { try { return energy.value && energy.value.whPerDay > 0 && sun.value && eff.value && usable.value && days.value != null && volts.value ? solarSizing(energy.value.whPerDay, sun.value, eff.value / 100, days.value, usable.value / 100, volts.value) : null } catch { return null } })
const add = () => loads.value.push({ name: 'Another load', amps: 1, hours: 1 })
</script>

<template>
  <ToolLayout id="power-planner" :references="['Energy = current × hours × voltage. Solar panel size = daily energy ÷ (peak sun hours × system efficiency); battery = daily energy × days of autonomy ÷ usable fraction.', 'Peak sun hours: look up your site (about 3–6 h/day in most of the world; less in winter). Lead-acid should be used only to about 50 %; LiFePO₄ to about 80–90 %.']">
    <div class="cols">
      <div class="stack">
        <div class="card stack">
          <NumField v-model="volts" label="Battery voltage" unit="V" :min="0" minExclusive />
          <div v-for="(l, i) in loads" :key="i" class="stack">
            <input v-model="l.name" :aria-label="'Load ' + (i + 1) + ' name'" />
            <NumField v-model="l.amps" :label="`${l.name}: current`" unit="A" :min="0" />
            <NumField v-model="l.hours" :label="`${l.name}: hours per day`" unit="h" :min="0" :max="24" />
          </div>
          <button class="ghost" @click="add">Add another load</button>
        </div>
        <div class="card stack">
          <NumField v-model="capacity" label="Battery rated capacity" unit="Ah" :min="0" minExclusive />
          <NumField v-model="usable" label="Usable fraction of the capacity" unit="%" :min="1" :max="100" hint="Lead-acid about 50, LiFePO₄ about 80–90." />
          <NumField v-model="sun" label="Peak sun hours per day" unit="h" :min="0" minExclusive />
          <NumField v-model="eff" label="Solar system efficiency" unit="%" :min="1" :max="100" hint="Cable, controller, dirt, heat: 60–75 % is realistic." />
          <NumField v-model="days" label="Days without sun to ride out" unit="days" :min="0" />
        </div>
      </div>
      <div class="card results" aria-live="polite">
        <ResultRow label="Energy used per day" :value="energy?.ahPerDay ?? null" unit="Ah" />
        <ResultRow label="Energy used per day" :value="energy?.whPerDay ?? null" unit="Wh" />
        <ResultRow label="Average current" :value="energy?.avgAmps ?? null" unit="A" />
        <ResultRow label="Battery lasts (no charging)" :value="hours" unit="h" big :note="hours ? `about ${(hours / 24).toFixed(1)} days` : ''" />
        <ResultRow label="Solar panel needed" :value="solar?.panelW ?? null" unit="W" big />
        <ResultRow label="Battery needed for the autonomy chosen" :value="solar?.batteryAh ?? null" unit="Ah" big :note="solar ? `${solar.batteryWh.toFixed(0)} Wh` : ''" />
        <p class="hint">Transmit current is for the duty cycle: SSB and CW draw far less on average than the peak, so enter the average over the hours you transmit.</p>
      </div>
    </div>
    <template #explain>
      <div class="formula">
        <math display="block">
          <msub><mi>Q</mi><mi>day</mi></msub><mo>=</mo><msub><mo>∑</mo><mi>i</mi></msub><msub><mi>I</mi><mi>i</mi></msub><msub><mi>t</mi><mi>i</mi></msub>
        </math>
        <math display="block">
          <msub><mi>E</mi><mi>day</mi></msub><mo>=</mo><mi>V</mi><msub><mi>Q</mi><mi>day</mi></msub>
        </math>
        <math display="block">
          <msub><mi>I</mi><mi>avg</mi></msub><mo>=</mo>
          <mfrac><msub><mi>Q</mi><mi>day</mi></msub><mrow><mn>24</mn><mtext> h</mtext></mrow></mfrac>
        </math>
        <math display="block">
          <msub><mi>t</mi><mi>run</mi></msub><mo>=</mo>
          <mfrac><msub><mi>Q</mi><mi>usable</mi></msub><msub><mi>I</mi><mi>avg</mi></msub></mfrac>
        </math>
        <math display="block">
          <msub><mi>P</mi><mi>panel</mi></msub><mo>=</mo>
          <mfrac><msub><mi>E</mi><mi>day</mi></msub><mrow><msub><mi>t</mi><mi>sun</mi></msub><mi>η</mi></mrow></mfrac>
        </math>
      </div>
      <p>For each load i, I<sub>i</sub> is current in amperes and t<sub>i</sub> is daily use in hours. Q<sub>day</sub> is daily charge in amp-hours, E<sub>day</sub> is daily energy in watt-hours, V is battery voltage, and I<sub>avg</sub> is average current in amperes.</p>
      <p>Runtime t<sub>run</sub> is in hours. Usable capacity Q<sub>usable</sub> is rated amp-hours times the usable fraction. Panel power P<sub>panel</sub> is in watts, t<sub>sun</sub> is peak-sun hours, and η is system efficiency as a fraction, such as 0.8 for 80%. Temperature, ageing and cloud affect actual runtime and solar output.</p>
    </template>
  </ToolLayout>
</template>
