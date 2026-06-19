import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient } from '@tanstack/react-query'

import { createWrapper } from '@/test/test-utils'

// 관찰자 없는 시드 쿼리가 invalidate 후 수거되지 않도록 gcTime 무한 클라이언트 사용.
const makeClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  })

import { useAuthStore } from '@/features/auth/store'

import { notificationApi } from '../api'
import {
  useDeleteAllNotifications,
  useDeleteNotification,
  useMarkNotificationRead,
  useNotifications,
} from '../hooks'
import { notificationKeys } from '../queryKeys'
import type { NotificationListResponse } from '../types'

vi.mock('../api', () => ({
  notificationApi: {
    getNotifications: vi.fn(),
    markNotificationRead: vi.fn(),
    deleteNotification: vi.fn(),
    deleteAllNotifications: vi.fn(),
  },
}))

const mockedGet = notificationApi.getNotifications as unknown as Mock
const mockedMarkRead = notificationApi.markNotificationRead as unknown as Mock
const mockedDelete = notificationApi.deleteNotification as unknown as Mock
const mockedDeleteAll = notificationApi.deleteAllNotifications as unknown as Mock

const seedList = (): NotificationListResponse => ({
  notifications: [
    { id: 1, type: 'SYSTEM', title: 'a', referencedId: null, isRead: false, createdAt: 't1' },
    { id: 2, type: 'SYSTEM', title: 'b', referencedId: null, isRead: true, createdAt: 't2' },
  ],
  unreadCount: 1,
})

beforeEach(() => {
  mockedGet.mockReset()
  mockedMarkRead.mockReset()
  mockedDelete.mockReset()
  mockedDeleteAll.mockReset()
  useAuthStore.setState({ accessToken: null })
})

describe('useNotifications polling', () => {
  it('does not fetch while unauthenticated (enabled gated by access token)', () => {
    const { Wrapper } = createWrapper({ queryClient: makeClient() })

    renderHook(() => useNotifications(), { wrapper: Wrapper })

    expect(mockedGet).not.toHaveBeenCalled()
  })

  it('refetches on a 60s interval when authenticated', async () => {
    vi.useFakeTimers()
    try {
      useAuthStore.setState({ accessToken: 'token' })
      mockedGet.mockResolvedValue(seedList())
      const { Wrapper } = createWrapper({ queryClient: makeClient() })

      renderHook(() => useNotifications(), { wrapper: Wrapper })

      await vi.advanceTimersByTimeAsync(0)
      expect(mockedGet).toHaveBeenCalledTimes(1)

      await vi.advanceTimersByTimeAsync(60_000)
      expect(mockedGet).toHaveBeenCalledTimes(2)

      await vi.advanceTimersByTimeAsync(60_000)
      expect(mockedGet).toHaveBeenCalledTimes(3)
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('useMarkNotificationRead optimistic update', () => {
  it('patches cache immediately and keeps it on success', async () => {
    mockedMarkRead.mockResolvedValueOnce(undefined)
    const { Wrapper, queryClient } = createWrapper({ queryClient: makeClient() })
    queryClient.setQueryData(notificationKeys.list(), seedList())

    const { result } = renderHook(() => useMarkNotificationRead(), { wrapper: Wrapper })
    result.current.mutate(1)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const data = queryClient.getQueryData<NotificationListResponse>(notificationKeys.list())
    expect(data?.notifications.find((n) => n.id === 1)?.isRead).toBe(true)
    expect(data?.unreadCount).toBe(0)
  })

  it('rolls back to the previous cache on error', async () => {
    mockedMarkRead.mockRejectedValueOnce(new Error('boom'))
    const { Wrapper, queryClient } = createWrapper({ queryClient: makeClient() })
    const seeded = seedList()
    queryClient.setQueryData(notificationKeys.list(), seeded)

    const { result } = renderHook(() => useMarkNotificationRead(), { wrapper: Wrapper })
    result.current.mutate(1)

    await waitFor(() => expect(result.current.isError).toBe(true))

    const data = queryClient.getQueryData<NotificationListResponse>(notificationKeys.list())
    expect(data?.notifications.find((n) => n.id === 1)?.isRead).toBe(false)
    expect(data?.unreadCount).toBe(1)
  })
})

describe('useDeleteNotification optimistic update', () => {
  it('removes the row and decrements unreadCount on success', async () => {
    mockedDelete.mockResolvedValueOnce(undefined)
    const { Wrapper, queryClient } = createWrapper({ queryClient: makeClient() })
    queryClient.setQueryData(notificationKeys.list(), seedList())

    const { result } = renderHook(() => useDeleteNotification(), { wrapper: Wrapper })
    result.current.mutate(1)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const data = queryClient.getQueryData<NotificationListResponse>(notificationKeys.list())
    expect(data?.notifications.some((n) => n.id === 1)).toBe(false)
    expect(data?.unreadCount).toBe(0)
  })

  it('rolls back the removed row on error', async () => {
    mockedDelete.mockRejectedValueOnce(new Error('boom'))
    const { Wrapper, queryClient } = createWrapper({ queryClient: makeClient() })
    queryClient.setQueryData(notificationKeys.list(), seedList())

    const { result } = renderHook(() => useDeleteNotification(), { wrapper: Wrapper })
    result.current.mutate(1)

    await waitFor(() => expect(result.current.isError).toBe(true))

    const data = queryClient.getQueryData<NotificationListResponse>(notificationKeys.list())
    expect(data?.notifications).toHaveLength(2)
    expect(data?.unreadCount).toBe(1)
  })
})

describe('useDeleteAllNotifications optimistic update', () => {
  it('clears the list on success', async () => {
    mockedDeleteAll.mockResolvedValueOnce(undefined)
    const { Wrapper, queryClient } = createWrapper({ queryClient: makeClient() })
    queryClient.setQueryData(notificationKeys.list(), seedList())

    const { result } = renderHook(() => useDeleteAllNotifications(), { wrapper: Wrapper })
    result.current.mutate()

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const data = queryClient.getQueryData<NotificationListResponse>(notificationKeys.list())
    expect(data).toEqual({ notifications: [], unreadCount: 0 })
  })

  it('rolls back the full list on error', async () => {
    mockedDeleteAll.mockRejectedValueOnce(new Error('boom'))
    const { Wrapper, queryClient } = createWrapper({ queryClient: makeClient() })
    queryClient.setQueryData(notificationKeys.list(), seedList())

    const { result } = renderHook(() => useDeleteAllNotifications(), { wrapper: Wrapper })
    result.current.mutate()

    await waitFor(() => expect(result.current.isError).toBe(true))

    const data = queryClient.getQueryData<NotificationListResponse>(notificationKeys.list())
    expect(data?.notifications).toHaveLength(2)
    expect(data?.unreadCount).toBe(1)
  })
})
