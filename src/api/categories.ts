import { apiRequest } from './client'
import type { Category, CategoryPayload } from '@/types'

export function listCategories(includeHidden = false) {
  return apiRequest<Category[]>(`/categories${includeHidden ? '?include_hidden=true' : ''}`)
}

export function createCategory(payload: CategoryPayload) {
  return apiRequest<Category>('/categories', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateCategory(id: number, payload: CategoryPayload) {
  return apiRequest<Category>(`/categories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function deleteCategory(id: number) {
  return apiRequest<{ ok: boolean }>(`/categories/${id}`, {
    method: 'DELETE',
  })
}
