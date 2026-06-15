import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import { DonutChart } from '../DonutChart'
import { RadialGauge } from '../RadialGauge'

describe('RadialGauge', () => {
  it('renders the value text, label, and an accessible label', () => {
    render(<RadialGauge value={83} valueText="83%" label="완주율" />)

    expect(screen.getByText('83%')).toBeInTheDocument()
    expect(screen.getByText('완주율')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '완주율 83%' })).toBeInTheDocument()
  })
})

describe('DonutChart', () => {
  it('renders N/M, the computed percent, and an accessible label', () => {
    render(<DonutChart value={5} max={60} label="결말 수집" />)

    expect(screen.getByText('5/60')).toBeInTheDocument()
    // round(5/60*100) = 8
    expect(screen.getByText('8%')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '결말 수집 5/60 (8%)' })).toBeInTheDocument()
  })

  it('renders 0% without dividing by zero when max is 0', () => {
    render(<DonutChart value={0} max={0} label="결말 수집" />)

    expect(screen.getByText('0/0')).toBeInTheDocument()
    expect(screen.getByText('0%')).toBeInTheDocument()
  })
})
