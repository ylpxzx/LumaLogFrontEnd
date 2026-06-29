<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { useLanguageStore } from '@/stores/language'
import { useThemeStore } from '@/stores/theme'
import type { ThemePreference } from '@/types'

const themeStore = useThemeStore()
const authStore = useAuthStore()
const languageStore = useLanguageStore()

async function selectTheme(theme: ThemePreference) {
  themeStore.setTheme(theme)
  if (authStore.user) {
    await authStore.savePreferences({ theme_preference: theme })
  }
}
</script>

<template>
  <div class="segmented" :aria-label="languageStore.t('theme')">
    <button
      type="button"
      :class="{ active: themeStore.preference === 'system' }"
      @click="selectTheme('system')"
    >
      {{ languageStore.t('themeSystem') }}
    </button>
    <button
      type="button"
      :class="{ active: themeStore.preference === 'light' }"
      @click="selectTheme('light')"
    >
      {{ languageStore.t('themeLight') }}
    </button>
    <button
      type="button"
      :class="{ active: themeStore.preference === 'dark' }"
      @click="selectTheme('dark')"
    >
      {{ languageStore.t('themeDark') }}
    </button>
  </div>
</template>
