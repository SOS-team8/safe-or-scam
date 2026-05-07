import axios, {
  AxiosHeaders,
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios'

import { useAuthStore } from '@/features/auth/store'

const REQUEST_TIMEOUT_MS = 10_000
const AUTH_REFRESH_PATH = '/api/v1/auth/refresh'
const PUBLIC_AUTH_PATHS = [
  '/api/v1/auth/email/send',
  '/api/v1/auth/email/verify',
  '/api/v1/auth/signup',
  '/api/v1/auth/login',
  AUTH_REFRESH_PATH,
]

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean
}

type ApiResponse<T> = {
  data: T
}

type RefreshResponse = {
  accessToken: string
  refreshToken: string
}

const refreshClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: REQUEST_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
})

let refreshPromise: Promise<RefreshResponse> | null = null

const attachAccessToken = (config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('accessToken')

  if (token) {
    config.headers = AxiosHeaders.from(config.headers)
    config.headers.set('Authorization', `Bearer ${token}`)
  }

  return config
}

const isPublicAuthRequest = (config?: InternalAxiosRequestConfig) => {
  const requestUrl = config?.url

  return Boolean(requestUrl && PUBLIC_AUTH_PATHS.some((path) => requestUrl.includes(path)))
}

const isLogoutRequest = (config: InternalAxiosRequestConfig) =>
  Boolean(
    config.url?.includes('/api/v1/auth/logout') &&
      !config.url.includes('/api/v1/auth/logout/all'),
  )

const redirectToLogin = () => {
  if (typeof window === 'undefined') {
    return
  }

  if (window.location.pathname !== '/login') {
    window.location.href = '/login'
  }
}

const clearAuthAndRedirect = () => {
  useAuthStore.getState().clearAuth()
  redirectToLogin()
}

const requestTokenRefresh = async () => {
  const refreshToken =
    useAuthStore.getState().refreshToken ?? localStorage.getItem('refreshToken')

  if (!refreshToken) {
    throw new Error('Missing refresh token')
  }

  const response = await refreshClient.post<ApiResponse<RefreshResponse>>(AUTH_REFRESH_PATH, {
    refreshToken,
  })
  const nextTokens = response.data.data
  useAuthStore.getState().setTokens(nextTokens.accessToken, nextTokens.refreshToken)

  return nextTokens
}

const refreshTokensOnce = () => {
  refreshPromise ??= requestTokenRefresh().finally(() => {
    refreshPromise = null
  })

  return refreshPromise
}

const handleUnauthorized =
  (client: AxiosInstance) => async (error: AxiosError) => {
    const originalConfig = error.config as RetriableRequestConfig | undefined

    if (error.response?.status !== 401 || !originalConfig) {
      return Promise.reject(error)
    }

    if (originalConfig._retry || isPublicAuthRequest(originalConfig)) {
      if (!isPublicAuthRequest(originalConfig)) {
        clearAuthAndRedirect()
      }

      return Promise.reject(error)
    }

    originalConfig._retry = true

    try {
      const { accessToken, refreshToken } = await refreshTokensOnce()
      originalConfig.headers = AxiosHeaders.from(originalConfig.headers)
      originalConfig.headers.set('Authorization', `Bearer ${accessToken}`)

      if (isLogoutRequest(originalConfig)) {
        originalConfig.data = { refreshToken }
      }

      return client(originalConfig)
    } catch (refreshError) {
      clearAuthAndRedirect()
      return Promise.reject(refreshError)
    }
  }

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: REQUEST_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const gameEngineClient = axios.create({
  baseURL: import.meta.env.VITE_GAME_ENGINE_URL,
  timeout: REQUEST_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use(attachAccessToken)
gameEngineClient.interceptors.request.use(attachAccessToken)

apiClient.interceptors.response.use((response) => response, handleUnauthorized(apiClient))
gameEngineClient.interceptors.response.use(
  (response) => response,
  handleUnauthorized(gameEngineClient),
)
