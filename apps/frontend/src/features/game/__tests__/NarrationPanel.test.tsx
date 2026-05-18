import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, render, screen, fireEvent } from '@testing-library/react'

import { NarrationPanel } from '../components/NarrationPanel'

describe('NarrationPanel', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('text를 한 글자씩 노출한 후 전체 표시한다', () => {
    render(<NarrationPanel text="abc" typingSpeed={10} />)

    // 초기에는 빈 텍스트 (article은 있지만 paragraph 안은 비어 있음).
    const article = screen.getByLabelText('시나리오 나레이션')
    expect(article).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(10)
    })
    expect(article.textContent).toContain('a')

    act(() => {
      vi.advanceTimersByTime(20)
    })
    expect(article.textContent).toContain('abc')
  })

  it('typingSpeed=0이면 즉시 전체 표시', () => {
    render(<NarrationPanel text="hello world" typingSpeed={0} />)
    expect(screen.getByLabelText('시나리오 나레이션').textContent).toContain(
      'hello world',
    )
  })

  it('클릭하면 즉시 전체 텍스트 노출 + onTypingComplete 호출', () => {
    const onComplete = vi.fn()
    render(
      <NarrationPanel
        text="hello"
        typingSpeed={100}
        onTypingComplete={onComplete}
      />,
    )

    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(screen.getByLabelText('시나리오 나레이션').textContent).toContain('h')

    fireEvent.click(screen.getByLabelText('시나리오 나레이션'))

    expect(screen.getByLabelText('시나리오 나레이션').textContent).toContain('hello')
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('타이핑 중에는 "클릭하면..." 안내가 보이고 완료되면 사라진다', () => {
    render(<NarrationPanel text="abcdef" typingSpeed={50} />)

    expect(screen.getByText(/클릭하면 전체 텍스트를 바로 볼 수 있어요/)).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(50 * 6)
    })
    expect(
      screen.queryByText(/클릭하면 전체 텍스트를 바로 볼 수 있어요/),
    ).not.toBeInTheDocument()
  })

  it('imageUrl이 있으면 img를 표시한다', () => {
    const { container } = render(
      <NarrationPanel text="x" imageUrl="/api/v1/images/foo/bar.png" typingSpeed={0} />,
    )
    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    expect(img).toHaveAttribute('src', '/api/v1/images/foo/bar.png')
  })

  it('imageUrl이 다른 노드로 바뀌면 imageFailed가 초기화된다', () => {
    const { rerender, container } = render(
      <NarrationPanel text="x" imageUrl="/a.png" typingSpeed={0} />,
    )
    const img = container.querySelector('img')!
    fireEvent.error(img)
    expect(container.querySelector('img')).toBeNull()

    rerender(<NarrationPanel text="y" imageUrl="/b.png" typingSpeed={0} />)
    expect(container.querySelector('img')).toHaveAttribute('src', '/b.png')
  })
})
