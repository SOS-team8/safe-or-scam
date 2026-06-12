export const historyKeys = {
  all: ['history'] as const,
  progress: () => [...historyKeys.all, 'progress'] as const,
  playLogs: (scenarioId: string) => [...historyKeys.all, 'play-logs', scenarioId] as const,
  playLogDetail: (logId: string) => [...historyKeys.all, 'play-log', logId] as const,
}
