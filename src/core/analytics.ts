import { watch } from 'vue'
import type { Router } from 'vue-router'
import { state } from './store'

/** True only in a build made with VITE_GA_ID (the public demo). Everywhere else this app makes no network requests. */
export const analyticsAvailable = !!import.meta.env.VITE_GA_ID

let started = false
export function startAnalytics(router: Router) {
  if (!import.meta.env.VITE_GA_ID) return
  const run = () => {
    const id = import.meta.env.VITE_GA_ID as string
    if (state.analytics === 'off') { window[`ga-disable-${id}`] = true; return } // stops further hits even if the script already loaded
    if (state.analytics !== 'on' || started) return
    started = true
    void import('./gtag').then((m) => m.start(id, router))
  }
  run()
  watch(() => state.analytics, run)
}
