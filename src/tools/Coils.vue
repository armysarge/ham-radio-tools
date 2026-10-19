<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolLayout from '../components/ToolLayout.vue'
import NumField from '../components/NumField.vue'
import ResultRow from '../components/ResultRow.vue'
import { FREQ_UNITS } from '../lib/units'
import { airCoilInductanceUh, airCoilTurns, inductiveReactanceOf, toroidTurns } from '../lib/station'
import { CORES, CORES_META } from '../data/cores'

const mode = ref<'toroid' | 'air'>('toroid')
const coreName = ref('T50-2')
const core = computed(() => CORES.find((c) => c.name === coreName.value)!)
const L = ref<number | null>(10e-6), f = ref<number | null>(7e6)
const dIn = ref<number | null>(1), pitch = ref<number | null>(0.1)
const turns = computed(() => { try { return L.value ? toroidTurns(L.value, core.value.al) : null } catch { return null } })
const xl = computed(() => (L.value && f.value ? inductiveReactanceOf(L.value, f.value) : null))
const airTurns = computed(() => { try { return L.value && dIn.value && pitch.value ? airCoilTurns(L.value * 1e6, dIn.value, pitch.value) : null } catch { return null } })
const airLen = computed(() => (airTurns.value && pitch.value ? airTurns.value * pitch.value : null))
const check = computed(() => (airTurns.value && airLen.value && dIn.value ? airCoilInductanceUh(dIn.value, airLen.value, airTurns.value) : null))
</script>

<template>
  <ToolLayout id="coils" :references="[`Toroid AL values: ${CORES_META.source} (revision ${CORES_META.revision}). Tolerance is typically ±10–25 %.`, 'Turns: N = √(L / AL). Air-core: Wheeler (1928) L(µH) = d²n² / (18d + 40l), inches; about 1 % for length above 0.8 × diameter.']">
    <div class="cols">
      <div class="card stack">
        <div class="seg" role="group" aria-label="Coil type">
          <button :aria-pressed="mode === 'toroid'" @click="mode = 'toroid'">Toroid</button>
          <button :aria-pressed="mode === 'air'" @click="mode = 'air'">Air-core coil</button>
        </div>
        <label v-if="mode === 'toroid'" class="field"><span class="lbl">Core</span>
          <select v-model="coreName"><option v-for="c in CORES" :key="c.name" :value="c.name">{{ c.name }} ({{ c.material }}, AL {{ c.al }})</option></select></label>
        <NumField v-model="L" label="Inductance wanted" unit="µH" :units="[{ label: 'µH', factor: 1e-6 }, { label: 'nH', factor: 1e-9 }, { label: 'mH', factor: 1e-3 }]" :min="0" minExclusive />
        <NumField v-model="f" label="Frequency (for reactance)" :units="FREQ_UNITS" unit="MHz" :min="0" minExclusive />
        <template v-if="mode === 'air'">
          <NumField v-model="dIn" label="Coil diameter" unit="in" :min="0" minExclusive hint="Wheeler’s formula uses inches." />
          <NumField v-model="pitch" label="Winding pitch (wire spacing)" unit="in per turn" :min="0" minExclusive />
        </template>
      </div>
      <div class="stack">
        <div class="card results" aria-live="polite">
          <template v-if="mode === 'toroid'">
            <ResultRow label="Turns to wind" :value="turns" big :note="turns ? `about ${Math.round(turns)} turns, each pass through the hole counts as one` : ''" />
            <p class="hint" v-if="core">{{ core.use }}</p>
            <p class="notice" role="status" v-if="core && core.material.startsWith('Ferrite')">Ferrite mixes are for chokes and broadband transformers: don’t use them for high-Q tuned coils.</p>
          </template>
          <template v-else>
            <ResultRow label="Turns" :value="airTurns" big />
            <ResultRow label="Winding length" :value="airLen" unit="in" />
            <ResultRow label="Check: inductance from those turns" :value="check" unit="µH" />
          </template>
          <ResultRow label="Reactance at this frequency" :value="xl" unit="Ω" />
        </div>
      </div>
    </div>
    <template #explain>
      <div class="formula">toroid: N = √(L / AL)       air: L(µH) = d²n² / (18d + 40l)</div>
      <p>A toroid’s catalogue AL value gives its inductance in nanohenries for one turn squared, so turns follow from a square root. AL varies from part to part and with winding spread; wind the figure, measure it, then add or remove a turn or two. The air-core formula is Wheeler’s, good to about a percent for a coil longer than 0.8 of its diameter.</p>
    </template>
  </ToolLayout>
</template>
