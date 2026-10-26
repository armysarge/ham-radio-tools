import { afterEach, expect, it, vi } from 'vitest'

afterEach(() => { localStorage.clear(); vi.resetModules() })

it('does not discard saved work when a legacy profile has malformed favorites', async () => {
  const locations = [{ id: 'home', name: 'Home', lat: 0, lon: 0 }]
  localStorage.setItem('hrt:v1', JSON.stringify({ favorites: null, locations, stationId: 'home' }))
  vi.resetModules()
  const { state } = await import('../src/core/store')
  expect(state.locations).toEqual(locations)
  expect(state.stationId).toBe('home')
  expect(state.favorites).toEqual([])
})
