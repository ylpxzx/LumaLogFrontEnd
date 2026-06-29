<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { createCheckin, fetchItem, fetchItemBadges, fetchItemShare, listCheckins } from '@/api/items'
import CheckinButton from '@/components/CheckinButton.vue'
import ContributionHeatmap from '@/components/ContributionHeatmap.vue'
import { useLanguageStore } from '@/stores/language'
import { badgeImage } from '@/utils/badgeImages'
import { heatmapLevelColor } from '@/utils/colors'
import { formatDate, formatFullDisplayDate, parseLocalDate, todayString } from '@/utils/dates'
import type { Badge, Checkin, DashboardItem, HeatmapDay, SharePayload } from '@/types'
import { statusText } from '@/utils/status'

const route = useRoute()
const languageStore = useLanguageStore()
const itemId = Number(route.params.id)

const entry = ref<DashboardItem | null>(null)
const loading = ref(true)
const checking = ref(false)
const error = ref('')
const success = ref('')
const note = ref('')
const checkins = ref<Checkin[]>([])
const badges = ref<Badge[]>([])
const sharing = ref(false)

const item = computed(() => entry.value?.item)
const earnedBadges = computed(() => badges.value.filter((badge) => badge.earned))
const zhMonthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
const enMonthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const timeHint = computed(() => {
  if (!item.value) {
    return ''
  }
  if (item.value.time_mode === 'all_day') {
    return languageStore.t('allDayCheckin')
  }
  return `${item.value.valid_start_time} - ${item.value.valid_end_time}`
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [entryData, checkinData, badgeData] = await Promise.all([
      fetchItem(itemId),
      listCheckins(itemId),
      fetchItemBadges(itemId),
    ])
    entry.value = entryData
    checkins.value = checkinData
    badges.value = badgeData
  } catch (err) {
    error.value = err instanceof Error ? err.message : languageStore.t('itemLoadFailed')
  } finally {
    loading.value = false
  }
}

async function checkin() {
  checking.value = true
  error.value = ''
  success.value = ''
  try {
    entry.value = await createCheckin(itemId, {
      note: note.value.trim(),
    })
    checkins.value = await listCheckins(itemId)
    badges.value = await fetchItemBadges(itemId)
    success.value = languageStore.t('checkinSuccess', { count: entry.value.stats.current_streak })
    note.value = ''
  } catch (err) {
    error.value = err instanceof Error ? err.message : languageStore.t('checkinFailed')
  } finally {
    checking.value = false
  }
}

async function downloadShareImage() {
  if (!item.value) {
    return
  }
  sharing.value = true
  error.value = ''
  success.value = ''
  try {
    const share = await fetchItemShare(itemId)
    const dataUrl = await renderShareImage(share)
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = `lumalog-${share.item.name}-${todayString()}.png`
    link.click()
    // success.value = languageStore.t('shareDownloaded')
  } catch (err) {
    error.value = err instanceof Error ? err.message : languageStore.t('shareFailed')
  } finally {
    sharing.value = false
  }
}

