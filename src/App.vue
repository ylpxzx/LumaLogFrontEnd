<script setup lang="ts">
import { onMounted } from 'vue'
import { useLanguageStore } from '@/stores/language'
import { useThemeStore } from '@/stores/theme'

const themeStore = useThemeStore()
const languageStore = useLanguageStore()

onMounted(() => {
  themeStore.initTheme()
  languageStore.initLanguage()
})
</script>

<template>
  <RouterView />
</template>
