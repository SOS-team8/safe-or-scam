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

export type CreateGameSessionVariables = {
  scenarioId: string
  forceNew?: boolean
}

export const useCreateGameSession = () => {
  const hydrateFromSession = useGameStore((s) => s.hydrateFromSession)
  const resetStore = useGameStore((s) => s.reset)
  const queryClient = useQueryClient()
  return useMutation({
    // mutationFn 안에서 session 생성과 scenario detail 사전 fetch를 함께 수행 →
    // base onSuccess와 call-site onSuccess 사이의 race를 피하고, hydrateFromSession을
    // mutate()의 callback이 호출되기 전에 끝낸다.
    //
    // 후방호환: scenarioId 문자열 단독 인자도 허용 (Phase 4 이전 시그너처).
    mutationFn: async (variables: string | CreateGameSessionVariables) => {
      const { scenarioId, forceNew } =
        typeof variables === 'string'
          ? { scenarioId: variables, forceNew: false }
          : { scenarioId: variables.scenarioId, forceNew: variables.forceNew ?? false }
      // 새 세션 진입 전 이전 snapshot을 비워 prologue/state 잔존을 방지.
      resetStore()
      const session = await gameApi.createGameSession(scenarioId, forceNew)
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

/**
 * GET /game-sessions/active?scenario_id=... 호출.
 *
 * LobbyPage가 카드 클릭 시 직접 호출 (useQuery로 캐시 X — 매번 신선한 응답이 필요).
 * mutation 형태로 노출하지만 부수효과는 없다 (server-side 변경 없음).
 */
export const useFetchActiveSession = () =>
  useMutation({
    mutationFn: (scenarioId: string) => gameApi.fetchActiveSession(scenarioId),
  })

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
