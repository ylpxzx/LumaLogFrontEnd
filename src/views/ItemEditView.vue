<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { archiveItem, deleteItem, fetchItem, unarchiveItem, updateItem } from '@/api/items'
import { listCategories } from '@/api/categories'
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog.vue'
import ItemForm from '@/components/ItemForm.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'
import { useLanguageStore } from '@/stores/language'
import type { Category, Item, ItemPayload } from '@/types'

const route = useRoute()
const router = useRouter()
const languageStore = useLanguageStore()
const itemId = Number(route.params.id)

const item = ref<Item | null>(null)
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
    categories.value = cats
  } catch (err) {
    error.value = err instanceof Error ? err.message : languageStore.t('itemLoadFailed')
  } finally {
    loading.value = false
  }
}

async function submit(payload: ItemPayload) {
  saving.value = true
  error.value = ''
  try {
    item.value = await updateItem(itemId, payload)
    router.push('/')
  } catch (err) {
    error.value = err instanceof Error ? err.message : languageStore.t('saveFailed')
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
  } catch (err) {
    error.value = err instanceof Error ? err.message : languageStore.t('deleteFailed')
  } finally {
    deleting.value = false
  }
}

async function toggleArchive() {
  if (!item.value) {
    return
  }
  archiving.value = true
  error.value = ''
  try {
    item.value = item.value.archived_at ? await unarchiveItem(itemId) : await archiveItem(itemId)
    router.push(item.value.archived_at ? '/settings' : '/')
  } catch (err) {
    error.value = err instanceof Error
      ? err.message
      : item.value.archived_at
        ? languageStore.t('unarchiveFailed')
        : languageStore.t('archiveFailed')
  } finally {
    archiving.value = false
  }
}

onMounted(load)
</script>

<template>
  <main class="form-page">
    <header class="topbar">
      <div class="title-block">
        <h1>{{ languageStore.t('editItemTitle') }}</h1>
        <p>{{ languageStore.t('editItemSubtitle') }}</p>
      </div>
      <div class="topbar-actions">
        <!-- <ThemeToggle /> -->
        <RouterLink class="button secondary" to="/">{{ languageStore.t('backHome') }}</RouterLink>
      </div>
    </header>

    <div v-if="loading" class="loading">{{ languageStore.t('loading') }}</div>
    <section v-else class="form-panel">
      <p v-if="error" class="error">{{ error }}</p>
      <ItemForm
        :item="item"
        :categories="categories"
        :loading="saving"
        :submit-label="languageStore.t('saveChanges')"
        @submit="submit"
      />

      <div class="danger-zone">
        <button class="button secondary" type="button" :disabled="archiving" @click="toggleArchive">
          {{ item?.archived_at ? languageStore.t('unarchive') : languageStore.t('archive') }}
        </button>
        <button class="button danger" type="button" @click="confirmOpen = true">
          {{ languageStore.t('deleteItem') }}
        </button>
      </div>
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
