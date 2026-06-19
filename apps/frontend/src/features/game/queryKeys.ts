import type { ScenarioFilters } from './types'

export const gameKeys = {
  all: ['game'] as const,
  scenarios: (filters?: ScenarioFilters) =>
    [...gameKeys.all, 'scenarios', filters ?? null] as const,
  scenario: (scenarioId: string) =>
    [...gameKeys.all, 'scenarios', 'detail', scenarioId] as const,
  session: (sessionId: string) =>
    [...gameKeys.all, 'sessions', sessionId] as const,
}
