import { describe, expect, it } from 'vitest'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { restoreWindowState } = require('../desktop/window-state.cjs')
const primary = { x: 0, y: 0, width: 1920, height: 1040 }
describe('desktop window restoration in screen-independent pixels', () => {
  it('centres a first launch and rejects corrupt state', () => {
    for (const value of [null, {}, { bounds: { x: NaN, y: 0, width: 900, height: 700 } }]) {
      expect(restoreWindowState(value, [primary], primary)).toEqual({ bounds: { x: 320, y: 95, width: 1280, height: 850 }, maximized: false })
    }
  })
  it('preserves normal bounds and maximized state on a left-hand monitor', () => {
    const bounds = { x: -1400, y: 100, width: 900, height: 700 }
    expect(restoreWindowState({ bounds, maximized: true }, [{ x: -1600, y: 0, width: 1600, height: 900 }, primary], primary)).toEqual({ bounds, maximized: true })
  })
  it('returns a disconnected-monitor window to the primary display', () => {
    const state = restoreWindowState({ bounds: { x: 3000, y: 10, width: 1000, height: 700 } }, [primary], primary)
    expect(state.bounds).toEqual({ x: 460, y: 170, width: 1000, height: 700 })
  })
  it('keeps all edges accessible on small screens', () => {
    const area = { x: 0, y: 0, width: 360, height: 480 }
    expect(restoreWindowState({ bounds: { x: -10, y: -20, width: 5000, height: 5000 }, maximized: 'yes' }, [area], area)).toEqual({ bounds: area, maximized: false })
  })
  it('clamps the original CI fixture on a 1024×720 runner', () => {
    const area = { x: 0, y: 0, width: 1024, height: 720 }
    expect(restoreWindowState({ bounds: { x: 40, y: 50, width: 1000, height: 700 } }, [area], area).bounds).toEqual({ x: 24, y: 20, width: 1000, height: 700 })
    const fitted = { x: 12, y: 10, width: 1000, height: 700 }
    expect(restoreWindowState({ bounds: fitted }, [area], area).bounds).toEqual(fitted)
  })
})
