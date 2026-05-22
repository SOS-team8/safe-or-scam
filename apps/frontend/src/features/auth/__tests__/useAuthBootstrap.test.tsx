import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

import { useAuthStore } from '../store'
import { useAuthBootstrap } from '../hooks'
import { authApi } from '../api'
import { createWrapper } from '@/test/test-utils'
import type { MeResponse } from '../types'

vi.mock('../api', () => ({
  authApi: {
    getMe: vi.fn(),
  },
}))

const mockedGetMe = authApi.getMe as unknown as Mock

function seedAuth(input: { accessToken: string | null; refreshToken?: string | null }) {
  const store = useAuthStore.getState()
  if (input.accessToken) {
    store.setAuth(
      input.accessToken,
      input.refreshToken ?? 'refresh-token',
      'USER',
    )
    // simulate fresh tab — role unknown
    useAuthStore.setState({ role: null })
  } else {
    store.clearAuth()
  }
}

const baseMe: MeResponse = {
  id: 1,
  email: 'foo@example.com',
  name: 'foo',
  role: 'USER',
  status: 'ACTIVE',
  createdAt: '2026-05-18T00:00:00Z',
}

const create401Error = () => {
  const error = new Error('Request failed with status code 401') as Error & {
    isAxiosError: true
    response: { status: number; data: unknown }
  }
  error.isAxiosError = true
  error.response = { status: 401, data: { error: { message: 'unauthorized' } } }
  return error
}

describe('useAuthBootstrap', () => {
  beforeEach(() => {
    mockedGetMe.mockReset()
    useAuthStore.getState().clearAuth()
  })

  it('does not call /me or clear auth when there is no access token', async () => {
    seedAuth({ accessToken: null })

    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useAuthBootstrap(), { wrapper: Wrapper })

    expect(result.current.isLoadingUser).toBe(false)
    expect(mockedGetMe).not.toHaveBeenCalled()
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
  })

  it('sets role from /me response when role is present', async () => {
    seedAuth({ accessToken: 'access' })
    mockedGetMe.mockResolvedValueOnce(baseMe)

    const { Wrapper } = createWrapper()
    renderHook(() => useAuthBootstrap(), { wrapper: Wrapper })

    await waitFor(() => {
      expect(useAuthStore.getState().role).toBe('USER')
    })
    expect(useAuthStore.getState().isAuthenticated).toBe(true)
  })

  it('keeps the session when /me returns 200 but role is missing (auth-boundary §6)', async () => {
    seedAuth({ accessToken: 'access' })
    // Simulate a corrupted response that lacks the contract-mandated role.
    const corruptedMe = { ...baseMe } as MeResponse
    delete (corruptedMe as Partial<MeResponse>).role
    mockedGetMe.mockResolvedValueOnce(corruptedMe)

    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useAuthBootstrap(), { wrapper: Wrapper })

    await waitFor(() => {
      expect(result.current.hasMeIntegrityError).toBe(true)
    })

    expect(useAuthStore.getState().isAuthenticated).toBe(true)
    expect(useAuthStore.getState().accessToken).toBe('access')
    expect(useAuthStore.getState().role).toBeNull()
  })

  it('clears auth when /me returns 401', async () => {
    seedAuth({ accessToken: 'access' })
    mockedGetMe.mockRejectedValueOnce(create401Error())

    const { Wrapper } = createWrapper()
    renderHook(() => useAuthBootstrap(), { wrapper: Wrapper })

    await waitFor(() => {
      expect(useAuthStore.getState().isAuthenticated).toBe(false)
    })
    expect(useAuthStore.getState().accessToken).toBeNull()
  })

  it('exposes a retry helper to refetch /me without forcing logout', async () => {
    seedAuth({ accessToken: 'access' })
    // First call returns role-less payload
    const corruptedMe = { ...baseMe } as MeResponse
    delete (corruptedMe as Partial<MeResponse>).role
    mockedGetMe
      .mockResolvedValueOnce(corruptedMe)
      .mockResolvedValueOnce(baseMe)

    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useAuthBootstrap(), { wrapper: Wrapper })

    await waitFor(() => {
      expect(result.current.hasMeIntegrityError).toBe(true)
    })

    await result.current.retryMe()

    await waitFor(() => {
      expect(useAuthStore.getState().role).toBe('USER')
    })
  })
})
