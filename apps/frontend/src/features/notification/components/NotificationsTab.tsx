import { useNavigate } from 'react-router-dom'

import { toApiError } from '@/shared/api/error'

import {
  useDeleteAllNotifications,
  useDeleteNotification,
  useMarkNotificationRead,
  useNotifications,
} from '../hooks'
import { formatRelativeTime } from '../relativeTime'
import type { NotificationItem, NotificationType } from '../types'

type NotificationsTabProps = {
  onToast: (toast: { tone: 'success' | 'error'; message: string }) => void
  onGoToAchievement: (achievementId: number | null) => void
  /** 라우팅이 발생하는 알림(NEW_SCENARIO)을 열 때 호출 — 팝오버 닫기 등 부가 동작용 */
  onNavigate?: () => void
}

const typeLabels: Record<NotificationType, string> = {
  ACHIEVEMENT: '업적',
  NEW_SCENARIO: '새 시나리오',
  SYSTEM: '시스템',
}

function NotificationListSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className="flex items-center gap-3 rounded-lg border border-sos-line bg-sos-inset p-4"
        >
          <div className="size-2 animate-pulse rounded-full bg-slate-800" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-16 animate-pulse rounded bg-slate-800" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-slate-800" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function NotificationsTab({ onToast, onGoToAchievement, onNavigate }: NotificationsTabProps) {
  const navigate = useNavigate()
  const notificationsQuery = useNotifications()
  const markReadMutation = useMarkNotificationRead()
  const deleteMutation = useDeleteNotification()
  const deleteAllMutation = useDeleteAllNotifications()

  const markAsRead = (notification: NotificationItem) => {
    if (notification.isRead) {
      return
    }

    markReadMutation.mutate(notification.id, {
      onError: (error) => {
        onToast({ tone: 'error', message: toApiError(error).message })
      },
    })
  }

  const handleOpen = (notification: NotificationItem) => {
    markAsRead(notification)

    if (notification.type === 'ACHIEVEMENT') {
      const achievementId = notification.referencedId ? Number(notification.referencedId) : null
      onGoToAchievement(Number.isNaN(achievementId) ? null : achievementId)
      return
    }

    if (notification.type === 'NEW_SCENARIO') {
      onNavigate?.()
      navigate('/lobby')
    }
  }

  const handleDelete = (notification: NotificationItem) => {
    deleteMutation.mutate(notification.id, {
      onError: (error) => {
        onToast({ tone: 'error', message: toApiError(error).message })
      },
    })
  }

  const handleDeleteAll = () => {
    deleteAllMutation.mutate(undefined, {
      onSuccess: () => {
        onToast({ tone: 'success', message: '알림을 모두 삭제했어요.' })
      },
      onError: (error) => {
        onToast({ tone: 'error', message: toApiError(error).message })
      },
    })
  }

  if (notificationsQuery.isPending) {
    return <NotificationListSkeleton />
  }

  if (notificationsQuery.isError) {
    return (
      <div className="rounded-lg border border-red-300/25 bg-red-500/10 p-6">
        <p className="text-sm text-red-100">{toApiError(notificationsQuery.error).message}</p>
        <button
          type="button"
          onClick={() => void notificationsQuery.refetch()}
          className="mt-4 rounded-lg bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-300"
        >
          다시 시도
        </button>
      </div>
    )
  }

  const { notifications, unreadCount } = notificationsQuery.data

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-sos-body">
          읽지 않은 <span className="font-semibold tabular-nums text-emerald-200">{unreadCount}</span>개
        </p>
        <button
          type="button"
          disabled={notifications.length === 0 || deleteAllMutation.isPending}
          onClick={handleDeleteAll}
          className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-sos-body transition hover:border-emerald-300 hover:text-sos-strong disabled:cursor-not-allowed disabled:border-white/5 disabled:text-slate-600"
        >
          모두 삭제
        </button>
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-lg border border-sos-line bg-sos-inset p-6 text-center">
          <p className="text-sm font-medium text-sos-body">받은 알림이 없어요.</p>
          <p className="mt-1 text-sm text-sos-faint">새 소식이 도착하면 여기에 표시됩니다.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {notifications.map((notification) => (
            <li
              key={notification.id}
              className="flex items-start gap-3 rounded-lg border border-sos-line bg-sos-inset p-4 transition hover:border-emerald-300/40"
            >
              <span
                aria-hidden="true"
                className={`mt-2 size-2 shrink-0 rounded-full ${
                  notification.isRead ? 'bg-slate-700' : 'bg-emerald-300'
                }`}
              />
              <button
                type="button"
                onClick={() => handleOpen(notification)}
                className="min-w-0 flex-1 rounded-md text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200"
              >
                <span className="rounded-md bg-slate-800 px-2 py-0.5 text-xs font-medium text-sos-body">
                  {typeLabels[notification.type]}
                </span>
                <p
                  className={`mt-2 truncate text-sm ${
                    notification.isRead ? 'text-sos-body' : 'font-semibold text-sos-strong'
                  }`}
                >
                  {notification.title}
                </p>
                <p className="mt-1 text-xs text-sos-faint">
                  {formatRelativeTime(notification.createdAt)}
                </p>
              </button>
              <div className="flex shrink-0 gap-2">
                {!notification.isRead ? (
                  <button
                    type="button"
                    onClick={() => markAsRead(notification)}
                    className="rounded-md border border-white/10 px-2 py-1 text-xs font-medium text-sos-body transition hover:border-emerald-300 hover:text-sos-strong"
                  >
                    읽음
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => handleDelete(notification)}
                  className="rounded-md border border-white/10 px-2 py-1 text-xs font-medium text-sos-body transition hover:border-red-300 hover:text-red-200"
                >
                  삭제
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
