<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { createItem } from '@/api/items'
import { listCategories } from '@/api/categories'
import ItemForm from '@/components/ItemForm.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'
import { useLanguageStore } from '@/stores/language'
import type { Category, ItemPayload } from '@/types'

const router = useRouter()
const languageStore = useLanguageStore()
const categories = ref<Category[]>([])
const loading = ref(false)
const error = ref('')

async function load() {
  categories.value = await listCategories()
}

async function submit(payload: ItemPayload) {
  loading.value = true
  error.value = ''
  try {
    await createItem(payload)
    router.push('/')
  } catch (err) {
    error.value = err instanceof Error ? err.message : languageStore.t('createFailed')
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <main class="form-page">
    <header class="topbar">
      <div class="title-block">
        <h1>{{ languageStore.t('createItemTitle') }}</h1>
        <p>{{ languageStore.t('createItemSubtitle') }}</p>
      </div>
      <div class="topbar-actions">
        <!-- <ThemeToggle /> -->
        <RouterLink class="button secondary" to="/">{{ languageStore.t('backHome') }}</RouterLink>
      </div>
    </header>

    <section class="form-panel">
      <p v-if="error" class="error">{{ error }}</p>
      <ItemForm
        :categories="categories"
        :loading="loading"
        :submit-label="languageStore.t('createItemSubmit')"
        @submit="submit"
      />
    </section>
  </main>
</template>
