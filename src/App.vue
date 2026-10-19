<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { CATEGORIES, tools } from './core/registry'
import { state } from './core/store'

const route = useRoute(), router = useRouter()
const q = ref(typeof route.query.q === 'string' ? route.query.q : '')
const menu = ref(false)
const searchEl = ref<HTMLInputElement>()
const favTools = computed(() => tools.filter((t) => state.favorites.includes(t.id)))

watch(q, (v) => router.replace({ path: '/', query: v ? { q: v } : {} }))
watch(() => route.fullPath, () => { menu.value = false })
watch(() => route.query.q, (v) => { if (route.path === '/' && (v ?? '') !== q.value) q.value = (v as string) ?? '' })

function onKey(e: KeyboardEvent) {
  const tag = (e.target as HTMLElement).tagName
  if (e.key === '/' && tag !== 'INPUT' && tag !== 'SELECT') { e.preventDefault(); searchEl.value?.focus() }
  if (e.key === 'Escape') menu.value = false
}
onMounted(() => addEventListener('keydown', onKey))
onUnmounted(() => removeEventListener('keydown', onKey))
function cycleTheme() { state.theme = ({ system: 'light', light: 'dark', dark: 'system' } as const)[state.theme] }
</script>

<template>
  <a href="#main" class="sr-only">Skip to content</a>
  <div class="shell">
    <header class="topbar">
      <button class="menu-btn" aria-label="Toggle navigation menu" :aria-expanded="menu" @click="menu = !menu">☰ Menu</button>
      <router-link to="/" class="brand">
        <svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="6" fill="#f2b84b" /><path d="M4 16h5l3-9 5 18 3-9h8" fill="none" stroke="#11161b" stroke-width="2.5" /></svg>
        Ham Radio Tools
      </router-link>
      <input ref="searchEl" v-model="q" class="search" type="text" placeholder="Search tools — press / to jump here" aria-label="Search tools" />
      <button :aria-label="`Theme: ${state.theme}. Click to change`" @click="cycleTheme">
        {{ state.theme === 'system' ? '◐ Auto' : state.theme === 'light' ? '☀ Light' : '☾ Dark' }}
      </button>
      <span class="badge-offline" title="No network access is used by this app">Works offline</span>
    </header>

    <aside class="sidebar" :class="{ open: menu }" aria-label="Main navigation">
      <nav>
        <router-link to="/">All tools</router-link>
        <template v-if="favTools.length">
          <div class="group-title">Favorites</div>
          <router-link v-for="t in favTools" :key="'f' + t.id" :to="`/tool/${t.id}`">★ {{ t.title }}</router-link>
        </template>
        <details v-for="c in CATEGORIES" :key="c.id" open>
          <summary>{{ c.name }}</summary>
          <router-link v-for="t in tools.filter((x) => x.category === c.id)" :key="t.id" :to="`/tool/${t.id}`">{{ t.title }}</router-link>
        </details>
        <div class="group-title">Your data</div>
        <router-link to="/saved">Saved designs</router-link>
        <router-link to="/settings">Settings &amp; content</router-link>
      </nav>
    </aside>

    <main id="main" tabindex="-1">
      <router-view v-slot="{ Component }">
        <Suspense><component :is="Component" /><template #fallback><p class="muted">Loading…</p></template></Suspense>
      </router-view>
    </main>
  </div>
</template>
