import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, render, screen, fireEvent } from '@testing-library/react'

import { PrologueScreen } from '../components/PrologueScreen'

describe('PrologueScreen', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('title과 prologue 텍스트를 노출한다', () => {
    render(
      <PrologueScreen
        title="스미싱 시나리오"
        prologue="안녕하세요"
        onStart={() => {}}
      />,
    )
    expect(screen.getByText('스미싱 시나리오')).toBeInTheDocument()

    // 한 번 typing 진행
    act(() => {
      vi.advanceTimersByTime(25 * 5)
    })
    expect(
      screen.getByLabelText('시나리오 프롤로그').textContent,
    ).toContain('안녕하세요')
  })

  it('typing 완료 전에는 시작 버튼이 disabled', () => {
    render(
      <PrologueScreen
        title="t"
        prologue="hello world"
        onStart={() => {}}
      />,
    )
    const button = screen.getByRole('button', { name: '게임 시작하기' })
    expect(button).toBeDisabled()
  })

  it('typing 완료되면 시작 버튼이 enabled', () => {
    render(
      <PrologueScreen
        title="t"
        prologue="hi"
        onStart={() => {}}
      />,
    )
    act(() => {
      vi.advanceTimersByTime(25 * 5)
    })
    const button = screen.getByRole('button', { name: '게임 시작하기' })
    expect(button).not.toBeDisabled()
  })

  it('본문 클릭 시 즉시 전체 텍스트 + 시작 버튼 활성화', () => {
    render(
      <PrologueScreen
        title="t"
        prologue="long-long-text"
        onStart={() => {}}
      />,
    )
    fireEvent.click(screen.getByLabelText('시나리오 프롤로그'))

    expect(
      screen.getByLabelText('시나리오 프롤로그').textContent,
    ).toContain('long-long-text')
    const button = screen.getByRole('button', { name: '게임 시작하기' })
    expect(button).not.toBeDisabled()
  })

  it('시작 버튼 클릭 시 onStart 호출', () => {
    const onStart = vi.fn()
    render(
      <PrologueScreen
        title="t"
        prologue="hi"
        onStart={onStart}
      />,
    )
    act(() => {
      vi.advanceTimersByTime(25 * 5)
    })
    fireEvent.click(screen.getByRole('button', { name: '게임 시작하기' }))
    expect(onStart).toHaveBeenCalledTimes(1)
  })

  it('isLoading이면 로딩 안내 표시 + 시작 버튼 disabled', () => {
    render(
      <PrologueScreen
        title=""
        prologue=""
        onStart={() => {}}
        isLoading
      />,
    )
    expect(screen.getByText(/시나리오를 불러오고 있어요/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '게임 시작하기' })).toBeDisabled()
  })

  it('prologue가 빈 문자열이고 isLoading=false면 즉시 버튼 활성화', () => {
    render(
      <PrologueScreen
        title="t"
        prologue=""
        onStart={() => {}}
      />,
    )
    expect(screen.getByRole('button', { name: '게임 시작하기' })).not.toBeDisabled()
  })
})
