<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { HeatmapDay } from '@/types'
import { formatDate, formatFullDisplayDate, parseLocalDate } from '@/utils/dates'
import { heatmapLevelColor } from '@/utils/colors'
import { useLanguageStore } from '@/stores/language'

const props = defineProps<{
  values: HeatmapDay[]
  colorTheme: string
}>()

const languageStore = useLanguageStore()
const zhMonthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
const enMonthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const compactDayCount = 153
const isCompact = ref(false)
let mediaQuery: MediaQueryList | null = null

const monthNames = computed(() => (languageStore.preference === 'en' ? enMonthNames : zhMonthNames))

const visibleValues = computed(() => {
  if (!isCompact.value || props.values.length <= compactDayCount) {
    return props.values
  }

  return props.values.slice(-compactDayCount)
})

const valueMap = computed(() => new Map(visibleValues.value.map((day) => [day.date, day])))

const spansMultipleYears = computed(() => {
  const firstValue = visibleValues.value[0]
  const lastValue = visibleValues.value.at(-1)
  if (!firstValue || !lastValue) {
    return false
  }

  return parseLocalDate(firstValue.date).getFullYear() !== parseLocalDate(lastValue.date).getFullYear()
})

const weeks = computed(() => {
  if (visibleValues.value.length === 0) {
    return []
  }

  const firstValue = visibleValues.value[0]
  const lastValue = visibleValues.value.at(-1)
  if (!firstValue || !lastValue) {
    return []
  }

  const first = parseLocalDate(firstValue.date)
  const last = parseLocalDate(lastValue.date)
  const start = startOfWeek(first)
  const result: Array<Array<HeatmapDay | null>> = []

  for (let cursor = new Date(start); cursor <= last; cursor.setDate(cursor.getDate() + 7)) {
    const week: Array<HeatmapDay | null> = []
    for (let offset = 0; offset < 7; offset++) {
      const date = new Date(cursor)
      date.setDate(cursor.getDate() + offset)
      const key = formatDate(date)
      week.push(valueMap.value.get(key) ?? null)
    }
    result.push(week)
  }

  return result
})

const monthLabels = computed(() => {
  const seenMonths = new Set<string>()
  return weeks.value
    .map((week, index) => {
      const firstDayOfMonth = week.find((day) => day && parseLocalDate(day.date).getDate() === 1)
      const firstVisibleDay = index === 0 ? week.find((day) => day) : null
      const targetDay = firstDayOfMonth ?? firstVisibleDay

      if (!targetDay) {
        return null
      }

      const date = parseLocalDate(targetDay.date)
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`
      if (seenMonths.has(monthKey)) {
        return null
      }

      seenMonths.add(monthKey)
      return {
        label:
          spansMultipleYears.value && date.getMonth() === 0
            ? languageStore.preference === 'en'
              ? `${enMonthNames[0]} ${date.getFullYear()}`
              : `${date.getFullYear()}年1月`
            : monthNames.value[date.getMonth()],
        index,
      }
    })
    .filter(Boolean) as Array<{ label: string; index: number }>
})

function startOfWeek(date: Date) {
  const result = new Date(date)
  const day = result.getDay()
  const diff = day === 0 ? -6 : 1 - day
  result.setDate(result.getDate() + diff)
  return result
}

function updateCompactMode(event: MediaQueryList | MediaQueryListEvent) {
  isCompact.value = event.matches
}

onMounted(() => {
  mediaQuery = window.matchMedia('(max-width: 640px)')
  updateCompactMode(mediaQuery)
  mediaQuery.addEventListener('change', updateCompactMode)
})

onBeforeUnmount(() => {
  mediaQuery?.removeEventListener('change', updateCompactMode)
})
</script>

<template>
  <div class="heatmap" :style="{ '--columns': weeks.length }">
    <div class="heatmap-months">
      <span
        v-for="month in monthLabels"
        :key="`${month.label}-${month.index}`"
        :style="{ gridColumn: `${month.index + 1}` }"
      >
        {{ month.label }}
      </span>
    </div>

    <div class="heatmap-content">
      <div class="heatmap-grid" :aria-label="languageStore.t('heatmapLabel')">
        <template v-for="(week, weekIndex) in weeks" :key="weekIndex">
          <span
            v-for="(day, dayIndex) in week"
            :key="`${weekIndex}-${dayIndex}`"
            class="heatmap-square"
            :class="{ placeholder: !day }"
            :title="
              day
                ? languageStore.t('heatmapTooltip', {
                    date: formatFullDisplayDate(day.date, languageStore.preference),
                    count: day.count,
                    completed: day.completed ? languageStore.t('heatmapCompletedSuffix') : '',
                  })
                : ''
            "
            :style="{ backgroundColor: day ? heatmapLevelColor(colorTheme, day.level) : 'transparent' }"
          />
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.heatmap {
  width: 100%;
  padding-bottom: 2px;
  --cell-gap: 3px;
}

.heatmap-months {
  display: grid;
  grid-template-columns: repeat(var(--columns), minmax(0, 1fr));
  gap: var(--cell-gap);
  width: 100%;
  color: var(--muted);
  font-size: 11px;
}

.heatmap-months span {
  white-space: nowrap;
}

.heatmap-content {
  width: 100%;
}

.heatmap-grid {
  display: grid;
  grid-auto-flow: column;
  grid-template-columns: repeat(var(--columns), minmax(0, 1fr));
  grid-template-rows: repeat(7, minmax(0, 1fr));
  gap: var(--cell-gap);
  width: 100%;
  aspect-ratio: var(--columns) / 7;
}

.heatmap-square {
  width: 100%;
  height: 100%;
  min-width: 0;
  border-radius: 3px;
  outline: 1px solid rgba(0, 0, 0, 0.02);
}

.heatmap-square.placeholder {
  outline: none;
}
</style>
