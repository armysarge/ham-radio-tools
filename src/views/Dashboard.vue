<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { CATEGORIES, KIND_LABEL, iconFor, searchTools } from '../core/registry'
import NavIcon from '../components/NavIcon.vue'
import { isFavorite, toggleFavorite } from '../core/store'

const route = useRoute()
const q = computed(() => (typeof route.query.q === 'string' ? route.query.q : ''))
const found = computed(() => searchTools(q.value))
const groups = computed(() => [
  ...(q.value ? [] : [{ id: 'fav', name: 'Favorites', items: found.value.filter((t) => isFavorite(t.id)) }]),
  ...CATEGORIES.map((c) => ({ id: c.id, name: c.name, blurb: c.blurb, items: found.value.filter((t) => t.category === c.id) })),
].filter((g) => g.items.length))
</script>

<template>
  <h1>{{ q ? `Results for “${q}”` : 'Ham Radio Tools' }}</h1>
  <p v-if="!q" class="muted">Calculators, antenna designs and grid-square tools. Everything runs on this device — no internet needed.</p>
  <div v-if="!found.length" class="empty">
    <p><strong>No tools match “{{ q }}”.</strong></p>
    <p>Try a shorter word such as “swr”, “dipole” or “grid”.</p>
  </div>
  <section v-for="g in groups" :key="g.id" style="margin-top:1.5rem">
    <h2>{{ g.name }} <span v-if="'blurb' in g" class="muted" style="font-weight:400;font-size:.9rem">— {{ g.blurb }}</span></h2>
    <div class="grid">
      <div v-for="t in g.items" :key="g.id + t.id" class="card tool-card">
        <router-link :to="`/tool/${t.id}`" style="text-decoration:none;color:inherit">
          <h3 style="display:flex;gap:.5rem;align-items:center"><NavIcon :name="iconFor(t.id)" style="color:var(--accent);width:1.4em;height:1.4em" />{{ t.title }}</h3><p>{{ t.summary }}</p>
          <span class="kind" :class="t.kind" style="margin-top:.5rem">{{ KIND_LABEL[t.kind] }}</span>
        </router-link>
        <button class="star ghost" :aria-pressed="isFavorite(t.id)" :aria-label="`${isFavorite(t.id) ? 'Remove' : 'Add'} ${t.title} ${isFavorite(t.id) ? 'from' : 'to'} favorites`" @click="toggleFavorite(t.id)">
          {{ isFavorite(t.id) ? '★' : '☆' }}
        </button>
      </div>
    </div>
  </section>
</template>
