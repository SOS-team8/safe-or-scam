/**
 * Game engine API TypeScript types.
 *
 * **All fields are snake_case** to match the locked contracts:
 * - `logs/integration/_workspace/contracts/game-engine-api.md` v2
 * - `logs/integration/_workspace/contracts/scenario-tree.md` v2
 *
 * Do NOT convert to camelCase. Phase 1/2/3 review concluded the snake↔camel
 * boundary lives at the backend (/users/me), not the game engine.
 */

// ---------- value objects (scenario-tree v2) ----------

export type Difficulty = 'easy' | 'medium' | 'hard'

export type ScenarioNodeType = 'narrative' | 'ending_good' | 'ending_bad'

export type EndingType = 'ending_good' | 'ending_bad'

export type SessionStatus = 'playing' | 'completed' | 'abandoned'

export interface Resources {
  trust: number
  money: number
  awareness: number
}

export interface ResourceDelta {
  trust: number
  money: number
  awareness: number
}

export interface ProtagonistProfile {
  age_group: 'young adult' | 'middle-aged' | 'elderly'
  gender: 'man' | 'woman'
  description: string
  appearance: string
}

export interface EducationalContent {
  title: string
  explanation: string
  prevention_tips: string[]
  warning_signs: string[]
}

export interface DangerFeedback {
  why_dangerous: string
  warning_signs: string[]
  safe_alternative: string
}

export interface Choice {
  id: string
  text: string
  next_node_id: string | null
  is_dangerous: boolean
  resource_effect: ResourceDelta
  danger_feedback: DangerFeedback | null
}

export interface EndingCategory {
  category_id: string
  label: string
  description: string
  node_ids: string[]
}

export interface ScenarioNode {
  id: string
  type: ScenarioNodeType
  text: string
  choices: Choice[]
  educational_content: EducationalContent | null
  image_url: string | null
  image_prompt: string | null
  depth: number
  parent_node_id: string | null
  parent_choice_id: string | null
  ending_category: string | null
}

export interface ScenarioTree {
  scenario_id: string
  title: string
  description: string
  phishing_type: string
  difficulty: Difficulty
  root_node_id: string
  nodes: Record<string, ScenarioNode>
  protagonist: ProtagonistProfile | null
  prologue: string | null
  total_endings: number
  total_good_endings: number
  total_bad_endings: number
  ending_categories: Record<string, EndingCategory> | null
  tags: string[]
  created_at: string
  updated_at: string
}

// ---------- API responses (game-engine-api v2) ----------

export interface ScenarioSummary {
  scenario_id: string
  title: string
  description: string
  phishing_type: string
  difficulty: Difficulty
  total_endings: number
  total_good_endings: number
  total_bad_endings: number
  tags: string[]
}

export interface ChoiceHistoryEntry {
  node_id: string
  choice_id: string
  is_dangerous: boolean
  timestamp: string
}

/** POST /game-sessions response (201). */
export interface GameSessionResponse {
  session_id: string
  scenario_id: string
  user_id: number
  current_node_id: string
  current_node: ScenarioNode
  resources: Resources
  status: SessionStatus
  dangerous_count: number
  choices_history: ChoiceHistoryEntry[]
  started_at: string
  completed_at: string | null
}

/**
 * POST /move response (200).
 *
 * Also returned by GET /{id} and POST /{id}/undo, with `danger_feedback` and
 * `educational_content` always null in those endpoints (game-engine-api v2 §3-5).
 */
export interface MoveResponse {
  session_id: string
  scenario_id: string
  current_node_id: string
  current_node: ScenarioNode
  resources: Resources
  status: SessionStatus
  dangerous_count: number
  choices_history: ChoiceHistoryEntry[]
  danger_feedback: DangerFeedback | null
  educational_content: EducationalContent | null
  is_finished: boolean
  ending_type: EndingType | null
  ending_category: string | null
  started_at: string
  completed_at: string | null
}

/**
 * GET /game-sessions/active?scenario_id=... 응답.
 *
 * 동일 user×scenario의 status=playing 세션이 있으면 active=true + session 반환.
 * LobbyPage가 카드 클릭 시 "이어하기 / 처음부터" 다이얼로그 표시 여부 판단용.
 */
export interface ActiveSessionResponse {
  active: boolean
  session: GameSessionResponse | null
}

// ---------- request bodies ----------

export interface CreateSessionRequest {
  scenario_id: string
  /**
   * true면 동일 user×scenario 활성 세션을 abandoned로 표시 후 새 세션 생성.
   * false (기본) 면 idempotent resume.
   */
  force_new?: boolean
}

export interface MoveRequest {
  choice_id: string
}

// ---------- scenario list filters ----------

export interface ScenarioFilters {
  difficulty?: Difficulty
  phishing_type?: string
}
