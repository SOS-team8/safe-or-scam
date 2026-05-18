import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate, type Location } from 'react-router-dom'

import { toApiError } from '@/shared/api/error'
import { userKeys } from '@/features/user/queryKeys'

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
  const role = useAuthStore((state) => state.role)
  const setRole = useAuthStore((state) => state.setRole)
  const clearAuth = useAuthStore((state) => state.clearAuth)

  const meQuery = useQuery({
    queryKey: authKeys.user(),
    queryFn: ({ signal }) => authApi.getMe({ signal }),
    enabled: Boolean(accessToken),
    retry: false,
  })

  // 401 → force logout. The axios interceptor already retried with refresh;
  // a 401 reaching this hook means refresh also failed.
  useEffect(() => {
    if (meQuery.error && toApiError(meQuery.error).status === 401) {
      clearAuth()
    }
  }, [clearAuth, meQuery.error])

  // 200 → sync role into the auth store. Per auth-boundary §6, a 200 response
  // missing `role` MUST NOT force logout (the server payload is corrupted, not
  // the session). Surface an integrity flag instead so the UI can prompt retry.
  useEffect(() => {
    if (!accessToken || role || !meQuery.data) {
      return
    }

    if (meQuery.data.role) {
      setRole(meQuery.data.role)
    }
  }, [accessToken, meQuery.data, role, setRole])

  const hasMeIntegrityError = Boolean(
    accessToken && meQuery.isSuccess && meQuery.data && !meQuery.data.role,
  )

  return {
    isLoadingUser: Boolean(accessToken && meQuery.isPending),
    hasMeIntegrityError,
    retryMe: meQuery.refetch,
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
      navigate('/lobby', { replace: true })
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
      queryClient.removeQueries({ queryKey: userKeys.me() })
      void queryClient.invalidateQueries({ queryKey: authKeys.session() })
      navigate('/login', { replace: true })
    },
  })
}
