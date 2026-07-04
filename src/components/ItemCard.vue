<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { DashboardItem, StatsVisibility } from '@/types'
import { useLanguageStore } from '@/stores/language'
import { statusText } from '@/utils/status'
import { themeColor } from '@/utils/colors'
import ContributionHeatmap from './ContributionHeatmap.vue'
import LumaIconBadge from './LumaIconBadge.vue'

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

const accent = computed(() => themeColor(props.entry.item.color_theme))

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
    :style="{ '--item-accent': accent }"
    :title="languageStore.t('longPressEdit')"
    @click="openCheckin"
    @contextmenu.prevent
    @pointerdown="startLongPress"
    @pointerup="clearLongPress"
    @pointercancel="clearLongPress"
    @pointerleave="clearLongPress"
  >
    <header class="item-entry-header">
      <LumaIconBadge :icon-key="entry.item.icon_key" :accent="accent" :size="44" />
      <div class="item-main">
        <div class="item-heading">
          <h4>{{ entry.item.name }}</h4>
          <span v-if="showTodayStatus" class="status-chip">
            {{ statusText(entry.status, languageStore.preference) }}
          </span>
        </div>
        <p v-if="entry.item.description">{{ entry.item.description }}</p>
      </div>
      <span class="category-pill">
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

    <div class="heatmap-card">
      <ContributionHeatmap
        :values="entry.heatmap"
        :color-theme="entry.item.color_theme"
        :max-days="153"
        :show-months="true"
      />
    </div>
  </article>
</template>

<style scoped>
.item-entry {
  display: grid;
  gap: 14px;
  border: 1px solid var(--border);
  border-radius: 18px;
  background: var(--surface);
  padding: 14px 14px 17px;
  transition:
    border-color 160ms ease,
    transform 160ms ease,
    opacity 160ms ease;
}

.item-entry:hover {
  border-color: color-mix(in srgb, var(--item-accent) 26%, var(--border-strong));
  transform: translateY(-1px);
}

.item-entry-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.item-heading {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 6px;
}

.item-main {
  display: grid;
  min-width: 0;
  flex: 1;
  gap: 4px;
}

.item-main p {
  overflow: hidden;
  margin: 0;
  color: color-mix(in srgb, var(--muted) 72%, transparent);
  font-size: 11.5px;
  line-height: 15px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.category-pill {
  display: inline-flex;
  max-width: 110px;
  flex: 0 0 auto;
  align-items: center;
  gap: 4px;
  border: 1px solid color-mix(in srgb, var(--item-accent) 12%, transparent);
  border-radius: 10px;
  background: color-mix(in srgb, var(--item-accent) 8%, transparent);
  color: color-mix(in srgb, var(--item-accent) 90%, var(--text));
  margin-left: 2px;
  padding: 4px 7px;
  font-size: 9px;
  font-weight: 500;
  line-height: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.category-pill::before {
  width: 5px;
  height: 5px;
  flex: 0 0 auto;
  border-radius: 999px;
  background: var(--item-accent);
  content: '';
}

.item-heading h4 {
  overflow: hidden;
  margin: 0;
  font-size: 19px;
  line-height: 23px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-chip {
  border-radius: 10px;
  background: color-mix(in srgb, var(--item-accent) 11%, transparent);
  color: var(--item-accent);
  font-size: 9px;
  font-weight: 600;
  line-height: 11px;
  padding: 3px 6px;
  white-space: nowrap;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  overflow: hidden;
  border-radius: 13px;
  background: var(--surface-soft);
  padding: 9px 0 8px;
}

.stats-row div {
  display: grid;
  min-width: 0;
  gap: 3px;
  place-items: center;
  border-left: 1px solid color-mix(in srgb, var(--border-strong) 38%, transparent);
}

.stats-row div:first-child {
  border-left: 0;
}

.stats-row strong {
  color: var(--text);
  font-size: 18px;
  line-height: 21px;
  font-weight: 600;
}

.stats-row span {
  color: var(--muted);
  font-size: 9px;
  line-height: 13px;
  overflow: hidden;
  max-width: 100%;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.heatmap-card {
  min-width: 0;
  padding: 0 2px 1px;
}

@media (max-width: 720px) {
  .item-entry-header {
    align-items: center;
    flex-direction: row;
    gap: 8px;
  }

  .item-heading {
    min-width: 0;
  }
}
</style>
