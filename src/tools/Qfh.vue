<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import ToolLayout from '../components/ToolLayout.vue'
import NumField from '../components/NumField.vue'
import ResultRow from '../components/ResultRow.vue'
import QfhDiagram from '../components/QfhDiagram.vue'
import MaterialsPanel from '../components/MaterialsPanel.vue'
import ModsPanel from '../components/ModsPanel.vue'
import RadiationPattern from '../components/RadiationPattern.vue'
import AntennaBands from '../components/AntennaBands.vue'
import { FREQ_UNITS, feetInches, fmt } from '../lib/units'
import { qfh } from '../lib/antenna'
import { saveDesign, state } from '../core/store'
import { exportSvg } from '../platform'

const route = useRoute()
const f = ref<number | null>(137.55e6)
const name = ref('')
const svgEl = ref<{ $el: SVGSVGElement }>()
const saved = ref(false)
const loaded = state.designs.find((d) => d.id === route.query.load && d.toolId === 'qfh')
if (loaded) { f.value = Number(loaded.params.f); name.value = loaded.name }
const design = computed(() => { try { return f.value ? qfh(f.value) : null } catch { return null } })
const imperial = computed(() => state.units === 'imperial')
const dim = (m: number | null | undefined) => m == null ? '—' : imperial.value ? feetInches(m) : m >= 1 ? `${m.toFixed(2)} m` : `${(m * 1000).toFixed(1)} mm`
const summary = computed(() => design.value ? `${fmt(f.value! / 1e6)} MHz, long loop ${dim(design.value.longHeight)}, short loop ${dim(design.value.shortHeight)}` : '')
function save() {
  if (!f.value || !design.value) return
  saveDesign({ toolId: 'qfh', name: name.value.trim() || `QFH ${fmt(f.value / 1e6)} MHz`, summary: summary.value, params: { f: f.value } })
  saved.value = true
}
const printPage = () => window.print()
</script>

<template>
  <ToolLayout id="qfh" :references="['EDN, Home Weather Satellite Receiver (2011), published 137.55 MHz receive prototype dimensions and construction notes.', 'NOAA, Building Receive Stations User Guide, Appendix V, QFH satellite-reception overview.']">
    <div class="cols">
      <div class="stack">
        <div class="card stack">
          <NumField v-model="f" label="Design frequency" :units="FREQ_UNITS" unit="MHz" :min="1e6" :max="1e9" hint="137.55 MHz is the documented reference design frequency; other values are proportional scaling only." />
          <p class="notice" style="margin:0">Receive-oriented starting geometry for satellite signals. Confirm locally active frequencies before building.</p>
        </div>
        <div class="card results" aria-live="polite">
          <ResultRow label="Long-loop height" :value="design ? dim(design.longHeight) : null" big />
          <ResultRow label="Short-loop height" :value="design ? dim(design.shortHeight) : null" big />
          <ResultRow label="Loop diameter" :value="design ? dim(design.diameter) : null" />
          <ResultRow label="Upper loop-plane offset" :value="design ? dim(design.loopOffset) : null" />
        </div>
      </div>
      <div class="stack">
        <div class="card stack no-print">
          <h3>Save this design</h3>
          <label class="field"><span class="lbl">Name</span><input v-model="name" type="text" placeholder="e.g. Roof QFH" @input="saved = false" /></label>
          <div><button class="primary" :disabled="!design" @click="save">Save design</button><span v-if="saved" role="status" style="margin-left:.75rem">Saved — see <router-link to="/saved">Saved designs</router-link>.</span></div>
        </div>
      </div>
    </div>

    <div class="card stack" style="margin-top:1rem">
      <h2 style="margin:0">QFH loop layout</h2>
      <QfhDiagram v-if="design" ref="svgEl" :long-height="dim(design.longHeight)" :short-height="dim(design.shortHeight)" :diameter="dim(design.diameter)" :loop-offset="dim(design.loopOffset)" />
      <p class="hint" style="margin:0">Follow each colour around the mast: one pair of half-turn sides exchanges the outer arm ends; the perpendicular pair bows out from the mast and returns to it. Faded sections pass behind the mast. End views show the arm axes at 90°. This is a construction schematic, not a cut template; the displayed dimensions come from the cited EDN build, whose proportions differ from other QFH variants. Feed connections are omitted; follow the complete source build.</p>
      <div class="seg no-print"><button :disabled="!design" @click="svgEl && exportSvg(svgEl.$el, `qfh-${f ? fmt(f / 1e6) : 'x'}MHz.svg`)">Download SVG</button><button @click="printPage">Print</button></div>
    </div>

    <div class="card stack" style="margin-top:1rem">
      <h2>Build and tune</h2>
      <ol style="margin:0;padding-left:1.3rem">
        <li>Use a nonconductive former such as PVC. The cited build uses copper tube with 90° elbows; use bend radii and fittings that preserve the measured loop geometry.</li>
        <li>Form two loops on the same former: one long and one short, crossing around the mast as shown. The four arms need the intended relative feed phase and polarity; follow a complete construction/feed drawing rather than connecting by appearance alone.</li>
        <li>Use a short, low-loss coax run at VHF. Add the common-mode choke appropriate to the published feed arrangement and weatherproof outdoor connections.</li>
        <li>Check reception and measure with a VNA or antenna analyser where practical. Adjust carefully; nearby supports, conductor diameter, bend radius and feed arrangement shift the response.</li>
      </ol>
      <p class="notice" style="margin:0">These outputs scale four dimensions from one published prototype, not a complete cut list. The report describes a 137.55 MHz design whose measured resonance was 133 MHz, so treat it as a starting pattern and tune the finished antenna.</p>
      <p style="margin:0"><a href="https://www.edn.com/home-weather-satellite-receiver/" target="_blank" rel="noopener noreferrer">Read the EDN construction report</a> · <a href="https://noaasis.noaa.gov/NOAASIS/pubs/Users_Guide-Building_Receive_Stations_March_2009.pdf" target="_blank" rel="noopener noreferrer">NOAA receive-station guide</a></p>
    </div>

    <AntennaBands antenna="qfh" />
    <RadiationPattern kind="qfh" />
    <MaterialsPanel antenna="qfh" />
    <ModsPanel antenna="qfh" />

    <template #explain>
      <div class="formula">D = D<sub>ref</sub> × (137.55 MHz ÷ f)</div>
      <p>D is a scaled dimension and D<sub>ref</sub> is its published prototype value. Use the selected frequency f in megahertz.</p>
      <p>This is an empirical geometric scale of the EDN prototype: long loop 560 mm, short loop 512 mm, former diameter 355.6 mm and loop offset 24 mm at 137.55 MHz. It is not a general QFH synthesis method. Changing frequency scales the shape but does not account for conductor thickness, dielectric supports, feed network or surrounding structures.</p>
      <p>QFH antennas use four helical conductors arranged as two unequal loops. The feed network and winding/phase orientation are essential to polarization and pattern; this drawing does not validate either. It is intended as a receive construction starting point, not a transmit-ready design.</p>
    </template>
  </ToolLayout>
</template>
