<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { useLanguageStore } from '@/stores/language'
import type { LanguagePreference } from '@/types'

const authStore = useAuthStore()
const languageStore = useLanguageStore()

async function selectLanguage(language: LanguagePreference) {
  languageStore.setLanguage(language)
  if (authStore.user) {
    await authStore.savePreferences({ language_preference: language })
  }
}
</script>

<template>
  <div class="segmented" :aria-label="languageStore.t('language')">
    <button
      type="button"
      :class="{ active: languageStore.preference === 'zh' }"
      @click="selectLanguage('zh')"
    >
      {{ languageStore.t('chinese') }}
    </button>
    <button
      type="button"
      :class="{ active: languageStore.preference === 'en' }"
      @click="selectLanguage('en')"
    >
      {{ languageStore.t('english') }}
    </button>
  </div>
</template>
