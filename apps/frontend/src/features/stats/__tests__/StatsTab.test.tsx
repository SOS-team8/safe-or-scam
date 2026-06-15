import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { render, screen } from '@testing-library/react'

import { createWrapper } from '@/test/test-utils'
import { useAchievements } from '@/features/achievement/hooks'

import { useUserStats } from '../hooks'
import { StatsTab } from '../components/StatsTab'

vi.mock('../hooks', () => ({ useUserStats: vi.fn() }))
vi.mock('@/features/achievement/hooks', () => ({ useAchievements: vi.fn() }))

const mockedStats = useUserStats as unknown as Mock
const mockedAchievements = useAchievements as unknown as Mock

const renderTab = () => {
  const { Wrapper } = createWrapper()
  return render(<StatsTab />, { wrapper: Wrapper })
}

beforeEach(() => {
  mockedStats.mockReset()
  mockedAchievements.mockReset()
  mockedAchievements.mockReturnValue({ data: undefined })
})

describe('StatsTab states', () => {
  it('renders an error card with retry on error', () => {
    mockedStats.mockReturnValue({
      isPending: false,
      isError: true,
      error: new Error('x'),
      refetch: vi.fn(),
    })
    renderTab()
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument()
  })

  it('renders the empty state + lobby CTA when no completed plays', () => {
    mockedStats.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        totalPlays: 0,
        completePlays: 0,
        goodEndings: 0,
        badEndings: 0,
        totalDangerousChoices: 0,
        avgScore: 0,
        bestScore: 0,
      },
    })
    renderTab()
    expect(screen.getByText('아직 통계가 없어요.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '시나리오 보러 가기' })).toBeInTheDocument()
  })

  it('renders metric cards and the safe-ending ratio when stats exist', () => {
    mockedStats.mockReturnValue({
      isPending: false,
      isError: false,
      data: {
        totalPlays: 18,
        completePlays: 15,
        goodEndings: 11,
        badEndings: 4,
        totalDangerousChoices: 7,
        avgScore: 78.5,
        bestScore: 95,
      },
    })
    mockedAchievements.mockReturnValue({ data: { achievedCount: 3, totalCount: 6 } })
    renderTab()

    expect(screen.getByText('완료 플레이')).toBeInTheDocument()
    expect(screen.getByText('15회')).toBeInTheDocument()
    expect(screen.getByText('78.5')).toBeInTheDocument()
    expect(screen.getByText('95')).toBeInTheDocument()
    // 안전 비율 = round(11 / 15 * 100) = 73
    expect(screen.getByText('안전 73%')).toBeInTheDocument()
    const bar = screen.getByRole('progressbar', { name: '안전 결말 비율' })
    expect(bar).toHaveAttribute('aria-valuenow', '73')
  })
})
