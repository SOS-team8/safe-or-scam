import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { createWrapper } from '@/test/test-utils'

import { gameApi } from '@/features/game/api'
import { userApi } from '@/features/user/api'
import { useGameStore } from '@/features/game/store'
import { LobbyPage } from '../pages/LobbyPage'
import type { GameSessionResponse, ScenarioSummary } from '@/features/game/types'
import type { UserProfile } from '@/features/user/types'

vi.mock('@/features/game/api', () => ({
  gameApi: {
    fetchScenarios: vi.fn(),
    createGameSession: vi.fn(),
    fetchActiveSession: vi.fn(),
    fetchScenarioDetail: vi.fn(),
  },
  toGameEngineError: (error: unknown) =>
    new Error(
      (error as { message?: string } | undefined)?.message ?? '게임 서버 오류',
    ),
}))

vi.mock('@/features/user/api', () => ({
  userApi: {
    getMe: vi.fn(),
  },
}))

const mockedFetch = gameApi.fetchScenarios as unknown as Mock
const mockedCreate = gameApi.createGameSession as unknown as Mock
const mockedActive = gameApi.fetchActiveSession as unknown as Mock
const mockedFetchDetail = gameApi.fetchScenarioDetail as unknown as Mock
const mockedGetMe = userApi.getMe as unknown as Mock

const baseProfile: UserProfile = {
  name: '테스터',
  email: 'tester@example.com',
  occupation: 'EMPLOYEE',
  gender: 'FEMALE',
  ageGroup: 'TWENTIES',
}

const baseScenarios: ScenarioSummary[] = [
  {
    scenario_id: 's1',
    title: '택배 스미싱',
    description: '받지 않은 택배 알림 문자',
    phishing_type: 'smishing',
    difficulty: 'easy',
    total_endings: 4,
    total_good_endings: 2,
    total_bad_endings: 2,
    tags: [],
  },
  {
    scenario_id: 's2',
    title: '보안 인증 알림',
    description: '회사 보안 메일 점검',
    phishing_type: 'voice_phishing',
    difficulty: 'medium',
    total_endings: 3,
    total_good_endings: 1,
    total_bad_endings: 2,
    tags: [],
  },
]

