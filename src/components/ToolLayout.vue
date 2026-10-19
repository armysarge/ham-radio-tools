<script setup lang="ts">
import { computed } from 'vue'
import { KIND_LABEL, toolById } from '../core/registry'
import { isFavorite, toggleFavorite } from '../core/store'

const props = defineProps<{ id: string; references?: string[] }>()
const tool = computed(() => toolById(props.id)!)
const fav = computed(() => isFavorite(props.id))
</script>

<template>
  <section>
    <header class="tool-head">
      <div style="display:flex;gap:.75rem;align-items:flex-start;justify-content:space-between">
        <div>
          <h1>{{ tool.title }}</h1>
          <p class="muted" style="margin:0 0 .4rem">{{ tool.summary }}</p>
          <span class="kind" :class="tool.kind" :title="tool.kind === 'empirical' ? 'Rule-of-thumb design estimate; not a simulation' : ''">{{ KIND_LABEL[tool.kind] }}</span>
        </div>
        <button class="no-print" :aria-pressed="fav" :aria-label="fav ? 'Remove from favorites' : 'Add to favorites'" @click="toggleFavorite(id)">
          {{ fav ? '★ Favorite' : '☆ Favorite' }}
        </button>
      </div>
    </header>
    <slot />
    <details class="explain">
      <summary>How this is calculated</summary>
      <slot name="explain" />
    </details>
    <details v-if="references?.length" class="explain">
      <summary>Sources &amp; references</summary>
      <ul><li v-for="r in references" :key="r">{{ r }}</li></ul>
    </details>
  </section>
</template>
