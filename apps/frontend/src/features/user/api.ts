import type { AxiosResponse } from 'axios'

import { apiClient } from '@/shared/api/client'

import type { OnboardingRequest, OnboardingResponse } from './types'

type ApiResponse<T> = {
  data: T
}

const unwrapData = <T>(response: AxiosResponse<ApiResponse<T>>) => response.data.data

export const userApi = {
  completeOnboarding: async (request: OnboardingRequest) => {
    const response = await apiClient.post<ApiResponse<OnboardingResponse>>(
      '/api/v1/users/me/onboarding',
      request,
    )
    return unwrapData(response)
  },
}
