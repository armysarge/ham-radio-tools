// Set by frame-guard.js (a blocking script in <head>) when this page is embedded by a site that is not allowed.
if ((window as unknown as { __hrtBlocked?: boolean }).__hrtBlocked) throw new Error('Embedding blocked')
import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'
import { tools } from './core/registry'
import { applyAppearance, state } from './core/store'
import { watch } from 'vue'
import { startAnalytics } from './core/analytics'
import './style.css'

// Hash routing: works from file://, a USB stick, or any static folder with no server rewrites.
const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: () => import('./views/Dashboard.vue') },
    { path: '/settings', component: () => import('./views/Settings.vue') },
    { path: '/saved', component: () => import('./views/SavedDesigns.vue') },
    ...tools.map((t) => ({ path: `/tool/${t.id}`, component: t.component, meta: { title: t.title, summary: t.summary } })),
    { path: '/:pathMatch(.*)*', component: () => import('./views/NotFound.vue') },
  ],
})
const pageMeta = (sel: string) => document.head.querySelector<HTMLMetaElement>(sel)
const defaults = { title: document.title, description: pageMeta('meta[name="description"]')?.content ?? '', url: pageMeta('meta[property="og:url"]')?.content ?? '' }
// Keeps the tab title, description and share metadata in step with the open tool (helps crawlers that run scripts; link previews use index.html).
router.afterEach((to) => {
  const title = to.meta.title as string | undefined, summary = to.meta.summary as string | undefined
  document.title = title ? `${title} — Ham Radio Tools` : 'Ham Radio Tools'
  const set = (sel: string, v: string) => { const el = pageMeta(sel); if (el) el.content = v }
  set('meta[name="description"]', summary ?? defaults.description); set('meta[property="og:description"]', summary ?? defaults.description); set('meta[name="twitter:description"]', summary ?? defaults.description)
  set('meta[property="og:title"]', title ? `${title} — Ham Radio Tools` : 'Ham Radio Tools — offline calculators and references for amateur radio')
  set('meta[property="og:url"]', title ? `${defaults.url}#${to.path}` : defaults.url)
})

watch(() => [state.theme, state.textSize], applyAppearance)
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyAppearance)
applyAppearance()

startAnalytics(router)
createApp(App).use(router).mount('#app')
