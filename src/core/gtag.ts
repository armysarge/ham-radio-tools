// Google Analytics 4 loader. Only ever imported from analytics.ts when the build was made with VITE_GA_ID (npm run build:demo),
// so the default build, the release zip and the desktop app contain no trace of it.
import type { Router } from 'vue-router'

type Gtag = (...a: unknown[]) => void
declare global { interface Window { dataLayer: unknown[]; [k: string]: unknown } }

export function start(id: string, router: Router) {
  window[`ga-disable-${id}`] = false
  window.dataLayer = window.dataLayer || []
  const gtag: Gtag = function () { window.dataLayer.push(arguments) } // gtag.js needs the arguments object itself
  gtag('js', new Date())
  // No ad personalisation, no Google signals; page views are sent by hand below because the app uses hash routing.
  gtag('config', id, { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false })
  const s = document.createElement('script')
  s.async = true; s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`
  document.head.appendChild(s)
  // Only the route path is sent: never the query string, which holds the search box text.
  const view = (path: string, title: unknown) => gtag('event', 'page_view', { page_path: path, page_location: `${location.origin}${location.pathname}#${path}`, page_title: typeof title === 'string' ? title : 'Ham Radio Tools' })
  view(router.currentRoute.value.path, router.currentRoute.value.meta.title)
  router.afterEach((to, from) => { if (to.path !== from.path) view(to.path, to.meta.title) })
}
