import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { clearToken, setToken } from '@/api/client'
import { fetchMe, login as loginApi, register as registerApi, updatePreferences } from '@/api/auth'
import type {
  DashboardViewMode,
  LanguagePreference,
  StatsVisibility,
  ThemePreference,
  User,
} from '@/types'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const token = ref(localStorage.getItem('lumalog_token'))
  const loading = ref(false)

  const isAuthenticated = computed(() => Boolean(token.value))

  function setSession(nextToken: string, nextUser: User) {
    token.value = nextToken
    user.value = nextUser
    setToken(nextToken)
  }

  async function login(email: string, password: string) {
    loading.value = true
    try {
      const response = await loginApi({ email, password })
      setSession(response.token, response.user)
      return response
    } finally {
      loading.value = false
    }
  }

  async function register(email: string, password: string, displayName: string) {
    loading.value = true
    try {
      const response = await registerApi({
        email,
        password,
        display_name: displayName,
      })
      setSession(response.token, response.user)
      return response
    } finally {
      loading.value = false
    }
  }

  async function loadMe() {
    if (!token.value) {
      return null
    }
    user.value = await fetchMe()
    return user.value
  }

  async function savePreferences(payload: {
    theme_preference?: ThemePreference
    language_preference?: LanguagePreference
    dashboard_view_mode?: DashboardViewMode
    show_today_status?: boolean
  } & Partial<StatsVisibility>) {
    user.value = await updatePreferences(payload)
    return user.value
  }

  function logout() {
    user.value = null
    token.value = null
    clearToken()
  }

  return {
    user,
    token,
    loading,
    isAuthenticated,
    login,
    register,
    loadMe,
    savePreferences,
    logout,
  }
})
