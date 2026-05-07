import { create } from 'zustand'

import type { SignupDraft, UserRole } from './types'

type AuthState = {
  accessToken: string | null
  refreshToken: string | null
  role: UserRole | null
  signupDraft: SignupDraft | null
  isAuthenticated: boolean
  setAuth: (accessToken: string, refreshToken: string, role: UserRole) => void
  setTokens: (accessToken: string, refreshToken: string) => void
  setRole: (role: UserRole) => void
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

const getStoredRole = () => {
  if (typeof window === 'undefined') {
    return null
  }

  const role = sessionStorage.getItem('userRole')

  return role === 'GUEST' || role === 'USER' || role === 'ADMIN' ? role : null
}

const persistTokens = (accessToken: string, refreshToken: string) => {
  localStorage.setItem('accessToken', accessToken)
  sessionStorage.setItem('refreshToken', refreshToken)
}

const persistRole = (role: UserRole) => {
  sessionStorage.setItem('userRole', role)
}

const clearStoredTokens = () => {
  localStorage.removeItem('accessToken')
  sessionStorage.removeItem('refreshToken')
  sessionStorage.removeItem('userRole')
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
  const role = accessToken && refreshToken ? getStoredRole() : null

  return {
    accessToken,
    refreshToken,
    role,
    signupDraft: null,
    isAuthenticated: Boolean(accessToken && refreshToken),
    setAuth: (nextAccessToken, nextRefreshToken, nextRole) => {
      persistTokens(nextAccessToken, nextRefreshToken)
      persistRole(nextRole)
      set({
        accessToken: nextAccessToken,
        refreshToken: nextRefreshToken,
        role: nextRole,
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
    setRole: (role) => {
      persistRole(role)
      set({ role })
    },
    clearAuth: () => {
      clearStoredTokens()
      set({
        accessToken: null,
        refreshToken: null,
        role: null,
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