describe('LobbyPage', () => {
  beforeEach(() => {
    mockedFetch.mockReset()
    mockedCreate.mockReset()
    mockedActive.mockReset()
    mockedFetchDetail.mockReset()
    mockedGetMe.mockReset()
    mockedGetMe.mockResolvedValue(baseProfile)
    // 기본은 활성 세션 없음 — 카드 클릭 시 곧장 새 세션 생성으로 진입.
    mockedActive.mockResolvedValue({ active: false, session: null })
    // hydrateFromSession이 prologue fetch를 시도하므로 기본 응답 제공.
    mockedFetchDetail.mockResolvedValue({
      scenario_id: 's',
      title: 't',
      prologue: null,
      root_node_id: 'n0',
      nodes: {},
    })
    useGameStore.getState().reset()
  })

  it('shows loading status while scenarios are pending', () => {
    mockedFetch.mockReturnValueOnce(new Promise(() => {}))

    const { Wrapper } = createWrapper({ routerInitialEntries: ['/lobby'] })
    render(<LobbyPage />, { wrapper: Wrapper })

    expect(screen.getByText(/시나리오를 불러오고 있어요/)).toBeInTheDocument()
  })

  it('renders fetched scenarios and the featured recommendation', async () => {
    mockedFetch.mockResolvedValueOnce(baseScenarios)

    const { Wrapper } = createWrapper({ routerInitialEntries: ['/lobby'] })
    render(<LobbyPage />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(screen.getAllByText('택배 스미싱').length).toBeGreaterThan(0)
    })
    expect(screen.getByText('보안 인증 알림')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /바로 시작하기/ })).toBeInTheDocument()
  })

  it('shows empty state when scenario list is empty', async () => {
    mockedFetch.mockResolvedValueOnce([])

    const { Wrapper } = createWrapper({ routerInitialEntries: ['/lobby'] })
    render(<LobbyPage />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(screen.getByText(/표시할 시나리오가 아직 없어요/)).toBeInTheDocument()
    })
  })

  it('shows error UI and retry button when fetch fails', async () => {
    mockedFetch.mockRejectedValueOnce(new Error('Game requires user account'))

    const { Wrapper } = createWrapper({ routerInitialEntries: ['/lobby'] })
    render(<LobbyPage />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(screen.getByText(/시나리오 목록을 불러오지 못했어요/)).toBeInTheDocument()
    })
    expect(screen.getByText(/Game requires user account/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument()
  })

  it('creates a session and navigates to /play/:sessionId when a scenario card is clicked', async () => {
    mockedFetch.mockResolvedValueOnce(baseScenarios)
    const created: GameSessionResponse = {
      session_id: 'sess-42',
      scenario_id: 's2',
      user_id: 1,
      current_node_id: 'n0',
      current_node: {
        id: 'n0',
        type: 'narrative',
        text: 'opening',
        choices: [],
        educational_content: null,
        image_url: null,
        image_prompt: null,
        depth: 0,
        parent_node_id: null,
        parent_choice_id: null,
        ending_category: null,
      },
      resources: { trust: 3, money: 3, awareness: 1 },
      status: 'playing',
      dangerous_count: 0,
      choices_history: [],
      started_at: '2026-05-18T00:00:00Z',
      completed_at: null,
    }
    mockedCreate.mockResolvedValueOnce(created)

    const { Wrapper } = createWrapper({ routerInitialEntries: ['/lobby'] })
    render(<LobbyPage />, { wrapper: Wrapper })

    const user = userEvent.setup()
    const startButtons = await screen.findAllByRole('button', { name: /시작하기/ })
    // Click the s2 card's start button by finding within s2 article
    const s2Article = screen.getByText('보안 인증 알림').closest('article')
    expect(s2Article).not.toBeNull()
    const button = s2Article!.querySelector('button')!
    expect(button.textContent).toMatch(/시작하기/)
    await user.click(button)

    await waitFor(() => {
      expect(mockedActive).toHaveBeenCalledWith('s2')
    })
    await waitFor(() => {
      expect(mockedCreate).toHaveBeenCalledWith('s2', false)
    })
    expect(useGameStore.getState().snapshot?.sessionId).toBe('sess-42')

    // Make sure at least one start button rendered
    expect(startButtons.length).toBeGreaterThan(0)
  })

  it('surfaces a backend detail message when createGameSession fails', async () => {
    mockedFetch.mockResolvedValueOnce(baseScenarios)
    mockedCreate.mockRejectedValueOnce(
      new Error('Active session already exists for this scenario'),
    )

    const { Wrapper } = createWrapper({ routerInitialEntries: ['/lobby'] })
    render(<LobbyPage />, { wrapper: Wrapper })

    const user = userEvent.setup()
    const startButton = await screen.findByRole('button', { name: /바로 시작하기/ })
    await user.click(startButton)

    await waitFor(() => {
      expect(
        screen.getByText(/Active session already exists/),
      ).toBeInTheDocument()
    })
  })

  it('shows ResumeOrRestartDialog when active session exists and "이어하기" navigates to existing session', async () => {
    mockedFetch.mockResolvedValueOnce(baseScenarios)
    const existing: GameSessionResponse = {
      session_id: 'existing-1',
      scenario_id: 's1',
      user_id: 1,
      current_node_id: 'n5',
      current_node: {
        id: 'n5',
        type: 'narrative',
        text: 'middle',
        choices: [],
        educational_content: null,
        image_url: null,
        image_prompt: null,
        depth: 5,
        parent_node_id: 'n4',
        parent_choice_id: 'c1',
        ending_category: null,
      },
      resources: { trust: 2, money: 2, awareness: 2 },
      status: 'playing',
      dangerous_count: 1,
      choices_history: [],
      started_at: '2026-05-18T00:00:00Z',
      completed_at: null,
    }
    mockedActive.mockReset()
    mockedActive.mockResolvedValueOnce({ active: true, session: existing })

    const { Wrapper } = createWrapper({ routerInitialEntries: ['/lobby'] })
    render(<LobbyPage />, { wrapper: Wrapper })

    const user = userEvent.setup()
    const startButton = await screen.findByRole('button', { name: /바로 시작하기/ })
    await user.click(startButton)

    // 다이얼로그가 등장 — "이어하기" 버튼이 존재
    const resumeButton = await screen.findByRole('button', { name: '이어하기' })
    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
    // 다이얼로그 내부에 시나리오 제목이 표시되어야 한다.
    expect(dialog.textContent).toMatch(/택배 스미싱/)

    await user.click(resumeButton)
    // 이어하기는 createGameSession을 호출하지 않는다.
    expect(mockedCreate).not.toHaveBeenCalled()
  })

  it('shows ResumeOrRestartDialog and "처음부터"가 force_new=true로 새 세션을 생성한다', async () => {
    mockedFetch.mockResolvedValueOnce(baseScenarios)
    const existing: GameSessionResponse = {
      session_id: 'existing-2',
      scenario_id: 's1',
      user_id: 1,
      current_node_id: 'n5',
      current_node: {
        id: 'n5',
        type: 'narrative',
        text: 'middle',
        choices: [],
        educational_content: null,
        image_url: null,
        image_prompt: null,
        depth: 5,
        parent_node_id: null,
        parent_choice_id: null,
        ending_category: null,
      },
      resources: { trust: 2, money: 2, awareness: 2 },
      status: 'playing',
      dangerous_count: 0,
      choices_history: [],
      started_at: '2026-05-18T00:00:00Z',
      completed_at: null,
    }
    mockedActive.mockReset()
    mockedActive.mockResolvedValueOnce({ active: true, session: existing })

    const created: GameSessionResponse = {
      ...existing,
      session_id: 'sess-new',
      current_node_id: 'n0',
      current_node: { ...existing.current_node, id: 'n0', depth: 0 },
      dangerous_count: 0,
      choices_history: [],
    }
    mockedCreate.mockResolvedValueOnce(created)

    const { Wrapper } = createWrapper({ routerInitialEntries: ['/lobby'] })
    render(<LobbyPage />, { wrapper: Wrapper })

    const user = userEvent.setup()
    const startButton = await screen.findByRole('button', { name: /바로 시작하기/ })
    await user.click(startButton)

    const restartButton = await screen.findByRole('button', { name: '처음부터' })
    await user.click(restartButton)

    await waitFor(() => {
      expect(mockedCreate).toHaveBeenCalledWith('s1', true)
    })
    expect(useGameStore.getState().snapshot?.sessionId).toBe('sess-new')
  })

  it('ResumeOrRestartDialog의 닫기 버튼이 다이얼로그를 닫는다', async () => {
    mockedFetch.mockResolvedValueOnce(baseScenarios)
    const existing: GameSessionResponse = {
      session_id: 'existing-3',
      scenario_id: 's1',
      user_id: 1,
      current_node_id: 'n5',
      current_node: {
        id: 'n5',
        type: 'narrative',
        text: 'middle',
        choices: [],
        educational_content: null,
        image_url: null,
        image_prompt: null,
        depth: 5,
        parent_node_id: null,
        parent_choice_id: null,
        ending_category: null,
      },
      resources: { trust: 2, money: 2, awareness: 2 },
      status: 'playing',
      dangerous_count: 0,
      choices_history: [],
      started_at: '2026-05-18T00:00:00Z',
      completed_at: null,
    }
    mockedActive.mockReset()
    mockedActive.mockResolvedValueOnce({ active: true, session: existing })

    const { Wrapper } = createWrapper({ routerInitialEntries: ['/lobby'] })
    render(<LobbyPage />, { wrapper: Wrapper })

    const user = userEvent.setup()
    const startButton = await screen.findByRole('button', { name: /바로 시작하기/ })
    await user.click(startButton)

    await screen.findByRole('button', { name: '이어하기' })
    const closeButton = screen.getByRole('button', { name: '닫기' })
    await user.click(closeButton)

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: '이어하기' })).not.toBeInTheDocument()
    })
    expect(mockedCreate).not.toHaveBeenCalled()
  })
})
