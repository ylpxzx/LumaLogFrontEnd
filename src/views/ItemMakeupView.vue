<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { createCheckin, fetchItem, listCheckins } from '@/api/items'
import LumaIconBadge from '@/components/LumaIconBadge.vue'
import SvgIcon from '@/components/SvgIcon.vue'
import { useLanguageStore } from '@/stores/language'
import { formatDate, formatFullDisplayDate, parseLocalDate, todayString } from '@/utils/dates'
import { themeColor } from '@/utils/colors'
import type { Checkin, DashboardItem, HeatmapDay, Item } from '@/types'
import okIcon from '@/assets/svg/ok.svg?raw'

const route = useRoute()
const languageStore = useLanguageStore()
const itemId = Number(route.params.id)

const entry = ref<DashboardItem | null>(null)
const checkins = ref<Checkin[]>([])
const loading = ref(true)
const error = ref('')
const success = ref('')
const pendingDates = ref<string[]>([])
const selectedDates = ref<string[]>([])
const confirming = ref(false)

type CalendarStatus = 'outside' | 'unavailable' | 'completed' | 'available' | 'selected'

const item = computed(() => entry.value?.item)
const accent = computed(() => (item.value ? themeColor(item.value.color_theme) : '#22c55e'))
const today = computed(() => todayString())
const currentMonth = computed(() => today.value.slice(0, 7))
const currentMonthStart = computed(() => `${currentMonth.value}-01`)
const pendingDateSet = computed(() => new Set(pendingDates.value))
const selectedDateSet = computed(() => new Set(selectedDates.value))
const weekdayLabels = computed(() => {
  return languageStore.preference === 'en'
    ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    : ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
})
const monthLabel = computed(() => {
  const [year, month] = currentMonth.value.split('-').map(Number)
  const yearValue = year ?? 1970
  const monthValue = month ?? 1
  if (languageStore.preference === 'en') {
    return new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(new Date(yearValue, monthValue - 1, 1))
  }
  return `${yearValue}年${monthValue}月`
})

const confirmedMakeupsThisMonth = computed(() => {
  return checkins.value.filter((record) => {
    if (record.source !== 'makeup') {
      return false
    }
    const createdMonth = (record.created_at || record.checkin_date).slice(0, 7)
    return createdMonth === currentMonth.value
  }).length
})

const remainingMakeupSlots = computed(() => {
  const current = item.value
  const limit = makeupMonthlyLimit(current)
  if (!current?.allow_makeup || limit <= 0) {
    return 0
  }
  return Math.max(0, limit - confirmedMakeupsThisMonth.value - selectedDates.value.length)
})

const makeupRecordsByDate = computed(() => {
  const result = new Map<string, Checkin[]>()
  checkins.value
    .filter((record) => record.source === 'makeup')
    .forEach((record) => {
      const records = result.get(record.checkin_date) ?? []
      records.push(record)
      result.set(record.checkin_date, records)
    })
  return result
})

const completedDates = computed(() => {
  const target = item.value?.daily_target_count ?? 1
  const grouped = new Map<string, Checkin[]>()
  checkins.value.forEach((record) => {
    const records = grouped.get(record.checkin_date) ?? []
    records.push(record)
    grouped.set(record.checkin_date, records)
  })
  return new Set(
    [...grouped.entries()]
      .filter(([, records]) => records.reduce((sum, record) => sum + record.count, 0) >= target)
      .map(([date]) => date),
  )
})

const baseCandidates = computed(() => {
  const current = item.value
  const heatmap = entry.value?.heatmap ?? []
  if (!current?.allow_makeup) {
    return []
  }

  return heatmap
    .filter((day) => {
      if (day.date < currentMonthStart.value) {
        return false
      }
      if (day.date < current.start_date) {
        return false
      }
      if (day.date >= today.value) {
        return false
      }
      if (!current.is_unlimited && current.end_date && day.date > current.end_date) {
        return false
      }
      if (makeupRecordsByDate.value.has(day.date)) {
        return false
      }
      return day.count === 0
    })
    .sort((a, b) => b.date.localeCompare(a.date))
})

