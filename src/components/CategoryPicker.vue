<script setup lang="ts">
import { useLanguageStore } from '@/stores/language'
import type { Category } from '@/types'

defineProps<{
  modelValue: number | null
  categories: Category[]
}>()

const languageStore = useLanguageStore()

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()
</script>

<template>
  <select
    class="select"
    :value="modelValue ?? ''"
    @change="emit('update:modelValue', Number(($event.target as HTMLSelectElement).value))"
  >
    <option disabled value="">{{ languageStore.t('selectCategory') }}</option>
    <option v-for="category in categories" :key="category.id" :value="category.id">
      {{ languageStore.categoryName(category.name) }}
    </option>
  </select>
</template>
