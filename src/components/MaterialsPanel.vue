<script setup lang="ts">
import { computed } from 'vue'
import { GROUPS, MATERIALS_META, PICKS, type MatAntenna, type Verdict } from '../data/materials'

const props = defineProps<{ antenna: MatAntenna }>()
const pick = computed(() => PICKS[props.antenna])
const LABEL: Record<Verdict, string> = { best: 'Best', good: 'Good', ok: 'OK for some uses', avoid: 'Avoid' }
const COLOUR: Record<Verdict, string> = { best: 'var(--good)', good: 'var(--accent)', ok: 'var(--warn)', avoid: 'var(--bad)' }
</script>

<template>
  <section class="card stack" style="margin-top:1rem">
    <h2>What to build it from</h2>
    <div class="notice"><strong>For this antenna:</strong>
      <ul style="margin:.4rem 0 0;padding-left:1.2rem"><li v-for="b in pick.best" :key="b" style="margin:.25rem 0">{{ b }}</li></ul>
      <p v-if="pick.extra" style="margin:.5rem 0 0">{{ pick.extra }}</p>
    </div>
    <details v-for="g in GROUPS" :key="g.id" class="explain" style="margin:0">
      <summary>{{ g.title }}</summary>
      <p>{{ g.intro }}</p>
      <div class="table-wrap"><table class="table">
        <thead><tr><th>Choice</th><th>Verdict</th><th>Why</th></tr></thead>
        <tbody><tr v-for="c in g.choices" :key="c.name"><td>{{ c.name }}</td>
          <td><span class="kind" :style="{ borderColor: COLOUR[c.verdict], color: COLOUR[c.verdict] }">{{ LABEL[c.verdict] }}</span></td><td>{{ c.note }}</td></tr></tbody>
      </table></div>
    </details>
    <p class="hint" style="margin:0">{{ MATERIALS_META.source }} Revision {{ MATERIALS_META.revision }}. Product figures (loss, power rating) differ between makes: the datasheet decides.</p>
  </section>
</template>
