<script setup lang="ts">
import { computed } from 'vue'
import SvgIcon from '@/components/SvgIcon.vue'
import { useLanguageStore } from '@/stores/language'
import type { CheckinStatus } from '@/types'
import okIcon from '@/assets/svg/ok.svg?raw'
import signedIcon from '@/assets/svg/hasSignIn.svg?raw'
import supplementIcon from '@/assets/svg/supplement.svg?raw'

const props = defineProps<{
  status: CheckinStatus
  todayCount: number
  target: number
  loading?: boolean
  forceEnabled?: boolean
  allowMakeup?: boolean
}>()

const emit = defineEmits<{
  checkin: []
  makeup: []
}>()

const languageStore = useLanguageStore()

const enabled = computed(() => {
  return (
    !props.loading && (props.forceEnabled || props.status === 'available' || props.status === 'completed_can_continue')
  )
})
const targetCount = computed(() => Math.max(1, props.target))
const completedCount = computed(() => Math.min(props.todayCount, targetCount.value))
const segmentCount = computed(() => Math.min(Math.max(targetCount.value, 1), 5))
const progressUnits = computed(() => (completedCount.value / targetCount.value) * segmentCount.value)
const segments = computed(() => {
  return Array.from({ length: segmentCount.value }, (_, index) => {
    return Math.max(0, Math.min(1, progressUnits.value - index))
  })
})
</script>

<template>
  <section class="checkin-goal-card app-card">
    <header class="goal-header">
      <span>{{ languageStore.t('todayGoal') }}</span>
      <strong>
        {{ completedCount }}/{{ targetCount }}
        <em>{{ languageStore.t('completedLabel') }}</em>
      </strong>
    </header>

    <div class="goal-segments" :style="{ '--segment-count': segmentCount }">
      <span
        v-for="(progress, index) in segments"
        :key="index"
        class="goal-segment"
        :class="{ complete: progress >= 1, partial: progress > 0 && progress < 1 }"
        :style="{ '--segment-progress': progress }"
      >
        <i />
        <SvgIcon :src="signedIcon" :size="18" />
      </span>
    </div>

    <slot name="middle" />

    <div class="goal-actions">
      <button v-if="allowMakeup" class="goal-action makeup" type="button" @click="emit('makeup')">
        <SvgIcon :src="supplementIcon" :size="15" />
        {{ languageStore.t('makeupEntry') }}
      </button>
      <button class="goal-action primary" type="button" :disabled="!enabled" @click="emit('checkin')">
        <SvgIcon :src="okIcon" :size="15" />
        {{ loading ? languageStore.t('checkinLoading') : languageStore.t('checkinAction') }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.checkin-goal-card {
  display: grid;
  gap: 10px;
  padding: 12px;
}

.goal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.goal-header span {
  color: var(--text);
  font-size: 13px;
  line-height: 16px;
  font-weight: 500;
}

.goal-header strong {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--item-accent, var(--accent));
  font-size: 12px;
  line-height: 15px;
  font-weight: 500;
}

.goal-header em {
  color: var(--muted);
  font-style: normal;
  font-weight: 400;
}

.goal-segments {
  display: grid;
  grid-template-columns: repeat(var(--segment-count), minmax(0, 1fr));
  gap: 2px;
}

.goal-segment {
  position: relative;
  display: grid;
  height: 40px;
  overflow: hidden;
  place-items: center;
  border-radius: 999px;
  background: #f1efea;
  color: rgba(255, 255, 255, 0.74);
}

:root[data-theme='dark'] .goal-segment {
  background: color-mix(in srgb, var(--surface-soft) 48%, transparent);
  color: rgba(255, 255, 255, 0.84);
}

.goal-segment i {
  position: absolute;
  inset: 0 auto 0 0;
  width: calc(var(--segment-progress) * 100%);
  background: var(--item-accent, var(--accent));
}

.goal-segment.partial,
.goal-segment.complete {
  color: rgba(255, 255, 255, 0.92);
}

:root[data-theme='dark'] .goal-segment.partial,
:root[data-theme='dark'] .goal-segment.complete {
  color: #ffffff;
}

.goal-segment .svg-icon {
  position: relative;
  z-index: 1;
}

.goal-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.goal-action {
  display: inline-flex;
  min-width: 0;
  height: 36px;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid color-mix(in srgb, var(--item-accent, var(--accent)) 34%, transparent);
  border-radius: 9px;
  background: transparent;
  color: var(--item-accent, var(--accent));
  padding: 0 12px;
  font-size: 13px;
  line-height: 16px;
  font-weight: 500;
}

.goal-action.primary {
  flex: 1.35;
  border-color: transparent;
  background: var(--item-accent, var(--accent));
  color: #ffffff;
}

.goal-action:disabled {
  cursor: not-allowed;
  background: var(--surface-soft);
  color: var(--muted);
  opacity: 1;
}
</style>
