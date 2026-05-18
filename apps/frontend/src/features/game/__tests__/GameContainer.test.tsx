import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { createWrapper } from '@/test/test-utils'

import { gameApi } from '../api'
import { GameContainer } from '../components/GameContainer'
import { useGameStore } from '../store'
import type {
  GameSessionResponse,
  MoveResponse,
  ScenarioNode,
  ScenarioTree,
} from '../types'

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
const mockedSubmit = gameApi.submitChoice as unknown as Mock

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

const dangerousChoice = {
  id: 'c1',
  text: '링크를 클릭한다',
  next_node_id: 'n1',
  is_dangerous: true,
  resource_effect: { trust: 0, money: -2, awareness: -1 },
  danger_feedback: {
    why_dangerous: '가짜 사이트',
    warning_signs: ['짧은 URL'],
    safe_alternative: '공식 앱',
  },
}

const safeChoice = {
  id: 'c2',
  text: '무시한다',
  next_node_id: 'n_end',
  is_dangerous: false,
  resource_effect: { trust: 0, money: 0, awareness: 1 },
  danger_feedback: null,
}

const rootNode: ScenarioNode = {
  ...node('n0'),
  text: '의심스러운 문자가 도착했습니다.',
  educational_content: {
    title: '스미싱 식별',
    explanation: '의심하세요',
    prevention_tips: ['앱에서 확인'],
    warning_signs: ['짧은 URL'],
  },
  choices: [dangerousChoice, safeChoice],
}

const midNode: ScenarioNode = {
  ...node('n1'),
  text: '링크를 따라가니 로그인 페이지가 열렸습니다.',
  choices: [
    {
      id: 'c1_1',
      text: '계속 입력한다',
      next_node_id: 'n_end_bad',
      is_dangerous: true,
      resource_effect: { trust: 0, money: -2, awareness: 0 },
      danger_feedback: null,
    },
  ],
}

