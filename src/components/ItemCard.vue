<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { DashboardItem, StatsVisibility } from '@/types'
import { useLanguageStore } from '@/stores/language'
import { statusText } from '@/utils/status'
import { themeColor } from '@/utils/colors'
import ContributionHeatmap from './ContributionHeatmap.vue'

const props = defineProps<{
  entry: DashboardItem
  showTodayStatus: boolean
  statsVisibility: StatsVisibility
}>()

const router = useRouter()
const languageStore = useLanguageStore()
const longPressDelay = 650
const longPressTimer = ref<number | null>(null)
const suppressNextClick = ref(false)

const hasVisibleStats = computed(() => {
  return Object.values(props.statsVisibility).some(Boolean)
})

function openCheckin() {
  if (suppressNextClick.value) {
    suppressNextClick.value = false
    return
  }
  router.push(`/items/${props.entry.item.id}/checkin`)
}

function openEdit() {
  suppressNextClick.value = true
  router.push(`/items/${props.entry.item.id}/edit`)
}

function startLongPress(event: PointerEvent) {
  if (event.button !== 0) {
    return
  }
  clearLongPress()
  longPressTimer.value = window.setTimeout(() => {
    longPressTimer.value = null
    openEdit()
  }, longPressDelay)
}

function clearLongPress() {
  if (longPressTimer.value !== null) {
    window.clearTimeout(longPressTimer.value)
    longPressTimer.value = null
  }
}
</script>

<template>
  <article
    class="item-entry"
    :title="languageStore.t('longPressEdit')"
    @click="openCheckin"
    @contextmenu.prevent
    @pointerdown="startLongPress"
    @pointerup="clearLongPress"
    @pointercancel="clearLongPress"
    @pointerleave="clearLongPress"
  >
    <header class="item-entry-header">
      <div class="item-heading">
        <h4>{{ entry.item.name }}</h4>
        <span v-if="showTodayStatus" class="status-chip">
          {{ statusText(entry.status, languageStore.preference) }}
        </span>
      </div>
      <span class="category-pill" :style="{ '--category-color': themeColor(entry.item.color_theme) }">
        {{ entry.item.category_name ? languageStore.categoryName(entry.item.category_name) : languageStore.t('uncategorized') }}
      </span>
    </header>

    <div v-if="hasVisibleStats" class="stats-row">
      <div v-if="statsVisibility.show_current_streak">
        <strong>{{ entry.stats.current_streak }}</strong>
        <span>{{ languageStore.t('currentStreak') }}</span>
      </div>
      <div v-if="statsVisibility.show_longest_streak">
        <strong>{{ entry.stats.longest_streak }}</strong>
        <span>{{ languageStore.t('longestStreak') }}</span>
      </div>
      <div v-if="statsVisibility.show_completion_rate">
        <strong>{{ Math.round(entry.stats.completion_rate * 100) }}%</strong>
        <span>{{ languageStore.t('completionRate') }}</span>
      </div>
      <div v-if="statsVisibility.show_total_checkins">
        <strong>{{ entry.stats.total_checkins }}</strong>
        <span>{{ languageStore.t('totalCheckins') }}</span>
      </div>
    </div>

    <div class="heatmap-card card">
      <ContributionHeatmap :values="entry.heatmap" :color-theme="entry.item.color_theme" />
    </div>
  </article>
</template>

<style scoped>
.item-entry {
  display: grid;
  /* gap: 10px; */
  transition:
    transform 160ms ease,
    opacity 160ms ease;
}

.item-entry:hover {
  transform: translateY(-1px);
}

.item-entry-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 0 2px;
}

.item-heading {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 10px;
}

.category-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--muted);
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.category-pill::before {
  width: 9px;
  height: 9px;
  border-radius: 3px;
  background: var(--category-color);
  content: '';
}

.item-heading h2 {
  overflow: hidden;
  margin: 0;
  font-size: 18px;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-chip {
  border: 1px solid var(--border);
  border-radius: 7px;
  background: var(--surface);
  color: var(--muted);
  font-size: 10px;
  font-weight: 600;
  line-height: 1;
  padding: 3px 6px;
  white-space: nowrap;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  padding: 2px 2px 0;
}

.stats-row div {
  display: grid;
  gap: 3px;
}

.stats-row strong {
  font-size: 22px;
  line-height: 1;
}

.stats-row span {
  color: var(--muted);
  font-size: 12px;
}

.heatmap-card {
  padding: 14px;
  transition: border-color 160ms ease;
}

.item-entry:hover .heatmap-card {
  border-color: color-mix(in srgb, var(--accent) 42%, var(--border));
}

@media (max-width: 720px) {
  .item-entry-header {
    align-items: center;
    flex-direction: row;
    gap: 8px;
  }

  .item-heading {
    flex-wrap: wrap;
  }

  .stats-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
