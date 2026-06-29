const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://192.168.31.215:8080/api'

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export function getToken() {
  return localStorage.getItem('lumalog_token')
}

export function setToken(token: string) {
  localStorage.setItem('lumalog_token', token)
}

export function clearToken() {
  localStorage.removeItem('lumalog_token')
}

function defaultErrorMessage() {
  return localStorage.getItem('lumalog_language') === 'en' ? 'Request failed' : '请求失败'
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  const token = getToken()

  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json')
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    let message = defaultErrorMessage()
    try {
      const body = (await response.json()) as { error?: string }
      if (body.error) {
        message = body.error
      }
    } catch {
      message = response.statusText || message
    }
    throw new ApiError(message, response.status)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}
