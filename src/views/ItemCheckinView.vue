<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { createCheckin, fetchItem, listCheckins } from '@/api/items'
import CheckinButton from '@/components/CheckinButton.vue'
import ContributionHeatmap from '@/components/ContributionHeatmap.vue'
import LumaIconBadge from '@/components/LumaIconBadge.vue'
import SvgIcon from '@/components/SvgIcon.vue'
import type { MessageKey } from '@/i18n/messages'
import { useLanguageStore } from '@/stores/language'
import { useThemeStore } from '@/stores/theme'
import { badgeImage } from '@/utils/badgeImages'
import { heatmapLevelColor, rgbaFromHex, themeColor } from '@/utils/colors'
import { formatDate, formatFullDisplayDate, parseLocalDate, todayString } from '@/utils/dates'
import { lumaIconClass } from '@/utils/icons'
import type { Badge, Checkin, DashboardItem, HeatmapDay, SharePayload } from '@/types'
import achievementIcon from '@/assets/svg/achievement.svg?raw'
import flameIcon from '@/assets/svg/flame.svg?raw'
import foldIcon from '@/assets/svg/fold.svg?raw'
import progressIcon from '@/assets/svg/progress.svg?raw'
import riseIcon from '@/assets/svg/icon-rise.svg?raw'
import starIcon from '@/assets/svg/star.svg?raw'

const route = useRoute()
const router = useRouter()
const languageStore = useLanguageStore()
const themeStore = useThemeStore()
const itemId = Number(route.params.id)
const checkinNoteMaxLength = 200

const entry = ref<DashboardItem | null>(null)
const loading = ref(true)
const checking = ref(false)
const error = ref('')
const checkins = ref<Checkin[]>([])
const checkinNote = ref('')
const badges = ref<Badge[]>([])
const sharing = ref(false)
const sharePickerOpen = ref(false)
const selectedShareTemplate = ref<ShareTemplate>('poster')
const achievementsExpanded = ref(false)

const item = computed(() => entry.value?.item)
const earnedBadges = computed(() => badges.value.filter((badge) => badge.earned))
const accent = computed(() => (item.value ? themeColor(item.value.color_theme) : '#22c55e'))
const today = computed(() => todayString())
const todayTarget = computed(() => Math.max(item.value?.daily_target_count ?? 1, 1))
const todayCount = computed(() => Math.min(entry.value?.today_count ?? 0, todayTarget.value))
const showCheckinNoteInput = computed(() =>
  Boolean(entry.value && todayCount.value < todayTarget.value),
)
const checkinsByDate = computed(() => {
  const result = new Map<string, Checkin[]>()
  checkins.value.forEach((record) => {
    const records = result.get(record.checkin_date) ?? []
    records.push(record)
    result.set(record.checkin_date, records)
  })
  return result
})
const makeupDates = computed(() => {
  return [...checkinsByDate.value.entries()]
    .filter(([, records]) => records.some((record) => record.source === 'makeup'))
    .map(([date]) => date)
})
const heatmapDayLabels = computed(() => {
  const labels: Record<string, string> = {}
  entry.value?.heatmap.forEach((day) => {
    const records = checkinsByDate.value.get(day.date) ?? []
    const hasMakeup = records.some((record) => record.source === 'makeup')
    const hasNormal = records.some((record) => record.source !== 'makeup')
    const sourceLabel =
      hasNormal && hasMakeup
        ? `${languageStore.t('normalCheckin')} + ${languageStore.t('makeupCheckin')}`
        : hasMakeup
          ? languageStore.t('makeupCheckin')
          : hasNormal
            ? languageStore.t('normalCheckin')
            : ''
    const note = latestNote(records)
    const parts: string[] = []
    if (sourceLabel) {
      parts.push(`${dayText(day)} / ${sourceLabel}`)
    }
    if (note) {
      parts.push(languageStore.t('checkinNoteDetail', { note }))
    }
    if (parts.length > 0) {
      labels[day.date] = parts.join('\n')
    }
  })
  return labels
})
const todayNote = computed(() => latestNoteForDate(checkins.value, today.value))
const zhMonthNames = [
  '1月',
  '2月',
  '3月',
  '4月',
  '5月',
  '6月',
  '7月',
  '8月',
  '9月',
  '10月',
  '11月',
  '12月',
]
const enMonthNames = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]
const checkinStats = computed(() => {
  const stats = entry.value?.stats
  if (!stats) {
    return []
  }
  return [
    { icon: flameIcon, value: stats.current_streak, label: languageStore.t('currentStreak') },
    { icon: riseIcon, value: stats.longest_streak, label: languageStore.t('longestStreak') },
    {
      icon: progressIcon,
      value: `${Math.round(stats.completion_rate * 100)}%`,
      label: languageStore.t('completionRate'),
    },
    { icon: starIcon, value: stats.total_checkins, label: languageStore.t('totalCheckins') },
  ]
})

type ShareTemplate = 'classic' | 'poster' | 'zen' | 'dashboard'

const shareTemplateOptions: Array<{ id: ShareTemplate; labelKey: MessageKey }> = [
  { id: 'classic', labelKey: 'shareTemplate1' },
  { id: 'poster', labelKey: 'shareTemplate2' },
  { id: 'zen', labelKey: 'shareTemplate3' },
  { id: 'dashboard', labelKey: 'shareTemplate4' },
]

const sharePreviewStats = Array.from({ length: 4 }, (_, index) => index)
const sharePreviewFooterBlocks = Array.from({ length: 5 }, (_, index) => index)

watch(
  todayNote,
  (note) => {
    checkinNote.value = note
  },
  { immediate: true },
)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [entryData, checkinData] = await Promise.all([fetchItem(itemId), listCheckins(itemId)])
    entry.value = entryData
    checkins.value = checkinData
    badges.value = itemBadges(entryData.stats)
  } catch {
    error.value = languageStore.t('itemLoadFailed')
  } finally {
    loading.value = false
  }
}

async function checkin() {
  checking.value = true
  error.value = ''
  try {
    entry.value = await createCheckin(itemId, { note: checkinNote.value.trim() })
    checkins.value = await listCheckins(itemId)
    badges.value = itemBadges(entry.value.stats)
  } catch {
    error.value = languageStore.t('checkinFailed')
  } finally {
    checking.value = false
  }
}

function updateCheckinNote(event: Event) {
  const input = event.target as HTMLTextAreaElement
  const value = input.value.slice(0, checkinNoteMaxLength)
  checkinNote.value = value
  if (input.value !== value) {
    input.value = value
  }
}

function latestNoteForDate(records: Checkin[], date: string) {
  return latestNote(records.filter((record) => record.checkin_date === date))
}

function latestNote(records: Checkin[]) {
  for (const record of [...records].sort((left, right) => right.id - left.id)) {
    const note = (record.note ?? '').trim()
    if (note) {
      return note
    }
  }
  return ''
}

function dayText(day: HeatmapDay) {
  return languageStore.t('heatmapTooltip', {
    date: formatFullDisplayDate(day.date, languageStore.preference),
    count: day.count,
    completed: day.completed ? languageStore.t('heatmapCompletedSuffix') : '',
  })
}

function itemBadges(stats: DashboardItem['stats']): Badge[] {
  return [
    {
      id: 'first_light',
      title: '初次点亮',
      description: '完成第一次签到',
      level: 'bronze',
      earned: stats.total_checkins >= 1,
    },
    {
      id: 'week_streak',
      title: '七日连光',
      description: '最长连续签到达到 7 天',
      level: 'silver',
      earned: stats.longest_streak >= 7,
    },
    {
      id: 'month_streak',
      title: '三十日微光',
      description: '最长连续签到达到 30 天',
      level: 'gold',
      earned: stats.longest_streak >= 30,
    },
    {
      id: 'hundred_lights',
      title: '百次记录',
      description: '累计签到达到 100 次',
      level: 'gold',
      earned: stats.total_checkins >= 100,
    },
    {
      id: 'steady_flow',
      title: '稳定节奏',
      description: '完成率达到 80%',
      level: 'silver',
      earned: stats.expected_days >= 7 && stats.completion_rate >= 0.8,
    },
  ]
}

function syncAchievementToggle(event: Event) {
  achievementsExpanded.value = (event.target as HTMLDetailsElement).open
}

function openSharePicker() {
  if (!entry.value || sharing.value) {
    return
  }
  sharePickerOpen.value = true
}

function closeSharePicker() {
  if (sharing.value) {
    return
  }
  sharePickerOpen.value = false
}

function selectShareTemplate(template: ShareTemplate) {
  selectedShareTemplate.value = template
}

function confirmShareTemplate() {
  sharePickerOpen.value = false
  void downloadShareImage(selectedShareTemplate.value)
}

async function downloadShareImage(template: ShareTemplate) {
  if (!item.value) {
    return
  }
  sharing.value = true
  error.value = ''
  try {
    if (!entry.value) {
      return
    }
    const share: SharePayload = {
      item: entry.value.item,
      stats: entry.value.stats,
      heatmap: entry.value.heatmap,
      today_count: entry.value.today_count,
      badges: itemBadges(entry.value.stats),
    }
    const dataUrl = await renderShareImage(share, template)
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = `lumalog-${share.item.name}-${template}-${todayString()}.png`
    link.click()
  } catch {
    error.value = languageStore.t('shareFailed')
  } finally {
    sharing.value = false
  }
}

function sharePreviewCellCount(template: ShareTemplate) {
  switch (template) {
    case 'classic':
    case 'zen':
      return 60
    case 'poster':
    case 'dashboard':
      return 72
    default:
      return 60
  }
}

function shareTemplateNumber(index: number) {
  return languageStore.preference === 'en' ? `Template ${index + 1}` : `模板 ${index + 1}`
}

function shareTemplateName(option: { labelKey: MessageKey }) {
  return (
    languageStore.t(option.labelKey).split('·').at(-1)?.trim() ?? languageStore.t(option.labelKey)
  )
}

function sharePreviewLevel(index: number, template: ShareTemplate) {
  const seeds: Record<ShareTemplate, number> = {
    classic: 3,
    poster: 7,
    zen: 11,
    dashboard: 13,
  }
  const seed = seeds[template]
  if ((index + seed) % 5 === 0 || (index * seed) % 17 === 0) {
    return 3
  }
  if ((index + seed) % 3 === 0 || (index * seed) % 11 === 0) {
    return 2
  }
  if ((index + seed) % 4 === 0) {
    return 1
  }
  return 0
}

