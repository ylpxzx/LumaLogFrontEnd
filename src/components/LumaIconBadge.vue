<script setup lang="ts">
import { computed } from 'vue'
import { lumaIconClass } from '@/utils/icons'

const props = withDefaults(
  defineProps<{
    iconKey?: string | null
    accent: string
    size?: number
    selected?: boolean
  }>(),
  {
    iconKey: '',
    size: 38,
    selected: false,
  },
)

const iconClass = computed(() => lumaIconClass(props.iconKey))
</script>

<template>
  <span
    class="luma-icon-badge"
    :class="{ selected }"
    :style="{
      '--icon-accent': accent,
      '--icon-badge-size': `${size}px`,
    }"
  >
    <i class="iconfont" :class="iconClass" aria-hidden="true" />
  </span>
</template>

<style scoped>
.luma-icon-badge {
  display: inline-grid;
  width: var(--icon-badge-size);
  height: var(--icon-badge-size);
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid color-mix(in srgb, var(--icon-accent) 18%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--icon-accent) 12%, transparent);
  color: var(--icon-accent);
}

.luma-icon-badge.selected {
  border-color: color-mix(in srgb, var(--icon-accent) 72%, transparent);
  border-width: 1.5px;
}

.luma-icon-badge .iconfont {
  font-size: calc(var(--icon-badge-size) * 0.56);
  line-height: 1;
}
</style>
