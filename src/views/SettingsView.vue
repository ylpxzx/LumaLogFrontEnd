<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { fetchBadges } from '@/api/dashboard'
import { createCategory, deleteCategory, listCategories, updateCategory } from '@/api/categories'
import { listItems, unarchiveItem } from '@/api/items'
import DashboardViewModeToggle from '@/components/DashboardViewModeToggle.vue'
import LanguageToggle from '@/components/LanguageToggle.vue'
import SvgIcon from '@/components/SvgIcon.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'
import { useAuthStore } from '@/stores/auth'
import { useLanguageStore } from '@/stores/language'
import { badgeImage } from '@/utils/badgeImages'
import { colorThemes, themeColor } from '@/utils/colors'
import type { Badge, Category, DashboardViewMode, Item } from '@/types'
import archiveIcon from '@/assets/svg/archive.svg?raw'
import foldIcon from '@/assets/svg/fold.svg?raw'
import goalIcon from '@/assets/svg/goal.svg?raw'
import homeIcon from '@/assets/svg/home.svg?raw'
import labelIcon from '@/assets/svg/label.svg?raw'
import noLimitIcon from '@/assets/svg/noLimit.svg?raw'
import photoIcon from '@/assets/svg/photo.svg?raw'

type SettingsPanelKey = 'display' | 'dashboard' | 'categories' | 'badges' | 'archived' | 'data'

const authStore = useAuthStore()
const languageStore = useLanguageStore()

const categories = ref<Category[]>([])
const archivedItems = ref<Item[]>([])
const badges = ref<Badge[]>([])
const loading = ref(true)
const saving = ref(false)
const restoringId = ref<number | null>(null)
const error = ref('')
const newCategoryName = ref('')
const newCategoryColor = ref('green')
const viewMode = ref<DashboardViewMode>('all')
const showTodayStatus = ref(false)
const showCurrentStreak = ref(false)
const showLongestStreak = ref(false)
const showCompletionRate = ref(false)
const showTotalCheckins = ref(false)
const expandedPanel = ref<SettingsPanelKey | null>('display')

const earnedBadges = computed(() => badges.value.filter((badge) => badge.earned))
const dashboardEnabledCount = computed(
  () =>
    [
      showTodayStatus.value,
      showCurrentStreak.value,
      showLongestStreak.value,
      showCompletionRate.value,
      showTotalCheckins.value,
    ].filter(Boolean).length,
)
const dashboardSummary = computed(() =>
  languageStore.t('settingsEnabledCount', { count: dashboardEnabledCount.value }),
)
const categorySummary = computed(() =>
  languageStore.t('settingsCategoryCount', { count: categories.value.length }),
)
const badgeSummary = computed(() =>
  languageStore.t('settingsBadgeCount', { count: earnedBadges.value.length }),
)
const archivedSummary = computed(() =>
  languageStore.t('settingsArchivedCount', { count: archivedItems.value.length }),
)

async function load() {
  loading.value = true
  error.value = ''
  try {
    if (!authStore.user) {
      await authStore.loadMe()
    }
    const user = authStore.user
    if (user?.language_preference) {
      languageStore.setLanguage(user.language_preference)
    }
    viewMode.value = user?.dashboard_view_mode ?? 'all'
    showTodayStatus.value = user?.show_today_status ?? false
    showCurrentStreak.value = user?.show_current_streak ?? false
    showLongestStreak.value = user?.show_longest_streak ?? false
    showCompletionRate.value = user?.show_completion_rate ?? false
    showTotalCheckins.value = user?.show_total_checkins ?? false
    const [categoryData, archivedData, badgeData] = await Promise.all([
      listCategories(true),
      listItems({ archived: true }),
      fetchBadges(),
    ])
    categories.value = categoryData
    archivedItems.value = archivedData
    badges.value = badgeData
  } catch {
    error.value = languageStore.t('settingsLoadFailed')
  } finally {
    loading.value = false
  }
}