function isDarkShareCanvas() {
  return document.documentElement.dataset.theme === 'dark'
}

function shareCanvasDividerColor(lightColor: string) {
  return isDarkShareCanvas() ? '#2b384a' : lightColor
}

function shareCanvasPalette(accent: string, template: ShareTemplate) {
  const isDark = isDarkShareCanvas()
  const lightBg: Record<ShareTemplate, string> = {
    classic: '#f7f8fa',
    poster: '#fbfcfb',
    zen: '#f5f7f8',
    dashboard: '#f5f8fb',
  }
  const lightCard: Record<ShareTemplate, string> = {
    classic: '#ffffff',
    poster: '#fbfffc',
    zen: '#fbfffc',
    dashboard: '#ffffff',
  }
  const lightBorderAlpha: Record<ShareTemplate, number> = {
    classic: 0.36,
    poster: 0.7,
    zen: 0.26,
    dashboard: 0.38,
  }
  const darkCard = template === 'dashboard' ? '#111a24' : '#121923'

  return {
    isDark,
    bg: isDark ? '#0c1118' : lightBg[template],
    card: isDark ? darkCard : lightCard[template],
    statCard: isDark ? '#172232' : '#ffffff',
    text: isDark ? '#eef3f8' : template === 'dashboard' ? '#101927' : '#121a28',
    muted: isDark ? '#94a3b8' : template === 'dashboard' ? '#5a6678' : '#5f6b7a',
    empty: isDark
      ? rgbaFromHex(accent, template === 'dashboard' ? 0.18 : 0.16)
      : template === 'dashboard'
        ? '#e5f7ee'
        : rgbaFromHex(accent, 0.1),
    border: isDark ? rgbaFromHex(accent, 0.42) : rgbaFromHex(accent, lightBorderAlpha[template]),
    statBorder: isDark ? '#2a384a' : '#dce3eb',
    divider: isDark ? '#2b384a' : '#dce6df',
    shadow: isDark ? 'rgba(0, 0, 0, 0.28)' : 'rgba(20, 40, 30, 0.12)',
  }
}

async function renderClassicShareImage(share: SharePayload) {
  const canvas = document.createElement('canvas')
  const scale = 2
  const width = 1600
  const height = 1060
  canvas.width = width * scale
  canvas.height = height * scale
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error(languageStore.t('shareFailed'))
  }

  const accent = themeColor(share.item.color_theme)
  const palette = shareCanvasPalette(accent, 'classic')
  const textColor = palette.text
  const mutedColor = palette.muted
  const emptyColor = palette.empty
  const cardX = 36
  const cardY = 58
  const cardWidth = width - cardX * 2
  const cardHeight = 930

  ctx.scale(scale, scale)
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = palette.bg
  ctx.fillRect(0, 0, width, height)

  ctx.fillStyle = palette.card
  roundedRect(ctx, cardX, cardY, cardWidth, cardHeight, 36)
  ctx.fill()
  ctx.strokeStyle = palette.border
  ctx.lineWidth = 1.5
  roundedRect(ctx, cardX, cardY, cardWidth, cardHeight, 36)
  ctx.stroke()

  await drawClassicHabitIcon(ctx, share.item.icon_key, accent, 92, 104, 136)

  drawFittedCanvasText(ctx, share.item.name, 288, 165, 860, 56, 760, textColor)

  const categoryLabel = share.item.category_name
    ? languageStore.categoryName(share.item.category_name)
    : languageStore.t('uncategorized')
  ctx.font = canvasFont(28, 760)
  ctx.fillStyle = accent
  ctx.fillText(categoryLabel, 270, 226)
  const categoryWidth = ctx.measureText(categoryLabel).width
  ctx.fillStyle = mutedColor
  ctx.font = canvasFont(28, 700)
  ctx.fillText(` / 连续 ${share.stats.current_streak} 天`, 270 + categoryWidth, 226)

  drawClassicShareStats(ctx, share, accent, mutedColor)
  drawClassicShareHeatmap(ctx, share, accent, emptyColor, mutedColor)
  drawClassicShareFooter(ctx, accent, mutedColor)

  return canvas.toDataURL('image/png')
}

async function renderPosterShareImage(share: SharePayload) {
  const canvas = document.createElement('canvas')
  const scale = 2
  const width = 1600
  const height = 1040
  canvas.width = width * scale
  canvas.height = height * scale
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error(languageStore.t('shareFailed'))
  }

  const accent = themeColor(share.item.color_theme)
  const palette = shareCanvasPalette(accent, 'poster')
  const textColor = palette.text
  const mutedColor = palette.muted
  const emptyColor = palette.empty
  const cardX = 36
  const cardY = 36
  const cardWidth = width - cardX * 2
  const cardHeight = 920

  ctx.scale(scale, scale)
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = palette.bg
  ctx.fillRect(0, 0, width, height)

  ctx.save()
  ctx.shadowColor = palette.shadow
  ctx.shadowBlur = 18
  ctx.shadowOffsetY = 8
  ctx.fillStyle = palette.card
  roundedRect(ctx, cardX, cardY, cardWidth, cardHeight, 34)
  ctx.fill()
  ctx.restore()

  ctx.save()
  roundedRect(ctx, cardX, cardY, cardWidth, cardHeight, 34)
  ctx.clip()
  drawPosterDotPattern(ctx, cardX + 26, cardY + 24, cardWidth - 52, cardHeight - 48, accent)
  drawPosterPlantWatermark(ctx, accent)
  ctx.restore()

  ctx.strokeStyle = palette.border
  ctx.lineWidth = 1.5
  roundedRect(ctx, cardX, cardY, cardWidth, cardHeight, 34)
  ctx.stroke()

  await drawPosterHabitIcon(ctx, share.item.icon_key, accent, 108, 138, 70)
  drawFittedCanvasText(ctx, share.item.name, 232, 202, 570, 66, 820, textColor)

  const categoryLabel = share.item.category_name
    ? languageStore.categoryName(share.item.category_name)
    : languageStore.t('uncategorized')
  ctx.font = canvasFont(34, 760)
  ctx.fillStyle = accent
  ctx.fillText(`${categoryLabel} / 连续 ${share.stats.current_streak} 天`, 98, 270)

  drawPosterShareStats(ctx, share, accent, mutedColor)
  drawPosterShareHeatmap(ctx, share, accent, emptyColor, mutedColor)
  drawPosterShareFooter(ctx, textColor, mutedColor)

  return canvas.toDataURL('image/png')
}

async function renderZenShareImage(share: SharePayload) {
  const canvas = document.createElement('canvas')
  const scale = 2
  const width = 1240
  const height = 1140
  canvas.width = width * scale
  canvas.height = height * scale
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error(languageStore.t('shareFailed'))
  }

  const accent = themeColor(share.item.color_theme)
  const palette = shareCanvasPalette(accent, 'zen')
  const textColor = palette.text
  const mutedColor = palette.muted
  const emptyColor = palette.empty
  const cardX = 40
  const cardY = 74
  const cardWidth = 1160
  const cardHeight = 1028
  const cardRadius = 42

  ctx.scale(scale, scale)
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = palette.bg
  ctx.fillRect(0, 0, width, height)

  ctx.save()
  ctx.shadowColor = palette.shadow
  ctx.shadowBlur = 18
  ctx.shadowOffsetY = 8
  ctx.fillStyle = palette.card
  roundedRect(ctx, cardX, cardY, cardWidth, cardHeight, cardRadius)
  ctx.fill()
  ctx.restore()

  ctx.save()
  roundedRect(ctx, cardX, cardY, cardWidth, cardHeight, cardRadius)
  ctx.clip()
  drawZenBottomWash(ctx, accent, cardX, cardY, cardWidth, cardHeight)
  ctx.restore()

  ctx.strokeStyle = palette.border
  ctx.lineWidth = 1.2
  roundedRect(ctx, cardX, cardY, cardWidth, cardHeight, cardRadius)
  ctx.stroke()

  drawZenLeaves(ctx, accent)
  await drawZenHabitIcon(ctx, share.item.icon_key, accent)

  drawCenteredFittedCanvasText(ctx, share.item.name, 620, 390, 780, 58, 34, 820, textColor)

  const categoryLabel = share.item.category_name
    ? languageStore.categoryName(share.item.category_name)
    : languageStore.t('uncategorized')
  drawCenteredFittedCanvasText(
    ctx,
    `${categoryLabel} / 连续 ${share.stats.current_streak} 天`,
    620,
    438,
    650,
    31,
    20,
    760,
    accent,
  )

  drawZenShareStats(ctx, share, accent, mutedColor)
  drawZenShareHeatmap(ctx, share, accent, emptyColor, mutedColor)
  drawZenShareFooter(ctx, textColor, mutedColor)

  return canvas.toDataURL('image/png')
}

async function renderShareImage(share: SharePayload, template: ShareTemplate) {
  if (template === 'classic') {
    return renderClassicShareImage(share)
  }
  if (template === 'poster') {
    return renderPosterShareImage(share)
  }
  if (template === 'zen') {
    return renderZenShareImage(share)
  }

  return renderDashboardShareImage(share)
}

async function renderDashboardShareImage(share: SharePayload) {
  const canvas = document.createElement('canvas')
  const scale = 2
  const width = 1600
  const height = 880
  canvas.width = width * scale
  canvas.height = height * scale
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error(languageStore.t('shareFailed'))
  }

  const accent = '#22c55e'
  const palette = shareCanvasPalette(accent, 'dashboard')
  const textColor = palette.text
  const mutedColor = palette.muted
  const emptyColor = palette.empty

  ctx.scale(scale, scale)
  ctx.fillStyle = palette.bg
  ctx.fillRect(0, 0, width, height)

  drawDashboardShell(ctx, palette)
  await drawClassicHabitIcon(ctx, share.item.icon_key, accent, 84, 92, 148)
  drawDashboardHeader(ctx, share, accent, textColor, mutedColor)
  await drawDashboardStats(ctx, share, accent, mutedColor, palette)
  drawDashboardHeatmap(ctx, share, accent, emptyColor, mutedColor)
  drawDashboardFooter(ctx, textColor, mutedColor)

  return canvas.toDataURL('image/png')
}

