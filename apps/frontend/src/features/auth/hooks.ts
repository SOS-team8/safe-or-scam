import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate, type Location } from 'react-router-dom'

import { toApiError } from '@/shared/api/error'

import { authApi } from './api'
import { authKeys } from './queryKeys'
import type { SignupFormValues } from './schemas'
import { useAuthStore } from './store'
import type { EmailVerifyRequest, SignupRequest } from './types'

type RedirectState = {
  from?: Pick<Location, 'pathname' | 'search' | 'hash'>
}

const getRedirectPath = (state: unknown) => {
  const redirectState = state as RedirectState | null
  const from = redirectState?.from

  if (!from) {
    return '/lobby'
  }

  return `${from.pathname}${from.search}${from.hash}`
}

export const useAuthBootstrap = () => {
  const accessToken = useAuthStore((state) => state.accessToken)
  const clearAuth = useAuthStore((state) => state.clearAuth)

  const meQuery = useQuery({
    queryKey: authKeys.user(),
    queryFn: ({ signal }) => authApi.getMe({ signal }),
    enabled: Boolean(accessToken),
    retry: false,
  })

  useEffect(() => {
    if (meQuery.error && toApiError(meQuery.error).status === 401) {
      clearAuth()
    }
  }, [clearAuth, meQuery.error])

  return {
    isLoadingUser: Boolean(accessToken && meQuery.isPending),
  }
}

export const useSendSignupVerificationEmail = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const setSignupDraft = useAuthStore((state) => state.setSignupDraft)

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
      setSignupDraft({
        email: values.email,
        name: values.name,
        password: values.password,
      })
      navigate('/signup/verify')
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
  const clearSignupDraft = useAuthStore((state) => state.clearSignupDraft)

  return useMutation({
    mutationFn: (request: SignupRequest) => authApi.signup(request),
    onSuccess: (response) => {
      setAuth(response.accessToken, response.refreshToken, response.user.role)
      clearSignupDraft()
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
      setAuth(response.accessToken, response.refreshToken, response.user.role)
      void queryClient.invalidateQueries({ queryKey: authKeys.session() })
      navigate(getRedirectPath(location.state), { replace: true })
    },
  })
}

export const useLogout = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const clearAuth = useAuthStore((state) => state.clearAuth)
  const refreshToken = useAuthStore((state) => state.refreshToken)

  return useMutation({
    mutationFn: () => authApi.logout({ refreshToken: refreshToken as string }),
    onSettled: () => {
      clearAuth()
      void queryClient.invalidateQueries({ queryKey: authKeys.session() })
      navigate('/login', { replace: true })
    },
  })
}