function togglePanel(panel: SettingsPanelKey) {
  expandedPanel.value = expandedPanel.value === panel ? null : panel
}

function logoCellLit(index: number) {
  return [1, 2, 6, 7, 11, 13, 16].includes(index)
}

async function saveMode(next: DashboardViewMode) {
  viewMode.value = next
  try {
    await authStore.savePreferences({ dashboard_view_mode: next })
  } catch {
    error.value = languageStore.t('settingsLoadFailed')
  }
}

async function saveStatsVisibility() {
  error.value = ''
  try {
    await authStore.savePreferences({
      show_today_status: showTodayStatus.value,
      show_current_streak: showCurrentStreak.value,
      show_longest_streak: showLongestStreak.value,
      show_completion_rate: showCompletionRate.value,
      show_total_checkins: showTotalCheckins.value,
    })
  } catch {
    error.value = languageStore.t('statsSaveFailed')
  }
}

async function addCategory() {
  if (!newCategoryName.value.trim()) {
    return
  }
  saving.value = true
  error.value = ''
  try {
    await createCategory({
      name: newCategoryName.value.trim(),
      color_theme: newCategoryColor.value,
      sort_order: categories.value.length * 10 + 100,
    })
    newCategoryName.value = ''
    categories.value = await listCategories(true)
  } catch {
    error.value = languageStore.t('categoryCreateFailed')
  } finally {
    saving.value = false
  }
}

async function toggleHidden(category: Category) {
  error.value = ''
  try {
    await updateCategory(category.id, { is_hidden: !category.is_hidden })
    categories.value = await listCategories(true)
  } catch {
    error.value = languageStore.t('categoryUpdateFailed')
  }
}

async function removeCategory(category: Category) {
  if (!window.confirm(languageStore.t('confirmDeleteCategory', { name: category.name }))) {
    return
  }
  error.value = ''
  try {
    await deleteCategory(category.id)
    categories.value = await listCategories(true)
  } catch {
    error.value = languageStore.t('categoryDeleteFailed')
  }
}

async function restoreArchivedItem(item: Item) {
  restoringId.value = item.id
  error.value = ''
  try {
    await unarchiveItem(item.id)
    archivedItems.value = archivedItems.value.filter((archived) => archived.id !== item.id)
  } catch {
    error.value = languageStore.t('unarchiveFailed')
  } finally {
    restoringId.value = null
  }
}

onMounted(load)
</script>

