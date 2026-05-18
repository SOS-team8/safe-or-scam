import { create } from 'zustand'

import type {
  ChoiceHistoryEntry,
  DangerFeedback,
  EducationalContent,
  EndingType,
  GameSessionResponse,
  MoveResponse,
  Resources,
  ScenarioNode,
  SessionStatus,
} from './types'

/**
 * 게임 진행 단계.
 * - prologue: 시나리오의 prologue를 표시하는 시작 화면.
 * - playing: 노드 → 선택 → 노드 진행 중.
 * - ended: isFinished=true (EndingScreen에서 처리).
 *
 * prologue가 null/공백이면 hydrateFromSession이 곧장 playing으로 들어간다.
 */
export type GamePhase = 'prologue' | 'playing' | 'ended'

type GameSnapshot = {
  sessionId: string
  scenarioId: string
  currentNode: ScenarioNode
  resources: Resources
  previousResources: Resources | null
  status: SessionStatus
  dangerousCount: number
  history: ChoiceHistoryEntry[]
  isFinished: boolean
  endingType: EndingType | null
  endingCategory: string | null
  pendingEducationalContent: EducationalContent | null
  pendingDangerFeedback: DangerFeedback | null
  phase: GamePhase
}

type GameStoreState = GameSnapshot | null

type GameStoreActions = {
  hydrateFromSession: (
    session: GameSessionResponse,
    options?: { prologue?: string | null },
  ) => void
  applyMove: (response: MoveResponse) => void
  dismissPopup: () => void
  startGameAfterPrologue: () => void
  reset: () => void
}

type GameStore = {
  snapshot: GameStoreState
} & GameStoreActions

const hasMeaningfulText = (s: string | null | undefined): s is string =>
  typeof s === 'string' && s.trim().length > 0

const buildSnapshotFromSession = (
  session: GameSessionResponse,
  prologue?: string | null,
): GameSnapshot => ({
  sessionId: session.session_id,
  scenarioId: session.scenario_id,
  currentNode: session.current_node,
  resources: session.resources,
  previousResources: null,
  status: session.status,
  dangerousCount: session.dangerous_count,
  history: session.choices_history,
  isFinished: false,
  endingType: null,
  endingCategory: null,
  pendingEducationalContent: null,
  pendingDangerFeedback: null,
  phase: hasMeaningfulText(prologue) ? 'prologue' : 'playing',
})

const buildSnapshotFromMove = (
  prev: GameSnapshot,
  move: MoveResponse,
): GameSnapshot => ({
  sessionId: move.session_id,
  scenarioId: move.scenario_id,
  currentNode: move.current_node,
  resources: move.resources,
  previousResources: prev.resources,
  status: move.status,
  dangerousCount: move.dangerous_count,
  history: move.choices_history,
  isFinished: move.is_finished,
  endingType: move.ending_type,
  endingCategory: move.ending_category,
  pendingEducationalContent: move.educational_content,
  pendingDangerFeedback: move.danger_feedback,
  // is_finished면 ended로. 아니면 이전 phase를 유지 — prologue 중 GET /session 응답이
  // 들어와도 phase가 'prologue'로 보존된다 (사용자가 명시 시작 버튼을 눌러야 playing 진입).
  phase: move.is_finished ? 'ended' : prev.phase,
})

export const useGameStore = create<GameStore>((set) => ({
  snapshot: null,
  hydrateFromSession: (session, options) =>
    set({
      snapshot: buildSnapshotFromSession(session, options?.prologue),
    }),
  applyMove: (response) =>
    set((state) => {
      if (!state.snapshot) {
        // Move arrived before hydration — derive what we can from the move alone.
        return {
          snapshot: {
            sessionId: response.session_id,
            scenarioId: response.scenario_id,
            currentNode: response.current_node,
            resources: response.resources,
            previousResources: null,
            status: response.status,
            dangerousCount: response.dangerous_count,
            history: response.choices_history,
            isFinished: response.is_finished,
            endingType: response.ending_type,
            endingCategory: response.ending_category,
            pendingEducationalContent: response.educational_content,
            pendingDangerFeedback: response.danger_feedback,
            phase: response.is_finished ? 'ended' : 'playing',
          },
        }
      }
      return { snapshot: buildSnapshotFromMove(state.snapshot, response) }
    }),
  dismissPopup: () =>
    set((state) => {
      if (!state.snapshot) return state
      return {
        snapshot: {
          ...state.snapshot,
          pendingEducationalContent: null,
          pendingDangerFeedback: null,
        },
      }
    }),
  startGameAfterPrologue: () =>
    set((state) => {
      if (!state.snapshot) return state
      if (state.snapshot.phase !== 'prologue') return state
      return {
        snapshot: {
          ...state.snapshot,
          phase: 'playing',
        },
      }
    }),
  reset: () => set({ snapshot: null }),
}))