async function renderShareImage(share: SharePayload) {
  const canvas = document.createElement('canvas')
  const scale = 2
  const width = 960
  const height = 620
  canvas.width = width * scale
  canvas.height = height * scale
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error(languageStore.t('shareFailed'))
  }

  const palette = shareCanvasPalette()
  ctx.scale(scale, scale)
  ctx.fillStyle = palette.bg
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = palette.surface
  roundedRect(ctx, 36, 36, width - 72, height - 72, 24)
  ctx.fill()

  ctx.fillStyle = palette.text
  ctx.font = '700 44px system-ui, sans-serif'
  ctx.fillText(share.item.name, 72, 116)
  ctx.fillStyle = palette.muted
  ctx.font = '500 20px system-ui, sans-serif'
  ctx.fillText(`${share.item.category_name || languageStore.t('uncategorized')} · LumaLog`, 72, 152)

  const statY = 218
  const stats = [
    [languageStore.t('currentStreak'), share.stats.current_streak],
    [languageStore.t('longestStreak'), share.stats.longest_streak],
    [languageStore.t('totalCheckins'), share.stats.total_checkins],
    [languageStore.t('completionRate'), `${Math.round(share.stats.completion_rate * 100)}%`],
  ]
  stats.forEach(([label, value], index) => {
    const x = 72 + index * 205
    ctx.fillStyle = palette.text
    ctx.font = '760 34px system-ui, sans-serif'
    ctx.fillText(String(value), x, statY)
    ctx.fillStyle = palette.muted
    ctx.font = '500 16px system-ui, sans-serif'
    ctx.fillText(String(label), x, statY + 30)
  })

  const heatmapWeeks = buildShareHeatmapWeeks(share.heatmap)
  const monthLabels = buildShareMonthLabels(heatmapWeeks)
  const columns = heatmapWeeks.length
  const gap = 3
  const gridLeft = 72
  const gridTop = 310
  const gridWidth = width - gridLeft * 2
  const cell = columns > 0 ? (gridWidth - (columns - 1) * gap) / columns : 0
  const gridHeight = cell * 7 + gap * 6

  ctx.fillStyle = palette.muted
  ctx.font = '500 13px system-ui, sans-serif'
  monthLabels.forEach((month) => {
    ctx.fillText(month.label, gridLeft + month.index * (cell + gap), gridTop - 14)
  })

  heatmapWeeks.forEach((week, weekIndex) => {
    week.forEach((day, dayIndex) => {
      if (!day) {
        return
      }
      const x = gridLeft + weekIndex * (cell + gap)
      const y = gridTop + dayIndex * (cell + gap)
      ctx.fillStyle = canvasHeatmapLevelColor(share.item.color_theme, day.level, palette.squareEmpty)
      roundedRect(ctx, x, y, cell, cell, Math.min(3, cell / 3))
      ctx.fill()
    })
  })

  ctx.fillStyle = palette.muted
  ctx.font = '500 16px system-ui, sans-serif'
  ctx.fillText(`${languageStore.t('heatmapLabel')} · ${columns} weeks`, gridLeft, gridTop + gridHeight + 28)

  await drawShareBadges(ctx, share.badges, palette, gridTop + gridHeight + 68)

  return canvas.toDataURL('image/png')
}

function buildShareHeatmapWeeks(values: HeatmapDay[]) {
  if (values.length === 0) {
    return []
  }

  const firstValue = values[0]
  const lastValue = values.at(-1)
  if (!firstValue || !lastValue) {
    return []
  }

  const valueMap = new Map(values.map((day) => [day.date, day]))
  const first = parseLocalDate(firstValue.date)
  const last = parseLocalDate(lastValue.date)
  const start = startOfHeatmapWeek(first)
  const result: Array<Array<HeatmapDay | null>> = []

  for (let cursor = new Date(start); cursor <= last; cursor.setDate(cursor.getDate() + 7)) {
    const week: Array<HeatmapDay | null> = []
    for (let offset = 0; offset < 7; offset++) {
      const date = new Date(cursor)
      date.setDate(cursor.getDate() + offset)
      week.push(valueMap.get(formatDate(date)) ?? null)
    }
    result.push(week)
  }

  return result
}

function buildShareMonthLabels(weeks: Array<Array<HeatmapDay | null>>) {
  const monthNames = languageStore.preference === 'en' ? enMonthNames : zhMonthNames
  const visibleDays = weeks.flat().filter(Boolean) as HeatmapDay[]
  const firstValue = visibleDays[0]
  const lastValue = visibleDays.at(-1)
  const spansMultipleYears = firstValue
    ? Boolean(lastValue) &&
      parseLocalDate(firstValue.date).getFullYear() !== parseLocalDate(lastValue?.date ?? firstValue.date).getFullYear()
    : false
  const seenMonths = new Set<string>()

  return weeks
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
          spansMultipleYears && date.getMonth() === 0
            ? languageStore.preference === 'en'
              ? `${enMonthNames[0]} ${date.getFullYear()}`
              : `${date.getFullYear()}年1月`
            : monthNames[date.getMonth()],
        index,
      }
    })
    .filter(Boolean) as Array<{ label: string; index: number }>
}

function startOfHeatmapWeek(date: Date) {
  const result = new Date(date)
  const day = result.getDay()
  const diff = day === 0 ? -6 : 1 - day
  result.setDate(result.getDate() + diff)
  return result
}