<template>
  <main class="settings-page">
    <header class="settings-topbar">
      <RouterLink class="settings-back" to="/">←</RouterLink>
      <h1>{{ languageStore.t('settings') }}</h1>
    </header>

    <div v-if="loading" class="loading">{{ languageStore.t('loading') }}</div>

    <section v-else class="settings-content">
      <p v-if="error" class="error">{{ error }}</p>

      <section class="settings-brand-block">
        <div class="settings-logo" aria-hidden="true">
          <span
            v-for="index in 16"
            :key="index"
            :class="{ lit: logoCellLit(index), dimmed: index === 16 }"
          />
        </div>
        <div class="settings-brand-copy">
          <strong>LumaLog</strong>
          <span>{{ languageStore.t('brandTagline') }}</span>
          <em>
            <i>✓</i>
            {{ languageStore.t('settingsLocalAutoSave') }}
          </em>
        </div>
      </section>

      <section class="settings-panel" :class="{ expanded: expandedPanel === 'display' }">
        <button class="settings-panel-head" type="button" @click="togglePanel('display')">
          <span class="settings-icon-badge"><SvgIcon :src="photoIcon" :size="17" /></span>
          <span class="settings-panel-title">{{ languageStore.t('display') }}</span>
          <SvgIcon class="settings-fold-icon" :src="foldIcon" :size="14" />
        </button>
        <div v-if="expandedPanel === 'display'" class="settings-panel-body">
          <span class="settings-field-label">{{ languageStore.t('language') }}</span>
          <LanguageToggle />
          <span class="settings-field-label">{{ languageStore.t('theme') }}</span>
          <ThemeToggle />
          <span class="settings-field-label">{{ languageStore.t('dashboardMode') }}</span>
          <DashboardViewModeToggle :model-value="viewMode" @update:model-value="saveMode" />
        </div>
      </section>

      <section class="settings-panel" :class="{ expanded: expandedPanel === 'dashboard' }">
        <button class="settings-panel-head" type="button" @click="togglePanel('dashboard')">
          <span class="settings-icon-badge"><SvgIcon :src="homeIcon" :size="17" /></span>
          <span class="settings-panel-title">{{ languageStore.t('dashboardDisplay') }}</span>
          <span v-if="expandedPanel !== 'dashboard'" class="settings-panel-summary">
            {{ dashboardSummary }}
          </span>
          <SvgIcon class="settings-fold-icon" :src="foldIcon" :size="14" />
        </button>
        <div v-if="expandedPanel === 'dashboard'" class="settings-panel-body compact-body">
          <label class="settings-switch-row">
            <span>{{ languageStore.t('todayStatus') }}</span>
            <input v-model="showTodayStatus" type="checkbox" @change="saveStatsVisibility" />
            <i />
          </label>
          <span class="settings-divider" />
          <label class="settings-switch-row">
            <span>{{ languageStore.t('currentStreak') }}</span>
            <input v-model="showCurrentStreak" type="checkbox" @change="saveStatsVisibility" />
            <i />
          </label>
          <span class="settings-divider" />
          <label class="settings-switch-row">
            <span>{{ languageStore.t('longestStreak') }}</span>
            <input v-model="showLongestStreak" type="checkbox" @change="saveStatsVisibility" />
            <i />
          </label>
          <span class="settings-divider" />
          <label class="settings-switch-row">
            <span>{{ languageStore.t('completionRate') }}</span>
            <input v-model="showCompletionRate" type="checkbox" @change="saveStatsVisibility" />
            <i />
          </label>
          <span class="settings-divider" />
          <label class="settings-switch-row">
            <span>{{ languageStore.t('totalCheckins') }}</span>
            <input v-model="showTotalCheckins" type="checkbox" @change="saveStatsVisibility" />
            <i />
          </label>
        </div>
      </section>

      <section class="settings-panel" :class="{ expanded: expandedPanel === 'categories' }">
        <button class="settings-panel-head" type="button" @click="togglePanel('categories')">
          <span class="settings-icon-badge"><SvgIcon :src="labelIcon" :size="17" /></span>
          <span class="settings-panel-title">{{ languageStore.t('categories') }}</span>
          <span v-if="expandedPanel !== 'categories'" class="settings-panel-summary">
            {{ categorySummary }}
          </span>
          <SvgIcon class="settings-fold-icon" :src="foldIcon" :size="14" />
        </button>
        <div v-if="expandedPanel === 'categories'" class="settings-panel-body">
          <form class="settings-category-create" @submit.prevent="addCategory">
            <input
              v-model="newCategoryName"
              :placeholder="languageStore.t('newCategoryName')"
              maxlength="20"
            />
            <div class="settings-color-dots">
              <button
                v-for="theme in colorThemes"
                :key="theme.value"
                type="button"
                :class="{ active: newCategoryColor === theme.value }"
                :style="{ '--dot-color': theme.color }"
                @click="newCategoryColor = theme.value"
              />
            </div>
            <button class="settings-primary-button" type="submit" :disabled="saving || !newCategoryName.trim()">
              {{ languageStore.t('addCategory') }}
            </button>
          </form>
          <div class="settings-category-list">
            <article
              v-for="category in categories"
              :key="category.id"
              class="settings-category-chip"
              :style="{ '--category-accent': themeColor(category.color_theme) }"
            >
              <i />
              <span>{{ languageStore.categoryName(category.name) }}</span>
              <button type="button" @click="toggleHidden(category)">
                {{ category.is_hidden ? languageStore.t('show') : languageStore.t('hide') }}
              </button>
              <button
                v-if="!category.is_default"
                class="delete-chip"
                type="button"
                @click="removeCategory(category)"
              >
                ×
              </button>
            </article>
          </div>
        </div>
      </section>

      <section class="settings-panel" :class="{ expanded: expandedPanel === 'badges' }">
        <button class="settings-panel-head" type="button" @click="togglePanel('badges')">
          <span class="settings-icon-badge"><SvgIcon :src="goalIcon" :size="17" /></span>
          <span class="settings-panel-title">{{ languageStore.t('earnedBadges') }}</span>
          <span v-if="expandedPanel !== 'badges'" class="settings-panel-summary">
            {{ badgeSummary }}
          </span>
          <SvgIcon class="settings-fold-icon" :src="foldIcon" :size="14" />
        </button>
        <div v-if="expandedPanel === 'badges'" class="settings-panel-body">
          <div v-if="earnedBadges.length > 0" class="settings-badge-list">
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
          <div v-else class="settings-empty">{{ languageStore.t('noEarnedBadges') }}</div>
        </div>
      </section>

      <section class="settings-panel" :class="{ expanded: expandedPanel === 'archived' }">
        <button class="settings-panel-head" type="button" @click="togglePanel('archived')">
          <span class="settings-icon-badge"><SvgIcon :src="archiveIcon" :size="17" /></span>
          <span class="settings-panel-title">{{ languageStore.t('archivedItems') }}</span>
          <span v-if="expandedPanel !== 'archived'" class="settings-panel-summary">
            {{ archivedSummary }}
          </span>
          <SvgIcon class="settings-fold-icon" :src="foldIcon" :size="14" />
        </button>
        <div v-if="expandedPanel === 'archived'" class="settings-panel-body compact-body">
          <div v-if="archivedItems.length === 0" class="settings-empty">
            {{ languageStore.t('archivedEmpty') }}
          </div>
          <template v-else>
            <article v-for="(item, index) in archivedItems" :key="item.id" class="settings-archive-row">
              <span v-if="index > 0" class="settings-divider" />
              <strong>{{ item.name }}</strong>
              <button
                type="button"
                :disabled="restoringId === item.id"
                @click="restoreArchivedItem(item)"
              >
                {{ languageStore.t('unarchive') }}
              </button>
            </article>
          </template>
        </div>
      </section>

      <section class="settings-panel" :class="{ expanded: expandedPanel === 'data' }">
        <button class="settings-panel-head" type="button" @click="togglePanel('data')">
          <span class="settings-icon-badge"><SvgIcon :src="noLimitIcon" :size="17" /></span>
          <span class="settings-panel-title">{{ languageStore.t('data') }}</span>
          <span v-if="expandedPanel !== 'data'" class="settings-panel-summary">
            {{ languageStore.t('settingsDataSummary') }}
          </span>
          <SvgIcon class="settings-fold-icon" :src="foldIcon" :size="14" />
        </button>
        <div v-if="expandedPanel === 'data'" class="settings-panel-body">
          <div class="settings-data-actions">
            <button type="button">{{ languageStore.t('export') }}</button>
            <button type="button">{{ languageStore.t('import') }}</button>
          </div>
        </div>
      </section>
    </section>
  </main>
