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
    mockedGetMe.mockReset()
    mockedGetMe.mockResolvedValue(baseProfile)
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
      expect(mockedCreate).toHaveBeenCalledWith('s2')
    })
    expect(useGameStore.getState().snapshot?.sessionId).toBe('sess-42')

    // Make sure at least one start button rendered
    expect(startButtons.length).toBeGreaterThan(0)
  })

  it('surfaces a backend detail message when createGameSession fails', async () => {
    mockedFetch.mockResolvedValueOnce(baseScenarios)
    mockedCreate.mockRejectedValueOnce(new Error('Active session already exists for this scenario'))

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
})
