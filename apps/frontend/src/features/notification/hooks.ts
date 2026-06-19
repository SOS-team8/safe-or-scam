import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuthStore } from '@/features/auth/store'

import { notificationApi } from './api'
import { notificationKeys } from './queryKeys'
import type { NotificationListResponse } from './types'

export const useNotifications = () => {
  const accessToken = useAuthStore((state) => state.accessToken)

  return useQuery({
    queryKey: notificationKeys.list(),
    queryFn: notificationApi.getNotifications,
    enabled: Boolean(accessToken),
    // 벨 뱃지를 준실시간으로 유지하기 위한 폴링. 숨겨진 탭에서는 폴링하지 않는다.
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  })
}

const useOptimisticListPatch = () => {
  const queryClient = useQueryClient()

  const patchList = async (
    updater: (current: NotificationListResponse) => NotificationListResponse,
  ) => {
    await queryClient.cancelQueries({ queryKey: notificationKeys.list() })
    const previous = queryClient.getQueryData<NotificationListResponse>(notificationKeys.list())

    if (previous) {
      queryClient.setQueryData(notificationKeys.list(), updater(previous))
    }

    return { previous }
  }

  const rollback = (context: { previous: NotificationListResponse | undefined } | undefined) => {
    if (context?.previous) {
      queryClient.setQueryData(notificationKeys.list(), context.previous)
    }
  }

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: notificationKeys.list() })
  }

  return { patchList, rollback, invalidate }
}

export const useMarkNotificationRead = () => {
  const { patchList, rollback, invalidate } = useOptimisticListPatch()

  return useMutation({
    mutationFn: (notificationId: number) => notificationApi.markNotificationRead(notificationId),
    onMutate: (notificationId) =>
      patchList((current) => {
        const target = current.notifications.find(
          (notification) => notification.id === notificationId,
        )

        return {
          notifications: current.notifications.map((notification) =>
            notification.id === notificationId ? { ...notification, isRead: true } : notification,
          ),
          unreadCount:
            target && !target.isRead ? Math.max(0, current.unreadCount - 1) : current.unreadCount,
        }
      }),
    onError: (_error, _notificationId, context) => rollback(context),
    onSettled: invalidate,
  })
}

export const useDeleteNotification = () => {
  const { patchList, rollback, invalidate } = useOptimisticListPatch()

  return useMutation({
    mutationFn: (notificationId: number) => notificationApi.deleteNotification(notificationId),
    onMutate: (notificationId) =>
      patchList((current) => {
        const target = current.notifications.find(
          (notification) => notification.id === notificationId,
        )

        return {
          notifications: current.notifications.filter(
            (notification) => notification.id !== notificationId,
          ),
          unreadCount:
            target && !target.isRead ? Math.max(0, current.unreadCount - 1) : current.unreadCount,
        }
      }),
    onError: (_error, _notificationId, context) => rollback(context),
    onSettled: invalidate,
  })
}

export const useDeleteAllNotifications = () => {
  const { patchList, rollback, invalidate } = useOptimisticListPatch()

  return useMutation({
    mutationFn: notificationApi.deleteAllNotifications,
    onMutate: () => patchList(() => ({ notifications: [], unreadCount: 0 })),
    onError: (_error, _variables, context) => rollback(context),
    onSettled: invalidate,
  })
}