function shareCanvasPalette() {
  return {
    bg: cssVariableValue('--bg', '#0c1118'),
    surface: cssVariableValue('--surface', '#121923'),
    surfaceSoft: cssVariableValue('--surface-soft', '#192230'),
    text: cssVariableValue('--text', '#eef3f8'),
    muted: cssVariableValue('--muted', '#94a3b8'),
    border: cssVariableValue('--border', '#263244'),
    accent: cssVariableValue('--accent', '#4ade80'),
    squareEmpty: cssVariableValue('--square-empty', '#1c2634'),
  }
}

function cssVariableValue(name: string, fallback: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
}

function canvasHeatmapLevelColor(theme: string, level: number, emptyColor: string) {
  const color = heatmapLevelColor(theme, level)
  const cssVariable = color.match(/^var\((--[^)]+)\)$/)?.[1]
  if (!cssVariable) {
    return color
  }

  return cssVariableValue(cssVariable, emptyColor)
}

async function drawShareBadges(
  ctx: CanvasRenderingContext2D,
  badges: Badge[],
  palette: ReturnType<typeof shareCanvasPalette>,
  top: number,
) {
  const earned = badges.filter((badge) => badge.earned).slice(0, 5)
  if (earned.length === 0) {
    return
  }

  ctx.fillStyle = palette.text
  ctx.font = '700 18px system-ui, sans-serif'
  ctx.fillText(languageStore.t('earnedBadges'), 72, top)

  const badgeWidth = 96
  const gap = 20
  const iconSize = 50
  const startX = 72
  const badgeTop = top + 18
  const images = await Promise.all(earned.map((badge) => loadCanvasImage(badgeImage(badge.id))))

  earned.forEach((badge, index) => {
    const image = images[index]
    if (!image) {
      return
    }

    const x = startX + index * (badgeWidth + gap)
    const imageX = x + (badgeWidth - iconSize) / 2
    ctx.drawImage(image, imageX, badgeTop, iconSize, iconSize)

    ctx.fillStyle = palette.text
    ctx.font = '700 12px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(badge.title, x + badgeWidth / 2, badgeTop + 66)
    ctx.textAlign = 'left'
  })
}

function loadCanvasImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(languageStore.t('shareFailed')))
    image.src = src
  })
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + width, y, x + width, y + height, radius)
  ctx.arcTo(x + width, y + height, x, y + height, radius)
  ctx.arcTo(x, y + height, x, y, radius)
  ctx.arcTo(x, y, x + width, y, radius)
  ctx.closePath()
}

onMounted(load)
</script>

<template>
  <main class="checkin-page">
    <header class="topbar checkin-topbar">
      <RouterLink class="button secondary" to="/">{{ languageStore.t('backHome') }}</RouterLink>
      <button class="button secondary" type="button" :disabled="loading || sharing" @click="downloadShareImage">
        {{ sharing ? languageStore.t('saveLoading') : languageStore.t('generateShare') }}
      </button>
    </header>

    <div v-if="loading" class="loading">{{ languageStore.t('loading') }}</div>
    <section v-else-if="entry && item" class="checkin-stage">
      <p class="category-line">{{ item.category_name }}</p>
      <h1>{{ item.name }}</h1>

      <CheckinButton
        :status="entry.status"
        :today-count="entry.today_count"
        :target="item.daily_target_count"
        :loading="checking"
        @checkin="checkin"
      />

      <div class="checkin-compose">
        <label class="field">
          <!-- <span>{{ languageStore.t('note') }}</span> -->
          <textarea
            v-model="note"
            class="textarea"
            maxlength="160"
            :placeholder="languageStore.t('notePlaceholder')"
          />
        </label>
      </div>

      <div class="checkin-meta">
        <span>{{ statusText(entry.status, languageStore.preference) }}</span>
        <span>{{ timeHint }}</span>
        <span>{{ languageStore.t('streakDays', { count: entry.stats.current_streak }) }}</span>
      </div>

      <div v-if="item.allow_makeup" class="topbar-actions">
        <RouterLink v-if="item.allow_makeup" class="button secondary" :to="`/items/${item.id}/makeup`">
          {{ languageStore.t('makeupEntry') }}
        </RouterLink>
      </div>

      <p v-if="success" class="success">{{ success }}</p>
      <p v-if="error" class="error">{{ error }}</p>

      <section v-if="earnedBadges.length > 0" class="checkin-panel card">
        <div class="panel-heading">{{ languageStore.t('earnedBadges') }}</div>
        <div class="badge-list">
          <span
            v-for="badge in earnedBadges"
            :key="badge.id"
            class="achievement-badge"
            :class="badge.level"
            :title="badge.description"
          >
            <img class="achievement-badge-image" :src="badgeImage(badge.id)" :alt="badge.title" />
            <span class="achievement-badge-label">{{ badge.title }}</span>
          </span>
        </div>
      </section>

      <div class="mini-heatmap card">
        <ContributionHeatmap :values="entry.heatmap" :color-theme="item.color_theme" />
      </div>

      <details class="checkin-panel card">
        <summary class="panel-heading record-summary">
          <span>{{ languageStore.t('checkinRecords') }}</span>
          <span>{{ checkins.length }}</span>
        </summary>
        <p v-if="checkins.length === 0" class="muted">{{ languageStore.t('noCheckinRecords') }}</p>
        <div v-else class="record-list">
          <div v-for="record in checkins.slice(0, 8)" :key="record.id" class="record-row">
            <div>
              <strong>{{ formatFullDisplayDate(record.checkin_date, languageStore.preference) }}</strong>
              <span>{{ record.source === 'makeup' ? languageStore.t('makeupCheckin') : languageStore.t('normalCheckin') }} · {{ record.count }}</span>
            </div>
            <p v-if="record.note">{{ record.note }}</p>
          </div>
        </div>
      </details>
    </section>
    <p v-else class="error">{{ languageStore.t('itemMissing') }}</p>
  </main>
