<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { createCategory, deleteCategory, listCategories, updateCategory } from '@/api/categories'
import DashboardViewModeToggle from '@/components/DashboardViewModeToggle.vue'
import LanguageToggle from '@/components/LanguageToggle.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'
import ColorThemePicker from '@/components/ColorThemePicker.vue'
import { useAuthStore } from '@/stores/auth'
import { useLanguageStore } from '@/stores/language'
import { themeColor } from '@/utils/colors'
import type { Category, DashboardViewMode } from '@/types'

const authStore = useAuthStore()
const languageStore = useLanguageStore()
const router = useRouter()

const categories = ref<Category[]>([])
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const newCategoryName = ref('')
const newCategoryColor = ref('green')
const viewMode = ref<DashboardViewMode>('all')
const showTodayStatus = ref(false)
const showCurrentStreak = ref(false)
const showLongestStreak = ref(false)
const showCompletionRate = ref(false)
const showTotalCheckins = ref(false)

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
    categories.value = await listCategories(true)
  } catch (err) {
    error.value = err instanceof Error ? err.message : languageStore.t('settingsLoadFailed')
  } finally {
    loading.value = false
  }
}

async function saveMode(next: DashboardViewMode) {
  viewMode.value = next
  await authStore.savePreferences({ dashboard_view_mode: next })
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
  } catch (err) {
    error.value = err instanceof Error ? err.message : languageStore.t('statsSaveFailed')
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
  } catch (err) {
    error.value = err instanceof Error ? err.message : languageStore.t('categoryCreateFailed')
  } finally {
    saving.value = false
  }
}

async function toggleHidden(category: Category) {
  error.value = ''
  try {
    await updateCategory(category.id, { is_hidden: !category.is_hidden })
    categories.value = await listCategories(true)
  } catch (err) {
    error.value = err instanceof Error ? err.message : languageStore.t('categoryUpdateFailed')
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
  } catch (err) {
    error.value = err instanceof Error ? err.message : languageStore.t('categoryDeleteFailed')
  }
}

function logout() {
  authStore.logout()
  router.push('/login')
}

onMounted(load)
</script>

<template>
  <main class="form-page">
    <header class="topbar">
      <div class="title-block">
        <h1>{{ languageStore.t('settingsTitle') }}</h1>
        <p>{{ languageStore.t('settingsSubtitle') }}</p>
      </div>
      <RouterLink class="button secondary" to="/">{{ languageStore.t('backHome') }}</RouterLink>
    </header>

    <div v-if="loading" class="loading">{{ languageStore.t('loading') }}</div>

    <section v-else class="settings-stack">
      <p v-if="error" class="error">{{ error }}</p>

      <section class="form-panel">
        <h2>{{ languageStore.t('display') }}</h2>
        <div class="settings-row">
          <span>{{ languageStore.t('language') }}</span>
          <LanguageToggle />
        </div>
        <div class="settings-row">
          <span>{{ languageStore.t('theme') }}</span>
          <ThemeToggle />
        </div>
        <div class="settings-row">
          <span>{{ languageStore.t('dashboardMode') }}</span>
          <DashboardViewModeToggle :model-value="viewMode" @update:model-value="saveMode" />
        </div>
      </section>

      <section class="form-panel">
        <h2>{{ languageStore.t('dashboardDisplayItems') }}</h2>
        <div class="toggle-grid">
          <label class="checkbox-row">
            <input v-model="showTodayStatus" type="checkbox" @change="saveStatsVisibility" />
            {{ languageStore.t('todayStatus') }}
          </label>
          <label class="checkbox-row">
            <input v-model="showCurrentStreak" type="checkbox" @change="saveStatsVisibility" />
            {{ languageStore.t('currentStreak') }}
          </label>
          <label class="checkbox-row">
            <input v-model="showLongestStreak" type="checkbox" @change="saveStatsVisibility" />
            {{ languageStore.t('longestStreak') }}
          </label>
          <label class="checkbox-row">
            <input v-model="showCompletionRate" type="checkbox" @change="saveStatsVisibility" />
            {{ languageStore.t('completionRate') }}
          </label>
          <label class="checkbox-row">
            <input v-model="showTotalCheckins" type="checkbox" @change="saveStatsVisibility" />
            {{ languageStore.t('totalCheckins') }}
          </label>
        </div>
      </section>

      <section class="form-panel">
        <h2>{{ languageStore.t('categories') }}</h2>
        <form class="category-create" @submit.prevent="addCategory">
          <input
            v-model="newCategoryName"
            class="input"
            :placeholder="languageStore.t('newCategoryName')"
          />
          <ColorThemePicker v-model="newCategoryColor" />
          <button class="button" type="submit" :disabled="saving">
            {{ languageStore.t('addCategory') }}
          </button>
        </form>

        <div class="category-list">
          <article v-for="category in categories" :key="category.id" class="category-item">
            <div>
              <span
                class="category-color"
                :style="{ '--category-color': themeColor(category.color_theme) }"
              />
              <strong>{{ languageStore.categoryName(category.name) }}</strong>
              <small>{{
                category.is_default
                  ? languageStore.t('defaultCategory')
                  : languageStore.t('customCategory')
              }}</small>
            </div>
            <div class="topbar-actions">
              <button class="button secondary" type="button" @click="toggleHidden(category)">
                {{ category.is_hidden ? languageStore.t('show') : languageStore.t('hide') }}
              </button>
              <button
                class="button danger"
                type="button"
                :disabled="category.is_default"
                @click="removeCategory(category)"
              >
                {{ languageStore.t('delete') }}
              </button>
            </div>
          </article>
        </div>
      </section>

      <section class="form-panel">
        <h2>{{ languageStore.t('account') }}</h2>
        <div class="settings-row">
          <span>{{ languageStore.t('logoutCurrent') }}</span>
          <button class="button danger" type="button" @click="logout">
            {{ languageStore.t('logout') }}
          </button>
        </div>
      </section>
    </section>
  </main>
</template>

<style scoped>
.settings-stack {
  display: grid;
  gap: 16px;
}

h2 {
  margin: 0 0 14px;
  font-size: 20px;
}

.settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 12px 0;
  border-top: 1px solid var(--border);
}

.settings-row:first-of-type {
  border-top: 0;
}

.category-create {
  display: grid;
  gap: 12px;
  margin-bottom: 18px;
}

.toggle-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px 16px;
}

.category-list {
  display: grid;
  gap: 10px;
}

.category-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 12px;
}

.category-item > div:first-child {
  display: flex;
  align-items: center;
  gap: 9px;
}

.category-item small {
  color: var(--muted);
}

@media (max-width: 720px) {
  .settings-row,
  .category-item {
    align-items: flex-start;
    flex-direction: column;
  }

  .toggle-grid {
    grid-template-columns: 1fr;
  }
}
</style>
