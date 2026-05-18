import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { EducationalPopup } from '../components/EducationalPopup'
import type { EducationalContent } from '../types'

const content: EducationalContent = {
  title: '택배 스미싱 식별',
  explanation: '받지 않은 택배는 의심해야 합니다.',
  prevention_tips: ['공식 앱에서 확인', '발신자 전화 차단'],
  warning_signs: ['짧은 URL', '긴급함을 강조'],
}

describe('EducationalPopup', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <EducationalPopup content={content} isOpen={false} onDismiss={() => {}} />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders all four v2 fields when open', () => {
    render(<EducationalPopup content={content} isOpen onDismiss={() => {}} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('택배 스미싱 식별')).toBeInTheDocument()
    expect(screen.getByText(/받지 않은 택배/)).toBeInTheDocument()
    expect(screen.getByText('공식 앱에서 확인')).toBeInTheDocument()
    expect(screen.getByText('짧은 URL')).toBeInTheDocument()
  })

  it('calls onDismiss when the continue button is clicked', async () => {
    const onDismiss = vi.fn()
    const user = userEvent.setup()
    render(<EducationalPopup content={content} isOpen onDismiss={onDismiss} />)
    await user.click(screen.getByRole('button', { name: '계속하기' }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('closes on ESC', async () => {
    const onDismiss = vi.fn()
    const user = userEvent.setup()
    render(<EducationalPopup content={content} isOpen onDismiss={onDismiss} />)
    await user.keyboard('{Escape}')
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})
