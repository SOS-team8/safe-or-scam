export const statsKeys = {
  all: ['stats'] as const,
  me: () => [...statsKeys.all, 'me'] as const,
}
