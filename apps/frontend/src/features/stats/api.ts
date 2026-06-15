import type { AxiosResponse } from 'axios'

import { apiClient } from '@/shared/api/client'

import type { UserStat } from './types'

type ApiResponse<T> = {
  data: T
}

const unwrapData = <T>(response: AxiosResponse<ApiResponse<T>>) => response.data.data

export const statsApi = {
  getUserStats: async () => {
    const response = await apiClient.get<ApiResponse<UserStat>>('/api/v1/users/me/stats')
    return unwrapData(response)
  },
}
