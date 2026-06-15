import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { render, screen } from '@testing-library/react'

import { createWrapper } from '@/test/test-utils'

import { usePhishingBreakdown } from '../hooks'
import { PhishingBreakdownSection } from '../components/PhishingBreakdownSection'

vi.mock('../hooks', () => ({ usePhishingBreakdown: vi.fn() }))

const mockedBreakdown = usePhishingBreakdown as unknown as Mock

const renderSection = () => {
  const { Wrapper } = createWrapper()
  return render(<PhishingBreakdownSection />, { wrapper: Wrapper })
}

beforeEach(() => mockedBreakdown.mockReset())

describe('PhishingBreakdownSection', () => {
  it('renders a safe-rate bar per phishing type with known slug labels mapped', () => {
    mockedBreakdown.mockReturnValue({
      isPending: false,
      isError: false,
      data: [
        { phishingType: 'smishing', playCount: 4, goodCount: 3, avgDangerous: 1.0, avgScore: 70 },
        {
          phishingType: '정부지원금 안내를 사칭한 스미싱',
          playCount: 2,
          goodCount: 0,
          avgDangerous: 3.5,
          avgScore: 30,
        },
      ],
    })

    renderSection()

    // 알려진 슬러그는 한국어로, 자유 문자열은 원문 그대로
    expect(screen.getByText('스미싱')).toBeInTheDocument()
    expect(screen.getByText('정부지원금 안내를 사칭한 스미싱')).toBeInTheDocument()

    // 안전율 바: smishing = round(3/4*100) = 75
    const smishingBar = screen.getByRole('progressbar', { name: '스미싱 안전 결말률' })
    expect(smishingBar).toHaveAttribute('aria-valuenow', '75')
    expect(screen.getByText('75% · 4판')).toBeInTheDocument()
  })

  it('sorts weakest (lowest safe-rate) types first', () => {
    mockedBreakdown.mockReturnValue({
      isPending: false,
      isError: false,
      data: [
        { phishingType: 'smishing', playCount: 4, goodCount: 4, avgDangerous: 0, avgScore: 90 },
        { phishingType: 'phishing', playCount: 2, goodCount: 0, avgDangerous: 4, avgScore: 20 },
      ],
    })

    renderSection()

    const bars = screen.getAllByRole('progressbar')
    // 오름차순: phishing(0%) 먼저, smishing(100%) 다음
    expect(bars[0]).toHaveAttribute('aria-label', '피싱 안전 결말률')
    expect(bars[0]).toHaveAttribute('aria-valuenow', '0')
    expect(bars[1]).toHaveAttribute('aria-valuenow', '100')
  })

  it('renders nothing when there is no play data', () => {
    mockedBreakdown.mockReturnValue({ isPending: false, isError: false, data: [] })
    const { container } = renderSection()
    expect(container).toBeEmptyDOMElement()
  })

  it('renders an error card with retry on error', () => {
    mockedBreakdown.mockReturnValue({
      isPending: false,
      isError: true,
      error: new Error('boom'),
      refetch: vi.fn(),
    })
    renderSection()
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument()
  })
})
