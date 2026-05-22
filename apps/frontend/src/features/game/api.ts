import axios from 'axios'

import { gameEngineClient } from '@/shared/api/client'

import type {
  ActiveSessionResponse,
  GameSessionResponse,
  MoveResponse,
  ScenarioFilters,
  ScenarioSummary,
  ScenarioTree,
} from './types'

const DEFAULT_ERROR_MESSAGE = '게임 서버 요청 처리 중 문제가 발생했습니다'

/**
 * Game-engine HTTP client.
 *
 * All endpoints use the locked `game-engine-api.md` v2 contract:
 * - snake_case bodies/responses
 * - JWT `Authorization: Bearer <token>` header (attached by gameEngineClient interceptor)
 * - error response shape `{"detail": str}` (FastAPI default, ADR-003)
 */
export const gameApi = {
  fetchScenarios: async (filters?: ScenarioFilters): Promise<ScenarioSummary[]> => {
    const response = await gameEngineClient.get<ScenarioSummary[]>('/api/v1/scenarios', {
      params: filters,
    })
    return response.data
  },

  fetchScenarioDetail: async (scenarioId: string): Promise<ScenarioTree> => {
    const response = await gameEngineClient.get<ScenarioTree>(
      `/api/v1/scenarios/${scenarioId}`,
    )
    return response.data
  },

  /**
   * POST /game-sessions.
   *
   * `forceNew=true`면 body에 `force_new: true`를 보내 활성 세션을 abandoned로 표시 후
   * 새 세션을 생성한다 ("처음부터" UX). 기본 false는 idempotent resume.
   */
  createGameSession: async (
    scenarioId: string,
    forceNew = false,
  ): Promise<GameSessionResponse> => {
    const body: { scenario_id: string; force_new?: boolean } = {
      scenario_id: scenarioId,
    }
    if (forceNew) body.force_new = true
    const response = await gameEngineClient.post<GameSessionResponse>(
      '/api/v1/game-sessions',
      body,
    )
    return response.data
  },

  /**
   * GET /game-sessions/active?scenario_id=...
   *
   * 동일 user×scenario의 활성 세션 정보 또는 null. LobbyPage가 다이얼로그 표시 여부 판단.
   */
  fetchActiveSession: async (
    scenarioId: string,
  ): Promise<ActiveSessionResponse> => {
    const response = await gameEngineClient.get<ActiveSessionResponse>(
      '/api/v1/game-sessions/active',
      { params: { scenario_id: scenarioId } },
    )
    return response.data
  },

  submitChoice: async (sessionId: string, choiceId: string): Promise<MoveResponse> => {
    const response = await gameEngineClient.post<MoveResponse>(
      `/api/v1/game-sessions/${sessionId}/move`,
      { choice_id: choiceId },
    )
    return response.data
  },

  getGameSession: async (sessionId: string): Promise<MoveResponse> => {
    const response = await gameEngineClient.get<MoveResponse>(
      `/api/v1/game-sessions/${sessionId}`,
    )
    return response.data
  },

  undoLastChoice: async (sessionId: string): Promise<MoveResponse> => {
    const response = await gameEngineClient.post<MoveResponse>(
      `/api/v1/game-sessions/${sessionId}/undo`,
    )
    return response.data
  },
}

/**
 * Convert a game-engine error to a user-facing Error.
 *
 * Game engine follows FastAPI's `{"detail": str}` response shape.
 * Reference: `phase3-cross-boundary.md` §2 helper signature.
 */
export const toGameEngineError = (error: unknown): Error => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { detail?: unknown } | undefined
    if (data && typeof data.detail === 'string' && data.detail) {
      return new Error(data.detail)
    }
  }
  return new Error(DEFAULT_ERROR_MESSAGE)
}
