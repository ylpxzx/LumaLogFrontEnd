<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { fetchDashboard } from '@/api/dashboard'
import ItemCard from '@/components/ItemCard.vue'
import { useAuthStore } from '@/stores/auth'
import { useLanguageStore } from '@/stores/language'
import { useThemeStore } from '@/stores/theme'
import { themeColor } from '@/utils/colors'
import type { Category, DashboardItem, DashboardViewMode } from '@/types'

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
  } catch {
    error.value = languageStore.t('dashboardLoadFailed')
  } finally {
    loading.value = false
  }
}

onMounted(loadDashboard)
</script>

<template>
  <main class="page dashboard-page">
    <header class="topbar">
      <div class="title-block">
        <div class="dashboard-logo" aria-label="LumaLog" role="img">
          <span class="logo-mark" aria-hidden="true">
            <span
              v-for="index in 42"
              :key="index"
              class="logo-dot"
              :class="{
                dim: ![6, 11, 12, 16, 22, 26, 27, 31, 37, 42].includes(index),
                strong: [6, 12, 22, 27, 37].includes(index),
              }"
            />
            <svg class="logo-streak" viewBox="0 0 58 58" aria-hidden="true">
              <path
                d="M12.5 53.1C18.52 48.47 25.62 34.27 32.72 30.72C39.11 27.17 40.53 15.81 48 10.5"
              />
              <circle class="logo-streak-dot-outer" cx="48" cy="10.5" r="3.4" />
              <circle class="logo-streak-dot-inner" cx="48" cy="10.5" r="1.5" />
            </svg>
          </span>
          <span class="logo-copy">
            <span class="logo-word">Luma<span>Log</span></span>
            <span class="logo-signature">
              <i />
              <i />
              <i />
              <span>{{ languageStore.t('brandTagline') }}</span>
            </span>
          </span>
        </div>
      </div>

      <div class="topbar-actions">
        <RouterLink
          class="icon-button"
          to="/settings"
          :title="languageStore.t('settings')"
          :aria-label="languageStore.t('settings')"
        >
          <span class="settings-glyph">⚙</span>
        </RouterLink>
      </div>
    </header>

    <section
      class="dashboard-intro app-card"
      :class="{ 'is-dark-transparent': themeStore.resolvedTheme === 'dark' }"
    >
      <div class="intro-heatmap" aria-hidden="true">
        <span
          v-for="index in 16"
          :key="index"
          :class="{ lit: [1, 2, 6, 7, 11, 13].includes(index) }"
        />
      </div>
      <div class="intro-copy">
        <strong>{{ languageStore.t('brandTagline') }}</strong>
        <span>{{ languageStore.t('dashboardIntroSubtitle') }}</span>
      </div>
      <div class="intro-legend">
        <span><i class="legend-lit" />{{ languageStore.t('checked') }}</span>
        <span><i class="legend-muted" />{{ languageStore.t('unchecked') }}</span>
        <span><i class="legend-empty" />{{ languageStore.t('noData') }}</span>
      </div>
    </section>

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

    <section v-if="!loading && !error && items.length === 0" class="empty-state">
      <div>
        <p>{{ languageStore.t('emptyItems') }}</p>
        <RouterLink class="button" to="/items/new">{{ languageStore.t('createFirst') }}</RouterLink>
      </div>
    </section>

    <section v-else-if="!loading && !error && viewMode === 'all'" class="item-grid">
      <ItemCard
        v-for="entry in items"
        :key="entry.item.id"
        :entry="entry"
        :show-today-status="showTodayStatus"
        :stats-visibility="statsVisibility"
      />
    </section>

    <section v-else-if="!loading && !error">
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
.page.dashboard-page {
  width: min(543px, calc(100% - 48px));
  padding-top: 34px;
}

.dashboard-page .topbar {
  margin-bottom: 22px;
}

.dashboard-page .icon-button {
  width: 48px;
  height: 48px;
  border-color: rgba(226, 232, 240, 0.68);
  /* background: rgba(255, 255, 255, 0.82); */
  color: #64748b;
}

:global(:root[data-theme='dark']) .dashboard-page .icon-button {
  border-color: rgba(148, 163, 184, 0.18);
  background: rgba(18, 25, 35, 0.86);
  color: #94a3b8;
}

.dashboard-page .icon-button:hover {
  border-color: color-mix(in srgb, var(--accent) 32%, var(--border-strong));
  background: var(--surface-solid);
}

.settings-glyph {
  display: block;
  transform: translateY(-1px);
  font-size: 20px;
  line-height: 1;
}

.dashboard-logo {
  display: inline-flex;
  width: min(220px, 58vw);
  align-items: center;
  gap: 10px;
  color: var(--text);
}

