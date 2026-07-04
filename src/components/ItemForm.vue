<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import LumaIconBadge from './LumaIconBadge.vue'
import SvgIcon from './SvgIcon.vue'
import archiveIcon from '@/assets/svg/archive.svg?raw'
import colorIcon from '@/assets/svg/color.svg?raw'
import dateIcon from '@/assets/svg/date.svg?raw'
import deleteIcon from '@/assets/svg/delete.svg?raw'
import descIcon from '@/assets/svg/desc.svg?raw'
import editIcon from '@/assets/svg/edit.svg?raw'
import goalIcon from '@/assets/svg/goal.svg?raw'
import homeIcon from '@/assets/svg/home.svg?raw'
import labelIcon from '@/assets/svg/label.svg?raw'
import noLimitIcon from '@/assets/svg/noLimit.svg?raw'
import photoIcon from '@/assets/svg/photo.svg?raw'
import signInIcon from '@/assets/svg/signIn.svg?raw'
import timeIcon from '@/assets/svg/time.svg?raw'
import { useLanguageStore } from '@/stores/language'
import type { Category, CategoryPayload, HeatmapDay, Item, ItemPayload, TimeMode } from '@/types'
import { colorThemes, heatmapLevelColor, themeColor } from '@/utils/colors'
import { todayString } from '@/utils/dates'
import { lumaIconOptions, normalizeLumaIconKey } from '@/utils/icons'

const props = withDefaults(
  defineProps<{
    item?: Item | null
    categories: Category[]
    heatmap?: HeatmapDay[]
    submitLabel: string
    loading?: boolean
    isEditing?: boolean
    archived?: boolean
    createCategory?: (payload: CategoryPayload) => Promise<Category | null>
  }>(),
  {
    item: null,
    heatmap: () => [],
    loading: false,
    isEditing: false,
    archived: false,
    createCategory: undefined,
  },
)

const emit = defineEmits<{
  submit: [payload: ItemPayload]
  archive: []
  delete: []
}>()

const languageStore = useLanguageStore()

const form = reactive({
  name: '',
  category_id: null as number | null,
  description: '',
  color_theme: 'green',
  icon_key: normalizeLumaIconKey(null),
  start_date: todayString(),
  end_date: '',
  is_unlimited: true,
  daily_target_count: 1,
  time_mode: 'all_day' as TimeMode,
  valid_start_time: '09:00',
  valid_end_time: '23:59',
  allow_makeup: false,
  makeup_monthly_limit: 3,
  allow_extra_checkins: false,
  show_on_dashboard: true,
})

const addCategoryOpen = ref(false)
const creatingCategory = ref(false)
const categoryError = ref('')
const newCategoryName = ref('')
const newCategoryTheme = ref('green')
const descriptionTextarea = ref<HTMLTextAreaElement | null>(null)

const visibleCategories = computed(() =>
  [...props.categories]
    .filter((category) => !category.is_hidden)
    .sort((left, right) => left.sort_order - right.sort_order),
)

const fallbackCategory = computed(() => visibleCategories.value[0] ?? props.categories[0] ?? null)
const hasCategories = computed(() => visibleCategories.value.length > 0)
const dateRangeInvalid = computed(
  () =>
    !form.is_unlimited &&
    Boolean(form.start_date && form.end_date && form.end_date < form.start_date),
)
const timeRangeInvalid = computed(
  () =>
    form.time_mode === 'time_range' &&
    Boolean(
      form.valid_start_time && form.valid_end_time && form.valid_end_time < form.valid_start_time,
    ),
)
const canSubmit = computed(
  () =>
    form.name.trim().length > 0 &&
    hasCategories.value &&
    !dateRangeInvalid.value &&
    !timeRangeInvalid.value,
)
const dateRangeInvalidText = computed(() => {
  const text = languageStore.t('dateRangeInvalid')
  if (text !== 'dateRangeInvalid') {
    return text
  }

  return languageStore.preference === 'en'
    ? 'End date cannot be earlier than start date'
    : '结束日期不能早于开始日期'
})
const timeRangeInvalidText = computed(() => {
  const text = languageStore.t('timeRangeInvalid')
  if (text !== 'timeRangeInvalid') {
    return text
  }

  return languageStore.preference === 'en'
    ? 'End time cannot be earlier than start time'
    : '结束时间不能早于开始时间'
})
const accent = computed(() => themeColor(form.color_theme))
const previewTitle = computed(() => form.name.trim() || languageStore.t('exampleHabitName'))
const previewDescription = computed(
  () => form.description.trim() || languageStore.t('exampleHabitDescription'),
)

