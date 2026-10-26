<script setup lang="ts">
import { computed } from 'vue'
import { ANTENNA_BANDS, type AntennaBandId } from '../data/antennaBands'
const props = defineProps<{ antenna: AntennaBandId }>()
const guide = computed(() => ANTENNA_BANDS[props.antenna])
</script>

<template>
  <section class="card stack antenna-bands" style="margin-top:1rem" aria-label="Recommended bands and uses">
    <h2>Recommended bands and uses</h2>
    <ul>
      <li v-for="choice in guide.choices" :key="choice.bands"><strong>{{ choice.bands }}</strong> — {{ choice.use }}</li>
    </ul>
    <p>{{ guide.limit }}</p>
    <p class="hint">Practical starting choices, not a universal ranking. Size and tune the antenna for your chosen band; check your local allocations before transmitting. Background: <a :href="guide.reference.url" target="_blank" rel="noopener noreferrer">{{ guide.reference.title }}</a>.</p>
  </section>
</template>

<style scoped>
.antenna-bands h2,.antenna-bands p,.antenna-bands ul { margin:0; }
.antenna-bands ul { padding-left:1.25rem; }
.antenna-bands li + li { margin-top:.55rem; }
.antenna-bands li,.antenna-bands p { max-width:85ch; }
</style>
