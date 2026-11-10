<script setup lang="ts">
import { computed, ref } from 'vue'
import '../components/antenna-diagrams.css'
import ToolLayout from '../components/ToolLayout.vue'
import NumField from '../components/NumField.vue'
import { FREQ_UNITS, feetInches } from '../lib/units'
import { quad, yagi } from '../lib/beams'
import { state } from '../core/store'
import BeamDiagram from '../components/BeamDiagram.vue'
import QuadDiagram from '../components/QuadDiagram.vue'
import RadiationPattern from '../components/RadiationPattern.vue'
import AntennaBands from '../components/AntennaBands.vue'

const props = defineProps<{ which: 'yagi' | 'quad' }>()
const isYagi = props.which === 'yagi'
const f = ref<number | null>(isYagi ? 144.2e6 : 28.4e6)
const n = ref(isYagi ? 3 : 2)
const dim = (m: number) => (state.units === 'imperial' ? feetInches(m) : `${m.toFixed(m < 1 ? 3 : 2)} m`)
const rows = computed(() => {
  try {
    if (!f.value) return []
    if (isYagi) return yagi(f.value, n.value).map((e) => ({ role: e.role, a: dim(e.length), b: dim(e.position) }))
    return quad(f.value, n.value).map((e) => ({ role: e.role, a: dim(e.perimeter), b: dim(e.side), c: dim(e.position) }))
  } catch { return [] }
})
const diagram = computed(() => {
  try {
    if (!f.value) return []
    if (isYagi) return yagi(f.value, n.value).map((e) => ({ role: e.role, size: e.length, pos: e.position, label: dim(e.length), posLabel: dim(e.position) }))
    return quad(f.value, n.value).map((e) => ({ role: e.role, size: e.side, pos: e.position, label: dim(e.perimeter), posLabel: dim(e.position) }))
  } catch { return [] }
})
</script>

<template>
  <ToolLayout :id="isYagi ? 'yagi' : 'quad'" :references="isYagi
    ? ['Rule-of-thumb Yagi proportions from the ARRL Antenna Book and amateur practice: reflector about 5 % longer, directors about 5 % shorter than the driven element, 0.15–0.25 λ spacing. DL6WU and the NBS Yagi tables give optimised designs for a specific boom length.']
    : ['Quad loop perimeters from the classic formulas in the ARRL Antenna Book and amateur practice: driven 1005/f ft, reflector 1030/f ft, directors 975/f ft (f in MHz), about 0.2 λ spacing.']">
    <div class="cols">
      <div class="card stack">
        <NumField v-model="f" label="Design frequency" :units="FREQ_UNITS" unit="MHz" :min="1e6" :max="3e9" />
        <label class="field"><span class="lbl">Elements</span><select v-model.number="n"><option v-for="k in (isYagi ? [2, 3, 4, 5, 6, 7, 8] : [2, 3, 4, 5])" :key="k" :value="k">{{ k }}</option></select></label>
        <p class="notice" role="status">A starting design, not an optimised one. No gain or pattern is claimed: build it, then trim with an antenna analyser.</p>
      </div>
      <div class="card">
        <div v-if="diagram.length" class="antenna-drawing beam-drawing">
          <BeamDiagram v-if="isYagi" :rows="diagram" />
          <QuadDiagram v-else :rows="diagram" />
          <p v-if="isYagi" class="hint">← Back · front (beam direction) →</p>
          <p class="hint">R = reflector · DE = driven · D = director. Dimensions are listed below.</p>
        </div>
        <div class="table-wrap"><table class="table">
          <thead v-if="isYagi"><tr><th>Element</th><th>Length</th><th>Distance from reflector</th></tr></thead>
          <thead v-else><tr><th>Loop</th><th>Perimeter</th><th>Side</th><th>Distance from reflector</th></tr></thead>
          <tbody>
            <tr v-for="(r, i) in rows" :key="i"><td>{{ r.role }}</td><td>{{ r.a }}</td><td>{{ r.b }}</td><td v-if="!isYagi">{{ (r as { c?: string }).c }}</td></tr>
          </tbody>
        </table></div>
        <template v-if="isYagi">
          <p class="hint">Lengths are tip to tip, for elements <strong>insulated from the boom</strong>. Elements passing through a metal boom act longer: shorten each by roughly 1–3 % of an element, or follow a design tuned for it. The driven element of a Yagi is low (about 20–25 Ω): feed it with a folded dipole, a gamma/hairpin match, or a 4:1 balun and 75 Ω section.</p>
        </template>
        <template v-else>
          <p class="hint">Square wire loops sit in separate planes across the boom, with their corners on insulating spreaders. The shown feed gap is at the bottom centre of the driven loop. Measure the assembled feed impedance before selecting a matching network; these starting dimensions do not predict a fixed impedance or bandwidth.</p>
        </template>
      </div>
    </div>
    <AntennaBands :antenna="which" />
    <RadiationPattern kind="beam" />
    <template #explain>
      <div v-if="isYagi" class="formula">
        <div>Driven element length = 0.473 × λ</div>
        <div>Reflector length = 1.05 × driven element length</div>
        <div>First director length = 0.95 × driven element length</div>
      </div>
      <div v-else class="formula">
        <div>Driven loop perimeter (ft) = 1005 ÷ f<sub>MHz</sub></div>
        <div>Reflector loop perimeter (ft) = 1030 ÷ f<sub>MHz</sub></div>
        <div>Director loop perimeter (ft) = 975 ÷ f<sub>MHz</sub></div>
      </div>
      <p v-if="isYagi">λ is the free-space wavelength in metres. Each additional director is 0.97 times the length of the previous one.</p>
      <p v-else>f<sub>MHz</sub> is the design frequency in megahertz. Each side is one quarter of its loop perimeter. Loop spacing is 0.2 times the free-space wavelength.</p>
      <p v-if="isYagi">A Yagi’s parasitic elements are not fed. The one behind the driven element is slightly long, so it re-radiates forward; the ones in front are slightly short, so they pull the pattern forward. Real optimised designs trade lengths and spacings against each other; these proportions are a sound place to begin. The result will cover a narrow band. Every figure is an empirical starting point, not a computed optimum.</p>
      <p v-else>A quad element is a full-wave loop. This starting design uses a larger reflector and smaller directors. The perimeters come from empirical formulas; trim and measure the assembled antenna. The rotatable drawing projects square loop planes and their positions in three dimensions, preserving their relative lengths and spacings. It is a construction view, not a model of gain, impedance or radiation pattern.</p>
    </template>
  </ToolLayout>
</template>

<style scoped>
/* Dense arrays use the dimension table so neighbouring element labels stay distinct. */
.beam-drawing :deep(.dg-dimtext),
.beam-drawing :deep(.dg-tick) { display: none; }
</style>
