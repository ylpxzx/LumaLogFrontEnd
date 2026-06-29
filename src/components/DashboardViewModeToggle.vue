<script setup lang="ts">
import { useLanguageStore } from '@/stores/language'
import type { DashboardViewMode } from '@/types'

defineProps<{
  modelValue: DashboardViewMode
}>()

const languageStore = useLanguageStore()

const emit = defineEmits<{
  'update:modelValue': [value: DashboardViewMode]
}>()
</script>

<template>
  <div class="segmented" :aria-label="languageStore.t('dashboardModeLabel')">
    <button
      type="button"
      :class="{ active: modelValue === 'all' }"
      @click="emit('update:modelValue', 'all')"
    >
      {{ languageStore.t('all') }}
    </button>
    <button
      type="button"
      :class="{ active: modelValue === 'category' }"
      @click="emit('update:modelValue', 'category')"
    >
      {{ languageStore.t('category') }}
    </button>
  </div>
</template>
