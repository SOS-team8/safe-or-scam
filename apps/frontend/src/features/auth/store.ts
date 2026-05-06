import { create } from 'zustand'

import type { AuthUser, SignupDraft } from './types'

type AuthState = {
  accessToken: string | null
  // Intentionally memory-only for current-session logout; refresh rotation belongs to the Day 3 auth flow.
  refreshToken: string | null
  user: AuthUser | null
  signupDraft: SignupDraft | null
  isAuthenticated: boolean
  setAuth: (accessToken: string, refreshToken: string, user: AuthUser) => void
  setUser: (user: AuthUser) => void
  clearAuth: () => void
  setSignupDraft: (signupDraft: SignupDraft) => void
  clearSignupDraft: () => void
}

const getInitialAccessToken = () => {
  if (typeof window === 'undefined') {
    return null
  }

  // TODO: Move session persistence to HttpOnly cookies or a BFF once the backend auth contract supports it.
  return localStorage.getItem('accessToken')
}

export const useAuthStore = create<AuthState>((set) => {
  const accessToken = getInitialAccessToken()

  return {
    accessToken,
    refreshToken: null,
    user: null,
    signupDraft: null,
    isAuthenticated: Boolean(accessToken),
    setAuth: (nextAccessToken, nextRefreshToken, user) => {
      localStorage.setItem('accessToken', nextAccessToken)
      set({
        accessToken: nextAccessToken,
        refreshToken: nextRefreshToken,
        user,
        isAuthenticated: true,
      })
    },
    setUser: (user) => {
      set({ user })
    },
    clearAuth: () => {
      localStorage.removeItem('accessToken')
      set({
        accessToken: null,
        refreshToken: null,
        user: null,
        isAuthenticated: false,
      })
    },
    setSignupDraft: (signupDraft) => {
      set({ signupDraft })
    },
    clearSignupDraft: () => {
      set({ signupDraft: null })
    },
  }
})
