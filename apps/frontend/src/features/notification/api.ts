import type { AxiosResponse } from 'axios'

import { apiClient } from '@/shared/api/client'

import type { NotificationItem, NotificationListResponse, NotificationType } from './types'

type ApiResponse<T> = {
  data: T
}

const unwrapData = <T>(response: AxiosResponse<ApiResponse<T>>) => response.data.data

// 백엔드 NotificationResponse 와 동일한 wire 포맷 (snake_case)
type NotificationWire = {
  id: number
  type: NotificationType
  title: string
  reference_id: string | null
  is_read: boolean
  created_at: string
}

const toNotificationItem = (wire: NotificationWire): NotificationItem => ({
  id: wire.id,
  type: wire.type,
  title: wire.title,
  referencedId: wire.reference_id,
  isRead: wire.is_read,
  createdAt: wire.created_at,
})

export const notificationApi = {
  getNotifications: async (): Promise<NotificationListResponse> => {
    const response = await apiClient.get<ApiResponse<NotificationWire[]>>('/api/v1/notifications')
    const payload = unwrapData(response)
    const notifications = (Array.isArray(payload) ? payload : []).map(toNotificationItem)

    return {
      notifications,
      unreadCount: notifications.filter((notification) => !notification.isRead).length,
    }
  },
  markNotificationRead: async (notificationId: number) => {
    await apiClient.patch(`/api/v1/notifications/${notificationId}/read`)
  },
  deleteNotification: async (notificationId: number) => {
    await apiClient.delete(`/api/v1/notifications/${notificationId}`)
  },
  deleteAllNotifications: async () => {
    await apiClient.delete('/api/v1/notifications')
  },
}
