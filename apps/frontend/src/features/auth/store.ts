import { create } from 'zustand'

import type { AuthUser, SignupDraft } from './types'

type AuthState = {
  accessToken: string | null
  refreshToken: string | null
  user: AuthUser | null
  signupDraft: SignupDraft | null
  isAuthenticated: boolean
  setAuth: (accessToken: string, refreshToken: string, user: AuthUser) => void
  setTokens: (accessToken: string, refreshToken: string) => void
  setUser: (user: AuthUser) => void
  clearAuth: () => void
  setSignupDraft: (signupDraft: SignupDraft) => void
  clearSignupDraft: () => void
}

const getStoredAccessToken = () => {
  if (typeof window === 'undefined') {
    return null
  }

  // TODO: Move session persistence to HttpOnly cookies or a BFF once the backend auth contract supports it.
  return localStorage.getItem('accessToken')
}

const getStoredRefreshToken = () => {
  if (typeof window === 'undefined') {
    return null
  }

  // TODO: Move session persistence to HttpOnly cookies or a BFF once the backend auth contract supports it.
  return sessionStorage.getItem('refreshToken')
}

const persistTokens = (accessToken: string, refreshToken: string) => {
  localStorage.setItem('accessToken', accessToken)
  sessionStorage.setItem('refreshToken', refreshToken)
}

const clearStoredTokens = () => {
  localStorage.removeItem('accessToken')
  sessionStorage.removeItem('refreshToken')
}

const getInitialTokens = () => {
  const accessToken = getStoredAccessToken()
  const refreshToken = getStoredRefreshToken()

  if (!accessToken || !refreshToken) {
    if (accessToken || refreshToken) {
      clearStoredTokens()
    }

    return {
      accessToken: null,
      refreshToken: null,
    }
  }

  return {
    accessToken,
    refreshToken,
  }
}

export const useAuthStore = create<AuthState>((set) => {
  const { accessToken, refreshToken } = getInitialTokens()

  return {
    accessToken,
    refreshToken,
    user: null,
    signupDraft: null,
    isAuthenticated: Boolean(accessToken && refreshToken),
    setAuth: (nextAccessToken, nextRefreshToken, user) => {
      persistTokens(nextAccessToken, nextRefreshToken)
      set({
        accessToken: nextAccessToken,
        refreshToken: nextRefreshToken,
        user,
        isAuthenticated: true,
      })
    },
    setTokens: (nextAccessToken, nextRefreshToken) => {
      persistTokens(nextAccessToken, nextRefreshToken)
      set({
        accessToken: nextAccessToken,
        refreshToken: nextRefreshToken,
        isAuthenticated: true,
      })
    },
    setUser: (user) => {
      set({ user })
    },
    clearAuth: () => {
      clearStoredTokens()
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
