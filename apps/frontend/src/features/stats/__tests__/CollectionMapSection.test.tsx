import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { render, screen } from '@testing-library/react'

import { createWrapper } from '@/test/test-utils'
import { useScenarios } from '@/features/game/hooks'
import { useScenarioProgress } from '@/features/history/hooks'

import { CollectionMapSection } from '../components/CollectionMapSection'

vi.mock('@/features/game/hooks', () => ({ useScenarios: vi.fn() }))
vi.mock('@/features/history/hooks', () => ({ useScenarioProgress: vi.fn() }))

const mockedProgress = useScenarioProgress as unknown as Mock
const mockedScenarios = useScenarios as unknown as Mock

const renderSection = () => {
  const { Wrapper } = createWrapper()
  return render(<CollectionMapSection />, { wrapper: Wrapper })
}

beforeEach(() => {
  mockedProgress.mockReset()
  mockedScenarios.mockReset()
})

describe('CollectionMapSection', () => {
  it('renders a donut over the whole service: discovered / all-scenarios categories', () => {
    // 발견: sc1 2개 + sc2 3개 = 5
    mockedProgress.mockReturnValue({
      isPending: false,
      isError: false,
      data: [
        { scenarioId: 'sc1', completionRate: 0.4, discoveredCategoryCount: 2, totalCategories: 5, lastPlayedAt: 't' },
        { scenarioId: 'sc2', completionRate: 1, discoveredCategoryCount: 3, totalCategories: 3, lastPlayedAt: 't' },
      ],
    })
    // 전체 분모: 미플레이 sc3 포함 10+10+10 = 30
    mockedScenarios.mockReturnValue({
      data: [
        { scenario_id: 'sc1', total_categories: 10 },
        { scenario_id: 'sc2', total_categories: 10 },
        { scenario_id: 'sc3', total_categories: 10 },
      ],
    })

    renderSection()

    // 도넛 중앙: 5/30, round(5/30*100)=17%
    expect(screen.getByText('5/30')).toBeInTheDocument()
    expect(screen.getByText('17%')).toBeInTheDocument()
    expect(
      screen.getByText('서비스 전체 결말 유형 30개 중 5개를 발견했어요.'),
    ).toBeInTheDocument()
  })

  it('renders nothing when no scenario exposes categories (denominator 0)', () => {
    mockedProgress.mockReturnValue({ isPending: false, isError: false, data: [] })
    mockedScenarios.mockReturnValue({ data: [{ scenario_id: 'sc1' }] })
    const { container } = renderSection()
    expect(container).toBeEmptyDOMElement()
  })
})