const previewHeatmap = computed(() => {
  const values = props.heatmap.slice(-56)
  if (values.length > 0) {
    return values
  }

  const today = new Date()
  return Array.from({ length: 56 }, (_, index) => {
    const date = new Date(today)
    date.setDate(today.getDate() - (55 - index))
    const active = index > 45 || (index + Math.floor(index / 8)) % 7 === 0
    const level = active ? (index % 4) + 1 : 0
    return {
      date: date.toISOString().slice(0, 10),
      count: active ? level : 0,
      level,
      completed: active,
    }
  })
})

const previewMonthLabels = computed(() => {
  const first = previewHeatmap.value[0]?.date ?? todayString()
  const last = previewHeatmap.value.at(-1)?.date ?? todayString()
  return [monthLabel(first), monthLabel(last)]
})

watch(
  () => [props.item, props.categories] as const,
  () => {
    const item = props.item
    const category = fallbackCategory.value
    form.name = item?.name ?? ''
    form.category_id = item?.category_id ?? category?.id ?? null
    form.description = item?.description ?? ''
    form.color_theme = item?.color_theme ?? category?.color_theme ?? 'green'
    form.icon_key = normalizeLumaIconKey(item?.icon_key)
    form.start_date = item?.start_date ?? todayString()
    form.end_date = item?.end_date ?? ''
    form.is_unlimited = item?.is_unlimited ?? true
    form.daily_target_count = item?.daily_target_count ?? 1
    form.time_mode = item?.time_mode ?? 'all_day'
    form.valid_start_time = item?.valid_start_time || '09:00'
    form.valid_end_time = item?.valid_end_time || '23:59'
    form.allow_makeup = item?.allow_makeup ?? false
    form.makeup_monthly_limit = item?.makeup_monthly_limit ?? item?.makeup_limit_days ?? 3
    form.allow_extra_checkins = item?.allow_extra_checkins ?? false
    form.show_on_dashboard = item?.show_on_dashboard ?? true
    void nextTick(resizeDescriptionTextarea)
  },
  { immediate: true },
)

watch(
  () => form.description,
  () => {
    void nextTick(resizeDescriptionTextarea)
  },
)

onMounted(() => {
  resizeDescriptionTextarea()
})

function submit() {
  if (!canSubmit.value) {
    return
  }

  emit('submit', {
    name: form.name.trim(),
    category_id: form.category_id ?? undefined,
    description: form.description.trim(),
    color_theme: form.color_theme,
    icon_key: normalizeLumaIconKey(form.icon_key),
    start_date: form.start_date,
    end_date: form.is_unlimited ? '' : form.end_date,
    is_unlimited: form.is_unlimited,
    daily_target_count: Math.max(1, Number(form.daily_target_count)),
    time_mode: form.time_mode,
    valid_start_time: form.time_mode === 'time_range' ? form.valid_start_time : '',
    valid_end_time: form.time_mode === 'time_range' ? form.valid_end_time : '',
    allow_makeup: form.allow_makeup,
    makeup_monthly_limit: form.allow_makeup ? Math.max(0, Number(form.makeup_monthly_limit)) : 0,
    makeup_limit_days: form.allow_makeup ? Math.max(0, Number(form.makeup_monthly_limit)) : 0,
    allow_extra_checkins: form.allow_extra_checkins,
    show_on_dashboard: form.show_on_dashboard,
  })
}

function chooseCategory(category: Category) {
  form.category_id = category.id
  form.color_theme = category.color_theme
}

function changeTarget(delta: number) {
  form.daily_target_count = Math.max(1, Number(form.daily_target_count || 1) + delta)
}

function changeMakeupLimit(delta: number) {
  form.makeup_monthly_limit = Math.max(0, Number(form.makeup_monthly_limit || 0) + delta)
}