const availableDates = computed(() => {
  const current = item.value
  const candidates = baseCandidates.value
  if (!current?.allow_makeup) {
    return []
  }

  if (makeupMonthlyLimit(current) <= 0) {
    return candidates.map((day) => day.date)
  }

  if (remainingMakeupSlots.value <= 0) {
    return []
  }

  return candidates.filter((day) => !selectedDateSet.value.has(day.date)).map((day) => day.date)
})

const clickableDates = computed(() => [...new Set([...selectedDates.value, ...availableDates.value])])
const clickableDateSet = computed(() => new Set(clickableDates.value))
const selectedLocalDates = computed(() => {
  return selectedDates.value.map((date) => parseLocalDate(date)).sort((a, b) => a.getTime() - b.getTime())
})
const selectedDateText = computed(() => {
  if (selectedLocalDates.value.length === 0) {
    return languageStore.t('makeupNoDatesSelected')
  }
  return selectedLocalDates.value.map((date) => formatFullDisplayDate(formatDate(date), languageStore.preference)).join('、')
})
const calendarCells = computed(() => buildCalendarCells(currentMonth.value))

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [entryData, checkinData] = await Promise.all([fetchItem(itemId), listCheckins(itemId)])
    entry.value = entryData
    checkins.value = checkinData
  } catch {
    error.value = languageStore.t('itemLoadFailed')
  } finally {
    loading.value = false
  }
}

function dayStatus(day: HeatmapDay): CalendarStatus {
  if (!day.completed) {
    return 'outside'
  }
  if (selectedDateSet.value.has(day.date)) {
    return 'selected'
  }
  if (clickableDateSet.value.has(day.date)) {
    return 'available'
  }
  if (completedDates.value.has(day.date)) {
    return 'completed'
  }
  return 'unavailable'
}

function makeupMonthlyLimit(current: Item | undefined) {
  return current?.makeup_monthly_limit ?? current?.makeup_limit_days ?? 0
}

function toggleDate(date: string) {
  if (!clickableDateSet.value.has(date) || pendingDateSet.value.has(date)) {
    return
  }

  if (selectedDateSet.value.has(date)) {
    selectedDates.value = selectedDates.value.filter((selected) => selected !== date)
    return
  }

  selectedDates.value = [...selectedDates.value, date]
  success.value = ''
  error.value = ''
}

async function confirmMakeup() {
  if (selectedDates.value.length === 0 || confirming.value) {
    return
  }

  confirming.value = true
  pendingDates.value = [...selectedDates.value]
  success.value = ''
  error.value = ''
  try {
    const dates = [...selectedDates.value].sort()
    for (const date of dates) {
      entry.value = await createCheckin(itemId, {
        checkin_date: date,
        source: 'makeup',
      })
    }
    entry.value = await fetchItem(itemId)
    checkins.value = await listCheckins(itemId)
    success.value = languageStore.t('makeupConfirmSuccess', { count: dates.length })
    selectedDates.value = []
  } catch {
    error.value = languageStore.t('checkinFailed')
  } finally {
    pendingDates.value = []
    confirming.value = false
  }
}

function buildCalendarCells(monthValue: string): HeatmapDay[] {
  const [year = 1970, month = 1] = monthValue.split('-').map(Number)
  const first = new Date(year, month - 1, 1)
  const start = new Date(first)
  const leadingDays = (first.getDay() + 6) % 7
  start.setDate(first.getDate() - leadingDays)
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    const key = formatDate(date)
    const inMonth = key.startsWith(monthValue)
    return {
      date: key,
      count: 0,
      level: 0,
      completed: inMonth,
    }
  })
}

onMounted(load)
</script>

