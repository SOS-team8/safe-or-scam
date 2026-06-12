export const notificationKeys = {
  all: ['notification'] as const,
  list: () => [...notificationKeys.all, 'list'] as const,
}