const endingNode: ScenarioNode = {
  ...node('n_end', 'ending_good'),
  text: '문자를 무시하고 일상으로 돌아왔어요.',
  ending_category: 'smart_block',
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

const tree: ScenarioTree = {
  scenario_id: 'scn1',
  title: '시나리오',
  description: '',
  phishing_type: 'smishing',
  difficulty: 'easy',
  root_node_id: 'n0',
  nodes: { n0: rootNode, n1: midNode, n_end: endingNode },
  protagonist: null,
  prologue: null,
  total_endings: 1,
  total_good_endings: 1,
  total_bad_endings: 0,
  ending_categories: {
    smart_block: {
      category_id: 'smart_block',
      label: '똑똑한 차단',
      description: '의심하고 무시한 결말',
      node_ids: ['n_end'],
    },
  },
  tags: [],
  created_at: '2026-05-18T00:00:00Z',
  updated_at: '2026-05-18T00:00:00Z',
}

describe('GameContainer integration', () => {
  beforeEach(() => {
    mockedGet.mockReset()
    mockedDetail.mockReset()
    mockedSubmit.mockReset()
    useGameStore.getState().reset()
  })

  it('hydrates from getGameSession and renders narration + choices + resources', async () => {
    mockedGet.mockResolvedValueOnce(sessionAsMove)
    mockedDetail.mockResolvedValueOnce(tree)
    useGameStore.getState().hydrateFromSession(session)

    const { Wrapper } = createWrapper()
    render(<GameContainer sessionId="sess1" />, { wrapper: Wrapper })

    // Skip the narration typing by clicking on the narration panel.
    const user = userEvent.setup()
    await waitFor(() => {
      expect(
        screen.getByLabelText('시나리오 나레이션'),
      ).toBeInTheDocument()
    })
    await user.click(screen.getByLabelText('시나리오 나레이션'))

    await waitFor(() => {
      expect(screen.getByText('의심스러운 문자가 도착했습니다.')).toBeInTheDocument()
    })
    expect(await screen.findByRole('button', { name: /링크를 클릭한다/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /무시한다/ })).toBeInTheDocument()
    expect(screen.getByLabelText('자원 현황')).toBeInTheDocument()
  })

  it('renders prologue screen first when scenario has prologue text', async () => {
    const treeWithPrologue: ScenarioTree = {
      ...tree,
      prologue: '오늘은 평범한 하루입니다. 곧 의심스러운 문자가 도착할 거예요.',
    }
    mockedGet.mockResolvedValueOnce(sessionAsMove)
    mockedDetail.mockResolvedValue(treeWithPrologue)
    useGameStore.getState().hydrateFromSession(session, {
      prologue: treeWithPrologue.prologue,
    })

    const { Wrapper } = createWrapper()
    render(<GameContainer sessionId="sess1" />, { wrapper: Wrapper })

    await waitFor(() => {
      expect(screen.getByLabelText('시나리오 프롤로그')).toBeInTheDocument()
    })

    const user = userEvent.setup()
    // 클릭으로 typing skip → 시작 버튼 활성화.
    await user.click(screen.getByLabelText('시나리오 프롤로그'))

    const startButton = screen.getByRole('button', { name: '게임 시작하기' })
    expect(startButton).not.toBeDisabled()
    await user.click(startButton)

    // 시작 버튼 클릭 후 narration panel로 전환.
    await waitFor(() => {
      expect(screen.getByLabelText('시나리오 나레이션')).toBeInTheDocument()
    })
  })

  it('shows EducationalPopup after a dangerous choice; closes on dismiss', async () => {
    mockedGet.mockResolvedValue(sessionAsMove)
    mockedDetail.mockResolvedValue(tree)
    useGameStore.getState().hydrateFromSession(session)

    const dangerousMove: MoveResponse = {
      ...sessionAsMove,
      current_node_id: 'n1',
      current_node: midNode,
      resources: { trust: 3, money: 1, awareness: 0 },
      status: 'playing',
      dangerous_count: 1,
      choices_history: [
        {
          node_id: 'n0',
          choice_id: 'c1',
          is_dangerous: true,
          timestamp: '2026-05-18T00:00:10Z',
        },
      ],
      danger_feedback: dangerousChoice.danger_feedback,
      educational_content: rootNode.educational_content,
      is_finished: false,
      ending_type: null,
      ending_category: null,
      completed_at: null,
    }
    mockedSubmit.mockResolvedValueOnce(dangerousMove)

    const { Wrapper } = createWrapper()
    render(<GameContainer sessionId="sess1" />, { wrapper: Wrapper })

    const user = userEvent.setup()
    // narration typing skip
    await user.click(await screen.findByLabelText('시나리오 나레이션'))
    await user.click(await screen.findByRole('button', { name: /링크를 클릭한다/ }))

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
    expect(screen.getByText('스미싱 식별')).toBeInTheDocument()
  })

  it('shows EndingScreen when isFinished is true and store is cleared from popup first', async () => {
    mockedGet.mockResolvedValue(sessionAsMove)
    mockedDetail.mockResolvedValue(tree)
    useGameStore.getState().hydrateFromSession(session)

    const safeMove: MoveResponse = {
      ...sessionAsMove,
      current_node_id: 'n_end',
      current_node: endingNode,
      resources: { trust: 3, money: 3, awareness: 2 },
      status: 'completed',
      dangerous_count: 0,
      choices_history: [
        {
          node_id: 'n0',
          choice_id: 'c2',
          is_dangerous: false,
          timestamp: '2026-05-18T00:00:10Z',
        },
      ],
      danger_feedback: null,
      educational_content: null,
      is_finished: true,
      ending_type: 'ending_good',
      ending_category: 'smart_block',
      completed_at: '2026-05-18T00:00:10Z',
    }
    mockedSubmit.mockResolvedValueOnce(safeMove)

    const { Wrapper } = createWrapper()
    render(<GameContainer sessionId="sess1" />, { wrapper: Wrapper })

    const user = userEvent.setup()
    // narration typing skip
    await user.click(await screen.findByLabelText('시나리오 나레이션'))
    await user.click(await screen.findByRole('button', { name: /무시한다/ }))

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /안전하게 마무리/ }),
      ).toBeInTheDocument()
    })
    // Ending category label from scenario tree
    expect(screen.getByText(/똑똑한 차단/)).toBeInTheDocument()
    // Ending node text rendered too
    expect(screen.getByText(/일상으로 돌아왔어요/)).toBeInTheDocument()
  })
})
