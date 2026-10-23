<script setup lang="ts">
import { computed } from 'vue'
import { EXPLAIN_LABEL, iconFor, toolById } from '../core/registry'
import NavIcon from './NavIcon.vue'
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
          <h1 style="display:flex;gap:.6rem;align-items:center"><NavIcon :name="iconFor(id)" style="color:var(--accent);width:1.1em;height:1.1em;flex:none" />{{ tool.title }}</h1>
          <p class="muted" style="margin:0 0 .4rem">{{ tool.summary }}</p>
        </div>
        <button class="favorite-icon no-print" :aria-pressed="fav" :aria-label="fav ? 'Remove from favorites' : 'Add to favorites'" :title="fav ? 'Remove from favorites' : 'Add to favorites'" @click="toggleFavorite(id)">
          <span :key="String(fav)" class="pop" aria-hidden="true">{{ fav ? '★' : '☆' }}</span>
        </button>
      </div>
    </header>
    <slot />
    <details class="explain">
      <summary>{{ EXPLAIN_LABEL[tool.kind] }}</summary>
      <slot name="explain" />
    </details>
    <details v-if="references?.length" class="explain">
      <summary>Sources &amp; references</summary>
      <ul><li v-for="r in references" :key="r">{{ r }}</li></ul>
    </details>
  </section>
</template>
