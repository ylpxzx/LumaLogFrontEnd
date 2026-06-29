<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import CategoryPicker from './CategoryPicker.vue'
import ColorThemePicker from './ColorThemePicker.vue'
import { useLanguageStore } from '@/stores/language'
import type { Category, Item, ItemPayload, TimeMode } from '@/types'
import { todayString } from '@/utils/dates'

const props = defineProps<{
  item?: Item | null
  categories: Category[]
  submitLabel: string
  loading?: boolean
}>()

const emit = defineEmits<{
  submit: [payload: ItemPayload]
}>()

const languageStore = useLanguageStore()

const form = reactive({
  name: '',
  category_id: null as number | null,
  description: '',
  color_theme: 'green',
  start_date: todayString(),
  end_date: '',
  is_unlimited: true,
  daily_target_count: 1,
  time_mode: 'all_day' as TimeMode,
  valid_start_time: '09:00',
  valid_end_time: '23:59',
  allow_extra_checkins: false,
  show_on_dashboard: true,
})

const hasCategories = computed(() => props.categories.length > 0)

watch(
  () => [props.item, props.categories] as const,
  () => {
    const item = props.item
    form.name = item?.name ?? ''
    form.category_id = item?.category_id ?? props.categories[0]?.id ?? null
    form.description = item?.description ?? ''
    form.color_theme = item?.color_theme ?? props.categories[0]?.color_theme ?? 'green'
    form.start_date = item?.start_date ?? todayString()
    form.end_date = item?.end_date ?? ''
    form.is_unlimited = item?.is_unlimited ?? true
    form.daily_target_count = item?.daily_target_count ?? 1
    form.time_mode = item?.time_mode ?? 'all_day'
    form.valid_start_time = item?.valid_start_time || '09:00'
    form.valid_end_time = item?.valid_end_time || '23:59'
    form.allow_extra_checkins = item?.allow_extra_checkins ?? false
    form.show_on_dashboard = item?.show_on_dashboard ?? true
  },
  { immediate: true },
)

function submit() {
  emit('submit', {
    name: form.name.trim(),
    category_id: form.category_id ?? undefined,
    description: form.description.trim(),
    color_theme: form.color_theme,
    start_date: form.start_date,
    end_date: form.is_unlimited ? '' : form.end_date,
    is_unlimited: form.is_unlimited,
    daily_target_count: Math.max(1, Number(form.daily_target_count)),
    time_mode: form.time_mode,
    valid_start_time: form.time_mode === 'time_range' ? form.valid_start_time : '',
    valid_end_time: form.time_mode === 'time_range' ? form.valid_end_time : '',
    allow_extra_checkins: form.allow_extra_checkins,
    show_on_dashboard: form.show_on_dashboard,
  })
}
</script>

<template>
  <form class="form-stack" @submit.prevent="submit">
    <div class="form-grid">
      <label class="field wide">
        <span>{{ languageStore.t('itemName') }}</span>
        <input
          v-model="form.name"
          class="input"
          required
          maxlength="80"
          :placeholder="languageStore.t('itemNamePlaceholder')"
        />
      </label>

      <label class="field">
        <span>{{ languageStore.t('category') }}</span>
        <CategoryPicker v-model="form.category_id" :categories="categories" />
      </label>

      <label class="field">
        <span>{{ languageStore.t('dailyTarget') }}</span>
        <input v-model.number="form.daily_target_count" class="input" min="1" type="number" />
      </label>

      <label class="field wide">
        <span>{{ languageStore.t('description') }}</span>
        <textarea
          v-model="form.description"
          class="textarea"
          maxlength="240"
          :placeholder="languageStore.t('descriptionPlaceholder')"
        />
      </label>

      <label class="field wide">
        <span>{{ languageStore.t('color') }}</span>
        <ColorThemePicker v-model="form.color_theme" />
      </label>

      <label class="field">
        <span>{{ languageStore.t('startDate') }}</span>
        <input v-model="form.start_date" class="input" type="date" />
      </label>

      <label class="checkbox-row">
        <input v-model="form.is_unlimited" type="checkbox" />
        {{ languageStore.t('unlimitedEndDate') }}
      </label>

      <label v-if="!form.is_unlimited" class="field">
        <span>{{ languageStore.t('endDate') }}</span>
        <input v-model="form.end_date" class="input" type="date" />
      </label>

      <label class="field">
        <span>{{ languageStore.t('validTime') }}</span>
        <select v-model="form.time_mode" class="select">
          <option value="all_day">{{ languageStore.t('allDay') }}</option>
          <option value="time_range">{{ languageStore.t('timeRange') }}</option>
        </select>
      </label>

      <template v-if="form.time_mode === 'time_range'">
        <label class="field">
          <span>{{ languageStore.t('startTime') }}</span>
          <input v-model="form.valid_start_time" class="input" type="time" />
        </label>
        <label class="field">
          <span>{{ languageStore.t('endTime') }}</span>
          <input v-model="form.valid_end_time" class="input" type="time" />
        </label>
      </template>

      <label class="checkbox-row">
        <input v-model="form.allow_extra_checkins" type="checkbox" />
        {{ languageStore.t('allowExtraCheckins') }}
      </label>

      <label class="checkbox-row">
        <input v-model="form.show_on_dashboard" type="checkbox" />
        {{ languageStore.t('showOnDashboard') }}
      </label>
    </div>

    <div class="topbar-actions">
      <button class="button" type="submit" :disabled="loading || !hasCategories">
        {{ loading ? languageStore.t('saveLoading') : submitLabel }}
      </button>
    </div>
  </form>
</template>
