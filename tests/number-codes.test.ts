import { mount } from '@vue/test-utils'
import { expect, it, vi } from 'vitest'
import NumberCodes from '../src/tools/NumberCodes.vue'
import { NUMBER_CODES } from '../src/data/numberCodes'
import { encode, decodeSymbols } from '../src/lib/morse'
import { platform } from '../src/platform'

it('keeps current shorthand separate from selected historical examples', () => {
  expect(NUMBER_CODES.filter(c => c.group === 'on-air').map(c => c.code)).toEqual(['73', '88', '72'])
  expect(NUMBER_CODES.find(c => c.code === '72')?.note).toContain('informal')
  expect(NUMBER_CODES.find(c => c.code === '73')?.meaning).toBe('Best regards')
  expect(new Set(NUMBER_CODES.map(c => c.code)).size).toBe(NUMBER_CODES.length)
  for (const c of NUMBER_CODES) expect(decodeSymbols(encode(c.code).symbols)).toBe(c.code)
  expect(encode('73').symbols).toBe('--... ...--')
})

it('offers a manual fallback when the clipboard is unavailable', async () => {
  const copy = vi.spyOn(platform, 'copyText').mockRejectedValue(new Error('clipboard unavailable'))
  const w = mount(NumberCodes, { global: { stubs: { RouterLink: true } } })
  try {
    await w.get('button[aria-label="Copy number 73"]').trigger('click')
    expect(w.get('[role="alert"]').text()).toContain('copy it manually')
    expect(w.find('[role="status"]').exists()).toBe(false)
  } finally { w.unmount(); copy.mockRestore() }
})

it('filters meanings and historical examples, reports empty results and copies a number', async () => {
  const copy = vi.spyOn(platform, 'copyText').mockResolvedValue(undefined)
  const w = mount(NumberCodes, { global: { stubs: { RouterLink: true } } })
  try {
    expect(w.findAll('article')).toHaveLength(3)
    await w.get('input[aria-label="Search number codes"]').setValue('regards')
    expect(w.findAll('article')).toHaveLength(2)
    await w.get('input[aria-label="Search number codes"]').setValue('73')
    await w.get('button[aria-label="Copy number 73"]').trigger('click')
    expect(copy).toHaveBeenCalledWith('73')
    expect(w.get('[role="status"]').text()).toContain('Copied 73')
    await w.get('input[aria-label="Search number codes"]').setValue('not-a-code')
    expect(w.text()).toContain('No number code matches')
    await w.get('input[aria-label="Search number codes"]').setValue('')
    await w.findAll('button').find(b => b.text() === 'Historical examples')!.trigger('click')
    expect(w.findAll('article')).toHaveLength(3)
    expect(w.findAll('article').map(a => a.text()).join(' ')).not.toContain('QRP')
    expect(w.text()).toContain('not a complete historical table')
  } finally { w.unmount(); copy.mockRestore() }
})
