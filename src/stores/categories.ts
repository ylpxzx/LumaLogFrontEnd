import { ref } from 'vue'
import { defineStore } from 'pinia'
import { listCategories } from '@/api/categories'
import type { Category } from '@/types'

export const useCategoriesStore = defineStore('categories', () => {
  const categories = ref<Category[]>([])
  const loading = ref(false)

  async function load(includeHidden = false) {
    loading.value = true
    try {
      categories.value = await listCategories(includeHidden)
      return categories.value
    } finally {
      loading.value = false
    }
  }

  return {
    categories,
    loading,
    load,
  }
})
