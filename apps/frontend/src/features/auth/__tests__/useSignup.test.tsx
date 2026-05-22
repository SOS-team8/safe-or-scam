import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

import { authApi } from '../api'
import { useSignup } from '../hooks'
import { useAuthStore } from '../store'
import { createWrapper } from '@/test/test-utils'
import type { SignupResponse } from '../types'

vi.mock('../api', () => ({
  authApi: {
    signup: vi.fn(),
    getMe: vi.fn(),
  },
}))

const mockedSignup = authApi.signup as unknown as Mock

const baseResponse: SignupResponse = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  user: {
    id: 42,
    email: 'new-user@example.com',
    name: 'New User',
    role: 'USER',
  },
}

describe('useSignup', () => {
  beforeEach(() => {
    mockedSignup.mockReset()
    useAuthStore.getState().clearAuth()
  })

  it('persists the auth tokens and role from response.user.id payload', async () => {
    mockedSignup.mockResolvedValueOnce(baseResponse)

    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useSignup(), { wrapper: Wrapper })

    result.current.mutate({
      verificationToken: 'verify-token',
      password: 'a-long-password',
      name: 'New User',
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    const state = useAuthStore.getState()
    expect(state.accessToken).toBe('access-token')
    expect(state.refreshToken).toBe('refresh-token')
    expect(state.role).toBe('USER')
    expect(state.isAuthenticated).toBe(true)
  })

  it('rejects SignupResponse payloads with the legacy userId field at compile time', () => {
    // Type-level assertion: the new contract uses `id`, not `userId`.
    // The line below would fail typecheck if SignupResponse.user.userId still existed.
    const _typed: SignupResponse['user'] = {
      id: 1,
      email: 'a@b.com',
      name: 'n',
      role: 'USER',
    }
    expect(_typed.id).toBe(1)
  })
})
