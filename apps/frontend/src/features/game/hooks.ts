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
  const queryClient = useQueryClient()
  return useMutation({
    // mutationFn 안에서 session 생성과 scenario detail 사전 fetch를 함께 수행 →
    // base onSuccess와 call-site onSuccess 사이의 race를 피하고, hydrateFromSession을
    // mutate()의 callback이 호출되기 전에 끝낸다.
    mutationFn: async (scenarioId: string) => {
      const session = await gameApi.createGameSession(scenarioId)
      let prologue: string | null
      try {
        const tree = await queryClient.fetchQuery({
          queryKey: gameKeys.scenario(session.scenario_id),
          queryFn: () => gameApi.fetchScenarioDetail(session.scenario_id),
        })
        prologue = tree.prologue ?? null
      } catch {
        // prologue fetch 실패는 치명적이지 않다 — phase는 자동으로 playing.
        prologue = null
      }
      hydrateFromSession(session, { prologue })
      return session
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
