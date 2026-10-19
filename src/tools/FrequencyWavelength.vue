<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolLayout from '../components/ToolLayout.vue'
import NumField from '../components/NumField.vue'
import ResultRow from '../components/ResultRow.vue'
import { FREQ_UNITS, LENGTH_UNITS, feetInches } from '../lib/units'
import { frequencyFromWavelength, period, wavelength } from '../lib/rf'
import { state } from '../core/store'

const known = ref<'f' | 'l'>('f')
const f = ref<number | null>(14.2e6)
const l = ref<number | null>(21.1)
const vf = ref<number | null>(1)

const out = computed(() => {
  if (vf.value == null) return null
  const freq = known.value === 'f' ? f.value : l.value == null ? null : frequencyFromWavelength(l.value, vf.value)
  if (freq == null || !(freq > 0)) return null
  const lam = wavelength(freq, vf.value)
  return { freq, lam, per: period(freq) }
})
const imperial = computed(() => state.units === 'imperial')
const len = (m: number) => (imperial.value ? { v: feetInches(m), u: '' } : { v: m, u: 'm' })

// One wavelength of a sine wave with quarter-wave tick marks
const wave = Array.from({ length: 81 }, (_, i) => `${i ? 'L' : 'M'}${40 + i * 5} ${100 - 55 * Math.sin((i / 80) * 2 * Math.PI)}`).join(' ')
</script>

<template>
  <ToolLayout id="frequency-wavelength" :references="['Speed of light c = 299 792 458 m/s (exact, SI definition).', 'ARRL Handbook, chapter “Radio Fundamentals” (λ = c/f).']">
    <div class="cols">
      <div class="card stack">
        <div class="seg" role="group" aria-label="What do you know?">
          <button :aria-pressed="known === 'f'" @click="known = 'f'">I know the frequency</button>
          <button :aria-pressed="known === 'l'" @click="known = 'l'">I know the wavelength</button>
        </div>
        <NumField v-if="known === 'f'" v-model="f" label="Frequency" :units="FREQ_UNITS" unit="MHz" :min="0" minExclusive />
        <NumField v-else v-model="l" label="Wavelength" :units="LENGTH_UNITS" :min="0" minExclusive />
        <NumField v-model="vf" label="Velocity factor" :min="0" :max="1" minExclusive hint="1.00 = free space. Typical coax is 0.66–0.85." />
      </div>
      <div class="stack">
        <div class="card results" aria-live="polite">
          <ResultRow label="Frequency" :value="out ? out.freq / 1e6 : null" unit="MHz" big />
          <ResultRow label="Wavelength" :value="out ? len(out.lam).v : null" :unit="out ? len(out.lam).u : ''" big />
          <ResultRow label="Half wave" :value="out ? len(out.lam / 2).v : null" :unit="out ? len(out.lam / 2).u : ''" />
          <ResultRow label="Quarter wave" :value="out ? len(out.lam / 4).v : null" :unit="out ? len(out.lam / 4).u : ''" />
          <ResultRow label="Period" :value="out ? out.per * 1e6 : null" unit="µs" />
        </div>
        <div class="card">
          <svg class="diagram" viewBox="0 0 440 180" role="img" aria-label="One wavelength of a sine wave with half and quarter wave marks">
            <line class="dg-axis" x1="30" y1="100" x2="430" y2="100" />
            <path class="dg-curve" :d="wave" />
            <g v-for="(m, i) in [['λ/4', 140], ['λ/2', 240], ['3λ/4', 340], ['λ', 440]]" :key="i">
              <line class="dg-dim" :x1="Math.min(m[1] as number, 440) - 0" y1="150" :x2="(m[1] as number) - 0" y2="156" />
            </g>
            <line class="dg-dim" x1="40" y1="160" x2="440" y2="160" /><line class="dg-dim" x1="40" y1="154" x2="40" y2="166" /><line class="dg-dim" x1="440" y1="154" x2="440" y2="166" />
            <text class="dg-dimtext" x="240" y="178" text-anchor="middle">λ = {{ out ? (imperial ? feetInches(out.lam) : out.lam.toPrecision(4) + ' m') : '—' }}</text>
          </svg>
        </div>
      </div>
    </div>
    <template #explain>
      <div class="formula">λ = c × VF / f      T = 1 / f</div>
      <p>c is the speed of light in a vacuum. Signals in cable travel slower by the velocity factor (VF), so the wavelength <em>in the cable</em> is shorter. For antennas in air use VF = 1; the dipole tool applies a separate end-effect factor.</p>
      <p>Result precision is shown to 4 significant figures; inputs are rarely known better than that.</p>
    </template>
  </ToolLayout>
</template>
