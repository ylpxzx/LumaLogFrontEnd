<script setup lang="ts">
import { useLanguageStore } from '@/stores/language'
import type { MessageKey } from '@/i18n/messages'
import { colorThemes } from '@/utils/colors'

defineProps<{
  modelValue: string
}>()

const languageStore = useLanguageStore()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const colorLabelKeys: Record<string, MessageKey> = {
  green: 'colorGreen',
  blue: 'colorBlue',
  purple: 'colorPurple',
  orange: 'colorOrange',
  red: 'colorRed',
  teal: 'colorTeal',
  pink: 'colorPink',
  gray: 'colorGray',
}

function colorLabel(theme: string) {
  return languageStore.t(colorLabelKeys[theme] ?? 'colorGreen')
}
</script>

<template>
  <div class="color-picker">
    <button
      v-for="theme in colorThemes"
      :key="theme.value"
      type="button"
      class="color-swatch"
      :class="{ active: modelValue === theme.value }"
      :title="colorLabel(theme.value)"
      :style="{ '--swatch': theme.color }"
      @click="emit('update:modelValue', theme.value)"
    >
      <span>{{ colorLabel(theme.value) }}</span>
    </button>
  </div>
</template>

<style scoped>
.color-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.color-swatch {
  display: inline-flex;
  min-height: 34px;
  align-items: center;
  gap: 7px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--muted);
  padding: 6px 10px;
}

.color-swatch::before {
  width: 12px;
  height: 12px;
  border-radius: 4px;
  background: var(--swatch);
  content: '';
}

.color-swatch.active {
  border-color: var(--swatch);
  color: var(--text);
  box-shadow: var(--focus);
}
</style>
