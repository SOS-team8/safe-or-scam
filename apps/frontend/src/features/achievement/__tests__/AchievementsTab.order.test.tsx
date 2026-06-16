import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { render, screen } from '@testing-library/react'

import { createWrapper } from '@/test/test-utils'

import { useAchievements } from '../hooks'
import { AchievementsTab } from '../components/AchievementsTab'
import type { AchievementSummary } from '../types'

vi.mock('../hooks', () => ({ useAchievements: vi.fn() }))

const mockedAchievements = useAchievements as unknown as Mock

const make = (
  id: number,
  code: string,
  title: string,
  progress?: { current: number | null; target: number | null },
): AchievementSummary => ({
  id,
  code,
  title,
  description: 'd',
  iconUrl: null,
  isAchieved: false,
  achievedAt: null,
  progressCurrent: progress?.current ?? null,
  progressTarget: progress?.target ?? null,
})

beforeEach(() => mockedAchievements.mockReset())

describe('AchievementsTab card ordering', () => {
  it('orders cards as FIRST_CLEAR → PLAY_10 → PLAY_30 → others regardless of API order', () => {
    // 의도적으로 뒤섞인 API 순서
    const achievements = [
      make(4, 'FLAWLESS', '무결점 판별'),
      make(6, 'PLAY_30', '베테랑'),
      make(1, 'FIRST_CLEAR', '첫 시나리오 플레이 완료'),
      make(5, 'PLAY_10', '반복 숙련가'),
      make(2, 'FULL_COLLECTION', '결말 수집가'),
      make(3, 'GOOD_ENDING_5', '안전 길잡이'),
    ]
    mockedAchievements.mockReturnValue({
      isPending: false,
      isError: false,
      data: { achievements, achievedCount: 0, totalCount: 6 },
    })

    const { Wrapper } = createWrapper()
    render(<AchievementsTab focusAchievementId={null} onFocusHandled={vi.fn()} />, {
      wrapper: Wrapper,
    })

    const titles = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
    expect(titles.slice(0, 3)).toEqual(['첫 시나리오 플레이 완료', '반복 숙련가', '베테랑'])
    // 나머지는 뒤에 (정의된 순서대로)
    expect(titles).toEqual([
      '첫 시나리오 플레이 완료',
      '반복 숙련가',
      '베테랑',
      '결말 수집가',
      '안전 길잡이',
      '무결점 판별',
    ])
  })
})

describe('AchievementsTab progress bar', () => {
  it('renders a progressbar with N/M for cumulative achievements and omits it for null progress', () => {
    const achievements = [
      make(1, 'PLAY_10', '반복 숙련가', { current: 3, target: 10 }),
      make(2, 'FLAWLESS', '무결점 판별', { current: null, target: null }),
    ]
    mockedAchievements.mockReturnValue({
      isPending: false,
      isError: false,
      data: { achievements, achievedCount: 0, totalCount: 2 },
    })

    const { Wrapper } = createWrapper()
    render(<AchievementsTab focusAchievementId={null} onFocusHandled={vi.fn()} />, {
      wrapper: Wrapper,
    })

    // 카드 진행 바는 "진행 N/M" 라벨(상단 전체 진행도 바와 구분). 누적형 1개만 존재.
    const cardBars = screen
      .getAllByRole('progressbar')
      .filter((bar) => bar.getAttribute('aria-label')?.startsWith('진행 '))
    expect(cardBars).toHaveLength(1)
    expect(cardBars[0]).toHaveAttribute('aria-valuenow', '3')
    expect(cardBars[0]).toHaveAttribute('aria-valuemax', '10')
    expect(screen.getByText('3/10')).toBeInTheDocument()
  })
})
