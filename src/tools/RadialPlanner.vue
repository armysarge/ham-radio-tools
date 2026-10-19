<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolLayout from '../components/ToolLayout.vue'
import NumField from '../components/NumField.vue'
import ResultRow from '../components/ResultRow.vue'
import { FREQ_UNITS, LENGTH_UNITS } from '../lib/units'
import { radialLengthM, radialPlan } from '../lib/beams'
import { state } from '../core/store'
import RadialDiagram from '../components/RadialDiagram.vue'

const f = ref<number | null>(7.1e6), r = ref<number | null>(8)
const elevated = ref(false)
const plan = computed(() => { try { return f.value && r.value ? radialPlan(f.value, r.value, elevated.value) : null } catch { return null } })
const BANDS: [string, number][] = [['160 m', 1.85e6], ['80 m', 3.6e6], ['40 m', 7.1e6], ['30 m', 10.12e6], ['20 m', 14.2e6], ['17 m', 18.1e6], ['15 m', 21.2e6], ['12 m', 24.9e6], ['10 m', 28.4e6]]
const fits = computed(() => BANDS.map(([name, hz]) => ({ name, len: radialLengthM(hz, 1), ok: r.value != null && r.value >= radialLengthM(hz, 1) })))
const imp = computed(() => state.units === 'imperial')
const show = (m: number) => (imp.value ? `${(m / 0.3048).toFixed(1)} ft` : `${m.toFixed(2)} m`)
</script>

<template>
  <ToolLayout id="radial-planner" :references="['Brown, Lewallen &amp; Epstein, “Ground systems as a factor in antenna efficiency”, Proc. IRE, 1937; ARRL Antenna Book on radial systems; Rudge et al., The Handbook of Antenna Design (IEE, 1982). Radial count recommendations are published rules of thumb, not a calculation of your soil.']">
    <div class="cols">
      <div class="card stack">
        <NumField v-model="f" label="Band frequency" :units="FREQ_UNITS" unit="MHz" :min="0" minExclusive />
        <NumField v-model="r" label="Room available around the base (radius)" :units="LENGTH_UNITS" :unit="imp ? 'ft' : 'm'" :min="0" minExclusive />
        <div class="seg" role="group" aria-label="Mounting">
          <button :aria-pressed="!elevated" @click="elevated = false">On or in the ground</button>
          <button :aria-pressed="elevated" @click="elevated = true">Elevated</button>
        </div>
      </div>
      <div class="stack">
        <div class="card results" aria-live="polite">
          <ResultRow label="Radial length" :value="plan ? show(plan.lengthM) : null" big :note="plan ? (plan.full ? 'a full quarter wave' : `${Math.round(plan.fraction * 100)} % of a quarter wave: the room is the limit`) : ''" />
          <ResultRow label="Number of radials" :value="plan?.count ?? null" big />
          <ResultRow label="Total wire" :value="plan ? show(plan.totalWireM) : null" />
          <RadialDiagram v-if="plan && r" :count="plan.count" :length-label="show(plan.lengthM)" :room-label="show(r)" :fits="plan.full" />
          <p class="hint" v-if="plan">{{ plan.advice }}</p>
        </div>
        <div class="card">
          <h3>Does a full quarter-wave radial fit?</h3>
          <div class="table-wrap"><table class="table"><thead><tr><th>Band</th><th>Radial</th><th>Fits?</th></tr></thead>
            <tbody><tr v-for="b in fits" :key="b.name"><td>{{ b.name }}</td><td>{{ show(b.len) }}</td><td>{{ b.ok ? 'Yes' : 'No' }}</td></tr></tbody></table></div>
        </div>
      </div>
    </div>
    <template #explain>
      <p>A quarter-wave vertical needs a return path for its current. On the ground that is a fan of wires lying on or just under the surface; each extra radial lowers the ground loss. Elevated, a few resonant radials are enough because they carry the current themselves. The counts shown are the commonly quoted ones; your soil, nearby metal and the surface you have decide the real loss, and no tool here can measure that.</p>
    </template>
  </ToolLayout>
</template>
