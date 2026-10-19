import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { analyticsAvailable } from '../src/core/analytics'
import { state } from '../src/core/store'
import ConsentBanner from '../src/components/ConsentBanner.vue'

describe('analytics is absent unless the demo build asks for it', () => {
  it('is unavailable, unset and invisible in a normal build', () => {
    expect(analyticsAvailable).toBe(false); expect(state.analytics).toBe('unset')
    expect(mount(ConsentBanner).find('.consent').exists()).toBe(false)
  })
})
