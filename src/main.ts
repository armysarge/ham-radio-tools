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
    ...tools.map((t) => ({ path: `/tool/${t.id}`, component: t.component, meta: { title: t.title } })),
    { path: '/:pathMatch(.*)*', component: () => import('./views/NotFound.vue') },
  ],
})
router.afterEach((to) => { document.title = (to.meta.title as string | undefined) ? `${to.meta.title} — Ham Radio Tools` : 'Ham Radio Tools' })

watch(() => [state.theme, state.textSize], applyAppearance)
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', applyAppearance)
applyAppearance()

startAnalytics(router)
createApp(App).use(router).mount('#app')
