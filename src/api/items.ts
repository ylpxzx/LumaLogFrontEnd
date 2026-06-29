import { apiRequest } from './client'
import type { Checkin, DashboardItem, Item, ItemPayload } from '@/types'

export function listItems() {
  return apiRequest<Item[]>('/items')
}

export function createItem(payload: ItemPayload) {
  return apiRequest<Item>('/items', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function fetchItem(id: number) {
  return apiRequest<DashboardItem>(`/items/${id}`)
}

export function updateItem(id: number, payload: ItemPayload) {
  return apiRequest<Item>(`/items/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function deleteItem(id: number) {
  return apiRequest<{ ok: boolean }>(`/items/${id}`, {
    method: 'DELETE',
  })
}

export function listCheckins(itemId: number) {
  return apiRequest<Checkin[]>(`/items/${itemId}/checkins`)
}

export function createCheckin(itemId: number, payload: { count?: number; note?: string } = {}) {
  return apiRequest<DashboardItem>(`/items/${itemId}/checkins`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
