import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'

import { useAuthStore } from '@/features/auth/store'
import { authKeys } from '@/features/auth/queryKeys'

import { userApi } from './api'
import { useOnboardingDraftStore } from './store'

export const useCompleteOnboarding = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const setTokens = useAuthStore((state) => state.setTokens)
  const setUser = useAuthStore((state) => state.setUser)
  const user = useAuthStore((state) => state.user)
  const clearOnboardingDraft = useOnboardingDraftStore((state) => state.clearOnboardingDraft)

  return useMutation({
    mutationFn: userApi.completeOnboarding,
    onSuccess: (response) => {
      setTokens(response.accessToken, response.refreshToken)

      if (user) {
        setUser({ ...user, role: response.role })
      }

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
