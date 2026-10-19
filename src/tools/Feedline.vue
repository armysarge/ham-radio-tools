<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolLayout from '../components/ToolLayout.vue'
import NumField from '../components/NumField.vue'
import ResultRow from '../components/ResultRow.vue'
import { FREQ_UNITS, feetInches } from '../lib/units'
import { physicalLengthForDegrees, wavelength } from '../lib/rf'

// Typical published velocity factors for common solid/foam-dielectric lines; check your cable's datasheet.
const CABLES: [string, number][] = [['RG-58 / RG-213 (solid PE)', 0.66], ['RG-8X (foam)', 0.78], ['LMR-400 / RG-213 foam types', 0.85], ['Ladder line (open wire)', 0.95], ['Custom', 0.66]]
const f = ref<number | null>(14.2e6)
const vf = ref<number | null>(0.66)
const deg = ref<number | null>(90)
const cable = ref(0)
const pickCable = () => { if (cable.value < CABLES.length - 1) vf.value = CABLES[cable.value][1] }
const fractions: [string, number][] = [['1/8 λ', 45], ['1/4 λ', 90], ['1/2 λ', 180], ['1 λ', 360]]

const len = computed(() => { try { return f.value && vf.value && deg.value != null ? physicalLengthForDegrees(f.value, vf.value, deg.value) : null } catch { return null } })
const lam = computed(() => { try { return f.value && vf.value ? wavelength(f.value, vf.value) : null } catch { return null } })
</script>

<template>
  <ToolLayout id="feedline-length" :references="['ARRL Antenna Book, “Transmission Lines”: electrical length = physical length × (360 / λ_line), λ_line = λ₀ × VF.']">
    <div class="cols">
      <div class="card stack">
        <NumField v-model="f" label="Frequency" :units="FREQ_UNITS" unit="MHz" :min="0" minExclusive />
        <label class="field"><span class="lbl">Cable type</span>
          <select v-model.number="cable" @change="pickCable"><option v-for="(c, i) in CABLES" :key="c[0]" :value="i">{{ c[0] }}</option></select></label>
        <NumField v-model="vf" label="Velocity factor" :min="0" :max="1" minExclusive hint="Typical values only — use the figure from your cable’s datasheet." />
        <div class="seg" role="group" aria-label="Common lengths">
          <button v-for="[t, d] in fractions" :key="t" :aria-pressed="deg === d" @click="deg = d">{{ t }}</button>
        </div>
        <NumField v-model="deg" label="Electrical length" unit="degrees" :min="0" hint="360° = one full wavelength in the cable." />
      </div>
      <div class="stack">
        <div class="card results" aria-live="polite">
          <ResultRow label="Cut length (metric)" :value="len" unit="m" big />
          <ResultRow label="Cut length (imperial)" :value="len == null ? null : feetInches(len)" big />
          <ResultRow label="Wavelength in the cable" :value="lam" unit="m" />
        </div>
        <div class="card">
          <svg class="diagram" viewBox="0 0 400 110" role="img" aria-label="Coax section with its cut length marked">
            <rect x="30" y="35" width="340" height="24" rx="12" fill="none" class="dg-wire" />
            <line class="dg-dim" x1="30" y1="85" x2="370" y2="85" /><line class="dg-dim" x1="30" y1="77" x2="30" y2="93" /><line class="dg-dim" x1="370" y1="77" x2="370" y2="93" />
            <text class="dg-dimtext" x="200" y="26" text-anchor="middle">{{ deg ?? '—' }}° at {{ f ? (f / 1e6).toPrecision(4) : '—' }} MHz</text>
            <text class="dg-dimtext" x="200" y="106" text-anchor="middle">{{ len == null ? '—' : len.toFixed(3) + ' m' }}</text>
          </svg>
        </div>
      </div>
    </div>
    <template #explain>
      <div class="formula">L = (θ / 360) × c × VF / f</div>
      <p>Signals travel slower in a cable than in air, so a “quarter wave” of cable is shorter than a quarter wave in free space. Measure the connector-to-connector <em>electrical</em> length: connectors add a little, and VF varies between makes and with age, so cut slightly long and verify with an antenna analyser if precision matters (phasing lines, stubs).</p>
    </template>
  </ToolLayout>
</template>
