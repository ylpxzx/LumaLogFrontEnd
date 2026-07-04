<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { HeatmapDay } from '@/types'
import { formatDate, formatFullDisplayDate, parseLocalDate } from '@/utils/dates'
import { heatmapLevelColor } from '@/utils/colors'
import { useLanguageStore } from '@/stores/language'

const props = defineProps<{
  values: HeatmapDay[]
  colorTheme: string
  interactive?: boolean
  clickableDates?: string[]
  pendingDates?: string[]
  selectedDates?: string[]
  makeupDates?: string[]
  dayLabels?: Record<string, string>
  showMonths?: boolean
  maxDays?: number
}>()

const emit = defineEmits<{
  dayClick: [day: HeatmapDay]
}>()

const languageStore = useLanguageStore()
const zhMonthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
const enMonthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const compactDayCount = 153
const isCompact = ref(false)
const selectedDay = ref<HeatmapDay | null>(null)
let mediaQuery: MediaQueryList | null = null

const monthNames = computed(() => (languageStore.preference === 'en' ? enMonthNames : zhMonthNames))

const visibleValues = computed(() => {
  const limit = props.maxDays ?? (isCompact.value ? compactDayCount : 0)
  if (!limit || props.values.length <= limit) {
    return props.values
  }

  return props.values.slice(-limit)
})

const valueMap = computed(() => new Map(visibleValues.value.map((day) => [day.date, day])))
const clickableDateSet = computed(() => new Set(props.clickableDates ?? []))
const pendingDateSet = computed(() => new Set(props.pendingDates ?? []))
const selectedDateSet = computed(() => new Set(props.selectedDates ?? []))
const makeupDateSet = computed(() => new Set(props.makeupDates ?? []))
const selectedDayText = computed(() => {
  if (!selectedDay.value) {
    return ''
  }
  return dayText(selectedDay.value)
})
const selectedDayLines = computed(() => selectedDayText.value.split('\n').filter(Boolean))

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
      week.push(
        valueMap.value.get(key) ??
          (date < first ? { date: key, count: 0, level: 0, completed: false } : null),
      )
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

function canClick(day: HeatmapDay | null) {
  return Boolean(day && props.interactive && clickableDateSet.value.has(day.date))
}

function handleDayClick(day: HeatmapDay | null) {
  if (!day) {
    return
  }

  if (!props.interactive) {
    selectedDay.value = day
    return
  }

  if (canClick(day) && !pendingDateSet.value.has(day.date)) {
    emit('dayClick', day)
  }
}

function dayText(day: HeatmapDay) {
  const customLabel = props.dayLabels?.[day.date]
  if (customLabel) {
    return customLabel
  }
  return languageStore.t('heatmapTooltip', {
    date: formatFullDisplayDate(day.date, languageStore.preference),
    count: day.count,
    completed: day.completed ? languageStore.t('heatmapCompletedSuffix') : '',
  })
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
    <div v-if="showMonths !== false" class="heatmap-months">
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
            :class="{
              placeholder: !day,
              inspectable: day && !interactive,
              clickable: canClick(day),
              disabled: interactive && day && !canClick(day),
              pending: day && pendingDateSet.has(day.date),
              selected: day && (selectedDay?.date === day.date || selectedDateSet.has(day.date)),
              makeup: day && makeupDateSet.has(day.date),
            }"
            :title="day ? dayText(day) : ''"
            :style="{ backgroundColor: day ? heatmapLevelColor(colorTheme, day.level) : 'transparent' }"
            @click="handleDayClick(day)"
          />
        </template>
      </div>
    </div>

    <div v-if="selectedDayLines.length > 0" class="heatmap-selection">
      <span
        v-for="(line, index) in selectedDayLines"
        :key="`${line}-${index}`"
        :class="{ 'is-note': index > 0 }"
      >
        {{ line }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.heatmap {
  width: 100%;
  padding-bottom: 2px;
  --cell-column-gap: 3px;
  --cell-row-gap: 4px;
}

.heatmap-months {
  display: grid;
  grid-template-columns: repeat(var(--columns), minmax(0, 1fr));
  align-items: center;
  column-gap: var(--cell-column-gap);
  width: 100%;
  min-height: 14px;
  margin-bottom: 7px;
  color: color-mix(in srgb, var(--muted) 88%, var(--text));
  font-size: 10px;
  font-weight: 600;
  line-height: 12px;
}

.heatmap-months span {
  min-width: max-content;
  white-space: nowrap;
}

:global(html[data-theme='dark']) .heatmap-months {
  color: rgba(226, 232, 240, 0.78);
}

.heatmap-content {
  width: 100%;
}

.heatmap-grid {
  display: grid;
  grid-auto-flow: column;
  grid-template-columns: repeat(var(--columns), minmax(0, 1fr));
  grid-template-rows: repeat(7, minmax(0, 1fr));
  column-gap: var(--cell-column-gap);
  row-gap: var(--cell-row-gap);
  width: 100%;
  aspect-ratio: var(--columns) / 7;
}

.heatmap-square {
  position: relative;
  width: 100%;
  height: 100%;
  min-width: 0;
  border-radius: 3px;
  outline: 0;
}

.heatmap-square.inspectable {
  cursor: pointer;
}

.heatmap-square.inspectable:hover,
.heatmap-square.selected {
  outline: 1px solid color-mix(in srgb, var(--accent) 68%, transparent);
  outline-offset: 1px;
}

.heatmap-square.clickable {
  cursor: pointer;
  outline: 1px solid color-mix(in srgb, var(--accent) 42%, transparent);
  transition:
    transform 140ms ease,
    outline-color 140ms ease,
    opacity 140ms ease;
}

.heatmap-square.clickable:hover {
  transform: scale(1.15);
  outline-color: var(--accent);
}

.heatmap-square.disabled {
  cursor: not-allowed;
  opacity: 0.38;
}

.heatmap-square.pending {
  cursor: wait;
  opacity: 0.72;
}

.heatmap-square.placeholder {
  outline: none;
}

.heatmap-square.makeup::after {
  position: absolute;
  right: 2px;
  bottom: 2px;
  width: 24%;
  height: 24%;
  min-width: 3px;
  min-height: 3px;
  border-radius: 999px;
  background: var(--surface-solid);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 72%, transparent);
  content: '';
}

.heatmap-selection {
  display: grid;
  width: fit-content;
  max-width: 100%;
  gap: 3px;
  margin-top: 8px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface-soft);
  color: var(--muted);
  padding: 6px 8px;
  font-size: 12px;
  font-weight: 650;
  line-height: 16px;
  white-space: pre-wrap;
  word-break: break-word;
}

.heatmap-selection .is-note {
  color: color-mix(in srgb, var(--text) 82%, var(--muted));
  font-weight: 500;
}
</style>
