import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { ChoicePanel } from '../components/ChoicePanel'
import type { Choice } from '../types'

const choices: Choice[] = [
  {
    id: 'c1',
    text: '링크를 클릭한다',
    next_node_id: 'n1',
    is_dangerous: true,
    resource_effect: { trust: 0, money: -2, awareness: -1 },
    danger_feedback: null,
  },
  {
    id: 'c2',
    text: '무시한다',
    next_node_id: 'n2',
    is_dangerous: false,
    resource_effect: { trust: 0, money: 0, awareness: 1 },
    danger_feedback: null,
  },
]

describe('ChoicePanel', () => {
  it('renders each choice as a button with text', () => {
    render(<ChoicePanel choices={choices} onChoose={() => {}} />)
    expect(screen.getByRole('button', { name: /링크를 클릭한다/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /무시한다/ })).toBeInTheDocument()
  })

  it('fires onChoose with the clicked choice id', async () => {
    const onChoose = vi.fn()
    const user = userEvent.setup()
    render(<ChoicePanel choices={choices} onChoose={onChoose} />)
    await user.click(screen.getByRole('button', { name: /무시한다/ }))
    expect(onChoose).toHaveBeenCalledWith('c2')
  })

  it('disables interaction when disabled prop is true', async () => {
    const onChoose = vi.fn()
    const user = userEvent.setup()
    render(<ChoicePanel choices={choices} onChoose={onChoose} disabled />)
    await user.click(screen.getByRole('button', { name: /무시한다/ }))
    expect(onChoose).not.toHaveBeenCalled()
  })

  it('does not visually distinguish safe vs dangerous choices', () => {
    render(<ChoicePanel choices={choices} onChoose={() => {}} />)
    const dangerousButton = screen.getByRole('button', { name: /링크를 클릭한다/ })
    const safeButton = screen.getByRole('button', { name: /무시한다/ })
    // Both share the same class set — confirms no spoiler styling
    expect(dangerousButton.className).toBe(safeButton.className)
  })

  it('supports number-key shortcuts for choices', () => {
    const onChoose = vi.fn()
    render(<ChoicePanel choices={choices} onChoose={onChoose} />)
    fireEvent.keyDown(window, { key: '2' })
    expect(onChoose).toHaveBeenCalledWith('c2')
  })

  it('renders nothing when choices is empty', () => {
    const { container } = render(<ChoicePanel choices={[]} onChoose={() => {}} />)
    expect(container.firstChild).toBeNull()
  })
})
