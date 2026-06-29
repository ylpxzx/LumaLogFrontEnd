import { ref } from 'vue'
import { defineStore } from 'pinia'
import { categoryTranslations, messages, type MessageKey } from '@/i18n/messages'
import type { LanguagePreference } from '@/types'

const storageKey = 'lumalog_language'

function normalizeLanguage(value: string | null | undefined): LanguagePreference {
  return value === 'en' ? 'en' : 'zh'
}

function isLanguagePreference(value: string | null | undefined): value is LanguagePreference {
  return value === 'zh' || value === 'en'
}

export const useLanguageStore = defineStore('language', () => {
  const preference = ref<LanguagePreference>(normalizeLanguage(localStorage.getItem(storageKey)))

  function applyLanguage() {
    document.documentElement.lang = preference.value === 'en' ? 'en' : 'zh-CN'
  }

  function setLanguage(next: string | null | undefined) {
    if (!isLanguagePreference(next)) {
      return
    }

    preference.value = next
    localStorage.setItem(storageKey, preference.value)
    applyLanguage()
  }

  function initLanguage() {
    applyLanguage()
  }

  function t(key: MessageKey, params: Record<string, string | number> = {}): string {
    const dictionary = messages[preference.value]
    const fallback = messages.zh[key]
    const template = String(dictionary[key] ?? fallback ?? key)

    return Object.entries(params).reduce(
      (text, [name, value]) => text.split(`{${name}}`).join(String(value)),
      template,
    )
  }

  function categoryName(name: string) {
    if (preference.value !== 'en') {
      return name
    }

    return categoryTranslations[name as keyof typeof categoryTranslations] ?? name
  }

  return {
    preference,
    setLanguage,
    initLanguage,
    t,
    categoryName,
  }
})
