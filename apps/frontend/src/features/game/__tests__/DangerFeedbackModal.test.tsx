import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { DangerFeedbackModal } from '../components/DangerFeedbackModal'
import type { DangerFeedback } from '../types'

const feedback: DangerFeedback = {
  why_dangerous: '링크는 가짜 사이트로 연결될 수 있습니다.',
  warning_signs: ['짧은 URL', '발신자 미확인'],
  safe_alternative: '공식 앱에서 직접 조회하세요.',
}

describe('DangerFeedbackModal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <DangerFeedbackModal feedback={feedback} isOpen={false} onClose={() => {}} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders all three v2 fields when open', () => {
    render(
      <DangerFeedbackModal
        feedback={feedback}
        choiceText="링크를 클릭한다"
        isOpen
        onClose={() => {}}
      />,
    )
    expect(screen.getByText('링크를 클릭한다')).toBeInTheDocument()
    expect(screen.getByText(/가짜 사이트/)).toBeInTheDocument()
    expect(screen.getByText('짧은 URL')).toBeInTheDocument()
    expect(screen.getByText(/공식 앱에서 직접 조회/)).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(<DangerFeedbackModal feedback={feedback} isOpen onClose={onClose} />)
    await user.click(screen.getByRole('button', { name: '닫기' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('shows default heading when choiceText is omitted', () => {
    render(<DangerFeedbackModal feedback={feedback} isOpen onClose={() => {}} />)
    expect(screen.getByText('이 선택이 위험했던 이유')).toBeInTheDocument()
  })
})
