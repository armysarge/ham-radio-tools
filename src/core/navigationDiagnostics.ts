import type { Router } from 'vue-router'
import { tools } from './registry'
import { platform } from '../platform'

const paths = new Set(['/', '/settings', '/saved', '/downloads', ...tools.map(t => `/tool/${t.id}`)])
const safePath = (path: string) => paths.has(path.split(/[?#]/)[0]!) ? path.split(/[?#]/)[0]! : 'unknown'
const tag = (el: Element | null) => el?.tagName.toLowerCase() ?? 'none'
const rect = (el: Element) => {
  const r = el.getBoundingClientRect()
  return { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) }
}
function bundledAsset(value: string) {
  try {
    const url = new URL(value, location.href), here = new URL(location.href)
    if (!(url.protocol === here.protocol && url.host === here.host) && !(url.protocol === 'hrt:' && url.host === 'app')) return undefined
    return /^\/assets\/([\w-]{1,150}\.(?:js|css))$/.exec(url.pathname)?.[1]
  } catch { return undefined }
}

/** Keep useful error classes and bundled filenames, never raw messages, URLs or filesystem paths. */
export function navigationErrorDetail(error: unknown) {
  const name = error instanceof Error && ['Error', 'TypeError', 'SyntaxError', 'ReferenceError', 'RangeError', 'SecurityError'].includes(error.name) ? error.name : 'Error'
  const message = error instanceof Error ? error.message : ''
  const category = /Unable to preload CSS/i.test(message) ? 'stylesheet-load'
    : /dynamically imported|importing a module|module script|Importing a module script failed/i.test(message) ? 'module-load'
    : ['TypeError', 'SyntaxError', 'ReferenceError', 'RangeError'].includes(name) ? 'runtime' : 'unknown'
  const assets = [...new Set((`${message}\n${error instanceof Error ? error.stack ?? '' : ''}`.match(/(?:hrt|https?):\/\/[^\s"'<>]+/g) ?? [])
    .map(url => bundledAsset(url.replace(/:\d+(?::\d+)?\)?$/, ''))).filter((asset): asset is string => !!asset))].slice(0, 4)
  return { name, category, ...(assets[0] ? { asset: assets[0], assets } : {}) }
}

type Entry = { ms: number; type: string; target: string; x?: number; y?: number; prevented?: boolean; error?: ReturnType<typeof navigationErrorDetail> }
const pointerTypes = ['pointerdown', 'pointerup', 'click'] as const
let snapshot: (() => ReturnType<typeof makeSnapshot>) | undefined

function makeSnapshot(router: Router, events: Entry[]) {
  const heading = document.querySelector('main h1')?.textContent?.trim()
  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('aside nav a')).flatMap(a => {
    if (a.closest('details')?.open === false) return []
    const r = a.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2
    if (!r.width || !r.height || x < 0 || x >= innerWidth || y < 0 || y >= innerHeight) return []
    const hit = document.elementFromPoint?.(x, y) ?? null
    return [{ target: safePath(a.hash.slice(1)), rect: rect(a), hit: tag(hit), covered: !!hit && !a.contains(hit),
      appRegion: getComputedStyle(a).getPropertyValue('-webkit-app-region') }]
  })
  return {
    format: 'ham-radio-tools-navigation', version: __APP_VERSION__,
    route: safePath(router.currentRoute.value.path), hashRoute: safePath(location.hash.slice(1)),
    renderedTool: tools.find(t => t.title === heading)?.id ?? 'other',
    viewport: { width: innerWidth, height: innerHeight, scale: devicePixelRatio },
    userAgent: navigator.userAgent,
    sidebarScroll: document.querySelector('aside')?.scrollTop ?? 0,
    groups: Array.from(document.querySelectorAll<HTMLDetailsElement>('aside nav details')).map(d => d.open),
    dragRegions: Array.from(document.querySelectorAll('.desktop-drag')).map(rect),
    links, events: events.map(e => ({ ...e })),
  }
}

/** Bounded, memory-only trace; never reads form values, query strings or saved work. */
export function startNavigationDiagnostics(router: Router) {
  const events: Entry[] = [], started = performance.now()
  const record = (type: string, target: string) => {
    const entry: Entry = { ms: Math.round(performance.now() - started), type, target }
    events.push(entry)
    if (events.length > 80) events.shift()
    return entry
  }
  const pointer = (e: MouseEvent) => {
    if (!(e.target instanceof Element) || !e.target.closest('aside, .topbar')) return
    const a = e.target.closest('a')
    const entry = record(e.type, a ? safePath(a.hash.slice(1)) : tag(e.target))
    entry.x = Math.round(e.clientX); entry.y = Math.round(e.clientY)
    queueMicrotask(() => { entry.prevented = e.defaultPrevented })
  }
  const error = (event: Event) => {
    const resource = event.target instanceof HTMLLinkElement ? event.target.href : event.target instanceof HTMLScriptElement ? event.target.src : ''
    const asset = resource ? bundledAsset(resource) : undefined
    if (asset) record('asset-error', safePath(router.currentRoute.value.path)).error = { name: 'Error', category: 'asset-load', asset, assets: [asset] }
    else if (event instanceof ErrorEvent) record('script-error', safePath(router.currentRoute.value.path)).error = navigationErrorDetail(event.error)
  }
  const removeHooks = [
    router.beforeEach(to => { record('route-start', safePath(to.path)) }),
    router.afterEach((to, _from, failure) => { record(failure ? 'route-not-completed' : 'route-end', safePath(to.path)) }),
    router.onError((error, to) => { record('route-error', safePath(to.path)).error = navigationErrorDetail(error) }),
  ]
  for (const type of pointerTypes) document.addEventListener(type, pointer, true)
  window.addEventListener('error', error, true)
  const report = () => makeSnapshot(router, events)
  snapshot = report
  return () => {
    removeHooks.forEach(remove => remove())
    for (const type of pointerTypes) document.removeEventListener(type, pointer, true)
    window.removeEventListener('error', error, true)
    if (snapshot === report) snapshot = undefined
  }
}

export const navigationReport = () => snapshot?.() ?? null
export async function saveNavigationReport() {
  const report = navigationReport()
  if (report) await platform.saveFile('ham-radio-tools-navigation.json', JSON.stringify(report, null, 2), 'application/json')
}
