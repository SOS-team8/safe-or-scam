export const achievementKeys = {
  all: ['achievement'] as const,
  list: () => [...achievementKeys.all, 'list'] as const,
}