</template>

<style>
.settings-page {
  width: min(430px, 100%);
  min-height: 100dvh;
  margin: 0 auto;
  background: var(--bg);
  padding: 0 0 28px;
}

.settings-topbar {
  position: sticky;
  z-index: 8;
  top: 0;
  display: grid;
  height: 56px;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  border-bottom: 1px solid var(--border);
  background: var(--bg);
  padding: 0 16px;
}

.settings-topbar h1 {
  grid-column: 2;
  margin: 0;
  color: var(--text);
  font-size: 17px;
  line-height: 22px;
  font-weight: 600;
}

.settings-back {
  justify-self: start;
  border-radius: 999px;
  color: var(--text);
  font-size: 24px;
  line-height: 1;
  padding: 4px 6px;
}

.settings-content {
  display: grid;
  gap: 8px;
  padding: 14px 12px 26px;
}

.settings-brand-block {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 2px 2px 13px;
}

.settings-logo {
  display: grid;
  width: 58px;
  height: 58px;
  flex: 0 0 auto;
  grid-template-columns: repeat(4, 7px);
  grid-auto-rows: 7px;
  place-content: center;
  gap: 4px;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: color-mix(in srgb, var(--surface-solid) 96%, transparent);
}

.settings-logo span {
  border-radius: 3px;
  background: color-mix(in srgb, var(--surface-soft) 88%, transparent);
}

