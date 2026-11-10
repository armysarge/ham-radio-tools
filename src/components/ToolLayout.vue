<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { EXPLAIN_LABEL, iconFor, toolById } from '../core/registry'
import NavIcon from './NavIcon.vue'
import { isFavorite, toggleFavorite } from '../core/store'
import { TOOL_INFO } from '../data/toolInfo'

const props = defineProps<{ id: string; references?: string[] }>()
const tool = computed(() => toolById(props.id)!)
const fav = computed(() => isFavorite(props.id))
const info = computed(() => TOOL_INFO[props.id])
const infoOpen = ref(false)
watch(() => props.id, () => { infoOpen.value = false })
</script>

<template>
  <section @keydown.esc="infoOpen = false">
    <header class="tool-head">
      <div style="display:flex;gap:.75rem;align-items:flex-start;justify-content:space-between">
        <div>
          <h1 style="display:flex;gap:.6rem;align-items:center"><NavIcon :name="iconFor(id)" style="color:var(--accent);width:1.1em;height:1.1em;flex:none" />{{ tool.title }}</h1>
          <p class="muted" style="margin:0 0 .4rem">{{ tool.summary }}</p>
        </div>
        <div class="tool-actions no-print">
        <button v-if="info" class="info-icon" :aria-expanded="infoOpen" :aria-controls="`tool-info-${id}`" aria-label="What is this tool?" title="What is this tool?" @click="infoOpen = !infoOpen">
          <svg width="20" height="20" viewBox="0 0 512 512" fill="currentColor" aria-hidden="true" focusable="false">
            <path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM216 336l24 0 0-64-24 0c-13.3 0-24-10.7-24-24s10.7-24 24-24l48 0c13.3 0 24 10.7 24 24l0 88 8 0c13.3 0 24 10.7 24 24s-10.7 24-24 24l-80 0c-13.3 0-24-10.7-24-24s10.7-24 24-24zm40-208a32 32 0 1 1 0 64 32 32 0 1 1 0-64z" />
          </svg>
        </button>
        <button class="favorite-icon" :aria-pressed="fav" :aria-label="fav ? 'Remove from favorites' : 'Add to favorites'" :title="fav ? 'Remove from favorites' : 'Add to favorites'" @click="toggleFavorite(id)">
          <span :key="String(fav)" class="pop" aria-hidden="true">{{ fav ? '★' : '☆' }}</span>
        </button>
        </div>
      </div>
      <div v-if="info && infoOpen" :id="`tool-info-${id}`" class="card tool-info" role="region" aria-label="What is this tool?">
        <h2>What is this?</h2>
        <p>{{ info.what }}</p>
        <p><strong>When you would use it:</strong> {{ info.when }}</p>
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
