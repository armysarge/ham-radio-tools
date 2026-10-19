<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolLayout from '../components/ToolLayout.vue'
import NumField from '../components/NumField.vue'
import { FREQ_UNITS, feetInches } from '../lib/units'
import { quad, yagi } from '../lib/beams'
import { state } from '../core/store'
import BeamDiagram from '../components/BeamDiagram.vue'

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
        <BeamDiagram v-if="diagram.length" :kind="which" :rows="diagram" />
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
          <p class="hint">Loops are square, wire corners on spreaders. The driven loop is about 100–120 Ω; a quarter-wave 75 Ω section brings it near 50 Ω. Directors add gain at the cost of a narrower bandwidth.</p>
        </template>
      </div>
    </div>
    <template #explain>
      <p v-if="isYagi">A Yagi’s parasitic elements are not fed. The one behind the driven element is slightly long, so it re-radiates forward; the ones in front are slightly short, so they pull the pattern forward. Real optimised designs trade lengths and spacings against each other; these proportions are a sound place to begin. The result will cover a narrow band. Every figure is an empirical starting point, not a computed optimum.</p>
      <p v-else>A quad element is a full-wave loop. Making the reflector loop a little bigger and the directors a little smaller produces the same “pull forward” as a Yagi, with a lower impedance and often a quieter receive. The perimeters come from empirical formulas; trim for the frequency you want.</p>
    </template>
  </ToolLayout>
</template>
