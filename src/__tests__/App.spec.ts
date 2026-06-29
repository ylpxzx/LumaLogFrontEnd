import { describe, it, expect } from 'vitest'

import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import App from '../App.vue'

describe('App', () => {
  it('mounts with router view', () => {
    const wrapper = mount(App, {
      global: {
        plugins: [createPinia()],
        stubs: ['RouterView'],
      },
    })

    expect(wrapper.exists()).toBe(true)
  })
})
