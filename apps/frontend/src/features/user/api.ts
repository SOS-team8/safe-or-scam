import type { AxiosResponse } from 'axios'

import { apiClient } from '@/shared/api/client'

import type {
  OnboardingRequest,
  OnboardingResponse,
  UpdateProfileRequest,
  UpdateProfileResponse,
  UserProfile,
  WithdrawalResponse,
} from './types'

type ApiResponse<T> = {
  data: T
}

const unwrapData = <T>(response: AxiosResponse<ApiResponse<T>>) => response.data.data

export const userApi = {
  getMe: async () => {
    const response = await apiClient.get<ApiResponse<UserProfile>>('/api/v1/users/me')
    return unwrapData(response)
  },
  updateProfile: async (request: UpdateProfileRequest) => {
    const response = await apiClient.patch<ApiResponse<UpdateProfileResponse>>(
      '/api/v1/users/me',
      request,
    )
    return unwrapData(response)
  },
  withdraw: async () => {
    const response = await apiClient.post<ApiResponse<WithdrawalResponse>>(
      '/api/v1/users/me/withdrawal',
    )
    return unwrapData(response)
  },
  completeOnboarding: async (request: OnboardingRequest) => {
    const response = await apiClient.post<ApiResponse<OnboardingResponse>>(
      '/api/v1/users/me/onboarding',
      request,
    )
    return unwrapData(response)
  },
}
