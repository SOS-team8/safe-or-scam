import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'

import { useAuthStore } from '@/features/auth/store'
import { authKeys } from '@/features/auth/queryKeys'

import { userApi } from './api'
import { userKeys } from './queryKeys'
import { useOnboardingDraftStore } from './store'
import type { UpdateProfileRequest } from './types'

export const useUserProfile = () => {
  const accessToken = useAuthStore((state) => state.accessToken)

  return useQuery({
    queryKey: userKeys.me(),
    queryFn: userApi.getMe,
    enabled: Boolean(accessToken),
  })
}

export const useUpdateProfile = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: UpdateProfileRequest) => userApi.updateProfile(request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: userKeys.me() })
    },
  })
}

export const useWithdrawUser = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const clearAuth = useAuthStore((state) => state.clearAuth)

  return useMutation({
    mutationFn: userApi.withdraw,
    onSuccess: () => {
      clearAuth()
      queryClient.clear()
      navigate('/login', {
        replace: true,
        state: {
          withdrawalComplete: true,
        },
      })
    },
  })
}

export const useCompleteOnboarding = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const setTokens = useAuthStore((state) => state.setTokens)
  const setRole = useAuthStore((state) => state.setRole)
  const clearOnboardingDraft = useOnboardingDraftStore((state) => state.clearOnboardingDraft)

  return useMutation({
    mutationFn: userApi.completeOnboarding,
    onSuccess: (response) => {
      setTokens(response.accessToken, response.refreshToken)
      setRole(response.role)

      clearOnboardingDraft()
      void queryClient.invalidateQueries({ queryKey: authKeys.session() })
      navigate('/lobby', {
        replace: true,
        state: {
          onboardingComplete: true,
        },
      })
    },
  })
}
