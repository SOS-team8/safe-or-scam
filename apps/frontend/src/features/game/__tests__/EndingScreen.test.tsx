import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { EndingScreen } from '../components/EndingScreen'
import type {
  ChoiceHistoryEntry,
  ScenarioNode,
  ScenarioTree,
} from '../types'

const baseNode = (id: string, type: ScenarioNode['type'] = 'narrative'): ScenarioNode => ({
  id,
  type,
  text: `text of ${id}`,
  choices: [],
  educational_content: null,
  image_url: null,
  image_prompt: null,
  depth: 0,
  parent_node_id: null,
  parent_choice_id: null,
  ending_category: null,
})

const tree: ScenarioTree = {
  scenario_id: 's1',
  title: 't',
  description: 'd',
  phishing_type: 'smishing',
  difficulty: 'easy',
  root_node_id: 'n0',
  nodes: {
    n0: {
      ...baseNode('n0'),
      choices: [
        {
          id: 'c1',
          text: '링크를 클릭한다',
          next_node_id: 'n1',
          is_dangerous: true,
          resource_effect: { trust: 0, money: -2, awareness: -1 },
          danger_feedback: {
            why_dangerous: '가짜 사이트 위험',
            warning_signs: ['짧은 URL'],
            safe_alternative: '공식 앱 확인',
          },
        },
        {
          id: 'c2',
          text: '무시한다',
          next_node_id: 'n_end',
          is_dangerous: false,
          resource_effect: { trust: 0, money: 0, awareness: 1 },
          danger_feedback: null,
        },
      ],
    },
    n_end: { ...baseNode('n_end', 'ending_good'), ending_category: 'smart_block' },
  },
  protagonist: null,
  prologue: null,
  total_endings: 1,
  total_good_endings: 1,
  total_bad_endings: 0,
  ending_categories: null,
  tags: [],
  created_at: '2026-05-18T00:00:00Z',
  updated_at: '2026-05-18T00:00:00Z',
}

const history: ChoiceHistoryEntry[] = [
  { node_id: 'n0', choice_id: 'c1', is_dangerous: true, timestamp: '2026-05-18T00:00:10Z' },
  { node_id: 'n0', choice_id: 'c2', is_dangerous: false, timestamp: '2026-05-18T00:00:20Z' },
]

describe('EndingScreen', () => {
  it('renders good ending with emerald tone', () => {
    render(
      <EndingScreen
        endingNode={tree.nodes.n_end}
        endingType="ending_good"
        resources={{ trust: 3, money: 3, awareness: 4 }}
        history={history}
        scenarioTree={tree}
        onReplay={() => {}}
        onSelectOther={() => {}}
      />,
    )
    expect(screen.getByText('안전한 결말')).toBeInTheDocument()
    expect(screen.getByText(/안전하게 마무리/)).toBeInTheDocument()
  })

  it('renders bad ending with red tone', () => {
    render(
      <EndingScreen
        endingNode={tree.nodes.n_end}
        endingType="ending_bad"
        resources={{ trust: 1, money: 0, awareness: 2 }}
        history={history}
        scenarioTree={tree}
        onReplay={() => {}}
        onSelectOther={() => {}}
      />,
    )
    expect(screen.getByText('주의가 필요한 결말')).toBeInTheDocument()
  })

  it('looks up choice text from the scenario tree using node_id + choice_id', () => {
    render(
      <EndingScreen
        endingNode={tree.nodes.n_end}
        endingType="ending_good"
        resources={{ trust: 3, money: 3, awareness: 4 }}
        history={history}
        scenarioTree={tree}
        onReplay={() => {}}
        onSelectOther={() => {}}
      />,
    )
    expect(screen.getByRole('button', { name: /링크를 클릭한다/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /무시한다/ })).toBeInTheDocument()
  })

  it('opens DangerFeedbackModal when a dangerous history entry is clicked', async () => {
    const user = userEvent.setup()
    render(
      <EndingScreen
        endingNode={tree.nodes.n_end}
        endingType="ending_good"
        resources={{ trust: 3, money: 3, awareness: 4 }}
        history={history}
        scenarioTree={tree}
        onReplay={() => {}}
        onSelectOther={() => {}}
      />,
    )
    await user.click(screen.getByRole('button', { name: /링크를 클릭한다/ }))
    expect(screen.getByText(/가짜 사이트 위험/)).toBeInTheDocument()
    expect(screen.getByText('공식 앱 확인')).toBeInTheDocument()
  })

  it('shows ending category label when provided', () => {
    render(
      <EndingScreen
        endingNode={tree.nodes.n_end}
        endingType="ending_good"
        endingCategoryLabel="똑똑한 차단"
        resources={{ trust: 3, money: 3, awareness: 4 }}
        history={[]}
        scenarioTree={tree}
        onReplay={() => {}}
        onSelectOther={() => {}}
      />,
    )
    expect(screen.getByText(/똑똑한 차단/)).toBeInTheDocument()
  })

  it('calls onReplay and onSelectOther', async () => {
    const onReplay = vi.fn()
    const onSelectOther = vi.fn()
    const user = userEvent.setup()
    render(
      <EndingScreen
        endingNode={tree.nodes.n_end}
        endingType="ending_good"
        resources={{ trust: 3, money: 3, awareness: 4 }}
        history={[]}
        scenarioTree={tree}
        onReplay={onReplay}
        onSelectOther={onSelectOther}
      />,
    )
    await user.click(screen.getByRole('button', { name: '다시 플레이' }))
    await user.click(screen.getByRole('button', { name: '다른 시나리오 선택' }))
    expect(onReplay).toHaveBeenCalled()
    expect(onSelectOther).toHaveBeenCalled()
  })
})