<template>
  <main class="makeup-page" :style="{ '--item-accent': accent }">
    <header class="screen-topbar">
      <RouterLink class="back-link screen-topbar-left" :to="`/items/${itemId}/checkin`">←</RouterLink>
      <span class="screen-topbar-title">{{ languageStore.t('makeupEntry') }}</span>
    </header>

    <div v-if="loading" class="loading">{{ languageStore.t('loading') }}</div>
    <section v-else-if="entry && item" class="makeup-stack">
      <section class="makeup-habit app-card">
        <LumaIconBadge :icon-key="item.icon_key" :accent="accent" :size="74" />
        <div class="makeup-habit-main">
          <div class="makeup-title-row">
            <h1>{{ item.name }}</h1>
            <span>{{ item.category_name ? languageStore.categoryName(item.category_name) : languageStore.t('uncategorized') }}</span>
          </div>
          <p>
            {{
              makeupMonthlyLimit(item) > 0
                ? languageStore.t('makeupRemainingThisMonth', { count: remainingMakeupSlots })
                : languageStore.t('makeupUnlimited')
            }}
          </p>
        </div>
      </section>

      <section class="calendar-card app-card">
        <h2>{{ monthLabel }}</h2>
        <div class="weekday-row">
          <span v-for="label in weekdayLabels" :key="label">{{ label }}</span>
        </div>
        <div class="calendar-grid">
          <button
            v-for="day in calendarCells"
            :key="day.date"
            class="calendar-day"
            :class="dayStatus(day)"
            :disabled="!['selected', 'available'].includes(dayStatus(day))"
            type="button"
            @click="toggleDate(day.date)"
          >
            <span>{{ parseLocalDate(day.date).getDate() }}</span>
            <SvgIcon v-if="dayStatus(day) === 'selected'" :src="okIcon" :size="14" />
            <i v-else-if="dayStatus(day) === 'completed'" />
            <b v-else />
          </button>
        </div>
        <div class="makeup-legend">
          <span><i class="completed" />{{ languageStore.t('makeupCompletedLegend') }}</span>
          <span><i class="available" />{{ languageStore.t('makeupAvailableLegend') }}</span>
          <span><i class="selected"><SvgIcon :src="okIcon" :size="10" /></i>{{ languageStore.t('makeupSelectedLegend') }}</span>
          <span><i class="unavailable" />{{ languageStore.t('makeupUnavailableLegend') }}</span>
        </div>
      </section>

      <section class="selected-card app-card">
        <span class="selected-icon"><SvgIcon :src="okIcon" :size="24" /></span>
        <div>
          <strong>{{ languageStore.t('makeupSelected', { count: selectedDates.length }) }}</strong>
          <p>{{ selectedDateText }}</p>
        </div>
      </section>
    </section>
    <p v-else class="error">{{ languageStore.t('itemMissing') }}</p>

    <p v-if="success" class="makeup-toast success">{{ success }}</p>
    <p v-if="error" class="makeup-toast error">{{ error }}</p>
  </main>

  <footer v-if="entry && item" class="makeup-bottom-bar">
    <button class="button" type="button" :disabled="selectedDates.length === 0 || confirming" @click="confirmMakeup">
      {{ confirming ? languageStore.t('saveLoading') : languageStore.t('confirmMakeup') }}
    </button>
  </footer>
</template>

<style scoped>
.makeup-page {
  display: grid;
  gap: 10px;
}

.makeup-stack {
  display: grid;
  gap: 10px;
}

.makeup-habit {
  display: flex;
  align-items: center;
  gap: 14px;
  border-color: color-mix(in srgb, var(--item-accent) 16%, transparent);
  padding: 14px;
}

.makeup-habit-main {
  display: grid;
  min-width: 0;
  flex: 1;
  gap: 7px;
}