function drawDashboardShell(
  ctx: CanvasRenderingContext2D,
  palette: ReturnType<typeof shareCanvasPalette>,
) {
  const cardX = 38
  const cardY = 38
  const cardWidth = 1524
  const cardHeight = 804
  const radius = 48

  ctx.save()
  ctx.shadowColor = palette.isDark ? 'rgba(0, 0, 0, 0.32)' : 'rgba(15, 23, 42, 0.11)'
  ctx.shadowBlur = 22
  ctx.shadowOffsetY = 10
  ctx.fillStyle = palette.card
  roundedRect(ctx, cardX, cardY, cardWidth, cardHeight, radius)
  ctx.fill()
  ctx.restore()

  ctx.strokeStyle = palette.isDark ? rgbaFromHex('#22c55e', 0.56) : '#86e3a8'
  ctx.lineWidth = 1.4
  roundedRect(ctx, cardX, cardY, cardWidth, cardHeight, radius)
  ctx.stroke()
}

function drawDashboardHeader(
  ctx: CanvasRenderingContext2D,
  share: SharePayload,
  accent: string,
  textColor: string,
  mutedColor: string,
) {
  drawFittedCanvasText(ctx, share.item.name, 292, 154, 440, 48, 830, textColor)

  const categoryLabel = share.item.category_name
    ? languageStore.categoryName(share.item.category_name)
    : languageStore.t('uncategorized')
  const streakLabel =
    languageStore.preference === 'en'
      ? `${share.stats.current_streak} day streak`
      : `\u8FDE\u7EED ${share.stats.current_streak} \u5929`

  let x = 276
  const y = 214
  ctx.font = canvasFont(31, 820)
  ctx.fillStyle = accent
  ctx.fillText(categoryLabel, x, y)
  x += ctx.measureText(categoryLabel).width + 10
  ctx.fillStyle = mutedColor
  ctx.fillText('/ ', x, y)
  x += ctx.measureText('/ ').width
  ctx.fillStyle = accent
  ctx.fillText(streakLabel, x, y)
}

async function drawDashboardStats(
  ctx: CanvasRenderingContext2D,
  share: SharePayload,
  accent: string,
  mutedColor: string,
  palette: ReturnType<typeof shareCanvasPalette>,
) {
  const stats = [
    { icon: flameIcon, label: languageStore.t('currentStreak'), value: share.stats.current_streak },
    { icon: riseIcon, label: languageStore.t('longestStreak'), value: share.stats.longest_streak },
    {
      icon: progressIcon,
      label: languageStore.t('completionRate'),
      value: `${Math.round(share.stats.completion_rate * 100)}%`,
    },
    { icon: starIcon, label: languageStore.t('totalCheckins'), value: share.stats.total_checkins },
  ] as const
  const icons = await Promise.all(stats.map((stat) => loadCanvasSvgIcon(stat.icon, accent)))

  stats.forEach((stat, index) => {
    const x = 735 + index * 199
    const y = 98
    const width = 184
    const height = 120

    ctx.save()
    ctx.shadowColor = palette.isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(15, 23, 42, 0.08)'
    ctx.shadowBlur = 14
    ctx.shadowOffsetY = 7
    ctx.fillStyle = palette.statCard
    roundedRect(ctx, x, y, width, height, 16)
    ctx.fill()
    ctx.restore()

    ctx.strokeStyle = palette.statBorder
    ctx.lineWidth = 1.2
    roundedRect(ctx, x, y, width, height, 16)
    ctx.stroke()

    const image = icons[index]
    if (image) {
      ctx.drawImage(image, x + 34, y + 43, 38, 38)
    }

    ctx.textAlign = 'center'
    ctx.fillStyle = palette.isDark ? accent : '#159447'
    ctx.font = canvasFont(34, 850)
    ctx.fillText(String(stat.value), x + 126, y + 62)
    ctx.fillStyle = mutedColor
    ctx.font = canvasFont(18, 800)
    ctx.fillText(stat.label, x + 126, y + 94)
    ctx.textAlign = 'left'
  })
}

function drawDashboardHeatmap(
  ctx: CanvasRenderingContext2D,
  share: SharePayload,
  accent: string,
  emptyColor: string,
  mutedColor: string,
) {
  const visibleValues = share.heatmap.length > 153 ? share.heatmap.slice(-153) : share.heatmap
  const heatmapWeeks = buildShareHeatmapWeeks(visibleValues)
  const columns = heatmapWeeks.length
  if (columns === 0) {
    return
  }

  const gridLeft = 122
  const gridTop = 325
  const gridWidth = 1370
  const gap = 14
  const cell = Math.min(46, (gridWidth - (columns - 1) * gap) / columns)
  const monthLabels = buildDashboardMonthLabels(heatmapWeeks)

  ctx.fillStyle = mutedColor
  ctx.font = canvasFont(23, 800)
  monthLabels.forEach((month) => {
    ctx.fillText(month.label, gridLeft + month.index * (cell + gap), gridTop - 21)
  })

  heatmapWeeks.forEach((week, weekIndex) => {
    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      const day = week[dayIndex]
      const x = gridLeft + weekIndex * (cell + gap)
      const y = gridTop + dayIndex * (cell + gap)
      ctx.fillStyle = day && day.level > 0 ? accent : emptyColor
      roundedRect(ctx, x, y, cell, cell, 7)
      ctx.fill()
    }
  })
}

function buildDashboardMonthLabels(weeks: Array<Array<HeatmapDay | null>>) {
  const visibleDays = weeks.flat().filter(Boolean) as HeatmapDay[]
  const firstValue = visibleDays[0]
  const lastValue = visibleDays.at(-1)
  const spansMultipleYears = firstValue
    ? Boolean(lastValue) &&
      parseLocalDate(firstValue.date).getFullYear() !==
        parseLocalDate(lastValue?.date ?? firstValue.date).getFullYear()
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
        label: dashboardMonthLabel(date, spansMultipleYears),
        index,
      }
    })
    .filter(Boolean) as Array<{ label: string; index: number }>
}

function dashboardMonthLabel(date: Date, spansMultipleYears: boolean) {
  if (languageStore.preference === 'en') {
    const label = enMonthNames[date.getMonth()] ?? ''
    return spansMultipleYears && date.getMonth() === 0 ? `${label} ${date.getFullYear()}` : label
  }

  const monthLabel = `${date.getMonth() + 1}\u6708`
  return spansMultipleYears && date.getMonth() === 0
    ? `${date.getFullYear()}\u5E74${monthLabel}`
    : monthLabel
}

function drawDashboardFooter(
  ctx: CanvasRenderingContext2D,
  textColor: string,
  mutedColor: string,
) {
  const y = 810
  let x = 88

  ctx.font = canvasFont(22, 850)
  ctx.fillStyle = textColor
  ctx.fillText('LumaLog', x, y)
  x += ctx.measureText('LumaLog').width + 12
  ctx.fillStyle = mutedColor
  ctx.fillText('/ ', x, y)
  x += ctx.measureText('/ ').width
  ctx.font = canvasFont(22, 800)
  ctx.fillText(languageStore.t('checkinHeatmap'), x, y)
}

function canvasFont(size: number, weight: number | string = 500) {
  return `${weight} ${size}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
}

function drawFittedCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  size: number,
  weight: number | string,
  color: string,
) {
  let fontSize = size
  ctx.fillStyle = color
  ctx.font = canvasFont(fontSize, weight)
  while (fontSize > 28 && ctx.measureText(text).width > maxWidth) {
    fontSize -= 2
    ctx.font = canvasFont(fontSize, weight)
  }
  ctx.fillText(text, x, y)
}

function drawCenteredFittedCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  y: number,
  maxWidth: number,
  size: number,
  minSize: number,
  weight: number | string,
  color: string,
) {
  let fontSize = size
  ctx.fillStyle = color
  ctx.textAlign = 'center'
  ctx.font = canvasFont(fontSize, weight)
  while (fontSize > minSize && ctx.measureText(text).width > maxWidth) {
    fontSize -= 1
    ctx.font = canvasFont(fontSize, weight)
  }
  ctx.fillText(text, centerX, y)
}

async function drawClassicHabitIcon(
  ctx: CanvasRenderingContext2D,
  iconKey: string | undefined,
  accent: string,
  x: number,
  y: number,
  size: number,
) {
  const gradient = ctx.createLinearGradient(x, y, x + size, y + size)
  gradient.addColorStop(0, rgbaFromHex(accent, 0.12))
  gradient.addColorStop(1, rgbaFromHex(accent, 0.04))

  ctx.fillStyle = gradient
  roundedRect(ctx, x, y, size, size, 30)
  ctx.fill()
  ctx.strokeStyle = rgbaFromHex(accent, 0.08)
  ctx.lineWidth = 1
  roundedRect(ctx, x, y, size, size, 30)
  ctx.stroke()

  const glyph = await canvasIconGlyph(iconKey)
  if (glyph) {
    ctx.save()
    ctx.fillStyle = accent
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = '68px iconfont'
    ctx.fillText(glyph, x + size / 2, y + size / 2 + 2)
    ctx.restore()
    return
  }

  drawFallbackHabitIcon(ctx, accent, x + size / 2, y + size / 2)
}

async function canvasIconGlyph(iconKey: string | undefined) {
  try {
    await document.fonts?.ready
    const probe = document.createElement('i')
    probe.className = `iconfont ${lumaIconClass(iconKey)}`
    probe.style.position = 'absolute'
    probe.style.left = '-9999px'
    probe.style.top = '-9999px'
    probe.style.opacity = '0'
    document.body.appendChild(probe)
    const content = getComputedStyle(probe, '::before').content
    probe.remove()
    return decodeCssContent(content)
  } catch {
    return ''
  }
}

function decodeCssContent(content: string) {
  const trimmed = content.trim()
  if (!trimmed || trimmed === 'none' || trimmed === 'normal') {
    return ''
  }
  const unquoted =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
      ? trimmed.slice(1, -1)
      : trimmed
  return unquoted.replace(/\\([0-9a-fA-F]{1,6})\s?/g, (_, hex: string) =>
    String.fromCodePoint(Number.parseInt(hex, 16)),
  )
}

function canvasSvgMarkup(svg: string, color: string) {
  const normalized = svg
    .replace(/<\?xml[\s\S]*?\?>/gi, '')
    .replace(/<!DOCTYPE[\s\S]*?>/gi, '')
    .replace(/\s(width|height)="[^"]*"/gi, '')
    .replace(/<svg\b/i, `<svg color="${color}"`)
  const style = `<style>path:not([fill="none"]),circle:not([fill="none"]),rect:not([fill="none"]),polygon:not([fill="none"]),ellipse:not([fill="none"]){fill:currentColor}[stroke]:not([stroke="none"]){stroke:currentColor}</style>`

  return normalized.replace(/<svg\b([^>]*)>/i, `<svg$1>${style}`)
}

function loadCanvasSvgIcon(svg: string, color: string) {
  const src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(canvasSvgMarkup(svg, color))}`
  return loadCanvasImage(src).catch(() => null)
}