function resizeDescriptionTextarea() {
  const textarea = descriptionTextarea.value
  if (!textarea) {
    return
  }
  textarea.style.height = 'auto'
  textarea.style.height = `${textarea.scrollHeight}px`
}

function monthLabel(dateValue: string) {
  const date = new Date(`${dateValue}T00:00:00`)
  if (Number.isNaN(date.getTime())) {
    return ''
  }
  if (languageStore.preference === 'en') {
    return date.toLocaleDateString('en', { month: 'short' })
  }
  return `${date.getMonth() + 1}月`
}

function openAddCategory() {
  if (!props.createCategory) {
    return
  }
  categoryError.value = ''
  newCategoryName.value = ''
  newCategoryTheme.value = form.color_theme
  addCategoryOpen.value = true
}

async function confirmAddCategory() {
  if (!props.createCategory || !newCategoryName.value.trim()) {
    return
  }

  creatingCategory.value = true
  categoryError.value = ''
  try {
    const category = await props.createCategory({
      name: newCategoryName.value.trim(),
      color_theme: newCategoryTheme.value,
    })
    if (category) {
      form.category_id = category.id
      form.color_theme = category.color_theme
    }
    addCategoryOpen.value = false
  } catch {
    categoryError.value = languageStore.t('categoryCreateFailed')
  } finally {
    creatingCategory.value = false
  }
}
</script>

