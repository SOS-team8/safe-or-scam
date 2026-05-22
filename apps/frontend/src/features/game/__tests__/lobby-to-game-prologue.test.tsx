/**
 * 전체 흐름 회귀 테스트: LobbyPage 카드 클릭 → 다이얼로그 → 처음부터 → GameContainer → PrologueScreen.
 *
 * 사용자 보고된 "프롤로그가 안 뜸" 문제가 어디서 발생하는지 정확히 짚는다.
 */
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

import { gameApi } from '../api'
import { userApi } from '@/features/user/api'
import { GameContainer } from '../components/GameContainer'
import { LobbyPage } from '@/features/game-session/pages/LobbyPage'
import { useGameStore } from '../store'
import { useAuthStore } from '@/features/auth/store'
import type {
  GameSessionResponse,
  MoveResponse,
  ScenarioNode,
  ScenarioSummary,
  ScenarioTree,
} from '../types'
import type { UserProfile } from '@/features/user/types'

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

vi.mock('@/features/user/api', () => ({
  userApi: { getMe: vi.fn() },
}))

const mockedScenarios = gameApi.fetchScenarios as unknown as Mock
const mockedCreate = gameApi.createGameSession as unknown as Mock
const mockedDetail = gameApi.fetchScenarioDetail as unknown as Mock
const mockedGet = gameApi.getGameSession as unknown as Mock
const mockedActive = gameApi.fetchActiveSession as unknown as Mock
const mockedGetMe = userApi.getMe as unknown as Mock

const baseProfile: UserProfile = {
  name: '테스터',
  email: 'tester@example.com',
  occupation: 'EMPLOYEE',
  gender: 'FEMALE',
  ageGroup: 'TWENTIES',
}

const scenarios: ScenarioSummary[] = [
  {
    scenario_id: 'scn1',
    title: '택배 스미싱',
    description: '받지 않은 택배 알림',
    phishing_type: 'smishing',
    difficulty: 'easy',
    total_endings: 2,
    total_good_endings: 1,
    total_bad_endings: 1,
    tags: [],
  },
]

const rootNode: ScenarioNode = {
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
  ...session,
  danger_feedback: null,
  educational_content: null,
  is_finished: false,
  ending_type: null,
  ending_category: null,
} as MoveResponse

const PROLOGUE = '사흘 전 의심스러운 문자가 도착했고, 당신은 결정의 순간을 맞이합니다.'

const tree: ScenarioTree = {
  scenario_id: 'scn1',
  title: '택배 스미싱',
  description: '',
  phishing_type: 'smishing',
  difficulty: 'easy',
  root_node_id: 'n0',
  nodes: { n0: rootNode },
  protagonist: null,
  prologue: PROLOGUE,
  total_endings: 2,
  total_good_endings: 1,
  total_bad_endings: 1,
  ending_categories: null,
  tags: [],
  created_at: '2026-05-18T00:00:00Z',
  updated_at: '2026-05-18T00:00:00Z',
}

const FakePlayPage = () => {
  // useParams 대체 — 라우터 파라미터에 sessionId 전달
  return <GameContainer sessionId="sess1" />
}

const FullAppWrapper =
  (strict: boolean) =>
  ({ children }: { children: ReactNode }) => {
    const qc = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
    })
    const tree = (
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/lobby']}>{children}</MemoryRouter>
      </QueryClientProvider>
    )
    return strict ? <StrictMode>{tree}</StrictMode> : tree
  }

const AppRoutes = () => {
  // navigate 후 /play/sess1 mount되도록 라우트 구성
  return (
    <Routes>
      <Route path="/lobby" element={<LobbyPage />} />
      <Route path="/play/:sessionId" element={<FakePlayPage />} />
    </Routes>
  )
}

describe('Lobby → Game Prologue flow regression', () => {
  beforeEach(() => {
    mockedScenarios.mockReset()
    mockedCreate.mockReset()
    mockedDetail.mockReset()
    mockedGet.mockReset()
    mockedActive.mockReset()
    mockedGetMe.mockReset()
    mockedGetMe.mockResolvedValue(baseProfile)
    mockedScenarios.mockResolvedValue(scenarios)
    mockedDetail.mockResolvedValue(tree)
    mockedCreate.mockResolvedValue(session)
    mockedGet.mockResolvedValue(sessionAsMove)
    useGameStore.getState().reset()
    // auth store 시뮬레이션 (LobbyPage가 ProtectedRoute에 의해 가드되어 있지 않은 라우트면 통과)
    useAuthStore.setState({
      accessToken: 'fake',
      refreshToken: 'fake',
      isAuthenticated: true,
      isBootstrapping: false,
    } as Partial<ReturnType<typeof useAuthStore.getState>> as never)
  })

  it('CASE 1 (new start, no active session): card click → mutation → navigate → PrologueScreen visible', async () => {
    mockedActive.mockResolvedValue({ active: false, session: null })

    const Wrapper = FullAppWrapper(false)
    render(<AppRoutes />, { wrapper: Wrapper })

    // LobbyPage 시나리오 카드 표시
    await screen.findAllByText('택배 스미싱')

    // 카드의 "시작하기" 버튼 클릭
    const user = userEvent.setup()
    const startButtons = screen.getAllByRole('button', { name: /시작하기/ })
    // 맞춤 추천(바로 시작하기) 버튼 사용
    await user.click(startButtons[0])

    // PrologueScreen이 렌더되어야 함
    await waitFor(() => {
      expect(screen.getByLabelText('시나리오 프롤로그')).toBeInTheDocument()
    })
  })

  it('CASE 1 (StrictMode): card click → mutation → navigate → PrologueScreen visible', async () => {
    mockedActive.mockResolvedValue({ active: false, session: null })

    const Wrapper = FullAppWrapper(true)
    render(<AppRoutes />, { wrapper: Wrapper })

    await screen.findAllByText('택배 스미싱')

    const user = userEvent.setup()
    const startButtons = screen.getAllByRole('button', { name: /시작하기/ })
    await user.click(startButtons[0])

    await waitFor(() => {
      expect(screen.getByLabelText('시나리오 프롤로그')).toBeInTheDocument()
    })
    // 후속 GET까지 모두 완료된 후에도 prologue 유지
    await waitFor(() => {
      expect(mockedGet).toHaveBeenCalled()
    })
    expect(screen.getByLabelText('시나리오 프롤로그')).toBeInTheDocument()
  })

  it('CASE 2 (active session, restart): dialog → 처음부터 → PrologueScreen visible', async () => {
    mockedActive.mockResolvedValue({ active: true, session })
    mockedCreate.mockResolvedValue(session) // force_new=true도 동일 응답

    const Wrapper = FullAppWrapper(true)
    render(<AppRoutes />, { wrapper: Wrapper })

    await screen.findAllByText('택배 스미싱')

    const user = userEvent.setup()
    const startButtons = screen.getAllByRole('button', { name: /시작하기/ })
    await user.click(startButtons[0])

    // 다이얼로그 표시
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
    // "처음부터" 버튼
    const restartBtn = screen.getByRole('button', { name: /처음부터/ })
    await user.click(restartBtn)

    // navigate 후 PrologueScreen
    await waitFor(() => {
      expect(screen.getByLabelText('시나리오 프롤로그')).toBeInTheDocument()
    })
  })
})
