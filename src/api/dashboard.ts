import { apiRequest } from './client'
import type { Badge, DashboardResponse } from '@/types'

export function fetchDashboard() {
  return apiRequest<DashboardResponse>('/dashboard')
}

export function fetchBadges() {
  return apiRequest<Badge[]>('/badges')
}
