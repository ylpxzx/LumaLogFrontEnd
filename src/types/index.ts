export type ThemePreference = 'system' | 'light' | 'dark'
export type LanguagePreference = 'zh' | 'en'
export type DashboardViewMode = 'all' | 'category'
export type TimeMode = 'all_day' | 'time_range'
export type CheckinStatus =
  | 'available'
  | 'not_started'
  | 'ended'
  | 'before_time_window'
  | 'after_time_window'
  | 'completed'
  | 'completed_can_continue'
  | 'archived'
  | 'deleted'

export interface User {
  id: number
  email: string
  display_name: string
  theme_preference: ThemePreference
  language_preference: LanguagePreference
  dashboard_view_mode: DashboardViewMode
  show_today_status: boolean
  show_current_streak: boolean
  show_longest_streak: boolean
  show_completion_rate: boolean
  show_total_checkins: boolean
  created_at: string
  updated_at: string
}

export interface StatsVisibility {
  show_current_streak: boolean
  show_longest_streak: boolean
  show_completion_rate: boolean
  show_total_checkins: boolean
}

export interface Category {
  id: number
  user_id: number
  name: string
  slug: string
  color_theme: string
  sort_order: number
  is_default: boolean
  is_hidden: boolean
  created_at: string
  updated_at: string
}

export interface Item {
  id: number
  user_id: number
  category_id: number
  category_name: string
  icon_key?: string
  name: string
  description: string
  color_theme: string
  start_date: string
  end_date: string
  is_unlimited: boolean
  daily_target_count: number
  time_mode: TimeMode
  valid_start_time: string
  valid_end_time: string
  allow_makeup: boolean
  makeup_monthly_limit: number
  makeup_limit_days?: number
  allow_extra_checkins: boolean
  show_on_dashboard: boolean
  sort_order: number
  archived_at: string
  created_at: string
  updated_at: string
}

export interface HeatmapDay {
  date: string
  count: number
  level: number
  completed: boolean
}

export interface ItemStats {
  current_streak: number
  longest_streak: number
  total_checkins: number
  completed_days: number
  expected_days: number
  completion_rate: number
}

export interface DashboardItem {
  item: Item
  stats: ItemStats
  heatmap: HeatmapDay[]
  today_count: number
  status: CheckinStatus
}

export interface DashboardResponse {
  user: User
  categories: Category[]
  items: DashboardItem[]
}

export interface AuthResponse {
  token: string
  user: User
  categories?: Category[]
}

export interface ItemPayload {
  category_id?: number
  icon_key?: string
  name?: string
  description?: string
  color_theme?: string
  start_date?: string
  end_date?: string
  is_unlimited?: boolean
  daily_target_count?: number
  time_mode?: TimeMode
  valid_start_time?: string
  valid_end_time?: string
  allow_makeup?: boolean
  makeup_monthly_limit?: number
  makeup_limit_days?: number
  allow_extra_checkins?: boolean
  show_on_dashboard?: boolean
  sort_order?: number
}

export interface CategoryPayload {
  name?: string
  color_theme?: string
  sort_order?: number
  is_hidden?: boolean
}

export interface Checkin {
  id: number
  user_id: number
  item_id: number
  checkin_date: string
  checkin_time: string
  count: number
  note: string
  source: string
  created_at: string
}

export interface CheckinPayload {
  count?: number
  note?: string
  source?: 'normal' | 'makeup'
  checkin_date?: string
}

export interface Badge {
  id: string
  title: string
  description: string
  level: 'bronze' | 'silver' | 'gold' | string
  earned: boolean
}

export interface SharePayload {
  item: Item
  stats: ItemStats
  heatmap: HeatmapDay[]
  today_count: number
  badges: Badge[]
}
