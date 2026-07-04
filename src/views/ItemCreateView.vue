<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { createItem } from '@/api/items'
import { createCategory, listCategories } from '@/api/categories'
import ItemForm from '@/components/ItemForm.vue'
import { useLanguageStore } from '@/stores/language'
import type { Category, CategoryPayload, ItemPayload } from '@/types'

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
  } catch {
    error.value = languageStore.t('createFailed')
  } finally {
    loading.value = false
  }
}

async function handleCreateCategory(payload: CategoryPayload) {
  const category = await createCategory(payload)
  categories.value = [...categories.value, category]
  return category
}

onMounted(load)
</script>

<template>
  <main class="form-page editor-page">
    <header class="screen-topbar editor-screen-topbar">
      <RouterLink class="back-link screen-topbar-left" to="/">←</RouterLink>
      <h1 class="screen-topbar-title">{{ languageStore.t('createItemTitle') }}</h1>
    </header>

    <section class="editor-stack">
      <p v-if="error" class="error">{{ error }}</p>
      <ItemForm
        :categories="categories"
        :loading="loading"
        :submit-label="languageStore.t('createItemSubmit')"
        :create-category="handleCreateCategory"
        @submit="submit"
      />
    </section>
  </main>
</template>

<style scoped>
.editor-page {
  padding-top: 18px;
}

.editor-screen-topbar {
  position: sticky;
  z-index: 18;
  top: 0;
  margin-bottom: 12px;
  background: var(--bg);
  padding: 8px 0;
}

.editor-stack {
  display: grid;
  gap: 10px;
}
</style>
