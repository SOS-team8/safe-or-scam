import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

import { ResourceBar } from '../components/ResourceBar'

describe('ResourceBar', () => {
  it('renders trust, money, awareness with current values', () => {
    render(<ResourceBar resources={{ trust: 3, money: 2, awareness: 5 }} />)
    expect(screen.getByLabelText('신뢰')).toBeInTheDocument()
    expect(screen.getByLabelText('자산')).toBeInTheDocument()
    expect(screen.getByLabelText('경계심')).toBeInTheDocument()
    expect(screen.getByLabelText('신뢰 수치')).toHaveTextContent('3')
    expect(screen.getByLabelText('자산 수치')).toHaveTextContent('2')
    expect(screen.getByLabelText('경계심 수치')).toHaveTextContent('5')
  })

  it('handles a 0 / 5 boundary without error', () => {
    render(<ResourceBar resources={{ trust: 0, money: 5, awareness: 0 }} />)
    expect(screen.getByLabelText('신뢰 수치')).toHaveTextContent('0')
    expect(screen.getByLabelText('자산 수치')).toHaveTextContent('5')
  })
})