.settings-logo span.lit {
  background: var(--accent);
}

.settings-logo span.dimmed {
  opacity: 0.72;
}

.settings-brand-copy {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.settings-brand-copy strong {
  color: var(--text);
  font-size: 17px;
  line-height: 21px;
  font-weight: 600;
}

.settings-brand-copy > span {
  color: var(--muted);
  font-size: 12px;
  line-height: 15px;
}

.settings-brand-copy em {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--muted);
  font-size: 11px;
  font-style: normal;
  line-height: 14px;
}

.settings-brand-copy i {
  display: grid;
  width: 15px;
  height: 15px;
  place-items: center;
  border: 1.2px solid color-mix(in srgb, var(--accent) 68%, transparent);
  border-radius: 999px;
  color: var(--accent);
  font-size: 9px;
  line-height: 1;
}

.settings-panel {
  display: grid;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: color-mix(in srgb, var(--surface-solid) 98%, transparent);
  padding: 8px 10px;
}

html[data-theme='dark'] .settings-panel,
html[data-theme='dark'] .settings-logo {
  background: rgba(18, 25, 35, 0.88);
}

.settings-panel-head {
  display: flex;
  width: 100%;
  min-width: 0;
  min-height: 44px;
  align-items: center;
  gap: 8px;
  border: 0;
  background: transparent;
  color: var(--text);
  padding: 0;
  text-align: left;
}

.settings-icon-badge {
  display: grid;
  width: 30px;
  height: 30px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 9px;
  background: color-mix(in srgb, var(--accent) 10%, transparent);
  color: var(--accent);
}

html[data-theme='dark'] .settings-icon-badge {
  background: color-mix(in srgb, var(--accent) 18%, transparent);
}

