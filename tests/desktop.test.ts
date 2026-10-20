import { describe, expect, it } from 'vitest'
import { createRequire } from 'node:module'
import path from 'node:path'
const require = createRequire(import.meta.url)
const { assetPath, isInternal, externalUrl } = require('../desktop/policy.cjs')

describe('desktop trust boundaries', () => {
  it('serves only files inside dist from the app origin', () => {
    expect(assetPath('hrt://app/', '/bundle')).toBe(path.resolve('/bundle/index.html'))
    expect(assetPath('hrt://app/assets/tool.js', '/bundle')).toBe(path.resolve('/bundle/assets/tool.js'))
    for (const url of ['https://evil.test/', 'hrt://evil/index.html', 'hrt://app/%2e%2e%2fsecret', 'hrt://app/%5csecret', 'hrt://app/C%3A/secret']) {
      expect(assetPath(url, '/bundle'), url).toBeNull()
    }
  })
  it('allows the app origin and requires web links for external navigation', () => {
    expect(isInternal('hrt://app/#/tool/swr')).toBe(true)
    expect(isInternal('hrt://evil/')).toBe(false)
    expect(externalUrl('https://github.com/armysarge/ham-radio-tools')).toBe(true)
    for (const url of ['file:///etc/passwd', 'javascript:alert(1)', 'https://user:password@example.com', 'garbage']) expect(externalUrl(url)).toBe(false)
  })
})
