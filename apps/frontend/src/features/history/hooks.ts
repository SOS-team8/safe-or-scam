import { useQuery } from '@tanstack/react-query'

import { useAuthStore } from '@/features/auth/store'

import { historyApi } from './api'
import { historyKeys } from './queryKeys'

export const useScenarioProgress = () => {
  const accessToken = useAuthStore((state) => state.accessToken)

  return useQuery({
    queryKey: historyKeys.progress(),
    queryFn: historyApi.getScenarioProgress,
    enabled: Boolean(accessToken),
  })
}

export const usePlayLogs = (scenarioId: string | null) => {
  const accessToken = useAuthStore((state) => state.accessToken)

  return useQuery({
    queryKey: historyKeys.playLogs(scenarioId ?? ''),
    queryFn: () => {
      if (scenarioId === null) {
        return Promise.reject(new Error('scenarioId is required'))
      }
      return historyApi.getPlayLogs(scenarioId)
    },
    enabled: Boolean(accessToken) && scenarioId !== null,
  })
}

export const usePlayLogDetail = (logId: string | null) => {
  const accessToken = useAuthStore((state) => state.accessToken)

  return useQuery({
    queryKey: historyKeys.playLogDetail(logId ?? ''),
    queryFn: () => {
      if (logId === null) {
        return Promise.reject(new Error('logId is required'))
      }
      return historyApi.getPlayLogDetail(logId)
    },
    enabled: Boolean(accessToken) && logId !== null,
  })
}
