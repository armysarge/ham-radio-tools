<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { CATEGORIES, CATEGORY_ICON, iconFor, tools } from './core/registry'
import { state } from './core/store'
import NavIcon from './components/NavIcon.vue'
import GithubLink from './components/GithubLink.vue'
import ConsentBanner from './components/ConsentBanner.vue'

const route = useRoute(), router = useRouter()
const q = ref(typeof route.query.q === 'string' ? route.query.q : '')
const version = __APP_VERSION__
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
      <select v-model="state.units" class="unit-select" aria-label="Measurement system"><option value="metric">Metric</option><option value="imperial">Imperial</option></select>
      <button :aria-label="`Theme: ${state.theme}. Click to change`" @click="cycleTheme">
        {{ state.theme === 'system' ? '◐ Auto' : state.theme === 'light' ? '☀ Light' : '☾ Dark' }}
      </button>
      <GithubLink />
      <span class="badge-offline" title="No network access is used by this app">Works offline</span>
    </header>

    <div class="backdrop" :class="{ on: menu }" @click="menu = false"></div>
    <aside class="sidebar" :class="{ open: menu }" aria-label="Main navigation">
      <button class="drawer-close" @click="menu = false">✕ Close</button>
      <nav>
        <router-link to="/"><NavIcon name="home" />All tools</router-link>
        <template v-if="favTools.length">
          <div class="group-title">Favorites</div>
          <router-link v-for="t in favTools" :key="'f' + t.id" :to="`/tool/${t.id}`"><NavIcon name="star" />{{ t.title }}</router-link>
        </template>
        <details v-for="c in CATEGORIES" :key="c.id" open>
          <summary><NavIcon :name="CATEGORY_ICON[c.id]" />{{ c.name }}</summary>
          <router-link v-for="t in tools.filter((x) => x.category === c.id)" :key="t.id" :to="`/tool/${t.id}`"><NavIcon :name="iconFor(t.id)" />{{ t.title }}</router-link>
        </details>
        <div class="group-title">Your data</div>
        <router-link to="/saved"><NavIcon name="saved" />Saved designs</router-link>
        <router-link to="/settings"><NavIcon name="settings" />Settings &amp; content</router-link>
        <p class="muted" style="font-size:.8rem;margin:.8rem .6rem">Ham Radio Tools v{{ version }} · by ZS6SHZ</p>
        <div style="margin:0 .6rem"><GithubLink label /></div>
      </nav>
    </aside>

    <ConsentBanner />
    <main id="main" tabindex="-1">
      <router-view v-slot="{ Component }">
        <Suspense v-if="Component"><component :is="Component" /><template #fallback><p class="muted">Loading…</p></template></Suspense>
      </router-view>
    </main>
  </div>
</template>
