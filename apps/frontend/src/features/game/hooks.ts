import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { gameApi } from './api'
import { gameKeys } from './queryKeys'
import { useGameStore } from './store'
import type { ScenarioFilters } from './types'

export const useScenarios = (filters?: ScenarioFilters) =>
  useQuery({
    queryKey: gameKeys.scenarios(filters),
    queryFn: () => gameApi.fetchScenarios(filters),
  })

export const useScenarioDetail = (scenarioId: string | undefined) =>
  useQuery({
    queryKey: gameKeys.scenario(scenarioId ?? ''),
    queryFn: () => gameApi.fetchScenarioDetail(scenarioId as string),
    enabled: Boolean(scenarioId),
  })

export const useCreateGameSession = () => {
  const hydrateFromSession = useGameStore((s) => s.hydrateFromSession)
  return useMutation({
    mutationFn: (scenarioId: string) => gameApi.createGameSession(scenarioId),
    onSuccess: (session) => {
      hydrateFromSession(session)
    },
  })
}

export const useSubmitChoice = (sessionId: string) => {
  const applyMove = useGameStore((s) => s.applyMove)
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (choiceId: string) => gameApi.submitChoice(sessionId, choiceId),
    onSuccess: (response) => {
      applyMove(response)
      queryClient.setQueryData(gameKeys.session(sessionId), response)
    },
  })
}

export const useGameSession = (sessionId: string | undefined) => {
  const hydrateApply = useGameStore((s) => s.applyMove)
  return useQuery({
    queryKey: gameKeys.session(sessionId ?? ''),
    queryFn: async () => {
      const data = await gameApi.getGameSession(sessionId as string)
      hydrateApply(data)
      return data
    },
    enabled: Boolean(sessionId),
  })
}