<template>
  <form class="editor-form" :style="{ '--item-accent': accent }" @submit.prevent="submit">
    <section class="editor-card preview-card">
      <LumaIconBadge :icon-key="form.icon_key" :accent="accent" :size="62" />
      <div class="preview-main">
        <h2>{{ previewTitle }}</h2>
        <p>{{ previewDescription }}</p>
        <div class="preview-heatmap" aria-hidden="true">
          <!-- <div class="preview-months">
            <span>{{ previewMonthLabels[0] }}</span>
            <span>{{ previewMonthLabels[1] }}</span>
          </div> -->
          <div class="preview-grid">
            <span
              v-for="(day, index) in previewHeatmap"
              :key="`${day.date}-${index}`"
              :style="{ backgroundColor: heatmapLevelColor(form.color_theme, day.level) }"
            />
          </div>
        </div>
      </div>
    </section>
    <section class="editor-card input-card">
      <label class="editor-row text-row">
        <span class="editor-glyph"><SvgIcon :src="editIcon" :size="18" /></span>
        <span class="row-body">
          <span class="row-title">{{ languageStore.t('itemName') }}</span>
          <input
            v-model="form.name"
            maxlength="20"
            :placeholder="languageStore.t('itemNamePlaceholder')"
          />
        </span>
        <span class="counter">{{ form.name.length }}/20</span>
      </label>

      <span class="soft-divider" />

      <label class="editor-row text-row description-row">
        <span class="editor-glyph"><SvgIcon :src="descIcon" :size="18" /></span>
        <span class="row-body">
          <span class="row-title">{{ languageStore.t('description') }}</span>
          <textarea
            ref="descriptionTextarea"
            v-model="form.description"
            maxlength="100"
            rows="1"
            :placeholder="languageStore.t('descriptionPlaceholder')"
            @input="resizeDescriptionTextarea"
          />
        </span>
        <span class="counter">{{ form.description.length }}/100</span>
      </label>
    </section>

    <section class="editor-card picker-card">
      <div class="section-title">
        <span class="editor-glyph"><SvgIcon :src="photoIcon" :size="18" /></span>
        <span>{{ languageStore.t('selectIcon') }}</span>
      </div>
      <div class="icon-strip" aria-label="icon picker">
        <button
          v-for="option in lumaIconOptions"
          :key="option.key"
          type="button"
          class="icon-choice"
          :class="{ active: normalizeLumaIconKey(form.icon_key) === option.key }"
          :style="{ '--choice-accent': themeColor(option.theme) }"
          @click="form.icon_key = option.key"
        >
          <LumaIconBadge :icon-key="option.key" :accent="themeColor(option.theme)" :size="37" />
        </button>
      </div>
    </section>

    <section class="editor-card picker-card">
      <div class="section-title">
        <span class="editor-glyph"><SvgIcon :src="labelIcon" :size="18" /></span>
        <span>{{ languageStore.t('selectCategory') }}</span>
      </div>
      <div class="category-chips">
        <button
          v-for="category in visibleCategories"
          :key="category.id"
          type="button"
          class="category-chip"
          :class="{ active: form.category_id === category.id }"
          :style="{ '--chip-accent': themeColor(category.color_theme) }"
          @click="chooseCategory(category)"
        >
          {{ languageStore.categoryName(category.name) }}
        </button>
        <button
          v-if="createCategory"
          type="button"
          class="category-chip add-chip"
          @click="openAddCategory"
        >
          + {{ languageStore.t('addCategory') }}
        </button>
      </div>

      <span class="soft-divider section-gap" />

      <div class="section-title">
        <span class="editor-glyph"><SvgIcon :src="colorIcon" :size="18" /></span>
        <span>{{ languageStore.t('selectColor') }}</span>
      </div>
      <div class="color-dots">
        <button
          v-for="theme in colorThemes"
          :key="theme.value"
          type="button"
          class="color-dot"
          :class="{ active: form.color_theme === theme.value }"
          :title="theme.label"
          :style="{ '--dot-color': theme.color }"
          @click="form.color_theme = theme.value"
        />
      </div>
    </section>

    <section class="editor-card date-card">
      <div class="date-row">
        <label class="date-cell">
          <span class="editor-glyph"><SvgIcon :src="dateIcon" :size="18" /></span>
          <span class="date-copy">
            <span class="row-title">{{ languageStore.t('startDate') }}</span>
            <span class="date-value">{{ form.start_date || todayString() }}</span>
          </span>
          <input v-model="form.start_date" type="date" />
          <span class="chevron">›</span>
        </label>
        <span class="vertical-divider" />
        <label class="date-cell" :class="{ disabled: form.is_unlimited }">
          <span class="editor-glyph"><SvgIcon :src="dateIcon" :size="18" /></span>
          <span class="date-copy">
            <span class="row-title">{{ languageStore.t('endDate') }}</span>
            <span class="date-value muted-value">
              {{ form.end_date || languageStore.t('unset') }}
            </span>
          </span>
          <input v-model="form.end_date" type="date" @focus="form.is_unlimited = false" />
          <span class="chevron">›</span>
        </label>
      </div>

      <p v-if="dateRangeInvalid" class="validation-message">
        {{ dateRangeInvalidText }}
      </p>

      <span class="soft-divider" />

      <div class="editor-row switch-row">
        <span class="editor-glyph"><SvgIcon :src="noLimitIcon" :size="18" /></span>
        <span class="row-title">{{ languageStore.t('unlimitedEndDate') }}</span>
        <button
          type="button"
          class="editor-switch"
          :class="{ active: form.is_unlimited }"
          @click="form.is_unlimited = !form.is_unlimited"
        >
          <span />
        </button>
      </div>
    </section>

    <section class="editor-card goal-card">
      <div class="editor-row">
        <span class="editor-glyph"><SvgIcon :src="goalIcon" :size="18" /></span>
        <span class="row-title">{{ languageStore.t('dailyTarget') }}</span>
        <span class="stepper">
          <button type="button" @click="changeTarget(-1)">−</button>
          <input v-model.number="form.daily_target_count" min="1" type="number" />
          <button type="button" @click="changeTarget(1)">+</button>
        </span>
      </div>

      <span class="soft-divider" />

      <div class="time-block">
        <div class="editor-row time-head">
          <span class="editor-glyph"><SvgIcon :src="timeIcon" :size="18" /></span>
          <span class="row-body">
            <span class="row-title">{{ languageStore.t('validTime') }}</span>
            <span class="subline">
              {{
                form.time_mode === 'all_day'
                  ? languageStore.t('allDayCheckin')
                  : `${form.valid_start_time} - ${form.valid_end_time}`
              }}
            </span>
          </span>
          <span class="segmented-control">
            <button
              type="button"
              :class="{ active: form.time_mode === 'all_day' }"
              @click="form.time_mode = 'all_day'"
            >
              {{ languageStore.t('allDay') }}
            </button>
            <button
              type="button"
              :class="{ active: form.time_mode === 'time_range' }"
              @click="form.time_mode = 'time_range'"
            >
              {{ languageStore.t('timeRange') }}
            </button>
          </span>
        </div>
        <div class="time-inputs">
          <label :class="{ disabled: form.time_mode === 'all_day' }">
            <span>{{ languageStore.t('startTime') }}</span>
            <input
              v-model="form.valid_start_time"
              type="time"
              :disabled="form.time_mode === 'all_day'"
            />
          </label>
          <span>—</span>
          <label :class="{ disabled: form.time_mode === 'all_day' }">
            <span>{{ languageStore.t('endTime') }}</span>
            <input
              v-model="form.valid_end_time"
              type="time"
              :disabled="form.time_mode === 'all_day'"
            />
          </label>
        </div>
        <p v-if="timeRangeInvalid" class="validation-message time-validation-message">
          {{ timeRangeInvalidText }}
        </p>
      </div>
    </section>

    <section class="editor-card toggles-card">
      <div class="editor-row switch-row">
        <span class="editor-glyph"><SvgIcon :src="signInIcon" :size="18" /></span>
        <span class="row-title">{{ languageStore.t('allowMakeup') }}</span>
        <button
          type="button"
          class="editor-switch"
          :class="{ active: form.allow_makeup }"
          @click="form.allow_makeup = !form.allow_makeup"
        >
          <span />
        </button>
      </div>

      <template v-if="form.allow_makeup">
        <span class="soft-divider" />
        <div class="editor-row makeup-limit-row">
          <span class="editor-glyph-placeholder" />
          <span class="row-title">{{ languageStore.t('makeupMonthlyLimit') }}</span>
          <span class="stepper">
            <button type="button" @click="changeMakeupLimit(-1)">−</button>
            <input v-model.number="form.makeup_monthly_limit" min="0" type="number" />
            <button type="button" @click="changeMakeupLimit(1)">+</button>
          </span>
        </div>
      </template>

      <span class="soft-divider" />

      <div class="editor-row switch-row">
        <span class="editor-glyph add-glyph">+</span>
        <span class="row-title">{{ languageStore.t('allowExtraCheckins') }}</span>
        <button
          type="button"
          class="editor-switch"
          :class="{ active: form.allow_extra_checkins }"
          @click="form.allow_extra_checkins = !form.allow_extra_checkins"
        >
          <span />
        </button>
      </div>

      <span class="soft-divider" />

      <div class="editor-row switch-row">
        <span class="editor-glyph"><SvgIcon :src="homeIcon" :size="18" /></span>
        <span class="row-title">{{ languageStore.t('showOnDashboard') }}</span>
        <button
          type="button"
          class="editor-switch"
          :class="{ active: form.show_on_dashboard }"
          @click="form.show_on_dashboard = !form.show_on_dashboard"
        >
          <span />
        </button>
      </div>
    </section>

    <footer class="editor-bottom-bar">
      <template v-if="isEditing">
        <button type="button" class="bottom-action" @click="emit('archive')">
          <SvgIcon :src="archiveIcon" :size="18" />
          <span>{{ archived ? languageStore.t('unarchive') : languageStore.t('archive') }}</span>
        </button>
        <span class="bottom-divider" />
        <button type="button" class="bottom-action danger-action" @click="emit('delete')">
          <SvgIcon :src="deleteIcon" :size="18" />
          <span>{{ languageStore.t('delete') }}</span>
        </button>
      </template>
      <span class="bottom-spacer" />
      <button type="submit" class="save-button" :disabled="loading || !canSubmit">
        {{ loading ? languageStore.t('saveLoading') : submitLabel }}
      </button>
    </footer>

    <div
      v-if="addCategoryOpen"
      class="category-dialog-backdrop"
      @click.self="addCategoryOpen = false"
    >
      <section class="category-dialog">
        <h3>{{ languageStore.t('addCategory') }}</h3>
        <label class="dialog-field">
          <span>{{ languageStore.t('newCategoryName') }}</span>
          <input v-model="newCategoryName" maxlength="20" autofocus />
        </label>
        <div class="dialog-colors">
          <button
            v-for="theme in colorThemes"
            :key="theme.value"
            type="button"
            class="color-dot"
            :class="{ active: newCategoryTheme === theme.value }"
            :style="{ '--dot-color': theme.color }"
            @click="newCategoryTheme = theme.value"
          />
        </div>
        <p v-if="categoryError" class="error">{{ categoryError }}</p>
        <div class="dialog-actions">
          <button type="button" class="dialog-cancel" @click="addCategoryOpen = false">
            {{ languageStore.t('cancel') }}
          </button>
          <button
            type="button"
            class="dialog-confirm"
            :disabled="creatingCategory || !newCategoryName.trim()"
            @click="confirmAddCategory"
          >
            {{ creatingCategory ? languageStore.t('saveLoading') : languageStore.t('save') }}
          </button>
        </div>
      </section>
    </div>
  </form>
