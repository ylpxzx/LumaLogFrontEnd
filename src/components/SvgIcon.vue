<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    src: string
    size?: number
    label?: string
  }>(),
  {
    size: 16,
    label: '',
  },
)

const svgMarkup = computed(() => {
  return props.src
    .replace(/<\?xml[\s\S]*?\?>/gi, '')
    .replace(/<!DOCTYPE[\s\S]*?>/gi, '')
    .replace(/\s(width|height)="[^"]*"/gi, '')
    .replace(/<svg\b/i, '<svg aria-hidden="true" focusable="false"')
})
</script>

<template>
  <span
    class="svg-icon"
    :aria-hidden="label ? undefined : 'true'"
    :aria-label="label || undefined"
    :role="label ? 'img' : undefined"
    :style="{
      width: `${props.size}px`,
      height: `${props.size}px`,
    }"
    v-html="svgMarkup"
  />
</template>

<style scoped>
.svg-icon {
  display: inline-block;
  flex: 0 0 auto;
  color: currentColor;
  line-height: 0;
}

.svg-icon :deep(svg) {
  display: block;
  width: 100%;
  height: 100%;
}

.svg-icon :deep(path:not([fill='none'])),
.svg-icon :deep(circle:not([fill='none'])),
.svg-icon :deep(rect:not([fill='none'])),
.svg-icon :deep(polygon:not([fill='none'])),
.svg-icon :deep(ellipse:not([fill='none'])) {
  fill: currentColor;
}

.svg-icon :deep([stroke]:not([stroke='none'])) {
  stroke: currentColor;
}
</style>
