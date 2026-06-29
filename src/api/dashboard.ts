import { apiRequest } from './client'
import type { DashboardResponse } from '@/types'

export function fetchDashboard() {
  return apiRequest<DashboardResponse>('/dashboard')
}
