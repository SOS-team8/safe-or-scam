import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'

import { apiClient } from '@/shared/api/client'

import { notificationApi } from '../api'

vi.mock('@/shared/api/client', () => ({
  apiClient: { get: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

const mockedGet = apiClient.get as unknown as Mock
const mockedPatch = apiClient.patch as unknown as Mock
const mockedDelete = apiClient.delete as unknown as Mock

beforeEach(() => {
  mockedGet.mockReset()
  mockedPatch.mockReset()
  mockedDelete.mockReset()
})

describe('notificationApi.getNotifications', () => {
  it('maps snake_case wire to camelCase and derives unreadCount', async () => {
    mockedGet.mockResolvedValueOnce({
      data: {
        data: [
          {
            id: 1,
            type: 'ACHIEVEMENT',
            title: 'a',
            reference_id: '3',
            is_read: false,
            created_at: '2026-06-12T09:00:00',
          },
          {
            id: 2,
            type: 'SYSTEM',
            title: 'b',
            reference_id: null,
            is_read: true,
            created_at: '2026-06-01T12:00:00',
          },
        ],
      },
    })

    const result = await notificationApi.getNotifications()

    expect(mockedGet).toHaveBeenCalledWith('/api/v1/notifications')
    expect(result.unreadCount).toBe(1)
    expect(result.notifications[0]).toEqual({
      id: 1,
      type: 'ACHIEVEMENT',
      title: 'a',
      referencedId: '3',
      isRead: false,
      createdAt: '2026-06-12T09:00:00',
    })
  })

  it('tolerates a non-array payload as an empty list', async () => {
    mockedGet.mockResolvedValueOnce({ data: { data: null } })
    const result = await notificationApi.getNotifications()
    expect(result).toEqual({ notifications: [], unreadCount: 0 })
  })
})

describe('notificationApi mutations hit the right endpoints', () => {
  it('markNotificationRead → PATCH /{id}/read', async () => {
    mockedPatch.mockResolvedValueOnce({ data: {} })
    await notificationApi.markNotificationRead(7)
    expect(mockedPatch).toHaveBeenCalledWith('/api/v1/notifications/7/read')
  })

  it('deleteNotification → DELETE /{id}', async () => {
    mockedDelete.mockResolvedValueOnce({ data: {} })
    await notificationApi.deleteNotification(7)
    expect(mockedDelete).toHaveBeenCalledWith('/api/v1/notifications/7')
  })

  it('deleteAllNotifications → DELETE collection', async () => {
    mockedDelete.mockResolvedValueOnce({ data: {} })
    await notificationApi.deleteAllNotifications()
    expect(mockedDelete).toHaveBeenCalledWith('/api/v1/notifications')
  })
})