.logo-mark {
  position: relative;
  display: grid;
  width: 58px;
  height: 58px;
  flex: 0 0 58px;
  grid-template-columns: repeat(6, 5px);
  grid-template-rows: repeat(7, 5px);
  place-content: center;
  gap: 2.1px;
  overflow: hidden;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 14px;
  background:
    radial-gradient(circle at 72% 24%, rgba(134, 239, 172, 0.38), transparent 42%),
    linear-gradient(135deg, #172033 0%, #101827 56%, #0b111b 100%);
}

:global(:root[data-theme='dark']) .logo-mark {
  border-color: rgba(148, 163, 184, 0.18);
  background:
    radial-gradient(circle at 72% 24%, rgba(74, 222, 128, 0.24), transparent 44%),
    linear-gradient(135deg, #243244 0%, #151f2d 55%, #0b111b 100%);
}

.logo-dot {
  border-radius: 999px;
  background: rgba(74, 222, 128, 0.88);
}

.logo-dot.dim {
  background: #263244;
}

:global(:root[data-theme='dark']) .logo-dot.dim {
  background: #334155;
}

.logo-dot.strong {
  background: #bbf7d0;
}

.logo-streak {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.logo-streak path {
  fill: none;
  stroke: #5eead4;
  stroke-linecap: round;
  stroke-width: 2;
}

.logo-streak-dot-outer {
  fill: #dcfce7;
}

.logo-streak-dot-inner {
  fill: #16a34a;
}

.logo-copy {
  display: grid;
  min-width: 0;
  gap: 6px;
}

.logo-word {
  color: var(--text);
  font-size: 28px;
  font-weight: 800;
  line-height: 29px;
  letter-spacing: 0;
  white-space: nowrap;
}

.logo-word span {
  color: #16a34a;
}

.logo-signature {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--muted);
  font-size: 9px;
  font-weight: 700;
  line-height: 10px;
  white-space: nowrap;
}

.logo-signature i {
  width: 6px;
  height: 6px;
  border-radius: 1.5px;
}

.logo-signature i:nth-child(1) {
  background: #14b8a6;
}

.logo-signature i:nth-child(2) {
  background: #22c55e;
}

.logo-signature i:nth-child(3) {
  background: #bbf7d0;
}

.dashboard-intro {
  display: flex;
  min-height: 86px;
  align-items: center;
  gap: 14px;
  margin-bottom: 24px;
  border-radius: 22px;
  background: linear-gradient(90deg, rgba(239, 251, 247, 0.98), rgba(247, 254, 251, 0.98));
  padding: 14px 18px;
}

:global(html[data-theme='dark']) .dashboard-intro,
:global(html[data-theme='dark']) .dashboard-intro.app-card {
  border-color: rgba(148, 163, 184, 0.18);
  background: transparent;
}

.dashboard-intro.is-dark-transparent {
  background: transparent !important;
  background-color: transparent !important;
  background-image: none !important;
}

.intro-heatmap {
  display: grid;
  width: 74px;
  height: 58px;
  flex: 0 0 auto;
  grid-template-columns: repeat(4, 10px);
  grid-auto-rows: 10px;
  place-content: center;
  gap: 7px;
  border-radius: 18px;
  background: color-mix(in srgb, var(--accent) 8%, transparent);
}

.intro-heatmap span {
  border-radius: 3px;
  background: #d9e4f3;
}

:global(:root[data-theme='dark']) .intro-heatmap span {
  background: color-mix(in srgb, var(--surface-soft) 82%, transparent);
}

.intro-heatmap span.lit {
  background: var(--accent);
}

.intro-copy {
  display: grid;
  min-width: 0;
  flex: 1;
  gap: 4px;
}

.intro-copy strong {
  overflow: hidden;
  color: var(--text);
  font-size: 13px;
  line-height: 19px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.intro-copy span {
  overflow: hidden;
  color: var(--muted);
  font-size: 10px;
  line-height: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.intro-legend {
  display: grid;
  gap: 6px;
}

.intro-legend span {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--muted);
  font-size: 11px;
  line-height: 13px;
  white-space: nowrap;
}

.intro-legend i {
  width: 18px;
  height: 7px;
  border-radius: 999px;
}

.legend-lit {
  background: var(--accent);
}

.legend-muted {
  background: #d9e4f3;
}

.legend-empty {
  background: var(--surface-soft);
}

@media (max-width: 520px) {
  .page.dashboard-page {
    width: min(543px, calc(100% - 32px));
  }

  .dashboard-logo {
    width: min(212px, 58vw);
    gap: 9px;
  }

  .logo-mark {
    width: 56px;
    height: 56px;
    flex-basis: 56px;
  }

  .logo-word {
    font-size: 26px;
    line-height: 27px;
  }

  .dashboard-intro {
    gap: 12px;
    padding: 14px 13px;
  }

  .intro-legend span {
    gap: 6px;
    font-size: 10px;
  }
}

@media (max-width: 360px) {
  .intro-legend {
    display: none;
  }
}
</style>
