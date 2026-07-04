<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { archiveItem, deleteItem, fetchItem, unarchiveItem, updateItem } from '@/api/items'
import { createCategory, listCategories } from '@/api/categories'
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog.vue'
import ItemForm from '@/components/ItemForm.vue'
import { useLanguageStore } from '@/stores/language'
import type { Category, CategoryPayload, HeatmapDay, Item, ItemPayload } from '@/types'

const route = useRoute()
const router = useRouter()
const languageStore = useLanguageStore()
const itemId = Number(route.params.id)

const item = ref<Item | null>(null)
const heatmap = ref<HeatmapDay[]>([])
const categories = ref<Category[]>([])
const loading = ref(true)
const saving = ref(false)
const deleting = ref(false)
const archiving = ref(false)
const confirmOpen = ref(false)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [entry, cats] = await Promise.all([fetchItem(itemId), listCategories()])
    item.value = entry.item
    heatmap.value = entry.heatmap
    categories.value = cats
  } catch {
    error.value = languageStore.t('itemLoadFailed')
  } finally {
    loading.value = false
  }
}

async function handleCreateCategory(payload: CategoryPayload) {
  const category = await createCategory(payload)
  categories.value = [...categories.value, category]
  return category
}

async function submit(payload: ItemPayload) {
  saving.value = true
  error.value = ''
  try {
    item.value = await updateItem(itemId, payload)
    router.push('/')
  } catch {
    error.value = languageStore.t('saveFailed')
  } finally {
    saving.value = false
  }
}

async function confirmDelete() {
  deleting.value = true
  error.value = ''
  try {
    await deleteItem(itemId)
    router.push('/')
  } catch {
    error.value = languageStore.t('deleteFailed')
  } finally {
    deleting.value = false
  }
}

async function toggleArchive() {
  if (!item.value) {
    return
  }
  const shouldUnarchive = Boolean(item.value.archived_at)
  archiving.value = true
  error.value = ''
  try {
    item.value = shouldUnarchive ? await unarchiveItem(itemId) : await archiveItem(itemId)
    router.push(item.value.archived_at ? '/settings' : '/')
  } catch {
    error.value = languageStore.t(shouldUnarchive ? 'unarchiveFailed' : 'archiveFailed')
  } finally {
    archiving.value = false
  }
}

onMounted(load)
</script>

<template>
  <main class="form-page editor-page">
    <header class="screen-topbar editor-screen-topbar">
      <RouterLink class="back-link screen-topbar-left" to="/">←</RouterLink>
      <h1 class="screen-topbar-title">{{ languageStore.t('editItemTitle') }}</h1>
    </header>

    <div v-if="loading" class="loading">{{ languageStore.t('loading') }}</div>
    <section v-else class="editor-stack">
      <p v-if="error" class="error">{{ error }}</p>
      <ItemForm
        :item="item"
        :categories="categories"
        :heatmap="heatmap"
        :loading="saving"
        :submit-label="languageStore.t('save')"
        :is-editing="true"
        :archived="Boolean(item?.archived_at)"
        :create-category="handleCreateCategory"
        @submit="submit"
        @archive="toggleArchive"
        @delete="confirmOpen = true"
      />
    </section>

    <DeleteConfirmDialog
      :open="confirmOpen"
      :loading="deleting"
      :title="languageStore.t('deleteItemTitle')"
      :message="languageStore.t('deleteItemMessage')"
      @cancel="confirmOpen = false"
      @confirm="confirmDelete"
    />
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
