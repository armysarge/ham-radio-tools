import { afterEach, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { startNavigationDiagnostics, navigationReport, saveNavigationReport } from '../src/core/navigationDiagnostics'
import { platform } from '../src/platform'

let stop: (() => void) | undefined
afterEach(() => { stop?.(); document.body.innerHTML = ''; vi.restoreAllMocks() })
const makeRouter = () => createRouter({ history: createMemoryHistory(), routes: [
  { path: '/', component: {} },
  { path: '/tool/efhw', component: {} },
  { path: '/tool/dipole', component: () => Promise.reject(new Error('private location and file path')) },
] })

it('records a failed tool load and pointer events without query values or personal data', async () => {
  const router = makeRouter()
  await router.push('/')
  stop = startNavigationDiagnostics(router)
  document.body.innerHTML = '<aside class="sidebar"><nav><details open><summary>Antenna Design</summary><a href="#/tool/efhw?load=private-design">EFHW</a></details></nav></aside><input value="private-callsign">'
  document.querySelector('a')!.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 60, clientY: 100 }))
  await router.push('/tool/efhw?load=private-design')
  await expect(router.push('/tool/dipole')).rejects.toThrow('private location')
  const report = navigationReport()!
  expect(report.route).toBe('/tool/efhw')
  expect(report.events).toEqual(expect.arrayContaining([
    expect.objectContaining({ type: 'pointerdown', target: '/tool/efhw' }),
    expect.objectContaining({ type: 'route-error', target: '/tool/dipole' }),
  ]))
  expect(JSON.stringify(report)).not.toMatch(/private|callsign|location and file/)
})

it('caps the journal, reports link coverage and cleans up its listeners', async () => {
  const router = makeRouter()
  await router.push('/')
  stop = startNavigationDiagnostics(router)
  document.body.innerHTML = '<aside class="sidebar"><nav><details open><summary>Antenna Design</summary><a href="#/tool/efhw">EFHW</a></details></nav></aside><div id="overlay"></div>'
  const a = document.querySelector('a')!
  vi.spyOn(a, 'getBoundingClientRect').mockReturnValue({ x: 20, y: 100, left: 20, right: 240, top: 100, bottom: 144, width: 220, height: 44, toJSON() {} })
  Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: vi.fn(() => document.querySelector('#overlay')) })
  for (let i = 0; i < 100; i++) a.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }))
  expect(navigationReport()!.events.length).toBeLessThanOrEqual(80)
  expect(navigationReport()!.links[0]).toMatchObject({ target: '/tool/efhw', covered: true, hit: 'div' })
  stop()
  expect(navigationReport()).toBeNull()
  a.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }))
  delete (document as Partial<Document>).elementFromPoint
})

it('exports only when requested through the existing file adapter', async () => {
  const router = makeRouter()
  await router.push('/')
  const save = vi.spyOn(platform, 'saveFile').mockImplementation(() => {})
  stop = startNavigationDiagnostics(router)
  await router.push('/tool/efhw?q=private-query')
  expect(save).not.toHaveBeenCalled()
  await saveNavigationReport()
  const [name, contents, mime] = save.mock.calls[0]!
  expect(name).toBe('ham-radio-tools-navigation.json')
  expect(mime).toBe('application/json')
  expect(JSON.parse(contents as string)).toMatchObject({ format: 'ham-radio-tools-navigation', route: '/tool/efhw' })
  expect(contents).not.toContain('private-query')
})

it('identifies failed bundled imports without exporting private URLs or raw error messages', async () => {
  const router = makeRouter()
  router.addRoute({ path: '/tool/inverted-v', component: () => Promise.reject(new TypeError('Failed to fetch dynamically imported module: hrt://app/assets/InvertedV-Abc123.js?private-query')) })
  await router.push('/')
  stop = startNavigationDiagnostics(router)
  await expect(router.push('/tool/inverted-v')).rejects.toThrow('dynamically imported')
  const report = navigationReport()!
  expect(report.events.at(-1)).toMatchObject({ type: 'route-error', target: '/tool/inverted-v', error: {
    name: 'TypeError', category: 'module-load', asset: 'InvertedV-Abc123.js',
  } })
  expect(JSON.stringify(report)).not.toMatch(/private-query|hrt:\/\/|Failed to fetch dynamically/)
})

it('records stylesheet resource failures and their tool route', async () => {
  const router = makeRouter()
  await router.push('/tool/efhw')
  stop = startNavigationDiagnostics(router)
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = new URL('assets/Vertical-def456.css?private-query', location.href).href
  document.head.append(link)
  try {
    link.dispatchEvent(new Event('error'))
    expect(navigationReport()!.events.at(-1)).toMatchObject({ type: 'asset-error', target: '/tool/efhw', error: {
      category: 'asset-load', asset: 'Vertical-def456.css',
    } })
    expect(JSON.stringify(navigationReport())).not.toContain('private-query')
  } finally { link.remove() }
})
