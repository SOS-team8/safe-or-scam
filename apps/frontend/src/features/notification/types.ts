export type NotificationType = 'ACHIEVEMENT' | 'NEW_SCENARIO' | 'SYSTEM'

export type NotificationItem = {
  id: number
  type: NotificationType
  title: string
  referencedId: string | null
  isRead: boolean
  createdAt: string
}

export type NotificationListResponse = {
  notifications: NotificationItem[]
  unreadCount: number
}
