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
}

type GameStoreState = GameSnapshot | null

type GameStoreActions = {
  hydrateFromSession: (session: GameSessionResponse) => void
  applyMove: (response: MoveResponse) => void
  dismissPopup: () => void
  reset: () => void
}

type GameStore = {
  snapshot: GameStoreState
} & GameStoreActions

const buildSnapshotFromSession = (session: GameSessionResponse): GameSnapshot => ({
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
})

export const useGameStore = create<GameStore>((set) => ({
  snapshot: null,
  hydrateFromSession: (session) =>
    set({ snapshot: buildSnapshotFromSession(session) }),
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
  reset: () => set({ snapshot: null }),
}))
