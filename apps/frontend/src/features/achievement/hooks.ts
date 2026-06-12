import { useQuery } from '@tanstack/react-query'

import { useAuthStore } from '@/features/auth/store'

import { achievementApi } from './api'
import { achievementKeys } from './queryKeys'

export const useAchievements = () => {
  const accessToken = useAuthStore((state) => state.accessToken)

  return useQuery({
    queryKey: achievementKeys.list(),
    queryFn: achievementApi.getAchievements,
    enabled: Boolean(accessToken),
  })
}
