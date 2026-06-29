<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { createCheckin, fetchItem } from '@/api/items'
import CheckinButton from '@/components/CheckinButton.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'
import ContributionHeatmap from '@/components/ContributionHeatmap.vue'
import { useLanguageStore } from '@/stores/language'
import type { DashboardItem } from '@/types'
import { statusText } from '@/utils/status'

const route = useRoute()
const languageStore = useLanguageStore()
const itemId = Number(route.params.id)

const entry = ref<DashboardItem | null>(null)
const loading = ref(true)
const checking = ref(false)
const error = ref('')
const success = ref('')

const item = computed(() => entry.value?.item)

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
    entry.value = await fetchItem(itemId)
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
    entry.value = await createCheckin(itemId)
    success.value = languageStore.t('checkinSuccess', { count: entry.value.stats.current_streak })
  } catch (err) {
    error.value = err instanceof Error ? err.message : languageStore.t('checkinFailed')
  } finally {
    checking.value = false
  }
}

onMounted(load)
</script>

<template>
  <main class="checkin-page">
    <header class="topbar checkin-topbar">
      <RouterLink class="button secondary" to="/">{{ languageStore.t('backHome') }}</RouterLink>
      <!-- <ThemeToggle /> -->
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

      <div class="checkin-meta">
        <span>{{ statusText(entry.status, languageStore.preference) }}</span>
        <span>{{ timeHint }}</span>
        <span>{{ languageStore.t('streakDays', { count: entry.stats.current_streak }) }}</span>
      </div>

      <p v-if="success" class="success">{{ success }}</p>
      <p v-if="error" class="error">{{ error }}</p>

      <div class="mini-heatmap card">
        <ContributionHeatmap :values="entry.heatmap" :color-theme="item.color_theme" />
      </div>
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
</style>
