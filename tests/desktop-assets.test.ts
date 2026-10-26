import { afterEach, expect, it } from 'vitest'
import { mkdtemp, mkdir, writeFile, unlink, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const dirs: string[] = []
afterEach(async () => {
  for (const dir of dirs.splice(0)) {
    if (!path.resolve(dir).startsWith(path.join(path.resolve(tmpdir()), 'hrt-asset-test-'))) throw new Error('Unexpected fixture directory')
    await rm(dir, { recursive: true, force: true })
  }
})
async function fixture() {
  const root = await mkdtemp(path.join(tmpdir(), 'hrt-asset-test-'))
  dirs.push(root)
  await mkdir(path.join(root, 'assets'))
  await writeFile(path.join(root, 'index.html'), '<script type="module" src="/assets/Tool-old.js"></script>')
  await writeFile(path.join(root, 'assets/Tool-old.js'), 'export const build = "old"')
  return root
}

it('keeps the launch bundle usable when a build removes unopened tool files', async () => {
  const { createAssetHandler } = require('../desktop/asset-handler.cjs')
  const root = await fixture()
  const serve = await createAssetHandler(root)
  await unlink(path.join(root, 'assets/Tool-old.js'))
  await writeFile(path.join(root, 'assets/Tool-new.js'), 'export const build = "new"')
  await writeFile(path.join(root, 'index.html'), '<script type="module" src="/assets/Tool-new.js"></script>')
  const tool = await serve(new Request('hrt://app/assets/Tool-old.js'))
  expect(tool.status).toBe(200)
  expect(await tool.text()).toBe('export const build = "old"')
  expect(await (await serve(new Request('hrt://app/'))).text()).toContain('Tool-old.js')
  expect((await serve(new Request('hrt://app/assets/Tool-new.js'))).status).toBe(404)
  const nextLaunch = await createAssetHandler(root)
  expect(await (await nextLaunch(new Request('hrt://app/'))).text()).toContain('Tool-new.js')
})

it('preserves MIME types, security headers, methods and the bundle path boundary', async () => {
  const { createAssetHandler } = require('../desktop/asset-handler.cjs')
  const serve = await createAssetHandler(await fixture())
  const response = await serve(new Request('hrt://app/assets/Tool-old.js'))
  expect(response.headers.get('Content-Type')).toBe('text/javascript')
  expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
  expect(response.headers.get('Content-Security-Policy')).toBe("frame-ancestors 'none'")
  expect(response.headers.get('Cache-Control')).toBe('no-store')
  expect((await serve(new Request('hrt://app/', { method: 'POST' }))).status).toBe(403)
  for (const url of ['https://evil.test/', 'hrt://evil/', 'hrt://app/%2e%2e%2fprivate', 'hrt://app/%5cprivate']) {
    expect((await serve(new Request(url))).status).toBe(403)
  }
})

it('rejects an incomplete launch bundle instead of opening a blank window', async () => {
  const { createAssetHandler } = require('../desktop/asset-handler.cjs')
  const root = await fixture()
  await unlink(path.join(root, 'index.html'))
  await expect(createAssetHandler(root)).rejects.toThrow('missing index.html')
})
