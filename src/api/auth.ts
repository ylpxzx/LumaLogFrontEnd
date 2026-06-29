import { apiRequest } from './client'
import type { AuthResponse, DashboardViewMode, LanguagePreference, ThemePreference, User } from '@/types'

export function register(payload: {
  email: string
  password: string
  display_name: string
}) {
  return apiRequest<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function login(payload: { email: string; password: string }) {
  return apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function fetchMe() {
  return apiRequest<User>('/me')
}

export function updatePreferences(payload: {
  theme_preference?: ThemePreference
  language_preference?: LanguagePreference
  dashboard_view_mode?: DashboardViewMode
  show_today_status?: boolean
  show_current_streak?: boolean
  show_longest_streak?: boolean
  show_completion_rate?: boolean
  show_total_checkins?: boolean
}) {
  return apiRequest<User>('/me/preferences', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}
