import type { AxiosResponse } from 'axios'

import { apiClient } from '@/shared/api/client'

import type { PlayLogDetail, PlayLogSummary, ScenarioProgress } from './types'

type ApiResponse<T> = {
  data: T
}

const unwrapData = <T>(response: AxiosResponse<ApiResponse<T>>) => response.data.data

export const historyApi = {
  getScenarioProgress: async () => {
    const response = await apiClient.get<ApiResponse<ScenarioProgress[]>>(
      '/api/v1/users/me/history/progress',
    )
    return unwrapData(response)
  },
  getPlayLogs: async (scenarioId: string) => {
    const response = await apiClient.get<ApiResponse<PlayLogSummary[]>>(
      '/api/v1/users/me/history/play-logs',
      { params: { scenarioId } },
    )
    return unwrapData(response)
  },
  getPlayLogDetail: async (logId: string) => {
    const response = await apiClient.get<ApiResponse<PlayLogDetail>>(
      `/api/v1/users/me/history/play-logs/${logId}`,
    )
    return unwrapData(response)
  },
}
