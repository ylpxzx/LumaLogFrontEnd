import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import type { ThemePreference } from '@/types'

const storageKey = 'lumalog_theme'

export const useThemeStore = defineStore('theme', () => {
  const preference = ref<ThemePreference>(
    (localStorage.getItem(storageKey) as ThemePreference | null) ?? 'system',
  )

  const systemDark = ref(window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false)

  const resolvedTheme = computed(() => {
    if (preference.value === 'system') {
      return systemDark.value ? 'dark' : 'light'
    }
    return preference.value
  })

  function applyTheme() {
    document.documentElement.dataset.theme = resolvedTheme.value
  }

  function setTheme(next: ThemePreference) {
    preference.value = next
    localStorage.setItem(storageKey, next)
    applyTheme()
  }

  function initTheme() {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)')
    media?.addEventListener('change', (event) => {
      systemDark.value = event.matches
      applyTheme()
    })
    applyTheme()
  }

  watch(preference, applyTheme)

  return {
    preference,
    resolvedTheme,
    setTheme,
    initTheme,
  }
})
