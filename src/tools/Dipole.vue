<script setup lang="ts">
import { computed, ref } from 'vue'
import '../components/antenna-diagrams.css'
import { useRoute } from 'vue-router'
import ToolLayout from '../components/ToolLayout.vue'
import ModsPanel from '../components/ModsPanel.vue'
import MaterialsPanel from '../components/MaterialsPanel.vue'
import NumField from '../components/NumField.vue'
import ResultRow from '../components/ResultRow.vue'
import LineChart from '../components/LineChart.vue'
import RadiationPattern from '../components/RadiationPattern.vue'
import AntennaBands from '../components/AntennaBands.vue'
import AntennaHeightGuide from '../components/AntennaHeightGuide.vue'
import { FREQ_UNITS, feetInches, fmt } from '../lib/units'
import { dipoleLength, trimPerLeg, wireHeightReferences } from '../lib/antenna'
import { saveDesign, state } from '../core/store'
import { exportSvg } from '../platform'
import { BANDS } from '../data/bands'


const f = ref<number | null>(7.1e6)
const k = ref(0.95)
const measured = ref<number | null>(null)
const name = ref('')
const route = useRoute()
const svgEl = ref<SVGSVGElement>()

const loaded = state.designs.find((d) => d.id === route.query.load)
if (loaded) { f.value = Number(loaded.params.f); k.value = Number(loaded.params.k); name.value = loaded.name }

const total = computed(() => { try { return f.value ? dipoleLength(f.value, k.value) : null } catch { return null } })
const leg = computed(() => (total.value ? total.value / 2 : null))
const heights = computed(() => { try { return total.value && f.value ? wireHeightReferences(f.value) : null } catch { return null } })
const imperial = computed(() => state.units === 'imperial')
const dim = (m: number | null) => (m == null ? '—' : imperial.value ? feetInches(m) : m >= 1 ? `${m.toFixed(2)} m` : `${(m * 100).toFixed(1)} cm`)
const trim = computed(() => {
  if (total.value == null || !f.value || !measured.value) return null
  return trimPerLeg(total.value, f.value, measured.value)
})
const curve = computed<[number, number][]>(() => Array.from({ length: 60 }, (_, i) => {
  const mhz = 1.8 * (30 / 1.8) ** (i / 59)
  return [mhz, dipoleLength(mhz * 1e6, k.value)]
}))
const marker = computed<[number, number] | null>(() => (f.value && total.value && f.value >= 1.8e6 && f.value <= 30e6 ? [f.value / 1e6, total.value] : null))

function save() {
  if (!total.value || !f.value) return
  saveDesign({ toolId: 'dipole', name: name.value.trim() || `Dipole ${fmt(f.value / 1e6)} MHz`, summary: `${fmt(f.value / 1e6)} MHz, k=${k.value.toFixed(3)}, ${dim(total.value)}`, params: { f: f.value, k: k.value } })
  saved.value = true
}
const saved = ref(false)
const printPage = () => window.print()
</script>

