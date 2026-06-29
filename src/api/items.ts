import { apiRequest } from './client'
import type { Badge, Checkin, CheckinPayload, DashboardItem, Item, ItemPayload, SharePayload } from '@/types'

export function listItems(options: { archived?: boolean } = {}) {
  const query = options.archived ? '?archived=true' : ''
  return apiRequest<Item[]>(`/items${query}`)
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

export function archiveItem(id: number) {
  return apiRequest<Item>(`/items/${id}/archive`, {
    method: 'PATCH',
  })
}

export function unarchiveItem(id: number) {
  return apiRequest<Item>(`/items/${id}/unarchive`, {
    method: 'PATCH',
  })
}

export function fetchItemBadges(id: number) {
  return apiRequest<Badge[]>(`/items/${id}/badges`)
}

export function fetchItemShare(id: number) {
  return apiRequest<SharePayload>(`/items/${id}/share`)
}

export function listCheckins(itemId: number) {
  return apiRequest<Checkin[]>(`/items/${itemId}/checkins`)
}

export function createCheckin(itemId: number, payload: CheckinPayload = {}) {
  return apiRequest<DashboardItem>(`/items/${itemId}/checkins`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function deleteCheckin(itemId: number, checkinId: number) {
  return apiRequest<{ ok: boolean }>(`/items/${itemId}/checkins/${checkinId}`, {
    method: 'DELETE',
  })
}