function drawFallbackHabitIcon(ctx: CanvasRenderingContext2D, accent: string, centerX: number, centerY: number) {
  ctx.save()
  ctx.strokeStyle = accent
  ctx.lineWidth = 5
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  roundedRect(ctx, centerX - 32, centerY - 30, 64, 48, 7)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(centerX - 20, centerY + 2)
  ctx.lineTo(centerX - 6, centerY - 10)
  ctx.lineTo(centerX + 6, centerY - 2)
  ctx.lineTo(centerX + 21, centerY - 19)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(centerX, centerY + 20)
  ctx.lineTo(centerX, centerY + 34)
  ctx.moveTo(centerX - 20, centerY + 34)
  ctx.lineTo(centerX + 20, centerY + 34)
  ctx.stroke()
  ctx.restore()
}

function drawPosterDotPattern(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  accent: string,
) {
  ctx.save()
  ctx.fillStyle = rgbaFromHex(accent, 0.08)
  for (let dotY = y; dotY <= y + height; dotY += 12) {
    for (let dotX = x; dotX <= x + width; dotX += 12) {
      ctx.beginPath()
      ctx.arc(dotX, dotY, 0.8, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.restore()
}

function drawPosterPlantWatermark(ctx: CanvasRenderingContext2D, accent: string) {
  ctx.save()
  ctx.globalAlpha = 0.1
  ctx.fillStyle = accent
  drawLeaf(ctx, 1270, 865, 1460, 815, 1418, 958, 1194, 832)
  drawLeaf(ctx, 1388, 902, 1545, 742, 1570, 922, 1360, 922)
  drawLeaf(ctx, 1315, 940, 1542, 978, 1358, 1082, 1184, 1018)

  ctx.globalAlpha = 0.12
  ctx.strokeStyle = accent
  ctx.lineWidth = 4
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(1346, 842)
  ctx.bezierCurveTo(1384, 906, 1438, 962, 1432, 1080)
  ctx.stroke()
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(1276, 862)
  ctx.lineTo(1398, 940)
  ctx.moveTo(1455, 816)
  ctx.lineTo(1370, 888)
  ctx.moveTo(1280, 1006)
  ctx.lineTo(1450, 992)
  ctx.stroke()
  ctx.restore()
}

function drawLeaf(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  x4: number,
  y4: number,
) {
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.bezierCurveTo(x2, y2, x3, y3, x4, y4)
  ctx.bezierCurveTo(x3 - 60, y3 - 8, x2 - 80, y2 + 70, x1, y1)
  ctx.closePath()
  ctx.fill()
}

async function drawPosterHabitIcon(
  ctx: CanvasRenderingContext2D,
  iconKey: string | undefined,
  accent: string,
  x: number,
  y: number,
  size: number,
) {
  const glyph = await canvasIconGlyph(iconKey)
  if (glyph) {
    ctx.save()
    ctx.fillStyle = accent
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `${size}px iconfont`
    ctx.fillText(glyph, x + size / 2, y + size / 2 + 3)
    ctx.restore()
    return
  }

  drawFallbackHabitIcon(ctx, accent, x + size / 2, y + size / 2)
}

function drawPosterShareStats(
  ctx: CanvasRenderingContext2D,
  share: SharePayload,
  accent: string,
  mutedColor: string,
) {
  const stats = [
    { label: languageStore.t('currentStreak'), value: share.stats.current_streak },
    { label: languageStore.t('longestStreak'), value: share.stats.longest_streak },
    {
      label: languageStore.t('completionRate'),
      value: `${Math.round(share.stats.completion_rate * 100)}%`,
    },
    { label: languageStore.t('totalCheckins'), value: share.stats.total_checkins },
  ]
  const centers = [858, 1040, 1228, 1418]
  const dividers = [950, 1138, 1324]

  ctx.save()
  ctx.strokeStyle = shareCanvasDividerColor('#dce6df')
  ctx.lineWidth = 1
  dividers.forEach((x) => {
    ctx.beginPath()
    ctx.moveTo(x, 130)
    ctx.lineTo(x, 256)
    ctx.stroke()
  })

  ctx.textAlign = 'center'
  stats.forEach((stat, index) => {
    const center = centers[index] ?? 858
    ctx.fillStyle = accent
    ctx.font = canvasFont(48, 780)
    ctx.fillText(String(stat.value), center, 184)
    drawCenteredFittedCanvasText(ctx, stat.label, center, 236, 154, 28, 18, 760, mutedColor)
  })
  ctx.restore()
}

function drawPosterShareHeatmap(
  ctx: CanvasRenderingContext2D,
  share: SharePayload,
  accent: string,
  emptyColor: string,
  mutedColor: string,
) {
  const visibleValues = share.heatmap.length > 153 ? share.heatmap.slice(-153) : share.heatmap
  const heatmapWeeks = buildShareHeatmapWeeks(visibleValues)
  const columns = heatmapWeeks.length
  if (columns === 0) {
    return
  }

  const monthLabels = buildShareMonthLabels(heatmapWeeks)
  const gridLeft = 94
  const gridTop = 346
  const gridWidth = 1368
  const gap = 12
  const cell = (gridWidth - (columns - 1) * gap) / columns

  ctx.fillStyle = mutedColor
  ctx.font = canvasFont(23, 760)
  monthLabels.forEach((month) => {
    ctx.fillText(month.label, gridLeft + month.index * (cell + gap), 324)
  })

  heatmapWeeks.forEach((week, weekIndex) => {
    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      const day = week[dayIndex]
      const x = gridLeft + weekIndex * (cell + gap)
      const y = gridTop + dayIndex * (cell + gap)
      ctx.fillStyle =
        day && day.level > 0
          ? canvasHeatmapLevelColor(share.item.color_theme, day.level, emptyColor)
          : emptyColor
      roundedRect(ctx, x, y, cell, cell, Math.min(7, cell / 5))
      ctx.fill()
    }
  })
}

function drawPosterShareFooter(ctx: CanvasRenderingContext2D, textColor: string, mutedColor: string) {
  const y = 900
  let x = 92
  ctx.font = canvasFont(28, 800)
  ctx.fillStyle = textColor
  ctx.fillText('LumaLog', x, y)
  x += ctx.measureText('LumaLog').width + 12
  ctx.fillStyle = mutedColor
  ctx.fillText('/ ', x, y)
  x += ctx.measureText('/ ').width
  ctx.font = canvasFont(28, 760)
  ctx.fillText(languageStore.t('checkinHeatmap'), x, y)
}

function drawZenBottomWash(
  ctx: CanvasRenderingContext2D,
  accent: string,
  cardX: number,
  cardY: number,
  cardWidth: number,
  cardHeight: number,
) {
  const bottom = cardY + cardHeight
  const right = cardX + cardWidth

  ctx.save()
  ctx.fillStyle = rgbaFromHex(accent, 0.12)
  ctx.beginPath()
  ctx.moveTo(cardX, bottom - 126)
  ctx.bezierCurveTo(cardX + 210, bottom - 158, cardX + 348, bottom - 70, cardX + 562, bottom - 103)
  ctx.bezierCurveTo(cardX + 760, bottom - 132, right - 220, bottom - 168, right, bottom - 118)
  ctx.lineTo(right, bottom)
  ctx.lineTo(cardX, bottom)
  ctx.closePath()
  ctx.fill()

  ctx.fillStyle = rgbaFromHex(accent, 0.08)
  ctx.beginPath()
  ctx.moveTo(cardX, bottom - 83)
  ctx.bezierCurveTo(cardX + 260, bottom - 43, cardX + 416, bottom - 108, cardX + 650, bottom - 72)
  ctx.bezierCurveTo(cardX + 820, bottom - 45, right - 212, bottom - 112, right, bottom - 88)
  ctx.lineTo(right, bottom)
  ctx.lineTo(cardX, bottom)
  ctx.closePath()
  ctx.fill()

  ctx.strokeStyle = rgbaFromHex(accent, 0.08)
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(cardX, bottom - 137)
  ctx.bezierCurveTo(cardX + 240, bottom - 164, cardX + 384, bottom - 115, cardX + 602, bottom - 132)
  ctx.bezierCurveTo(cardX + 778, bottom - 147, right - 238, bottom - 161, right, bottom - 168)
  ctx.stroke()

  ctx.strokeStyle = rgbaFromHex(accent, 0.06)
  ctx.lineWidth = 1.4
  ctx.beginPath()
  ctx.moveTo(cardX, bottom - 101)
  ctx.bezierCurveTo(cardX + 206, bottom - 130, cardX + 382, bottom - 76, cardX + 588, bottom - 95)
  ctx.bezierCurveTo(cardX + 750, bottom - 111, right - 254, bottom - 93, right, bottom - 111)
  ctx.stroke()
  ctx.restore()
}

function drawZenLeaves(ctx: CanvasRenderingContext2D, accent: string) {
  drawZenLeaf(ctx, accent, 370, 200, -0.34, 0.92, 0.24)
  drawZenLeaf(ctx, accent, 436, 256, 0.7, 1.05, 0.18)
  drawZenLeaf(ctx, accent, 776, 239, -0.08, 0.88, 0.18)
  drawZenLeaf(ctx, accent, 856, 202, -0.62, 0.72, 0.2)
  drawZenLeaf(ctx, accent, 930, 135, 0, 0.48, 0.18)
}

function drawZenLeaf(
  ctx: CanvasRenderingContext2D,
  accent: string,
  centerX: number,
  centerY: number,
  angle: number,
  scale: number,
  alpha: number,
) {
  ctx.save()
  ctx.translate(centerX, centerY)
  ctx.rotate(angle)
  ctx.scale(scale, scale)
  ctx.fillStyle = rgbaFromHex(accent, alpha)
  ctx.beginPath()
  ctx.moveTo(-22, 0)
  ctx.bezierCurveTo(-7, -17, 19, -17, 32, 1)
  ctx.bezierCurveTo(12, 13, -7, 13, -22, 0)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = rgbaFromHex(accent, alpha * 0.75)
  ctx.lineWidth = 1.3
  ctx.beginPath()
  ctx.moveTo(-14, 0)
  ctx.quadraticCurveTo(4, -2, 22, 2)
  ctx.stroke()
  ctx.restore()
}

async function drawZenHabitIcon(
  ctx: CanvasRenderingContext2D,
  iconKey: string | undefined,
  accent: string,
) {
  const centerX = 620
  const centerY = 208
  const radius = 96
  const gradient = ctx.createRadialGradient(centerX - 18, centerY - 22, 12, centerX, centerY, radius)
  gradient.addColorStop(0, rgbaFromHex(accent, 0.16))
  gradient.addColorStop(1, rgbaFromHex(accent, 0.06))

  ctx.save()
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = rgbaFromHex(accent, 0.1)
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()

  const glyph = await canvasIconGlyph(iconKey)
  if (glyph) {
    ctx.save()
    ctx.fillStyle = accent
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = '84px iconfont'
    ctx.fillText(glyph, centerX, centerY + 4)
    ctx.restore()
    return
  }

  drawFallbackHabitIcon(ctx, accent, centerX, centerY)
}

function drawZenShareStats(
  ctx: CanvasRenderingContext2D,
  share: SharePayload,
  accent: string,
  mutedColor: string,
) {
  const stats = [
    { label: languageStore.t('currentStreak'), value: share.stats.current_streak },
    { label: languageStore.t('longestStreak'), value: share.stats.longest_streak },
    {
      label: languageStore.t('completionRate'),
      value: `${Math.round(share.stats.completion_rate * 100)}%`,
    },
    { label: languageStore.t('totalCheckins'), value: share.stats.total_checkins },
  ]
  const panelX = 123
  const panelY = 464
  const panelWidth = 994
  const panelHeight = 108
  const centers = [248, 496, 744, 992]
  const dividers = [372, 620, 868]

  ctx.save()
  ctx.fillStyle = isDarkShareCanvas() ? 'rgba(23, 34, 50, 0.86)' : 'rgba(255, 255, 255, 0.78)'
  roundedRect(ctx, panelX, panelY, panelWidth, panelHeight, 18)
  ctx.fill()
  ctx.strokeStyle = rgbaFromHex(accent, isDarkShareCanvas() ? 0.3 : 0.18)
  ctx.lineWidth = 1.1
  roundedRect(ctx, panelX, panelY, panelWidth, panelHeight, 18)
  ctx.stroke()

  ctx.strokeStyle = shareCanvasDividerColor('#dfe8e2')
  ctx.lineWidth = 1
  dividers.forEach((x) => {
    ctx.beginPath()
    ctx.moveTo(x, panelY + 38)
    ctx.lineTo(x, panelY + 76)
    ctx.stroke()
  })

  ctx.textAlign = 'center'
  stats.forEach((stat, index) => {
    const center = centers[index] ?? 248
    ctx.fillStyle = accent
    ctx.font = canvasFont(31, 780)
    ctx.fillText(String(stat.value), center, panelY + 50)
    drawCenteredFittedCanvasText(ctx, stat.label, center, panelY + 85, 150, 22, 16, 760, mutedColor)
  })
  ctx.restore()
}

function drawZenShareHeatmap(
  ctx: CanvasRenderingContext2D,
  share: SharePayload,
  accent: string,
  emptyColor: string,
  mutedColor: string,
) {
  const visibleValues = share.heatmap.length > 153 ? share.heatmap.slice(-153) : share.heatmap
  const heatmapWeeks = buildShareHeatmapWeeks(visibleValues)
  const columns = heatmapWeeks.length
  if (columns === 0) {
    return
  }

  const monthLabels = buildShareMonthLabels(heatmapWeeks)
  const gridLeft = 124
  const gridTop = 646
  const gridWidth = 994
  const gap = 8
  const cell = (gridWidth - (columns - 1) * gap) / columns

  ctx.save()
  ctx.textAlign = 'left'
  ctx.fillStyle = mutedColor
  ctx.font = canvasFont(23, 760)
  monthLabels.forEach((month) => {
    ctx.fillText(month.label, gridLeft + month.index * (cell + gap), gridTop - 22)
  })

  heatmapWeeks.forEach((week, weekIndex) => {
    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      const day = week[dayIndex]
      const x = gridLeft + weekIndex * (cell + gap)
      const y = gridTop + dayIndex * (cell + gap)
      ctx.fillStyle =
        day && day.level > 0
          ? canvasHeatmapLevelColor(share.item.color_theme, day.level, emptyColor)
          : emptyColor
      roundedRect(ctx, x, y, cell, cell, Math.min(7, cell / 5))
      ctx.fill()
    }
  })
  ctx.restore()
}

function drawZenShareFooter(ctx: CanvasRenderingContext2D, textColor: string, mutedColor: string) {
  const y = 1044
  const label = languageStore.t('checkinHeatmap')
  const slash = ' / '

  ctx.save()
  ctx.textAlign = 'left'
  ctx.font = canvasFont(25, 800)
  const logoWidth = ctx.measureText('LumaLog').width
  ctx.font = canvasFont(25, 760)
  const slashWidth = ctx.measureText(slash).width
  const labelWidth = ctx.measureText(label).width
  let x = 620 - (logoWidth + slashWidth + labelWidth) / 2

  ctx.font = canvasFont(25, 800)
  ctx.fillStyle = textColor
  ctx.fillText('LumaLog', x, y)
  x += logoWidth
  ctx.font = canvasFont(25, 760)
  ctx.fillStyle = mutedColor
  ctx.fillText(slash, x, y)
  x += slashWidth
  ctx.fillText(label, x, y)

  ctx.textAlign = 'center'
  ctx.font = canvasFont(20, 600)
  ctx.fillStyle = mutedColor
  const tagline =
    languageStore.preference === 'en'
      ? 'Track tiny habits · grow with consistency'
      : '记录微小习惯 · 见证持续成长'
  ctx.fillText(tagline, 620, 1086)
  ctx.restore()
}

function drawClassicShareStats(
  ctx: CanvasRenderingContext2D,
  share: SharePayload,
  accent: string,
  mutedColor: string,
) {
  const stats = [
    { label: languageStore.t('currentStreak'), value: share.stats.current_streak },
    { label: languageStore.t('longestStreak'), value: share.stats.longest_streak },
    {
      label: languageStore.t('completionRate'),
      value: `${Math.round(share.stats.completion_rate * 100)}%`,
    },
    { label: languageStore.t('totalCheckins'), value: share.stats.total_checkins },
  ]
  const centers = [250, 600, 950, 1300]

  ctx.save()
  ctx.strokeStyle = shareCanvasDividerColor('#e3e8e4')
  ctx.lineWidth = 1
  const dividers = [425, 775, 1125]
  dividers.forEach((x) => {
    ctx.beginPath()
    ctx.moveTo(x, 278)
    ctx.lineTo(x, 354)
    ctx.stroke()
  })

  ctx.textAlign = 'center'
  stats.forEach((stat, index) => {
    const center = centers[index] ?? 250
    ctx.fillStyle = accent
    ctx.font = canvasFont(40, 760)
    ctx.fillText(String(stat.value), center, 310)
    ctx.fillStyle = mutedColor
    ctx.font = canvasFont(24, 700)
    ctx.fillText(stat.label, center, 358)
  })
  ctx.restore()
}

function drawClassicShareHeatmap(
  ctx: CanvasRenderingContext2D,
  share: SharePayload,
  accent: string,
  emptyColor: string,
  mutedColor: string,
) {
  const visibleValues = share.heatmap.length > 153 ? share.heatmap.slice(-153) : share.heatmap
  const heatmapWeeks = buildShareHeatmapWeeks(visibleValues)
  const columns = heatmapWeeks.length
  if (columns === 0) {
    return
  }

  const monthLabels = buildShareMonthLabels(heatmapWeeks)
  const gridLeft = 108
  const gridTop = 430
  const gridWidth = 1344
  const gap = 10
  const cell = (gridWidth - (columns - 1) * gap) / columns

  ctx.fillStyle = mutedColor
  ctx.font = canvasFont(22, 700)
  monthLabels.forEach((month) => {
    ctx.fillText(month.label, gridLeft + month.index * (cell + gap), 410)
  })

  heatmapWeeks.forEach((week, weekIndex) => {
    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      const day = week[dayIndex]
      const x = gridLeft + weekIndex * (cell + gap)
      const y = gridTop + dayIndex * (cell + gap)
      ctx.fillStyle =
        day && day.level > 0
          ? canvasHeatmapLevelColor(share.item.color_theme, day.level, emptyColor)
          : emptyColor
      roundedRect(ctx, x, y, cell, cell, Math.min(8, cell / 5))
      ctx.fill()
    }
  })
}

