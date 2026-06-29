<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { fetchDashboard } from '@/api/dashboard'
import ItemCard from '@/components/ItemCard.vue'
import { useAuthStore } from '@/stores/auth'
import { useLanguageStore } from '@/stores/language'
import { useThemeStore } from '@/stores/theme'
import { themeColor } from '@/utils/colors'
import type { Category, DashboardItem, DashboardViewMode } from '@/types'
import logoUrl from '@/assets/lumalog-logo.svg'

const authStore = useAuthStore()
const languageStore = useLanguageStore()
const themeStore = useThemeStore()

const loading = ref(true)
const error = ref('')
const items = ref<DashboardItem[]>([])
const categories = ref<Category[]>([])
const viewMode = ref<DashboardViewMode>('all')

const groupedItems = computed(() => {
  return categories.value
    .map((category) => ({
      category,
      items: items.value.filter((entry) => entry.item.category_id === category.id),
    }))
    .filter((group) => group.items.length > 0)
})

const statsVisibility = computed(() => {
  const user = authStore.user
  return {
    show_current_streak: user?.show_current_streak ?? false,
    show_longest_streak: user?.show_longest_streak ?? false,
    show_completion_rate: user?.show_completion_rate ?? false,
    show_total_checkins: user?.show_total_checkins ?? false,
  }
})

const showTodayStatus = computed(() => authStore.user?.show_today_status ?? false)

async function loadDashboard() {
  loading.value = true
  error.value = ''
  try {
    const data = await fetchDashboard()
    authStore.user = data.user
    categories.value = data.categories
    items.value = data.items
    viewMode.value = data.user.dashboard_view_mode
    if (data.user.language_preference) {
      languageStore.setLanguage(data.user.language_preference)
    }
    themeStore.setTheme(data.user.theme_preference)
  } catch (err) {
    error.value = err instanceof Error ? err.message : languageStore.t('dashboardLoadFailed')
  } finally {
    loading.value = false
  }
}

onMounted(loadDashboard)
</script>

<template>
  <main class="page">
    <header class="topbar">
      <div class="title-block">
        <img class="dashboard-logo" :src="logoUrl" alt="LumaLog" />
      </div>

      <div class="topbar-actions">
        <RouterLink
          class="icon-button"
          to="/settings"
          :title="languageStore.t('settings')"
          :aria-label="languageStore.t('settings')"
        >
          ⚙
        </RouterLink>
      </div>
    </header>

    <RouterLink
      class="floating-create"
      to="/items/new"
      :title="languageStore.t('createItem')"
      :aria-label="languageStore.t('createItem')"
    >
      +
    </RouterLink>

    <p v-if="error" class="error">{{ error }}</p>
    <div v-else-if="loading" class="loading">{{ languageStore.t('loading') }}</div>

    <section v-else-if="items.length === 0" class="empty-state">
      <div>
        <p>{{ languageStore.t('emptyItems') }}</p>
        <RouterLink class="button" to="/items/new">{{ languageStore.t('createFirst') }}</RouterLink>
      </div>
    </section>

    <section v-else-if="viewMode === 'all'" class="item-grid">
      <ItemCard
        v-for="entry in items"
        :key="entry.item.id"
        :entry="entry"
        :show-today-status="showTodayStatus"
        :stats-visibility="statsVisibility"
      />
    </section>

    <section v-else>
      <div v-for="group in groupedItems" :key="group.category.id" class="category-section">
        <div class="category-heading">
          <span
            class="category-color"
            :style="{ '--category-color': themeColor(group.category.color_theme) }"
          />
          <span>{{ languageStore.categoryName(group.category.name) }}</span>
          <span>{{ languageStore.t('itemCount', { count: group.items.length }) }}</span>
        </div>
        <div class="item-grid">
          <ItemCard
            v-for="entry in group.items"
            :key="entry.item.id"
            :entry="entry"
            :show-today-status="showTodayStatus"
            :stats-visibility="statsVisibility"
          />
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.dashboard-logo {
  display: block;
  width: min(190px, 54vw);
  height: auto;
}

@media (max-width: 520px) {
  .dashboard-logo {
    width: min(190px, 58vw);
  }
}
</style>
