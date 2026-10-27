import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'

type Startup = { update: (value: number, label: string) => void; complete: () => void; fail: () => void }
let startup: Startup
function initialize() {
  const html = new DOMParser().parseFromString(readFileSync('index.html', 'utf8'), 'text/html')
  document.body.innerHTML = html.body.innerHTML
  new Function(readFileSync('public/startup.js', 'utf8'))()
  startup = (window as unknown as { hrtStartup: Startup }).hrtStartup
}
beforeEach(() => {
  vi.useFakeTimers()
  initialize()
})
afterEach(async () => { startup?.complete(); await vi.runAllTimersAsync(); vi.useRealTimers(); document.body.innerHTML = ''; localStorage.clear(); delete window.hrtDesktop })

it('keeps a fast desktop startup readable, without inventing intermediate progress or holding a slow startup again', async () => {
  startup.complete(); await vi.runAllTimersAsync()
  window.hrtDesktop = {} as NonNullable<typeof window.hrtDesktop>
  initialize()
  startup.update(55, 'Loading resources…')
  await vi.advanceTimersByTimeAsync(100)
  expect(document.querySelector('progress')!.value).toBe(55)
  startup.complete()
  await vi.advanceTimersByTimeAsync(500)
  expect(document.querySelector('#startup')).not.toBeNull()
  expect(document.querySelector('progress')!.value).toBe(100)
  expect(document.querySelector('#startup-status')!.textContent).toBe('Ready')
  await vi.advanceTimersByTimeAsync(150)
  expect(document.querySelector('#startup')).toBeNull()
  initialize()
  await vi.advanceTimersByTimeAsync(1000)
  startup.complete()
  await vi.advanceTimersByTimeAsync(32)
  expect(document.querySelector('#startup')).toBeNull()
})

it('starts the desktop hold only after Electron acknowledges its first window display', async () => {
  startup.complete(); await vi.runAllTimersAsync()
  let shown!: () => void
  window.hrtDesktop = { startupVisible: () => new Promise<void>(resolve => { shown = resolve }) } as NonNullable<typeof window.hrtDesktop>
  initialize()
  startup.complete()
  await vi.advanceTimersByTimeAsync(1200)
  expect(document.querySelector('#startup')).not.toBeNull()
  shown()
  await vi.advanceTimersByTimeAsync(600)
  expect(document.querySelector('#startup')).not.toBeNull()
  await vi.advanceTimersByTimeAsync(150)
  expect(document.querySelector('#startup')).toBeNull()
})

it('shows labelled stage progress, keeps it monotonic and reveals the app only on completion', () => {
  const bar = document.querySelector('progress')!
  expect(bar.getAttribute('aria-label')).toBe('Application startup')
  startup.update(55, 'Loading your first page…')
  expect(bar.value).toBe(55)
  startup.update(20, 'Old stage')
  expect(bar.value).toBe(55)
  expect(document.querySelector('#startup-status')!.textContent).toContain('Loading your first page')
  expect(document.querySelector('#app')!.hasAttribute('inert')).toBe(true)
  startup.complete()
  vi.runOnlyPendingTimers()
  expect(document.querySelector('#startup')).toBeNull()
  expect(document.querySelector('#app')!.hasAttribute('inert')).toBe(false)
  startup.update(50, 'Late update')
  expect(document.querySelector('#startup')).toBeNull()
})

it('offers recovery on slow startup and can still complete later', () => {
  startup.update(25, 'Loading application resources…')
  vi.advanceTimersByTime(30_000)
  expect(document.querySelector('#startup-reload')!.hasAttribute('hidden')).toBe(false)
  expect(document.querySelector('progress')!.value).toBe(25)
  startup.complete()
  vi.runOnlyPendingTimers()
  expect(document.querySelector('#startup')).toBeNull()
})

it('keeps a readable failure and reload action when resources fail, without erasing saved projects', () => {
  localStorage.setItem('hrt:v1', '{"designs":[{"id":"saved"}]}')
  startup.fail()
  expect(document.querySelector('#startup-status')!.getAttribute('role')).toBe('alert')
  expect(document.querySelector('#startup-status')!.textContent).toContain('Couldn’t start')
  expect(document.querySelector('#startup-reload')!.hasAttribute('hidden')).toBe(false)
  expect(localStorage.getItem('hrt:v1')).toContain('saved')
})