function drawClassicShareFooter(ctx: CanvasRenderingContext2D, accent: string, mutedColor: string) {
  const y = 950
  let x = 92
  ctx.font = canvasFont(25, 760)
  ctx.fillStyle = accent
  ctx.fillText('LumaLog', x, y)
  x += ctx.measureText('LumaLog').width + 10
  ctx.fillStyle = mutedColor
  ctx.fillText('/ ', x, y)
  x += ctx.measureText('/ ').width
  ctx.font = canvasFont(25, 700)
  ctx.fillText(languageStore.t('checkinHeatmap'), x, y)
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
      parseLocalDate(firstValue.date).getFullYear() !==
        parseLocalDate(lastValue?.date ?? firstValue.date).getFullYear()
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

function loadCanvasImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(languageStore.t('shareFailed')))
    image.src = src
  })
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
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
  <main class="checkin-page" :style="{ '--item-accent': accent }">
    <header class="screen-topbar checkin-topbar">
      <RouterLink class="back-link screen-topbar-left" to="/">←</RouterLink>
      <span class="screen-topbar-title">{{ languageStore.t('checkinAction') }}</span>
      <button
        class="share-link screen-topbar-right"
        type="button"
        :disabled="loading || sharing"
        @click="openSharePicker"
      >
        {{ sharing ? languageStore.t('saveLoading') : languageStore.t('generateShare') }}
      </button>
    </header>

    <div v-if="loading" class="loading">{{ languageStore.t('loading') }}</div>
    <section v-else-if="entry && item" class="checkin-stack">
      <section class="habit-identity app-card">
        <LumaIconBadge :icon-key="item.icon_key" :accent="accent" :size="64" />
        <div class="habit-identity-main">
          <div class="habit-title-row">
            <h1>{{ item.name }}</h1>
            <span class="category-chip">
              {{
                item.category_name
                  ? languageStore.categoryName(item.category_name)
                  : languageStore.t('uncategorized')
              }}
            </span>
          </div>
          <p v-if="item.description">{{ item.description }}</p>
        </div>
      </section>

      <CheckinButton
        :status="entry.status"
        :today-count="entry.today_count"
        :target="item.daily_target_count"
        :loading="checking"
        :allow-makeup="item.allow_makeup"
        @checkin="checkin"
        @makeup="router.push(`/items/${item.id}/makeup`)"
      >
        <template v-if="showCheckinNoteInput" #middle>
          <div class="checkin-note-box">
            <div class="checkin-note-head">
              <label class="checkin-note-label" for="checkin-note-input">
                {{ languageStore.t('checkinNote') }}
              </label>
              <span class="checkin-note-count">
                {{ checkinNote.length }}/{{ checkinNoteMaxLength }}
              </span>
            </div>
            <textarea
              id="checkin-note-input"
              class="checkin-note-input"
              :value="checkinNote"
              :maxlength="checkinNoteMaxLength"
              :placeholder="languageStore.t('checkinNotePlaceholder')"
              rows="3"
              @input="updateCheckinNote"
            />
          </div>
        </template>
      </CheckinButton>

      <section class="checkin-stats app-card">
        <div v-for="(stat, index) in checkinStats" :key="stat.label" class="checkin-stat">
          <div class="stat-value">
            <SvgIcon :src="stat.icon" :size="13" />
            <strong>{{ stat.value }}</strong>
          </div>
          <span>{{ stat.label }}</span>
          <i v-if="index < checkinStats.length - 1" />
        </div>
      </section>

      <p v-if="error" class="error">{{ error }}</p>

      <section class="heatmap-panel app-card">
        <div class="heatmap-heading">
          <strong>{{ languageStore.t('checkinHeatmap') }}</strong>
          <div class="heatmap-legend">
            <span>{{ languageStore.t('heatmapLess') }}</span>
            <i
              v-for="level in [0, 1, 2, 3, 4]"
              :key="level"
              :style="{ backgroundColor: heatmapLevelColor(item.color_theme, level) }"
            />
            <span>{{ languageStore.t('heatmapMore') }}</span>
          </div>
        </div>
        <ContributionHeatmap
          :values="entry.heatmap"
          :color-theme="item.color_theme"
          :max-days="153"
          :selected-dates="[today]"
          :makeup-dates="makeupDates"
          :day-labels="heatmapDayLabels"
        />
      </section>

      <details
        class="achievement-panel app-card"
        :open="achievementsExpanded"
        @toggle="syncAchievementToggle"
      >
        <summary class="achievement-summary">
          <span class="achievement-icon-wrap">
            <SvgIcon :src="achievementIcon" :size="15" />
          </span>
          <span class="achievement-copy">
            <strong>{{ languageStore.t('earnedAchievements') }}</strong>
            <em>{{ languageStore.t('achievementCount', { count: earnedBadges.length }) }}</em>
          </span>
          <SvgIcon class="fold-icon" :src="foldIcon" :size="14" />
        </summary>
        <p v-if="earnedBadges.length === 0" class="muted">
          {{ languageStore.t('noEarnedBadges') }}
        </p>
        <div v-else class="badge-list">
          <span
            v-for="badge in earnedBadges"
            :key="badge.id"
            class="achievement-badge"
            :title="badge.description"
          >
            <img class="achievement-badge-image" :src="badgeImage(badge.id)" :alt="badge.title" />
            <span class="achievement-badge-label">{{ badge.title }}</span>
          </span>
        </div>
      </details>

      <section class="tip-card app-card">
        <span>⊙</span>
        <p>{{ languageStore.t('checkinTip') }}</p>
      </section>
    </section>
    <p v-else class="error">{{ languageStore.t('itemMissing') }}</p>
  </main>

  <Teleport to="body">
    <div
      v-if="sharePickerOpen"
      class="share-picker-backdrop"
      :class="{ 'is-dark': themeStore.resolvedTheme === 'dark' }"
      :style="{ '--item-accent': accent }"
      @click.self="closeSharePicker"
    >
      <section
        class="share-picker-dialog"
        :class="{ 'is-dark': themeStore.resolvedTheme === 'dark' }"
        role="dialog"
        aria-modal="true"
        :aria-label="languageStore.t('shareTemplateTitle')"
      >
        <span class="share-picker-handle" aria-hidden="true" />
        <div class="share-picker-heading">
          <h2>{{ languageStore.t('shareTemplateTitle') }}</h2>
          <p>{{ languageStore.t('shareTemplateSubtitle') }}</p>
        </div>
        <div class="share-template-grid">
          <button
            v-for="(option, index) in shareTemplateOptions"
            :key="option.id"
            class="share-template-option"
            :class="[`is-${option.id}`, { 'is-selected': selectedShareTemplate === option.id }]"
            type="button"
            :disabled="sharing"
            :aria-pressed="selectedShareTemplate === option.id"
            @click="selectShareTemplate(option.id)"
          >
            <div class="share-template-preview" :class="`is-${option.id}`" aria-hidden="true">
              <div v-if="option.id === 'zen'" class="share-preview-zen">
                <span class="share-preview-orb" />
                <div class="share-preview-zen-title">
                  <span class="share-preview-title-line" />
                  <span class="share-preview-subtitle-line" />
                </div>
                <span class="share-preview-zen-strip" />
                <div class="share-preview-heatmap">
                  <i
                    v-for="cell in sharePreviewCellCount(option.id)"
                    :key="cell"
                    :class="`level-${sharePreviewLevel(cell, option.id)}`"
                  />
                </div>
                <div class="share-preview-zen-footer">
                  <span v-for="stat in sharePreviewStats" :key="stat" />
                </div>
                <div class="share-preview-zen-lines">
                  <span />
                  <span />
                </div>
              </div>
              <div v-else class="share-preview-standard">
                <div class="share-preview-head">
                  <span class="share-preview-avatar" />
                  <div class="share-preview-copy">
                    <span class="share-preview-title-line" />
                    <span class="share-preview-subtitle-line" />
                  </div>
                  <div v-if="option.id !== 'classic'" class="share-preview-statline is-mini">
                    <span
                      v-for="stat in option.id === 'dashboard' ? sharePreviewStats : 3"
                      :key="stat"
                    >
                      <i />
                      <em />
                    </span>
                  </div>
                </div>
                <div v-if="option.id === 'classic'" class="share-preview-statline">
                  <span v-for="stat in sharePreviewStats" :key="stat">
                    <i />
                    <em />
                  </span>
                </div>
                <div class="share-preview-heatmap">
                  <i
                    v-for="cell in sharePreviewCellCount(option.id)"
                    :key="cell"
                    :class="`level-${sharePreviewLevel(cell, option.id)}`"
                  />
                </div>
                <div
                  v-if="
                    option.id === 'classic' || option.id === 'poster' || option.id === 'dashboard'
                  "
                  class="share-preview-classic-footer"
                >
                  <span v-for="block in sharePreviewFooterBlocks" :key="block" />
                  <em />
                </div>
                <span v-if="option.id === 'dashboard'" class="share-preview-divider" />
              </div>
            </div>
            <span class="share-template-label">{{ shareTemplateName(option) }}</span>
          </button>
        </div>
        <div class="share-picker-actions">
          <button
            class="share-picker-cancel"
            type="button"
            :disabled="sharing"
            @click="closeSharePicker"
          >
            {{ languageStore.t('cancel') }}
          </button>
          <button
            class="share-picker-confirm"
            type="button"
            :disabled="sharing"
            @click="confirmShareTemplate"
          >
            {{ sharing ? languageStore.t('saveLoading') : languageStore.t('confirm') }}
          </button>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.checkin-page {
  display: block;
  width: min(430px, 100%);
  min-height: 100dvh;
  margin: 0 auto;
  background: var(--bg);
  padding: 0 0 56px;
}