.makeup-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.makeup-title-row h1 {
  overflow: hidden;
  flex: 1;
  margin: 0;
  color: var(--text);
  font-size: 21px;
  line-height: 25px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.makeup-title-row span {
  max-width: 104px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--item-accent) 15%, transparent);
  border-radius: 9px;
  background: color-mix(in srgb, var(--item-accent) 10%, transparent);
  color: var(--item-accent);
  padding: 3px 8px;
  font-size: 12px;
  line-height: 15px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.makeup-habit-main p {
  overflow: hidden;
  margin: 0;
  color: var(--muted);
  font-size: 14px;
  line-height: 18px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.calendar-card {
  display: grid;
  gap: 9px;
  border-color: color-mix(in srgb, var(--item-accent) 16%, transparent);
  padding: 14px;
}

.calendar-card h2 {
  margin: 0 0 5px;
  color: var(--text);
  font-size: 21px;
  line-height: 25px;
  font-weight: 500;
  text-align: center;
}

.weekday-row,
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 6px;
}

.weekday-row span {
  color: var(--muted);
  font-size: 12px;
  line-height: 15px;
  text-align: center;
}

.calendar-day {
  display: grid;
  aspect-ratio: 1;
  place-items: center;
  border: 1px solid color-mix(in srgb, var(--border) 86%, transparent);
  border-radius: 9px;
  background: color-mix(in srgb, var(--surface-soft) 40%, transparent);
  color: var(--muted);
  padding: 0;
}

.calendar-day span {
  color: currentColor;
  font-size: 16px;
  line-height: 18px;
  font-weight: 400;
}

.calendar-day b,
.calendar-day i {
  width: 6px;
  height: 6px;
}

.calendar-day.completed {
  background: color-mix(in srgb, var(--surface-soft) 58%, transparent);
  color: var(--text);
}

.calendar-day.completed i {
  border-radius: 999px;
  background: color-mix(in srgb, var(--item-accent) 78%, transparent);
}

.calendar-day.available {
  border-width: 1.4px;
  border-color: var(--item-accent);
  background: color-mix(in srgb, var(--surface-soft) 38%, transparent);
  color: var(--text);
}

.calendar-day.selected {
  border-color: var(--item-accent);
  background: var(--item-accent);
  color: #ffffff;
}

.calendar-day.outside {
  background: color-mix(in srgb, var(--surface-soft) 14%, transparent);
  color: color-mix(in srgb, var(--muted) 38%, transparent);
}

.calendar-day:disabled {
  cursor: default;
}

.makeup-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  padding-top: 5px;
}

.makeup-legend span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--muted);
  font-size: 12px;
  line-height: 15px;
}

.makeup-legend i {
  display: grid;
  width: 16px;
  height: 16px;
  place-items: center;
  border-radius: 4px;
}

.makeup-legend .completed {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--item-accent);
}

.makeup-legend .available {
  width: 14px;
  height: 14px;
  border: 1.5px solid var(--item-accent);
}

.makeup-legend .selected {
  background: var(--item-accent);
  color: #ffffff;
}

.makeup-legend .unavailable {
  background: var(--surface-soft);
}

.selected-card {
  display: flex;
  align-items: center;
  gap: 12px;
  border-color: color-mix(in srgb, var(--item-accent) 16%, transparent);
  padding: 14px;
}

.selected-icon {
  display: grid;
  width: 50px;
  height: 50px;
  place-items: center;
  border: 1.5px solid color-mix(in srgb, var(--item-accent) 76%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--item-accent) 9%, transparent);
  color: var(--item-accent);
}

.selected-card div {
  display: grid;
  min-width: 0;
  flex: 1;
  gap: 5px;
}

.selected-card strong {
  color: var(--text);
  font-size: 17px;
  line-height: 21px;
  font-weight: 500;
}

.selected-card p {
  overflow: hidden;
  margin: 0;
  color: var(--item-accent);
  font-size: 14px;
  line-height: 18px;
  text-overflow: ellipsis;
}

.makeup-toast {
  justify-self: center;
  margin: 0;
}

.makeup-bottom-bar {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 12;
  border-top: 1px solid var(--border);
  background: var(--surface);
  padding: 10px 12px max(10px, env(safe-area-inset-bottom));
}

.makeup-bottom-bar .button {
  width: min(736px, 100%);
  min-height: 50px;
  margin: 0 auto;
  border-radius: 15px;
}

@media (max-width: 520px) {
  .makeup-title-row span {
    max-width: 92px;
  }
}
</style>
