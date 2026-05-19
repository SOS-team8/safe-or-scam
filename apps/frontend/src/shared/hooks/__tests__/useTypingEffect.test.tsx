import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'

import { useTypingEffect } from '../useTypingEffect'

describe('useTypingEffect', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('빈 텍스트는 즉시 isComplete=true', () => {
    const { result } = renderHook(() => useTypingEffect('', { speed: 10 }))
    expect(result.current.isComplete).toBe(true)
    expect(result.current.displayedText).toBe('')
  })

  it('enabled=false이면 즉시 전체 텍스트', () => {
    const { result } = renderHook(() =>
      useTypingEffect('hello', { speed: 10, enabled: false }),
    )
    expect(result.current.isComplete).toBe(true)
    expect(result.current.displayedText).toBe('hello')
  })

  it('한 글자씩 점진적으로 노출하고 끝날 때 onComplete 호출', () => {
    const onComplete = vi.fn()
    const { result } = renderHook(() =>
      useTypingEffect('abc', { speed: 10, onComplete }),
    )

    expect(result.current.displayedText).toBe('')
    expect(result.current.isComplete).toBe(false)

    act(() => {
      vi.advanceTimersByTime(10)
    })
    expect(result.current.displayedText).toBe('a')

    act(() => {
      vi.advanceTimersByTime(10)
    })
    expect(result.current.displayedText).toBe('ab')

    act(() => {
      vi.advanceTimersByTime(10)
    })
    expect(result.current.displayedText).toBe('abc')
    expect(result.current.isComplete).toBe(true)
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('skip() 호출 시 즉시 전체 노출 + onComplete', () => {
    const onComplete = vi.fn()
    const { result } = renderHook(() =>
      useTypingEffect('hello', { speed: 50, onComplete }),
    )

    act(() => {
      vi.advanceTimersByTime(50)
    })
    expect(result.current.displayedText).toBe('h')

    act(() => {
      result.current.skip()
    })
    expect(result.current.displayedText).toBe('hello')
    expect(result.current.isComplete).toBe(true)
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('skip() 이후 timer가 진행되어도 부분 텍스트로 덮어쓰지 않는다 (race fix)', () => {
    // 회귀: skip 호출 후에도 setTimeout 체인이 살아 있어 다음 tick에서
    // setState(prev → 부분 슬라이스)로 isComplete=true를 다시 false로 만드는 버그.
    const onComplete = vi.fn()
    const { result } = renderHook(() =>
      useTypingEffect('abcdef', { speed: 50, onComplete }),
    )

    // 첫 글자 진행 (index=1).
    act(() => {
      vi.advanceTimersByTime(50)
    })
    expect(result.current.displayedText).toBe('a')

    // skip 호출 — 즉시 전체 표시.
    act(() => {
      result.current.skip()
    })
    expect(result.current.displayedText).toBe('abcdef')
    expect(result.current.isComplete).toBe(true)

    // 충분히 시간이 흘러 timer chain이 더 실행돼도 부분 텍스트로 덮어쓰면 안 된다.
    act(() => {
      vi.advanceTimersByTime(50 * 10)
    })
    expect(result.current.displayedText).toBe('abcdef')
    expect(result.current.isComplete).toBe(true)
    // onComplete는 skip 시점에만 1회 호출되어야 함 (timer chain이 추가 호출 X).
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('text 변경 시 다시 시작', () => {
    const { result, rerender } = renderHook(
      ({ text }: { text: string }) => useTypingEffect(text, { speed: 10 }),
      { initialProps: { text: 'ab' } },
    )

    act(() => {
      vi.advanceTimersByTime(20)
    })
    expect(result.current.displayedText).toBe('ab')
    expect(result.current.isComplete).toBe(true)

    rerender({ text: 'xyz' })

    expect(result.current.displayedText).toBe('')
    expect(result.current.isComplete).toBe(false)

    act(() => {
      vi.advanceTimersByTime(30)
    })
    expect(result.current.displayedText).toBe('xyz')
  })

  it('unmount 시 timer cleanup', () => {
    const onComplete = vi.fn()
    const { unmount } = renderHook(() =>
      useTypingEffect('hello', { speed: 10, onComplete }),
    )

    act(() => {
      vi.advanceTimersByTime(10)
    })
    unmount()
    act(() => {
      vi.advanceTimersByTime(100)
    })
    // unmount 이후 onComplete가 호출되면 안 된다.
    expect(onComplete).not.toHaveBeenCalled()
  })
})
