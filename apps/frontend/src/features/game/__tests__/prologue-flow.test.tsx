import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { StrictMode, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { renderHook } from '@testing-library/react'

import { gameApi } from '../api'
import { useCreateGameSession } from '../hooks'
import { GameContainer } from '../components/GameContainer'
import { useGameStore } from '../store'
import type {
  GameSessionResponse,
  MoveResponse,
  ScenarioNode,
  ScenarioTree,
} from '../types'

/**
 * "신규 시작" 케이스 전체 흐름 회귀 테스트.
 *
 * LobbyPage → mutate({scenarioId}) → mutationFn 내부 (resetStore → createGameSession
 * → fetchQuery(scenarioDetail) → hydrateFromSession{prologue}) → store 상태 →
 * GameContainer mount → PrologueScreen 렌더.
 *
 * 각 단계를 직접 검증하여, prologue가 끊기는 단계를 정확히 짚는다.
 */

vi.mock('../api', () => ({
  gameApi: {
    fetchScenarios: vi.fn(),
    fetchScenarioDetail: vi.fn(),
    createGameSession: vi.fn(),
    submitChoice: vi.fn(),
    getGameSession: vi.fn(),
    undoLastChoice: vi.fn(),
    fetchActiveSession: vi.fn(),
  },
  toGameEngineError: (error: unknown) =>
    new Error((error as Error)?.message ?? 'unknown'),
}))

const mockedCreate = gameApi.createGameSession as unknown as Mock
const mockedDetail = gameApi.fetchScenarioDetail as unknown as Mock
const mockedGet = gameApi.getGameSession as unknown as Mock

const baseNode: ScenarioNode = {
  id: 'n0',
  type: 'narrative',
  text: '의심스러운 문자가 도착했습니다.',
  choices: [],
  educational_content: null,
  image_url: null,
  image_prompt: null,
  depth: 0,
  parent_node_id: null,
  parent_choice_id: null,
  ending_category: null,
}

const sessionResponse: GameSessionResponse = {
  session_id: 'sess1',
  scenario_id: 'scn1',
  user_id: 1,
  current_node_id: 'n0',
  current_node: baseNode,
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
  current_node: baseNode,
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

const PROLOGUE_TEXT = '사흘 전, 당신은 인근 소방서의 행정관이라는 사람에게서 50인분 단체 도시락 예약 전화를 받았습니다.'

const treeWithPrologue: ScenarioTree = {
  scenario_id: 'scn1',
  title: '공공기관 사칭',
  description: '',
  phishing_type: 'smishing',
  difficulty: 'easy',
  root_node_id: 'n0',
  nodes: { n0: baseNode },
  protagonist: null,
  prologue: PROLOGUE_TEXT,
  total_endings: 0,
  total_good_endings: 0,
  total_bad_endings: 0,
  ending_categories: null,
  tags: [],
  created_at: '2026-05-18T00:00:00Z',
  updated_at: '2026-05-18T00:00:00Z',
}

const makeWrapper = (qc: QueryClient, strict = false) => {
  const Wrapper = ({ children }: { children: ReactNode }) => {
    const tree = (
      <QueryClientProvider client={qc}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    )
    return strict ? <StrictMode>{tree}</StrictMode> : tree
  }
  return Wrapper
}

describe('prologue flow (LobbyPage → mutate → navigate → GameContainer)', () => {
  beforeEach(() => {
    mockedCreate.mockReset()
    mockedDetail.mockReset()
    mockedGet.mockReset()
    useGameStore.getState().reset()
  })

  it('Step A: mutationFn fetches prologue and hydrates store with phase=prologue', async () => {
    mockedCreate.mockResolvedValue(sessionResponse)
    mockedDetail.mockResolvedValue(treeWithPrologue)

    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    })
    const Wrapper = makeWrapper(qc)

    const { result } = renderHook(() => useCreateGameSession(), { wrapper: Wrapper })

    await act(async () => {
      await result.current.mutateAsync({ scenarioId: 'scn1' })
    })

    // mutationFn 호출 검증
    expect(mockedCreate).toHaveBeenCalledWith('scn1', false)
    expect(mockedDetail).toHaveBeenCalledWith('scn1')

    // store 상태 검증
    const snap = useGameStore.getState().snapshot
    expect(snap).not.toBeNull()
    expect(snap?.phase).toBe('prologue')
    expect(snap?.sessionId).toBe('sess1')
  })

  it('Step B: After mutate, GameContainer mounts and shows PrologueScreen (no StrictMode)', async () => {
    mockedCreate.mockResolvedValue(sessionResponse)
    mockedDetail.mockResolvedValue(treeWithPrologue)
    mockedGet.mockResolvedValue(sessionAsMove)

    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    })
    const Wrapper = makeWrapper(qc)

    // mutate 시뮬레이션
    const { result } = renderHook(() => useCreateGameSession(), { wrapper: Wrapper })
    await act(async () => {
      await result.current.mutateAsync({ scenarioId: 'scn1' })
    })

    // mount GameContainer (simulating navigate to /play/sess1)
    render(<GameContainer sessionId="sess1" />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(screen.getByLabelText('시나리오 프롤로그')).toBeInTheDocument()
    })
  })

  it('Step C: Same flow with StrictMode — prologue must NOT disappear', async () => {
    mockedCreate.mockResolvedValue(sessionResponse)
    mockedDetail.mockResolvedValue(treeWithPrologue)
    mockedGet.mockResolvedValue(sessionAsMove)

    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    })
    const Wrapper = makeWrapper(qc, true)

    const { result } = renderHook(() => useCreateGameSession(), { wrapper: Wrapper })
    await act(async () => {
      await result.current.mutateAsync({ scenarioId: 'scn1' })
    })

    // snapshot 확인
    expect(useGameStore.getState().snapshot?.phase).toBe('prologue')

    render(<GameContainer sessionId="sess1" />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(screen.getByLabelText('시나리오 프롤로그')).toBeInTheDocument()
    })

    // 후속 상태 확인 — useGameSession이 응답을 가져온 후에도 prologue 유지
    await waitFor(() => {
      expect(mockedGet).toHaveBeenCalled()
    })
    expect(useGameStore.getState().snapshot?.phase).toBe('prologue')
    expect(screen.getByLabelText('시나리오 프롤로그')).toBeInTheDocument()
  })
})
