import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate, type Location } from 'react-router-dom'

import { authApi } from './api'
import { authKeys } from './queryKeys'
import type { SignupFormValues } from './schemas'
import { useAuthStore } from './store'
import type {
  AuthUser,
  EmailVerifyRequest,
  LoginResponse,
  SignupDraft,
  SignupResponse,
  SignupRequest,
} from './types'

type RedirectState = {
  from?: Pick<Location, 'pathname' | 'search' | 'hash'>
}

const normalizeLoginUser = (user: LoginResponse['user']): AuthUser => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
})

const normalizeSignupUser = (user: SignupResponse['user']): AuthUser => ({
  id: user.userId,
  email: user.email,
  name: user.name,
  role: user.role,
})

const getRedirectPath = (state: unknown) => {
  const redirectState = state as RedirectState | null
  const from = redirectState?.from

  if (!from) {
    return '/lobby'
  }

  return `${from.pathname}${from.search}${from.hash}`
}

export const useSendSignupVerificationEmail = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (values: SignupFormValues) =>
      authApi.sendVerificationEmail({
        email: values.email,
        purpose: 'SIGNUP',
      }),
    onSuccess: (_data, values) => {
      void queryClient.invalidateQueries({
        queryKey: authKeys.emailVerification(values.email),
      })
      navigate('/signup/verify', {
        state: {
          email: values.email,
          name: values.name,
          password: values.password,
        } satisfies SignupDraft,
      })
    },
  })
}

export const useVerifyEmail = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: EmailVerifyRequest) => authApi.verifyEmail(request),
    onSuccess: (_data, request) => {
      void queryClient.invalidateQueries({
        queryKey: authKeys.emailVerification(request.email),
      })
    },
  })
}

export const useSignup = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const setAuth = useAuthStore((state) => state.setAuth)

  return useMutation({
    mutationFn: (request: SignupRequest) => authApi.signup(request),
    onSuccess: (response) => {
      setAuth(response.accessToken, normalizeSignupUser(response.user))
      void queryClient.invalidateQueries({ queryKey: authKeys.session() })
      navigate('/onboarding', { replace: true })
    },
  })
}

export const useLogin = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const setAuth = useAuthStore((state) => state.setAuth)

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (response) => {
      setAuth(response.accessToken, normalizeLoginUser(response.user))
      void queryClient.invalidateQueries({ queryKey: authKeys.session() })
      navigate(getRedirectPath(location.state), { replace: true })
    },
  })
}

export const useLogout = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const clearAuth = useAuthStore((state) => state.clearAuth)

  return useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      clearAuth()
      void queryClient.invalidateQueries({ queryKey: authKeys.session() })
      navigate('/login', { replace: true })
    },
  })
}
