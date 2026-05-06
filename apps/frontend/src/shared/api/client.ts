import axios, { AxiosHeaders, type AxiosError, type InternalAxiosRequestConfig } from 'axios'

const REQUEST_TIMEOUT_MS = 10_000

const attachAccessToken = (config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('accessToken')

  if (token) {
    config.headers = AxiosHeaders.from(config.headers)
    config.headers.set('Authorization', `Bearer ${token}`)
  }

  return config
}

const handleUnauthorized = (error: AxiosError) => {
  if (error.response?.status === 401) {
    localStorage.removeItem('accessToken')

    if (window.location.pathname !== '/login') {
      window.location.href = '/login'
    }
  }

  return Promise.reject(error)
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

apiClient.interceptors.response.use((response) => response, handleUnauthorized)
gameEngineClient.interceptors.response.use((response) => response, handleUnauthorized)
