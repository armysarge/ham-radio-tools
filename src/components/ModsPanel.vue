<script setup lang="ts">
import { computed, ref } from 'vue'
import { MODS_META, modsFor, type AntennaId, type Evidence, type ModGoal } from '../data/antennaMods'

const props = defineProps<{ antenna: AntennaId }>()
const GOALS: Record<ModGoal, string> = { range: 'Range', reception: 'Reception', bands: 'More bands', bandwidth: 'Bandwidth', size: 'Smaller size', portable: 'Portable', safety: 'Safety' }
const EV: [Evidence, string][] = [['proven', 'Proven'], ['situational', 'Situational'], ['unproven', 'Unproven / myth']]
const filter = ref<Evidence | 'all'>('all')
const goal = ref<ModGoal | 'all'>('all')
const mods = computed(() => modsFor(props.antenna))
const shown = computed(() => mods.value.filter((m) => (filter.value === 'all' || m.evidence === filter.value) && (goal.value === 'all' || m.goal === goal.value)))
const count = (e: Evidence) => mods.value.filter((m) => m.evidence === e).length
</script>

<template>
  <section class="card stack" style="margin-top:1rem">
    <h2>Antenna system improvements</h2>
    <p class="muted" style="margin:0">Ideas for the antenna, feedline, receive setup, and portable station. Filter by goal and evidence. Results depend on frequency, installation, and local noise; this app does not simulate antenna performance.</p>
    <div class="seg" role="group" aria-label="Filter by improvement goal">
      <button :aria-pressed="goal === 'all'" @click="goal = 'all'">All goals</button>
      <button v-for="(label, key) in GOALS" :key="key" :aria-pressed="goal === key" @click="goal = key as ModGoal">{{ label }}</button>
    </div>
    <div class="seg" role="group" aria-label="Filter by evidence">
      <button :aria-pressed="filter === 'all'" @click="filter = 'all'">All ({{ shown.length }})</button>
      <button v-for="[k, t] in EV" :key="k" :aria-pressed="filter === k" @click="filter = k">{{ t }} ({{ count(k) }})</button>
    </div>
    <details v-for="m in shown" :key="m.id" class="explain" style="margin:0">
      <summary style="gap:.6rem;flex-wrap:wrap">
        <span class="kind" :class="m.evidence === 'proven' ? 'analytical' : m.evidence === 'situational' ? 'empirical' : ''" :style="m.evidence === 'unproven' ? 'border-color:var(--bad);color:var(--bad)' : ''">{{ m.evidence === 'unproven' ? 'Unproven' : m.evidence === 'proven' ? 'Proven' : 'Situational' }}</span>
        {{ m.title }} <span class="muted" style="font-weight:400;font-size:.85rem">· {{ GOALS[m.goal] }}</span>
      </summary>
      <p><strong>What:</strong> {{ m.what }}</p>
      <p><strong>Effect:</strong> {{ m.effect }}</p>
      <p><strong>Caveat:</strong> {{ m.caveat }}</p>
      <p class="hint">Basis: {{ m.basis }}</p>
    </details>
    <details class="explain" style="margin:0">
      <summary>What “proven”, “situational” and “unproven” mean</summary>
      <ul><li v-for="[k, t] in EV" :key="k"><strong>{{ t }}:</strong> {{ MODS_META.levels[k] }}</li></ul>
      <p class="hint">Sources consulted for these ratings (revision {{ MODS_META.revision }}): {{ MODS_META.references.join('; ') }}.</p>
    </details>
  </section>
</template>