.checkin-topbar {
  position: sticky;
  z-index: 18;
  top: 0;
  min-height: 56px;
  margin: 0;
  border-bottom: 1px solid var(--border);
  background: var(--bg);
  padding: 0 12px;
}

.checkin-page .app-card {
  border-color: color-mix(in srgb, var(--border) 82%, transparent);
  border-radius: 16px;
  background: color-mix(in srgb, var(--surface-solid) 98%, transparent);
  box-shadow: none;
}

:global(html[data-theme='dark']) .checkin-page .app-card {
  background: rgba(18, 25, 35, 0.9);
}

:global(html[data-theme='dark']) .checkin-topbar {
  background: var(--bg);
}

.share-link {
  border: 0;
  border-radius: 12px;
  background: transparent;
  color: var(--text);
  padding: 3px;
  font-size: 12px;
  line-height: 16px;
  font-weight: 500;
}

.share-link:disabled {
  cursor: not-allowed;
  opacity: 0.52;
}

.checkin-stack {
  display: grid;
  gap: 9px;
  padding: 8px 12px 40px;
}

.habit-identity {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
}

.habit-identity :deep(.luma-icon-badge) {
  border: 0;
  border-radius: 17px;
  background: color-mix(in srgb, var(--item-accent) 9%, transparent);
}

:global(html[data-theme='dark']) .habit-identity :deep(.luma-icon-badge) {
  background: color-mix(in srgb, var(--item-accent) 17%, transparent);
}

.habit-identity :deep(.luma-icon-badge .iconfont) {
  font-size: 40px;
}

.habit-identity-main {
  display: grid;
  min-width: 0;
  flex: 1;
  gap: 5px;
}

.habit-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.habit-title-row h1 {
  overflow: hidden;
  flex: 1;
  margin: 0;
  color: var(--text);
  font-size: 18px;
  line-height: 22px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.habit-identity-main p {
  overflow: hidden;
  margin: 0;
  color: var(--muted);
  font-size: 12px;
  line-height: 16px;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.category-chip {
  max-width: 112px;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--item-accent) 14%, transparent);
  border-radius: 10px;
  background: color-mix(in srgb, var(--item-accent) 10%, transparent);
  color: var(--item-accent);
  padding: 3px 7px;
  font-size: 11px;
  line-height: 14px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.checkin-note-box {
  display: grid;
  gap: 8px;
  padding: 1px 0;
}

.checkin-note-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.checkin-note-label {
  color: var(--text);
  font-size: 13px;
  line-height: 17px;
  font-weight: 500;
}

.checkin-note-count {
  color: var(--muted);
  font-size: 10px;
  line-height: 13px;
}

.checkin-note-input {
  box-sizing: border-box;
  width: 100%;
  min-height: 74px;
  resize: vertical;
  border: 1px solid color-mix(in srgb, var(--border) 84%, transparent);
  border-radius: 14px;
  outline: none;
  background: color-mix(in srgb, var(--surface-soft) 52%, transparent);
  color: var(--text);
  padding: 10px 11px;
  font: inherit;
  font-size: 13px;
  line-height: 18px;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background 0.2s ease;
}

.checkin-note-input::placeholder {
  color: color-mix(in srgb, var(--muted) 72%, transparent);
}

.checkin-note-input:focus {
  border-color: color-mix(in srgb, var(--item-accent) 56%, var(--border));
  background: color-mix(in srgb, var(--surface-solid) 88%, transparent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--item-accent) 12%, transparent);
}

