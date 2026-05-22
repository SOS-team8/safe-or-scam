import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { StrictMode, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'

import { gameApi } from '../api'
import { GameContainer } from '../components/GameContainer'
import { useGameStore } from '../store'
import type {
  GameSessionResponse,
  MoveResponse,
  ScenarioNode,
  ScenarioTree,
} from '../types'

/**
 * StrictMode 환경에서 GameContainer가 prologue를 잃지 않는지 검증.
 *
 * 실제 production main.tsx는 <StrictMode>로 App을 감싼다. 이때 React 19는
 * mount → unmount → mount 사이클을 즉시 실행하여 useEffect cleanup이 1회 발생.
 * 만약 cleanup에서 store를 reset하면 prologue 단계가 즉시 사라진다.
 */

vi.mock('../api', () => ({
  gameApi: {
    fetchScenarios: vi.fn(),
    fetchScenarioDetail: vi.fn(),
    createGameSession: vi.fn(),
    submitChoice: vi.fn(),
    getGameSession: vi.fn(),
    undoLastChoice: vi.fn(),
  },
  toGameEngineError: (error: unknown) =>
    new Error((error as Error)?.message ?? 'unknown'),
}))

const mockedGet = gameApi.getGameSession as unknown as Mock
const mockedDetail = gameApi.fetchScenarioDetail as unknown as Mock

const node = (id: string, type: ScenarioNode['type'] = 'narrative'): ScenarioNode => ({
  id,
  type,
  text: `text ${id}`,
  choices: [],
  educational_content: null,
  image_url: null,
  image_prompt: null,
  depth: 0,
  parent_node_id: null,
  parent_choice_id: null,
  ending_category: null,
})

const rootNode: ScenarioNode = {
  ...node('n0'),
  text: '의심스러운 문자가 도착했습니다.',
  choices: [],
}

const session: GameSessionResponse = {
  session_id: 'sess1',
  scenario_id: 'scn1',
  user_id: 1,
  current_node_id: 'n0',
  current_node: rootNode,
  resources: { trust: 3, money: 3, awareness: 1 },
  status: 'playing',
  dangerous_count: 0,
  choices_history: [],
  started_at: '2026-05-18T00:00:00Z',
  completed_at: null,
}

const sessionAsMove: MoveResponse = {
  session_id: 'sess1',
  scenario_id: 'scn1',
  current_node_id: 'n0',
  current_node: rootNode,
  resources: { trust: 3, money: 3, awareness: 1 },
  status: 'playing',
  dangerous_count: 0,
  choices_history: [],
  danger_feedback: null,
  educational_content: null,
  is_finished: false,
  ending_type: null,
  ending_category: null,
  started_at: '2026-05-18T00:00:00Z',
  completed_at: null,
}

const treeWithPrologue: ScenarioTree = {
  scenario_id: 'scn1',
  title: '시나리오',
  description: '',
  phishing_type: 'smishing',
  difficulty: 'easy',
  root_node_id: 'n0',
  nodes: { n0: rootNode },
  protagonist: null,
  prologue: '오늘은 평범한 하루입니다.',
  total_endings: 0,
  total_good_endings: 0,
  total_bad_endings: 0,
  ending_categories: null,
  tags: [],
  created_at: '2026-05-18T00:00:00Z',
  updated_at: '2026-05-18T00:00:00Z',
}

const StrictWrapper = ({ children }: { children: ReactNode }) => {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })
  return (
    <StrictMode>
      <QueryClientProvider client={qc}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    </StrictMode>
  )
}

describe('GameContainer under StrictMode (regression: prologue must persist)', () => {
  beforeEach(() => {
    mockedGet.mockReset()
    mockedDetail.mockReset()
    useGameStore.getState().reset()
  })

  it('renders PrologueScreen and does NOT lose prologue phase due to StrictMode cleanup', async () => {
    mockedGet.mockResolvedValue(sessionAsMove)
    mockedDetail.mockResolvedValue(treeWithPrologue)

    // mutationFn 시뮬레이션: hydrate 후 navigate된 상태
    useGameStore.getState().hydrateFromSession(session, {
      prologue: treeWithPrologue.prologue,
    })

    // hydrate 직후 store 상태 확인
    expect(useGameStore.getState().snapshot?.phase).toBe('prologue')

    render(<GameContainer sessionId="sess1" />, { wrapper: StrictWrapper })

    // StrictMode 환경에서도 PrologueScreen이 보여야 함
    await waitFor(() => {
      expect(screen.getByLabelText('시나리오 프롤로그')).toBeInTheDocument()
    })
    // 후속 비동기까지 모두 완료된 상태에서도 prologue가 유지돼야 함
    await waitFor(() => {
      expect(mockedGet).toHaveBeenCalled()
    })
    // 상세 응답이 가져와진 후에도 prologue phase 유지
    expect(useGameStore.getState().snapshot?.phase).toBe('prologue')
    expect(screen.getByLabelText('시나리오 프롤로그')).toBeInTheDocument()
  })

  it('REGRESSION: useEffect cleanup must NOT wipe prologue snapshot on StrictMode dev double-mount', async () => {
    mockedGet.mockResolvedValue(sessionAsMove)
    mockedDetail.mockResolvedValue(treeWithPrologue)

    useGameStore.getState().hydrateFromSession(session, {
      prologue: treeWithPrologue.prologue,
    })

    // StrictMode 환경에서 mount→cleanup→mount cycle
    render(<GameContainer sessionId="sess1" />, { wrapper: StrictWrapper })

    // StrictMode double-effect 후에도 snapshot이 살아 있어야 함
    // (cleanup이 resetStore를 호출하면 snapshot=null이 되어 phase 잃음)
    expect(useGameStore.getState().snapshot).not.toBeNull()
    expect(useGameStore.getState().snapshot?.phase).toBe('prologue')
  })
})
