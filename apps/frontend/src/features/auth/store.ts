import { create } from 'zustand'

import type { AuthUser } from './types'

type AuthState = {
  accessToken: string | null
  user: AuthUser | null
  isAuthenticated: boolean
  setAuth: (accessToken: string, user: AuthUser) => void
  clearAuth: () => void
}

const getInitialAccessToken = () => {
  if (typeof window === 'undefined') {
    return null
  }

  return localStorage.getItem('accessToken')
}

export const useAuthStore = create<AuthState>((set) => {
  const accessToken = getInitialAccessToken()

  return {
    accessToken,
    user: null,
    isAuthenticated: Boolean(accessToken),
    setAuth: (nextAccessToken, user) => {
      localStorage.setItem('accessToken', nextAccessToken)
      set({
        accessToken: nextAccessToken,
        user,
        isAuthenticated: true,
      })
    },
    clearAuth: () => {
      localStorage.removeItem('accessToken')
      set({
        accessToken: null,
        user: null,
        isAuthenticated: false,
      })
    },
  }
})
