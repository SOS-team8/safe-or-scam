import { useQuery } from '@tanstack/react-query'

import { useAuthStore } from '@/features/auth/store'

import { statsApi } from './api'
import { statsKeys } from './queryKeys'

export const useUserStats = () => {
  const accessToken = useAuthStore((state) => state.accessToken)

  return useQuery({
    queryKey: statsKeys.me(),
    queryFn: statsApi.getUserStats,
    enabled: Boolean(accessToken),
  })
}

export const usePhishingBreakdown = () => {
  const accessToken = useAuthStore((state) => state.accessToken)

  return useQuery({
    queryKey: statsKeys.phishingBreakdown(),
    queryFn: statsApi.getPhishingBreakdown,
    enabled: Boolean(accessToken),
  })
}
