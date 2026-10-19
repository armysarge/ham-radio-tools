<script setup lang="ts">
import { computed, ref } from 'vue'
import { MODS_META, modsFor, type AntennaId, type Evidence } from '../data/antennaMods'

const props = defineProps<{ antenna: AntennaId }>()
const GOALS: Record<string, string> = { range: 'Range', bands: 'More bands', bandwidth: 'Bandwidth', size: 'Smaller size', safety: 'Safety' }
const EV: [Evidence, string][] = [['proven', 'Proven'], ['situational', 'Situational'], ['unproven', 'Unproven / myth']]
const filter = ref<Evidence | 'all'>('all')
const mods = computed(() => modsFor(props.antenna))
const shown = computed(() => mods.value.filter((m) => filter.value === 'all' || m.evidence === filter.value))
const count = (e: Evidence) => mods.value.filter((m) => m.evidence === e).length
</script>

<template>
  <section class="card stack" style="margin-top:1rem">
    <h2>Mods to extend range or bands</h2>
    <p class="muted" style="margin:0">Ideas builders use on this antenna, labelled by how well each claim is supported. No gain numbers are quoted: the result depends on your site, and this app does not simulate antennas.</p>
    <div class="seg" role="group" aria-label="Filter by evidence">
      <button :aria-pressed="filter === 'all'" @click="filter = 'all'">All ({{ mods.length }})</button>
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
