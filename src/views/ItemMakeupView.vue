<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { createCheckin, fetchItem, listCheckins } from '@/api/items'
import ContributionHeatmap from '@/components/ContributionHeatmap.vue'
import { useLanguageStore } from '@/stores/language'
import { todayString } from '@/utils/dates'
import type { Checkin, DashboardItem, HeatmapDay } from '@/types'

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

const item = computed(() => entry.value?.item)
const today = computed(() => todayString())
const currentMonth = computed(() => today.value.slice(0, 7))
const currentMonthStart = computed(() => `${currentMonth.value}-01`)
const pendingDateSet = computed(() => new Set(pendingDates.value))
const selectedDateSet = computed(() => new Set(selectedDates.value))

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
  if (!current?.allow_makeup || current.makeup_monthly_limit <= 0) {
    return 0
  }
  return Math.max(0, current.makeup_monthly_limit - confirmedMakeupsThisMonth.value - selectedDates.value.length)
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

  if (current.makeup_monthly_limit <= 0) {
    return candidates.map((day) => day.date)
  }

  if (remainingMakeupSlots.value <= 0) {
    return []
  }

  return candidates.filter((day) => !selectedDateSet.value.has(day.date)).map((day) => day.date)
})

const clickableDates = computed(() => [...new Set([...selectedDates.value, ...availableDates.value])])

const displayHeatmap = computed(() => {
  const current = item.value
  const heatmap = entry.value?.heatmap ?? []
  if (!current || selectedDates.value.length === 0) {
    return heatmap
  }

  return heatmap.map((day) => {
    if (!selectedDateSet.value.has(day.date)) {
      return day
    }
    return {
      ...day,
      count: current.daily_target_count,
      level: 4,
      completed: true,
    }
  })
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [entryData, checkinData] = await Promise.all([fetchItem(itemId), listCheckins(itemId)])
    entry.value = entryData
    checkins.value = checkinData
  } catch (err) {
    error.value = err instanceof Error ? err.message : languageStore.t('itemLoadFailed')
  } finally {
    loading.value = false
  }
}

async function makeup(day: HeatmapDay) {
  if (!clickableDates.value.includes(day.date) || pendingDateSet.value.has(day.date)) {
    return
  }

  if (selectedDateSet.value.has(day.date)) {
    selectedDates.value = selectedDates.value.filter((date) => date !== day.date)
    return
  }

  selectedDates.value = [...selectedDates.value, day.date]
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
  } catch (err) {
    error.value = err instanceof Error ? err.message : languageStore.t('checkinFailed')
  } finally {
    pendingDates.value = []
    confirming.value = false
  }
}

onMounted(load)
</script>

<template>
  <main class="makeup-page">
    <header class="makeup-topbar">
      <RouterLink class="button secondary" :to="`/items/${itemId}/checkin`">
        {{ languageStore.t('backCheckin') }}
      </RouterLink>
      <span v-if="entry && item" class="makeup-count">
        {{
          item.makeup_monthly_limit > 0
            ? languageStore.t('makeupRemainingThisMonth', { count: remainingMakeupSlots })
            : languageStore.t('makeupUnlimited')
        }}
      </span>
    </header>

    <div v-if="loading" class="loading">{{ languageStore.t('loading') }}</div>
    <section v-else-if="entry && item" class="makeup-heatmap card">
      <ContributionHeatmap
        :values="displayHeatmap"
        :color-theme="item.color_theme"
        interactive
        :clickable-dates="clickableDates"
        :pending-dates="pendingDates"
        @day-click="makeup"
      />
      <div class="makeup-actions">
        <span>{{ languageStore.t('makeupSelectedCount', { count: selectedDates.length }) }}</span>
        <button class="button" type="button" :disabled="selectedDates.length === 0 || confirming" @click="confirmMakeup">
          {{ confirming ? languageStore.t('saveLoading') : languageStore.t('confirmMakeup') }}
        </button>
      </div>
    </section>
    <p v-else class="error">{{ languageStore.t('itemMissing') }}</p>

    <p v-if="success" class="makeup-toast success">{{ success }}</p>
    <p v-if="error" class="makeup-toast error">{{ error }}</p>
  </main>
</template>

<style scoped>
.makeup-page {
  display: grid;
  min-height: 100vh;
  align-content: center;
  gap: 16px;
  width: min(980px, calc(100% - 32px));
  margin: 0 auto;
  padding: 24px 0 48px;
}

.makeup-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.makeup-count {
  color: var(--muted);
  font-size: 13px;
  font-weight: 700;
}

.makeup-heatmap {
  padding: 16px;
}

.makeup-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 14px;
}

.makeup-actions span {
  color: var(--muted);
  font-size: 13px;
  font-weight: 700;
}

.makeup-toast {
  justify-self: center;
  margin: 0;
}

@media (max-width: 560px) {
  .makeup-actions {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