.settings-panel-title {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  color: var(--text);
  font-size: 14px;
  font-weight: 600;
  line-height: 18px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.settings-panel-summary {
  max-width: 132px;
  overflow: hidden;
  color: var(--muted);
  font-size: 11px;
  line-height: 15px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.settings-fold-icon {
  width: 18px;
  flex: 0 0 auto;
  color: var(--muted);
  transform: rotate(90deg);
  transition: transform 160ms ease;
}

.settings-panel.expanded .settings-fold-icon {
  transform: rotate(-90deg);
}

.settings-panel-body {
  display: grid;
  gap: 9px;
  border-top: 1px solid color-mix(in srgb, var(--border) 74%, transparent);
  margin-top: 8px;
  padding-top: 9px;
}

.compact-body {
  gap: 0;
}

.settings-field-label {
  color: var(--text);
  font-size: 12px;
  font-weight: 600;
  line-height: 16px;
}

.settings-page .segmented {
  display: flex;
  width: 100%;
  height: 35px;
  border-color: color-mix(in srgb, var(--border) 86%, transparent);
  border-radius: 11px;
  background: color-mix(in srgb, var(--surface-soft) 56%, transparent);
  padding: 2px;
}

.settings-page .segmented button {
  flex: 1;
  min-height: 29px;
  border: 1px solid transparent;
  border-radius: 9px;
  color: var(--muted);
  padding: 0 8px;
  font-size: 12px;
  font-weight: 500;
}

.settings-page .segmented button.active {
  border-color: color-mix(in srgb, var(--accent) 28%, transparent);
  background: color-mix(in srgb, var(--surface-solid) 96%, transparent);
  color: var(--accent);
  font-weight: 600;
}

.settings-switch-row {
  display: flex;
  min-height: 38px;
  align-items: center;
  gap: 12px;
  color: var(--text);
  font-size: 12px;
  line-height: 16px;
}

.settings-switch-row span {
  flex: 1;
}

.settings-switch-row input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.settings-switch-row i {
  position: relative;
  width: 44px;
  height: 26px;
  flex: 0 0 auto;
  border-radius: 999px;
  background: color-mix(in srgb, var(--muted) 18%, var(--surface-soft));
  transition: background-color 160ms ease;
}

.settings-switch-row i::after {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 20px;
  height: 20px;
  border-radius: 999px;
  background: #ffffff;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.12);
  content: '';
  transition: transform 160ms ease;
}

.settings-switch-row input:checked + i {
  background: var(--accent);
}

.settings-switch-row input:checked + i::after {
  transform: translateX(18px);
}

.settings-divider {
  display: block;
  height: 1px;
  background: color-mix(in srgb, var(--border) 74%, transparent);
}

.settings-category-create {
  display: grid;
  gap: 8px;
}

.settings-category-create input {
  width: 100%;
  min-height: 38px;
  border: 1px solid var(--border);
  border-radius: 11px;
  background: var(--surface-soft);
  color: var(--text);
  outline: none;
  padding: 0 12px;
  font-size: 12px;
}

.settings-color-dots {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.settings-color-dots button {
  width: 22px;
  height: 22px;
  border: 0;
  border-radius: 999px;
  background: var(--dot-color);
  box-shadow: inset 0 0 0 3px var(--surface-solid);
  padding: 0;
}

.settings-color-dots button.active {
  border: 1.8px solid var(--dot-color);
  box-shadow: inset 0 0 0 3px var(--surface-solid);
}

.settings-primary-button,
.settings-data-actions button {
  min-height: 34px;
  border: 0;
  border-radius: 11px;
  background: var(--accent);
  color: #ffffff;
  padding: 0 12px;
  font-size: 12px;
  font-weight: 600;
}

.settings-primary-button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.settings-category-list {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.settings-category-chip {
  display: inline-flex;
  max-width: 100%;
  align-items: center;
  gap: 6px;
  border: 1px solid color-mix(in srgb, var(--category-accent) 16%, transparent);
  border-radius: 13px;
  background: color-mix(in srgb, var(--category-accent) 8%, transparent);
  color: var(--text);
  padding: 6px 7px 6px 8px;
}

.settings-category-chip i {
  width: 8px;
  height: 8px;
  flex: 0 0 auto;
  border-radius: 999px;
  background: var(--category-accent);
}

.settings-category-chip span {
  overflow: hidden;
  max-width: 108px;
  font-size: 12px;
  line-height: 15px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.settings-category-chip button {
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: var(--muted);
  padding: 1px 3px;
  font-size: 11px;
  line-height: 14px;
}

.settings-category-chip .delete-chip {
  color: var(--danger);
  font-size: 15px;
  line-height: 15px;
}

.settings-badge-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.settings-empty {
  color: var(--muted);
  font-size: 11px;
  line-height: 15px;
  padding: 2px 0;
}

.settings-archive-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  min-height: 36px;
}

.settings-archive-row .settings-divider {
  grid-column: 1 / -1;
}

.settings-archive-row strong {
  overflow: hidden;
  color: var(--text);
  font-size: 13px;
  font-weight: 500;
  line-height: 17px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.settings-archive-row button {
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--accent);
  padding: 6px 4px;
  font-size: 12px;
}

.settings-data-actions {
  display: flex;
  gap: 8px;
}

.settings-data-actions button {
  flex: 1;
}

.settings-data-actions button + button {
  border: 1px solid color-mix(in srgb, var(--accent) 34%, var(--border));
  background: transparent;
  color: var(--accent);
}

@media (max-width: 360px) {
  .settings-panel-summary {
    max-width: 96px;
  }
}
</style>