</template>

<style scoped>
.checkin-page {
  width: min(980px, calc(100% - 32px));
  min-height: 100vh;
  margin: 0 auto;
  padding: 24px 0 48px;
}

.checkin-topbar {
  margin-bottom: 18px;
}

.flat-share-action {
  border: 0;
  background: transparent;
  color: var(--muted);
  padding: 0;
  font-size: 13px;
  font-weight: 700;
}

.flat-share-action:hover {
  color: var(--text);
}

.flat-share-action:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.checkin-stage {
  display: grid;
  min-height: calc(100vh - 120px);
  place-items: center;
  align-content: center;
  gap: 20px;
  text-align: center;
}

.category-line {
  margin: 0;
  color: var(--muted);
  font-weight: 700;
}

h1 {
  max-width: 720px;
  margin: 0;
  font-size: clamp(30px, 7vw, 56px);
  line-height: 1.05;
}

.checkin-meta {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  color: var(--muted);
  font-size: 14px;
}

.checkin-meta span {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 6px 9px;
}

.checkin-compose {
  display: grid;
  width: min(520px, 100%);
  text-align: left;
}

.checkin-compose .textarea {
  min-height: 74px;
}

.success {
  border: 1px solid rgba(34, 197, 94, 0.28);
  border-radius: 8px;
  background: rgba(34, 197, 94, 0.1);
  color: var(--accent);
  padding: 10px 12px;
}

.mini-heatmap {
  width: min(840px, 100%);
  padding: 14px;
}

.checkin-panel {
  width: min(840px, 100%);
  padding: 14px;
  text-align: left;
}

.panel-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  color: var(--muted);
  font-size: 13px;
  font-weight: 760;
}

.record-summary {
  cursor: pointer;
  list-style: none;
}

.record-summary::-webkit-details-marker {
  display: none;
}

.record-summary::after {
  color: var(--muted);
  content: '+';
  font-size: 18px;
  font-weight: 520;
}

details[open] .record-summary::after {
  content: '-';
}

.badge-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.record-list {
  display: grid;
  gap: 8px;
}

.record-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  border-top: 1px solid var(--border);
  padding-top: 8px;
}

.record-row:first-child {
  border-top: 0;
  padding-top: 0;
}

.record-row div {
  display: grid;
  gap: 3px;
}

.record-row span,
.record-row p {
  margin: 0;
  color: var(--muted);
  font-size: 12px;
}

.record-row p {
  max-width: 360px;
  text-align: right;
}

@media (max-width: 640px) {
  .checkin-compose {
    grid-template-columns: 1fr;
  }

  .record-row {
    flex-direction: column;
  }

  .record-row p {
    text-align: left;
  }
}
</style>
