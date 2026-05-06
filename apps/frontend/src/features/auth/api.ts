import type { AxiosRequestConfig, AxiosResponse } from 'axios'

import { apiClient } from '@/shared/api/client'

import type {
  ApiResponse,
  EmailSendRequest,
  EmailVerifyRequest,
  EmailVerifyResponse,
  LoginRequest,
  LoginResponse,
  LogoutRequest,
  MeResponse,
  SignupRequest,
  SignupResponse,
} from './types'

const unwrapData = <T>(response: AxiosResponse<ApiResponse<T>>) => response.data.data

export const authApi = {
  sendVerificationEmail: async (request: EmailSendRequest) => {
    const response = await apiClient.post<ApiResponse<null>>('/api/v1/auth/email/send', request)
    return unwrapData(response)
  },
  verifyEmail: async (request: EmailVerifyRequest) => {
    const response = await apiClient.post<ApiResponse<EmailVerifyResponse>>(
      '/api/v1/auth/email/verify',
      request,
    )
    return unwrapData(response)
  },
  signup: async (request: SignupRequest) => {
    const response = await apiClient.post<ApiResponse<SignupResponse>>('/api/v1/auth/signup', request)
    return unwrapData(response)
  },
  login: async (request: LoginRequest) => {
    const response = await apiClient.post<ApiResponse<LoginResponse>>('/api/v1/auth/login', request)
    return unwrapData(response)
  },
  getMe: async (config?: AxiosRequestConfig) => {
    const response = await apiClient.get<ApiResponse<MeResponse>>('/api/v1/users/me', config)
    return unwrapData(response)
  },
  logout: async (request: LogoutRequest) => {
    const response = await apiClient.post<ApiResponse<null>>('/api/v1/auth/logout', request)
    return unwrapData(response)
  },
}