</template>

<style scoped>
.editor-form {
  display: grid;
  min-width: 0;
  gap: 10px;
  padding-bottom: 92px;
}

.editor-card {
  min-width: 0;
  max-width: 100%;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: color-mix(in srgb, var(--surface-solid) 98%, transparent);
  box-shadow: none;
}

:global(html[data-theme='dark']) .editor-card {
  background: rgba(18, 25, 35, 0.9);
}

.preview-card {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 12px;
  padding: 12px 13px;
}

.preview-main {
  min-width: 0;
  flex: 1;
}

.preview-main h2 {
  margin: 0;
  overflow: hidden;
  color: var(--text);
  font-size: 17px;
  font-weight: 650;
  line-height: 22px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-main p {
  margin: 4px 0 6px;
  overflow: hidden;
  color: var(--muted);
  font-size: 12px;
  line-height: 15px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-months {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
  color: color-mix(in srgb, var(--muted) 88%, var(--text));
  font-size: 9px;
  line-height: 11px;
}

.preview-grid {
  display: grid;
  grid-template-columns: repeat(28, minmax(0, 1fr));
  grid-template-rows: repeat(2, minmax(0, 1fr));
  gap: 2px;
  width: 100%;
}

.preview-grid span {
  aspect-ratio: 1;
  min-width: 0;
  border-radius: 2px;
}

.input-card,
.picker-card,
.date-card,
.goal-card,
.toggles-card {
  padding: 8px 12px;
}

.editor-row,
.section-title,
.date-cell {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 11px;
}

.editor-row {
  min-height: 48px;
  padding: 6px 0;
}

.editor-glyph {
  display: grid;
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 10px;
  background: color-mix(in srgb, var(--item-accent) 10%, transparent);
  color: color-mix(in srgb, var(--item-accent) 84%, var(--text));
  font-size: 20px;
  font-weight: 500;
}

.editor-glyph-placeholder {
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
}

:global(html[data-theme='dark']) .editor-glyph {
  background: color-mix(in srgb, var(--item-accent) 16%, transparent);
}

.add-glyph {
  line-height: 1;
}

.row-body {
  display: grid;
  min-width: 0;
  flex: 1;
  gap: 4px;
}

.row-title,
.section-title span:last-child {
  color: var(--text);
  font-size: 14px;
  font-weight: 650;
  line-height: 18px;
}

.editor-row > .row-title {
  flex: 1;
}

.subline {
  overflow: hidden;
  color: var(--muted);
  font-size: 11px;
  line-height: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.text-row input,
.text-row textarea {
  width: 100%;
  border: 0;
  background: transparent;
  color: var(--muted);
  outline: none;
  padding: 0;
  font-size: 13px;
  line-height: 17px;
}

.text-row textarea {
  min-height: 17px;
  overflow: hidden;
  resize: none;
}

.description-row {
  align-items: flex-start;
}

.description-row .editor-glyph {
  margin-top: 1px;
}

.description-row .counter {
  padding-top: 3px;
}

.text-row input::placeholder,
.text-row textarea::placeholder {
  color: color-mix(in srgb, var(--muted) 62%, transparent);
}

.counter {
  flex: 0 0 auto;
  color: color-mix(in srgb, var(--muted) 72%, transparent);
  font-size: 11px;
  line-height: 13px;
}

.soft-divider {
  display: block;
  height: 1px;
  background: var(--border);
}

.validation-message {
  margin: -2px 0 7px 45px;
  color: var(--danger);
  font-size: 11px;
  line-height: 14px;
}

.time-validation-message {
  margin: -3px 0 0 45px;
}

.section-title {
  min-height: 40px;
  padding: 5px 0 8px;
}

.icon-strip {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 0 0 5px;
  scrollbar-width: none;
}

.icon-strip::-webkit-scrollbar {
  display: none;
}

.icon-choice {
  display: grid;
  width: 50px;
  height: 50px;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid var(--border);
  border-radius: 13px;
  background: var(--surface-soft);
  color: var(--choice-accent);
  padding: 0;
}

.icon-choice.active {
  border: 1.6px solid color-mix(in srgb, var(--choice-accent) 92%, transparent);
  background: color-mix(in srgb, var(--choice-accent) 10%, var(--surface-solid));
}

.category-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding-bottom: 4px;
}

.category-chip {
  border: 1px solid transparent;
  border-radius: 12px;
  background: var(--surface-soft);
  color: var(--muted);
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  line-height: 15px;
}

.category-chip.active {
  border-color: color-mix(in srgb, var(--chip-accent) 34%, transparent);
  background: color-mix(in srgb, var(--chip-accent) 12%, transparent);
  color: var(--chip-accent);
}

.add-chip {
  border-color: color-mix(in srgb, var(--item-accent) 20%, transparent);
  background: color-mix(in srgb, var(--item-accent) 8%, transparent);
  color: var(--item-accent);
}

.section-gap {
  margin: 10px 0;
}

.color-dots {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 5px 0 7px;
}

.color-dot {
  width: 28px;
  height: 28px;
  border: 1px solid color-mix(in srgb, var(--muted) 28%, transparent);
  border-radius: 999px;
  background: var(--dot-color);
  box-shadow: inset 0 0 0 4px var(--surface-solid);
}

.color-dot.active {
  border: 2px solid var(--dot-color);
  box-shadow: inset 0 0 0 4px var(--surface-solid);
}

:global(html[data-theme='dark']) .color-dot {
  box-shadow: inset 0 0 0 4px var(--surface-solid);
}

.date-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 1px minmax(0, 1fr);
  align-items: center;
}

.date-cell {
  position: relative;
  min-height: 58px;
  cursor: pointer;
  padding: 7px 0;
}

.date-cell input {
  position: absolute;
  inset: 0;
  opacity: 0;
}

.date-cell.disabled {
  opacity: 0.62;
}

.date-copy {
  display: grid;
  min-width: 0;
  flex: 1;
  gap: 3px;
}

.date-value {
  overflow: hidden;
  color: var(--item-accent);
  font-size: 13px;
  line-height: 16px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.muted-value {
  color: var(--muted);
}

.chevron {
  color: color-mix(in srgb, var(--muted) 64%, transparent);
  font-size: 20px;
  line-height: 1;
}

.vertical-divider,
.bottom-divider {
  width: 1px;
  background: var(--border);
}

.vertical-divider {
  height: 58px;
}

.switch-row .row-title {
  flex: 1;
}

.editor-switch {
  position: relative;
  width: 54px;
  height: 30px;
  flex: 0 0 auto;
  border: 0;
  border-radius: 999px;
  background: color-mix(in srgb, var(--muted) 18%, var(--surface-soft));
  padding: 3px;
  transition: background-color 160ms ease;
}

.editor-switch span {
  display: block;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  background: #ffffff;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.12);
  transform: translateX(0);
  transition: transform 160ms ease;
}

.editor-switch.active {
  background: var(--item-accent);
}

.editor-switch.active span {
  transform: translateX(24px);
}

.stepper {
  display: inline-grid;
  grid-template-columns: 32px 38px 32px;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface-soft);
}

.stepper button,
.stepper input {
  height: 30px;
  border: 0;
  background: transparent;
  color: var(--text);
  text-align: center;
  outline: none;
}

.stepper button {
  font-size: 19px;
  font-weight: 650;
  line-height: 1;
}

.stepper input {
  width: 38px;
  padding: 0;
  font-size: 14px;
  font-weight: 650;
  appearance: textfield;
}

.stepper input::-webkit-outer-spin-button,
.stepper input::-webkit-inner-spin-button {
  margin: 0;
  appearance: none;
}

.time-block {
  display: grid;
  gap: 10px;
  padding: 7px 0;
}

.time-head {
  min-height: 34px;
  padding: 0;
}

.segmented-control {
  display: inline-flex;
  flex: 0 0 auto;
  gap: 2px;
  border-radius: 11px;
  background: var(--surface-soft);
  padding: 2px;
}

.segmented-control button {
  min-width: 64px;
  border: 1px solid transparent;
  border-radius: 9px;
  background: transparent;
  color: var(--muted);
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 600;
  line-height: 15px;
}

.segmented-control button.active {
  border-color: color-mix(in srgb, var(--item-accent) 24%, transparent);
  background: var(--surface-solid);
  color: var(--item-accent);
}

.time-inputs {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 9px;
}

.time-inputs > span {
  color: color-mix(in srgb, var(--muted) 56%, transparent);
}

.time-inputs label {
  display: flex;
  min-width: 0;
  height: 42px;
  align-items: center;
  gap: 7px;
  border-radius: 10px;
  background: var(--surface-soft);
  padding: 0 10px;
}

.time-inputs label.disabled {
  opacity: 0.45;
}

.time-inputs label span {
  flex: 0 0 auto;
  color: var(--muted);
  font-size: 11px;
  line-height: 13px;
}

.time-inputs input {
  min-width: 0;
  flex: 1;
  border: 0;
  background: transparent;
  color: var(--muted);
  outline: none;
  font-size: 12px;
}

.editor-bottom-bar {
  position: fixed;
  z-index: 20;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  border-top: 1px solid var(--border);
  background: color-mix(in srgb, var(--surface-solid) 98%, transparent);
  padding: 10px max(14px, calc((100vw - 760px) / 2 + 14px));
}

:global(html[data-theme='dark']) .editor-bottom-bar {
  background: rgba(18, 25, 35, 0.98);
}

.bottom-action {
  display: inline-flex;
  min-height: 42px;
  align-items: center;
  gap: 6px;
  border: 0;
  background: transparent;
  color: var(--text);
  padding: 8px 8px;
  font-size: 13px;
  font-weight: 650;
}

.danger-action {
  color: var(--danger);
}

.bottom-divider {
  height: 22px;
}

.bottom-spacer {
  flex: 1;
}

.save-button {
  min-width: 142px;
  min-height: 48px;
  border: 0;
  border-radius: 14px;
  background: linear-gradient(135deg, #20b75b, #11994f);
  color: #ffffff;
  padding: 0 28px;
  font-size: 16px;
  font-weight: 650;
}

.save-button:disabled {
  cursor: not-allowed;
  opacity: 0.48;
}

.category-dialog-backdrop {
  position: fixed;
  z-index: 30;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(15, 23, 42, 0.28);
  padding: 22px;
}

.category-dialog {
  display: grid;
  width: min(340px, 100%);
  gap: 14px;
  border: 1px solid var(--border);
  border-radius: 18px;
  background: var(--surface-solid);
  padding: 18px;
}

.category-dialog h3 {
  margin: 0;
  color: var(--text);
  font-size: 17px;
  line-height: 22px;
}

.dialog-field {
  display: grid;
  gap: 7px;
}

.dialog-field span {
  color: var(--muted);
  font-size: 12px;
}

.dialog-field input {
  height: 42px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface-soft);
  color: var(--text);
  outline: none;
  padding: 0 12px;
}

.dialog-colors {
  display: flex;
  justify-content: space-between;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.dialog-actions button {
  min-height: 38px;
  border-radius: 12px;
  padding: 0 14px;
  font-weight: 650;
}

.dialog-cancel {
  border: 1px solid var(--border);
  background: transparent;
  color: var(--muted);
}

.dialog-confirm {
  border: 0;
  background: var(--item-accent);
  color: #ffffff;
}

@media (max-width: 520px) {
  .editor-form {
    gap: 8px;
  }

  .segmented-control button {
    min-width: 52px;
    padding-inline: 8px;
  }

  .editor-bottom-bar {
    padding-inline: 14px;
  }

  .save-button {
    min-width: 132px;
  }
}
</style>