:global(html[data-theme='dark']) .checkin-note-input {
  border-color: rgba(148, 163, 184, 0.18);
  background: rgba(30, 41, 59, 0.42);
}

.checkin-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  padding: 11px 10px;
}

.checkin-stat {
  position: relative;
  display: grid;
  min-width: 0;
  place-items: center;
  gap: 4px;
}

.checkin-stat > i {
  position: absolute;
  top: 4px;
  right: 0;
  bottom: 4px;
  width: 1px;
  background: color-mix(in srgb, var(--border) 72%, transparent);
}

.stat-value {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--item-accent);
}

.stat-value strong {
  font-size: 14px;
  line-height: 17px;
  font-weight: 500;
}

.checkin-stat span {
  overflow: hidden;
  max-width: 100%;
  color: var(--muted);
  font-size: 10px;
  line-height: 13px;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.heatmap-panel {
  display: grid;
  gap: 7px;
  padding: 10px;
}

.heatmap-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.heatmap-heading strong {
  overflow: hidden;
  color: var(--text);
  font-size: 15px;
  line-height: 19px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.heatmap-legend {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.heatmap-legend span {
  color: var(--muted);
  font-size: 9px;
  line-height: 11px;
}

.heatmap-legend i {
  width: 8px;
  height: 8px;
  border-radius: 2px;
}

.heatmap-panel :deep(.heatmap) {
  --cell-column-gap: 3px;
  --cell-row-gap: 4px;
}

.achievement-panel {
  padding: 12px 14px;
}

.achievement-summary {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  list-style: none;
}

.achievement-summary::-webkit-details-marker {
  display: none;
}

.achievement-icon-wrap {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border-radius: 999px;
  background: color-mix(in srgb, var(--item-accent) 10%, transparent);
  color: var(--item-accent);
}

.achievement-copy {
  display: grid;
  min-width: 0;
  flex: 1;
  gap: 1px;
}

.achievement-copy strong {
  color: var(--text);
  font-size: 13px;
  line-height: 16px;
  font-weight: 500;
}

.achievement-copy em {
  color: var(--muted);
  font-size: 11px;
  line-height: 14px;
  font-style: normal;
}

.fold-icon {
  color: var(--muted);
  transform: rotate(90deg);
  transition: transform 160ms ease;
}

.achievement-panel[open] .fold-icon {
  transform: rotate(-90deg);
}

.badge-list {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  padding-top: 10px;
}

.achievement-panel > .muted {
  margin: 10px 0 0;
  color: var(--muted);
  font-size: 12px;
  line-height: 16px;
}

.tip-card {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 8px 11px;
}

.tip-card span {
  display: grid;
  width: 22px;
  height: 22px;
  place-items: center;
  border-radius: 999px;
  background: color-mix(in srgb, var(--item-accent) 9%, transparent);
  color: var(--item-accent);
  font-size: 13px;
  line-height: 13px;
}

.tip-card p {
  overflow: hidden;
  margin: 0;
  color: var(--muted);
  font-size: 12px;
  line-height: 16px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.share-picker-backdrop {
  position: fixed;
  z-index: 80;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(8, 9, 12, 0.63);
  padding: 0;
}

.share-picker-dialog {
  display: grid;
  width: min(430px, 100vw);
  max-height: calc(100dvh - 36px);
  overflow: auto;
  border-radius: 31px 31px 0 0;
  background: linear-gradient(160deg, #fffefe 0%, #fbf8ff 62%, #fffefe 100%);
  color: #101827;
  padding: 10px 16px max(22px, env(safe-area-inset-bottom));
  box-shadow: none;
}

.share-picker-handle {
  justify-self: center;
  width: 39px;
  height: 4px;
  border-radius: 999px;
  background: #b8b9c0;
}

.share-picker-heading {
  display: grid;
  gap: 7px;
  margin-top: 14px;
  margin-bottom: 16px;
}

.share-picker-dialog h2 {
  margin: 0;
  color: inherit;
  font-size: 22px;
  line-height: 28px;
  font-weight: 700;
  letter-spacing: 0;
}

.share-picker-dialog p {
  margin: 0;
  color: #667085;
  font-size: 13px;
  line-height: 17px;
  font-weight: 500;
}

.share-template-grid {
  display: grid;
  align-items: start;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 12px;
}

.share-template-option {
  display: grid;
  grid-template-rows: 78px 18px;
  gap: 3px;
  box-sizing: border-box;
  min-width: 0;
  min-height: 0;
  height: 124px;
  border: 1.5px solid color-mix(in srgb, var(--item-accent) 48%, #9eb8f0);
  border-radius: 16px;
  background:
    linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.96) 0%,
      rgba(255, 255, 255, 0.96) 73%,
      rgba(248, 249, 255, 0.94) 73%
    ),
    #fff;
  padding: 8px 8px 9px;
  color: #0f172a;
  text-align: center;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    transform 160ms ease;
}

.share-template-option.is-selected {
  border-color: color-mix(in srgb, var(--item-accent) 82%, #16a34a);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--item-accent) 72%, #16a34a);
}

.share-template-option:active {
  transform: scale(0.99);
}

.share-template-option:disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

.share-template-preview {
  display: grid;
  align-content: start;
  overflow: visible;
  width: 100%;
  height: 78px;
  min-height: 0;
  border: 0;
  border-radius: 12px;
  background: transparent;
  padding: 0;
}

.share-template-preview.is-classic {
  height: 78px;
}

.share-template-preview.is-poster {
  height: 78px;
}

.share-template-preview.is-zen {
  height: 78px;
  border-radius: 12px;
  background: transparent;
}

.share-template-preview.is-dashboard {
  height: 78px;
}

.share-template-kicker {
  color: #687084;
  font-size: 13px;
  line-height: 17px;
  font-weight: 500;
}

.share-template-label {
  overflow: hidden;
  color: #0f172a;
  font-size: 12px;
  line-height: 18px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.share-preview-standard,
.share-preview-zen {
  display: grid;
  min-height: 0;
  height: 100%;
  gap: 2px;
}

.share-preview-zen {
  justify-items: center;
  gap: 1.2px;
}

.share-preview-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  min-width: 0;
}

.share-preview-avatar {
  flex: 0 0 auto;
  width: 16px;
  height: 16px;
  border: 1px solid color-mix(in srgb, var(--item-accent) 28%, transparent);
  border-radius: 5px;
  background: color-mix(in srgb, var(--item-accent) 12%, transparent);
}

.share-preview-copy {
  display: grid;
  flex: 1;
  min-width: 0;
  gap: 2px;
}

.share-preview-title-line,
.share-preview-subtitle-line {
  display: block;
  height: 4px;
  border-radius: 3px;
}

.share-preview-title-line {
  width: 54px;
  background: var(--item-accent);
}

.share-preview-subtitle-line {
  width: 36px;
  height: 2.5px;
  background: color-mix(in srgb, var(--item-accent) 18%, transparent);
}

.share-template-preview.is-poster .share-preview-title-line {
  width: 66px;
  height: 6px;
  background: var(--item-accent);
}

.share-template-preview.is-poster .share-preview-subtitle-line {
  width: 48px;
  height: 2.5px;
}

.share-template-preview.is-poster .share-preview-head {
  align-items: stretch;
}

.share-template-preview.is-poster .share-preview-avatar {
  width: 18px;
  height: 18px;
}

.share-template-preview.is-poster .share-preview-statline.is-mini {
  align-self: stretch;
  width: 66px;
  border: 1px solid color-mix(in srgb, var(--item-accent) 24%, transparent);
  border-radius: 5px;
  background: color-mix(in srgb, var(--item-accent) 5%, transparent);
  padding: 3px 4px;
}

.share-template-preview.is-poster .share-preview-statline.is-mini i {
  width: 12px;
  height: 3px;
}

.share-template-preview.is-poster .share-preview-statline.is-mini em {
  width: 10px;
}

.share-template-preview.is-dashboard .share-preview-title-line {
  width: 38px;
  height: 5px;
}

.share-template-preview.is-dashboard .share-preview-subtitle-line {
  width: 30px;
  height: 2.5px;
}

.share-template-preview.is-dashboard .share-preview-head {
  align-items: stretch;
  gap: 4px;
}

.share-template-preview.is-dashboard .share-preview-avatar {
  width: 18px;
  height: 18px;
}

.share-template-preview.is-dashboard .share-preview-copy {
  flex: 0 0 38px;
  align-content: center;
}

.share-template-preview.is-dashboard .share-preview-statline.is-mini {
  display: grid;
  flex: 1;
  align-self: stretch;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 3px;
  width: auto;
}

.share-template-preview.is-dashboard .share-preview-statline.is-mini span {
  width: auto;
  min-width: 0;
  height: 18px;
  border: 1px solid color-mix(in srgb, var(--item-accent) 24%, transparent);
  border-radius: 5px;
  background: color-mix(in srgb, var(--item-accent) 6%, transparent);
}

.share-template-preview.is-dashboard .share-preview-statline.is-mini i,
.share-template-preview.is-dashboard .share-preview-statline.is-mini em {
  display: none;
}

.share-preview-orb {
  width: 16px;
  height: 16px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--item-accent) 32%, transparent);
  background: color-mix(in srgb, var(--item-accent) 10%, transparent);
}

.share-template-preview.is-zen .share-preview-orb {
  width: 11px;
  height: 11px;
  border-radius: 4px;
}

.share-preview-zen-title {
  display: grid;
  justify-items: center;
  gap: 1px;
}

.share-template-preview.is-zen .share-preview-title-line {
  width: 42px;
  height: 4px;
}

.share-template-preview.is-zen .share-preview-subtitle-line {
  width: 28px;
  height: 2px;
}

.share-preview-zen-strip {
  display: block;
  width: 88%;
  height: 7px;
  border: 1px solid color-mix(in srgb, var(--item-accent) 24%, transparent);
  border-radius: 4px;
  background: color-mix(in srgb, var(--item-accent) 6%, transparent);
}

.share-preview-zen-footer {
  display: grid;
  width: 86%;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 5px;
}

.share-preview-zen-footer span {
  height: 5px;
  border: 1px solid color-mix(in srgb, var(--item-accent) 24%, transparent);
  border-radius: 3px;
  background: color-mix(in srgb, var(--item-accent) 7%, #fff);
}

.share-preview-zen-lines {
  display: grid;
  justify-items: center;
  gap: 1px;
}

.share-preview-zen-lines span {
  display: block;
  width: 32px;
  height: 2px;
  border-radius: 2px;
  background: color-mix(in srgb, var(--item-accent) 18%, #dbe6ff);
}

.share-preview-zen-lines span:first-child {
  width: 38px;
}

.share-preview-statline {
  display: flex;
  justify-content: space-evenly;
  gap: 2px;
  width: 100%;
}

.share-preview-statline.is-mini {
  width: 48px;
}

.share-preview-statline span {
  display: grid;
  justify-items: center;
  gap: 1px;
  min-width: 0;
}

.share-preview-statline i,
.share-preview-statline em {
  display: block;
  border-radius: 2px;
}

.share-preview-statline i {
  width: 15px;
  height: 3.5px;
  background: color-mix(in srgb, var(--item-accent) 78%, transparent);
}

.share-preview-statline em {
  width: 11px;
  height: 2px;
  background: color-mix(in srgb, var(--item-accent) 14%, #cbd5e1);
}

.share-preview-heatmap {
  display: grid;
  align-content: start;
  justify-content: stretch;
  gap: 1.4px;
  min-height: 0;
  width: 100%;
  margin-top: 0;
}

.share-template-preview.is-classic .share-preview-heatmap,
.share-template-preview.is-zen .share-preview-heatmap {
  grid-template-columns: repeat(20, minmax(0, 1fr));
}

.share-template-preview.is-poster .share-preview-heatmap {
  grid-template-columns: repeat(24, minmax(0, 1fr));
  gap: 1.4px;
}

.share-template-preview.is-dashboard .share-preview-heatmap {
  grid-template-columns: repeat(24, minmax(0, 1fr));
  gap: 1.4px;
}

.share-preview-heatmap i {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 2px;
  background: color-mix(in srgb, var(--item-accent) 12%, #eef4ff);
}

.share-preview-heatmap i.level-1 {
  background: color-mix(in srgb, var(--item-accent) 28%, #eef4ff);
}

.share-preview-heatmap i.level-2 {
  background: color-mix(in srgb, var(--item-accent) 54%, #eef4ff);
}

.share-preview-heatmap i.level-3 {
  background: color-mix(in srgb, var(--item-accent) 84%, #eef4ff);
}

.share-preview-classic-footer {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 1.5px;
  margin-top: 1px;
  padding: 0 13px;
}

.share-preview-classic-footer span {
  height: 6px;
  border: 1px solid color-mix(in srgb, var(--item-accent) 24%, transparent);
  border-radius: 3px;
  background: color-mix(in srgb, var(--item-accent) 8%, #fff);
}

.share-preview-classic-footer em {
  display: block;
  width: 18px;
  height: 2px;
  grid-column: 1 / 2;
  border-radius: 2px;
  background: color-mix(in srgb, var(--item-accent) 16%, #dbe6ff);
}

.share-preview-divider {
  display: none;
  width: 100%;
  height: 1px;
  background: #e2e8f0;
}

.share-picker-cancel {
  border: 0;
  background: transparent;
  color: #667085;
}

.share-picker-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: center;
  margin-top: 20px;
}

.share-picker-cancel,
.share-picker-confirm {
  min-height: 38px;
  border-radius: 14px;
  padding: 0 10px;
  font-size: 16px;
  line-height: 22px;
  font-weight: 700;
}

.share-picker-confirm {
  justify-self: center;
  border: 0;
  background: transparent;
  color: color-mix(in srgb, var(--item-accent) 82%, #16a34a);
}

.share-picker-cancel:disabled,
.share-picker-confirm:disabled {
  cursor: not-allowed;
  opacity: 0.52;
}

.share-picker-backdrop.is-dark {
  background: rgba(2, 6, 12, 0.68);
}

.share-picker-dialog.is-dark {
  background: linear-gradient(160deg, #151b25 0%, #151923 100%);
  color: #eef3f8;
}

.share-picker-dialog.is-dark .share-picker-handle {
  background: #475569;
}

.share-picker-dialog.is-dark p,
.share-picker-dialog.is-dark .share-template-kicker,
.share-picker-dialog.is-dark .share-picker-cancel {
  color: #94a3b8;
}

.share-picker-dialog.is-dark .share-template-option {
  border-color: color-mix(in srgb, var(--item-accent) 34%, #334155);
  background:
    linear-gradient(
      180deg,
      rgba(20, 27, 38, 0.95) 0%,
      rgba(20, 27, 38, 0.95) 73%,
      rgba(17, 24, 34, 0.96) 73%
    ),
    #111923;
  color: #eef3f8;
}

.share-picker-dialog.is-dark .share-template-option.is-selected {
  border-color: color-mix(in srgb, var(--item-accent) 82%, #22c55e);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--item-accent) 72%, #22c55e);
}

.share-picker-dialog.is-dark .share-template-label {
  color: #eef3f8;
}

.share-picker-dialog.is-dark .share-preview-subtitle-line {
  background: color-mix(in srgb, var(--item-accent) 24%, #273449);
}

.share-picker-dialog.is-dark .share-template-preview.is-poster .share-preview-statline.is-mini,
.share-picker-dialog.is-dark .share-template-preview.is-dashboard .share-preview-statline.is-mini span,
.share-picker-dialog.is-dark .share-preview-zen-strip {
  border-color: color-mix(in srgb, var(--item-accent) 30%, #263244);
  background: color-mix(in srgb, var(--item-accent) 10%, #162132);
}

.share-picker-dialog.is-dark .share-preview-zen-footer span,
.share-picker-dialog.is-dark .share-preview-classic-footer span {
  border-color: color-mix(in srgb, var(--item-accent) 30%, #263244);
  background: color-mix(in srgb, var(--item-accent) 10%, #172033);
}

.share-picker-dialog.is-dark .share-preview-heatmap i {
  background: color-mix(in srgb, var(--item-accent) 14%, #1e293b);
}

.share-picker-dialog.is-dark .share-preview-heatmap i.level-1 {
  background: color-mix(in srgb, var(--item-accent) 32%, #1e293b);
}

.share-picker-dialog.is-dark .share-preview-heatmap i.level-2 {
  background: color-mix(in srgb, var(--item-accent) 58%, #1e293b);
}

.share-picker-dialog.is-dark .share-preview-heatmap i.level-3 {
  background: color-mix(in srgb, var(--item-accent) 86%, #1e293b);
}

.share-picker-dialog.is-dark .share-preview-statline em,
.share-picker-dialog.is-dark .share-preview-zen-lines span,
.share-picker-dialog.is-dark .share-preview-classic-footer em {
  background: #475569;
}

:global(html[data-theme='dark']) .share-picker-backdrop {
  background: rgba(2, 6, 12, 0.68);
}

:global(html[data-theme='dark']) .share-picker-dialog {
  background: linear-gradient(160deg, #151b25 0%, #151923 100%);
  color: #eef3f8;
}

:global(html[data-theme='dark']) .share-picker-dialog p,
:global(html[data-theme='dark']) .share-template-kicker,
:global(html[data-theme='dark']) .share-picker-cancel {
  color: #94a3b8;
}

:global(html[data-theme='dark']) .share-template-option {
  background:
    linear-gradient(
      180deg,
      rgba(20, 27, 38, 0.95) 0%,
      rgba(20, 27, 38, 0.95) 73%,
      rgba(17, 24, 34, 0.96) 73%
    ),
    #111923;
  color: #eef3f8;
}

:global(html[data-theme='dark']) .share-template-preview {
  background: transparent;
}

:global(html[data-theme='dark']) .share-template-preview.is-zen {
  background: transparent;
}

:global(html[data-theme='dark']) .share-template-label {
  color: #eef3f8;
}

:global(html[data-theme='dark']) .share-preview-subtitle-line {
  background: color-mix(in srgb, var(--item-accent) 24%, #273449);
}

:global(html[data-theme='dark']) .share-template-preview.is-poster .share-preview-statline.is-mini,
:global(html[data-theme='dark']) .share-template-preview.is-dashboard .share-preview-statline.is-mini span,
:global(html[data-theme='dark']) .share-preview-zen-strip {
  border-color: color-mix(in srgb, var(--item-accent) 30%, #263244);
  background: color-mix(in srgb, var(--item-accent) 10%, #162132);
}

:global(html[data-theme='dark']) .share-preview-zen-footer span,
:global(html[data-theme='dark']) .share-preview-classic-footer span {
  border-color: color-mix(in srgb, var(--item-accent) 30%, #263244);
  background: color-mix(in srgb, var(--item-accent) 10%, #172033);
}

:global(html[data-theme='dark']) .share-preview-heatmap i {
  background: color-mix(in srgb, var(--item-accent) 14%, #1e293b);
}

:global(html[data-theme='dark']) .share-preview-heatmap i.level-1 {
  background: color-mix(in srgb, var(--item-accent) 32%, #1e293b);
}

:global(html[data-theme='dark']) .share-preview-heatmap i.level-2 {
  background: color-mix(in srgb, var(--item-accent) 58%, #1e293b);
}

:global(html[data-theme='dark']) .share-preview-heatmap i.level-3 {
  background: color-mix(in srgb, var(--item-accent) 86%, #1e293b);
}

:global(html[data-theme='dark']) .share-preview-statline em,
:global(html[data-theme='dark']) .share-preview-zen-lines span,
:global(html[data-theme='dark']) .share-preview-classic-footer em {
  background: #475569;
}

@media (max-width: 520px) {
  .checkin-stats {
    padding-right: 8px;
    padding-left: 8px;
  }

  .category-chip {
    max-width: 96px;
  }

  .heatmap-heading {
    align-items: center;
    flex-direction: row;
  }
}
</style>
