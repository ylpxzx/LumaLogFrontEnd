<script setup lang="ts">
import { useLanguageStore } from '@/stores/language'
import type { CheckinStatus } from '@/types'
import { statusHint, statusText } from '@/utils/status'

const props = defineProps<{
  status: CheckinStatus
  todayCount: number
  target: number
  loading?: boolean
  forceEnabled?: boolean
}>()

const emit = defineEmits<{
  checkin: []
}>()

const languageStore = useLanguageStore()

function canClick() {
  return (
    !props.loading && (props.forceEnabled || props.status === 'available' || props.status === 'completed_can_continue')
  )
}
</script>

<template>
  <button
    class="checkin-button"
    type="button"
    :class="{ disabled: !canClick(), completed: status === 'completed' }"
    :disabled="!canClick()"
    @click="emit('checkin')"
  >
    <span class="checkin-count">{{ Math.min(todayCount, target) }}/{{ target }}</span>
    <strong>{{ statusText(status, languageStore.preference) }}</strong>
    <small>{{
      loading
        ? languageStore.t('checkinLoading')
        : statusHint(status, languageStore.preference)
    }}</small>
  </button>
</template>

<style scoped>
.checkin-button {
  display: grid;
  width: min(300px, 70vw);
  aspect-ratio: 1;
  place-items: center;
  border: 1px solid color-mix(in srgb, var(--accent) 45%, var(--border));
  border-radius: 50%;
  background:
    radial-gradient(circle at 50% 38%, rgba(255, 255, 255, 0.18), transparent 32%),
    var(--accent);
  color: #ffffff;
  box-shadow:
    0 0 0 18px var(--accent-soft),
    0 24px 80px rgba(0, 0, 0, 0.18);
  padding: 34px;
  text-align: center;
  transition:
    transform 180ms ease,
    opacity 180ms ease;
}

.checkin-button:not(.disabled):hover {
  transform: translateY(-2px) scale(1.01);
}

.checkin-button.disabled {
  background: var(--surface-soft);
  color: var(--muted);
  box-shadow: none;
}

.checkin-button.completed {
  color: var(--text);
}

.checkin-count {
  align-self: end;
  font-size: 32px;
  font-weight: 800;
  line-height: 1;
}

.checkin-button strong {
  font-size: 20px;
}

.checkin-button small {
  align-self: start;
  color: currentColor;
  opacity: 0.78;
}
</style>
