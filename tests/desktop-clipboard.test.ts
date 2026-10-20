import { afterEach, expect, it, vi } from 'vitest'
import { platform } from '../src/platform'
afterEach(() => { delete window.hrtDesktop })
it('copies through the narrow desktop bridge instead of browser clipboard permissions', async () => {
  const copyText = vi.fn(async () => {})
  window.hrtDesktop = { copyText } as unknown as NonNullable<Window['hrtDesktop']>
  await platform.copyText('Wavelength: 21.11 m')
  expect(copyText).toHaveBeenCalledWith('Wavelength: 21.11 m')
})
it('exports through a native save dialog in Electron', async () => {
  const saveFile = vi.fn(async (_name: string, _bytes: Uint8Array) => {})
  window.hrtDesktop = { saveFile } as unknown as NonNullable<Window['hrtDesktop']>
  await platform.saveFile('project.json', '{"designs":[]}', 'application/json')
  expect(saveFile).toHaveBeenCalledOnce()
  expect(saveFile.mock.calls[0]?.[0]).toBe('project.json')
  expect(Array.from(saveFile.mock.calls[0]?.[1] ?? [])).toEqual(Array.from(new TextEncoder().encode('{"designs":[]}')))
})
