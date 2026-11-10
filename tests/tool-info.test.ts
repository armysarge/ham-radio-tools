import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ToolLayout from '../src/components/ToolLayout.vue'
import { tools } from '../src/core/registry'
import { TOOL_INFO } from '../src/data/toolInfo'

const layout = (id: string) => mount(ToolLayout, { props: { id }, slots: { default: '<p>body</p>' }, attachTo: document.body })

describe('tool info button', () => {
  it('opens and closes a plain-language explanation beside the favourite button', async () => {
    const w = layout('swr')
    try {
      const info = w.get('button[aria-label="What is this tool?"]')
      const fav = w.get('button[aria-pressed]')
      expect(info.element.nextElementSibling).toBe(fav.element)
      expect(info.get('svg').attributes('aria-hidden')).toBe('true')
      expect(info.attributes('aria-expanded')).toBe('false')
      expect(w.find('.tool-info').exists()).toBe(false)
      await info.trigger('click')
      expect(info.attributes('aria-expanded')).toBe('true')
      expect(info.attributes('aria-controls')).toBe(w.get('.tool-info').attributes('id'))
      expect(w.get('.tool-info').text()).toContain('What is this?')
      expect(w.get('.tool-info').text()).toContain(TOOL_INFO.swr.what)
      expect(w.get('.tool-info').text()).toContain(TOOL_INFO.swr.when)
      await w.get('section').trigger('keydown', { key: 'Escape' })
      expect(w.find('.tool-info').exists()).toBe(false)
      await info.trigger('click'); await info.trigger('click')
      expect(w.find('.tool-info').exists()).toBe(false)
    } finally { w.unmount() }
  })
  it('keeps favouriting independent of the info panel', async () => {
    const w = layout('swr')
    try {
      await w.get('button[aria-label="What is this tool?"]').trigger('click')
      await w.get('button[aria-pressed]').trigger('click')
      expect(w.get('button[aria-pressed]').attributes('aria-pressed')).toBe('true')
      expect(w.find('.tool-info').exists()).toBe(true)
      await w.get('button[aria-pressed]').trigger('click')
    } finally { w.unmount() }
  })
  it('appears on every tool page', () => {
    for (const t of tools) {
      const w = layout(t.id)
      try { expect(w.find('button[aria-label="What is this tool?"]').exists(), t.id).toBe(true) } finally { w.unmount() }
    }
  })
})