<template>
  <ToolLayout id="dipole" :references="[
    'ARRL Antenna Book — half-wave dipole length L(ft) ≈ 468 / f(MHz), from a velocity/end-effect factor ≈ 0.95.',
    'Straw (ed.), The ARRL Antenna Book; and Rothammel, Antennenbuch (end-effect shortening vs. wire diameter/λ).']">
    <div class="cols">
      <div class="stack">
        <div class="card stack">
          <div class="seg" role="group" aria-label="Band presets">
            <button v-for="[b, mhz] in BANDS" :key="b" :aria-pressed="f === mhz * 1e6" @click="f = mhz * 1e6; saved = false">{{ b }}</button>
          </div>
          <NumField v-model="f" label="Design frequency" :units="FREQ_UNITS" unit="MHz" :min="100e3" :max="1e9" hint="Preset buttons use a typical frequency in each band." />
          <label class="field"><span class="lbl">Shortening factor k = {{ k.toFixed(3) }}</span>
            <input v-model.number="k" type="range" min="0.92" max="0.99" step="0.001" aria-label="Shortening factor" />
            <span class="hint">Thin bare wire often starts near 0.95. Insulation, conductor size, height and surroundings alter resonance; cut long and trim at the final height.</span></label>
        </div>
        <div class="card results" aria-live="polite">
          <ResultRow label="Total length" :value="total ? dim(total) : null" big />
          <ResultRow label="Each leg" :value="leg ? dim(leg) : null" big />
          <ResultRow label="Cut each leg to start" :value="leg ? dim(leg * 1.05) : null" note="5% long, then trim (see below)" />
          <ResultRow label="Total length" :value="total ? (imperial ? total : total / 0.3048) : null" :unit="imperial ? 'm' : 'ft'" />
        </div>
      </div>
      <div class="stack">
        <div class="card">
          <svg ref="svgEl" class="diagram dg-big antenna-drawing" viewBox="0 0 640 355" role="img" :aria-label="`Dipole drawing: each leg ${dim(leg)}, total ${dim(total)}, half-wavelength height reference ${dim(heights?.half ?? null)}`">
            <line class="dg-ground" x1="10" y1="300" x2="630" y2="300" />
            <line class="dg-ground" x1="80" y1="70" x2="80" y2="300" /><line class="dg-ground" x1="560" y1="70" x2="560" y2="300" />
            <path class="dg-wire" d="M80 85 H300 M340 85 H560" />
            <rect class="dg-solid" x="300" y="77" width="40" height="16" rx="3" />
            <path class="dg-ground" d="M320 93 V200" /><text class="dg-text" x="350" y="174">coax to radio</text>
            <text class="dg-text" x="320" y="66" text-anchor="middle">feed point</text>
            <g><line class="dg-dim" x1="80" y1="118" x2="320" y2="118" /><line class="dg-dim" x1="80" y1="108" x2="80" y2="128" /><line class="dg-dim" x1="320" y1="108" x2="320" y2="128" />
              <text class="dg-dimtext" x="200" y="112" text-anchor="middle">{{ dim(leg) }}</text></g>
            <g><line class="dg-dim" x1="320" y1="118" x2="560" y2="118" /><line class="dg-dim" x1="560" y1="108" x2="560" y2="128" />
              <text class="dg-dimtext" x="440" y="112" text-anchor="middle">{{ dim(leg) }}</text></g>
            <g><line class="dg-dim" x1="80" y1="260" x2="560" y2="260" /><line class="dg-dim" x1="80" y1="250" x2="80" y2="270" /><line class="dg-dim" x1="560" y1="250" x2="560" y2="270" />
              <text class="dg-dimtext" x="320" y="247" text-anchor="middle">total {{ dim(total) }}</text></g>
            <path class="dg-dim" d="M45 85 V300 M37 85 H53 M37 300 H53" />
            <text class="dg-dimtext" x="28" y="193" text-anchor="middle" transform="rotate(-90 28 193)">{{ dim(heights?.half ?? null) }}</text>
            <text class="dg-text" x="320" y="338" text-anchor="middle">½λ height target · schematic side view</text>
          </svg>
          <p class="hint">Not to scale in height. Lengths are wire only; add a little for tying off the insulators.</p>
          <AntennaHeightGuide :frequency="total ? f : null" kind="dipole" />
          <div class="seg no-print">
            <button @click="svgEl && exportSvg(svgEl, `dipole-${f ? fmt(f / 1e6) : 'x'}MHz.svg`)">Download SVG</button>
            <button @click="printPage">Print</button>
          </div>
        </div>
        <div class="card">
          <h3>Dipole length across HF</h3>
          <LineChart :points="curve" :marker="marker" log-x x-label="Frequency (MHz)" y-label="Total length (m)" title="Total dipole length in metres versus frequency, 1.8 to 30 MHz" />
        </div>
        <div class="card stack no-print">
          <h3>Save this design</h3>
          <label class="field"><span class="lbl">Name</span><input v-model="name" type="text" placeholder="e.g. Garden 40 m dipole" /></label>
          <div><button class="primary" :disabled="!total" @click="save">Save design</button>
            <span v-if="saved" role="status" style="margin-left:.75rem">Saved — see <router-link to="/saved">Saved designs</router-link>.</span></div>
        </div>
      </div>
    </div>

    <div class="card stack" style="margin-top:1rem">
      <h2>Cut and trim</h2>
      <ol style="margin:0;padding-left:1.3rem">
        <li>Cut each leg about 5% longer than the figure above, and hang the antenna at its final height.</li>
        <li>Measure where the SWR is lowest (an antenna analyser is best).</li>
        <li>Enter that frequency below. If it is <em>below</em> your target, shorten both legs; if <em>above</em>, you cut too much — add wire.</li>
      </ol>
      <div class="cols">
        <NumField v-model="measured" label="Measured resonant frequency" :units="FREQ_UNITS" unit="MHz" :min="0" minExclusive hint="Optional" />
        <div class="results">
          <ResultRow label="Adjust each leg by" :value="trim == null ? null : (trim >= 0 ? 'cut ' : 'add ') + dim(Math.abs(trim))" />
        </div>
      </div>
    </div>

    <MaterialsPanel antenna="dipole" />
    <AntennaBands antenna="dipole" />
    <RadiationPattern kind="dipole" />
    <ModsPanel antenna="dipole" />

    <template #explain>
      <div class="formula">
        <div>L<sub>total</sub> = k × c ÷ (2f)</div>
        <div>L<sub>leg</sub> = L<sub>total</sub> ÷ 2</div>
      </div>
      <p>L<sub>total</sub> is the total wire length in metres and L<sub>leg</sub> is the length of each leg. c is the speed of light in metres per second, f is the design frequency in hertz, and k is the shortening factor. The familiar rule in feet is about 468 ÷ f<sub>MHz</sub>, with frequency in megahertz.</p>
      <p>A free-space half wave would be c ÷ (2f). The wire is electrically longer than it looks because of end effects, so it is cut a few percent shorter. <strong>k is an empirical factor.</strong> This is a design estimate, not a simulation: it says nothing about SWR bandwidth, feed-point impedance or radiation pattern.</p>
      <ul>
        <li><strong>Conductor:</strong> thicker conductors lower k (shorter antenna) and widen bandwidth.</li>
        <li><strong>Height &amp; ground:</strong> below about ¼ wavelength, the ground shifts resonance and impedance noticeably; expect to trim.</li>
        <li><strong>Surroundings:</strong> trees, gutters and metal masts typically lower the resonant frequency.</li>
        <li><strong>Insulation:</strong> covered wire resonates lower than bare wire, so the 5% allowance matters.</li>
      </ul>
      <div class="formula">Trim per leg ≈ L<sub>current</sub> × (1 − f<sub>measured</sub> ÷ f<sub>target</sub>) ÷ 2</div>
      <p>L<sub>current</sub> is the wire’s current total length. f<sub>measured</sub> is its measured resonant frequency and f<sub>target</sub> is the desired resonance. A positive trim means cut that much from each leg. A negative trim means add wire. Use this estimate for small corrections.</p>
    </template>
  </ToolLayout>
</template>
