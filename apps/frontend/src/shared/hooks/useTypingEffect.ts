import { useEffect, useRef, useState } from 'react'

export type UseTypingEffectResult = {
  /** 현재까지 노출된 텍스트 (한 글자씩 누적). */
  displayedText: string
  /** 전체 텍스트가 표시 완료된 상태 여부. */
  isComplete: boolean
  /** 즉시 전체 텍스트를 노출시키는 트리거. 이미 완료됐다면 no-op. */
  skip: () => void
}

export type UseTypingEffectOptions = {
  /** ms/character. 기본 30ms. */
  speed?: number
  /** false면 typing 효과 비활성화 — 즉시 전체 표시. 테스트/접근성 옵션. */
  enabled?: boolean
  /** 텍스트가 완전히 표시된 직후 1회 호출. */
  onComplete?: () => void
}

type TypingState = {
  /** 현재까지 노출된 텍스트. */
  displayedText: string
  /** 표시 완료 여부. */
  isComplete: boolean
  /** 마지막으로 처리한 props (text/enabled) — 변경 감지용. */
  lastText: string
  lastEnabled: boolean
}

const initialState = (text: string, enabled: boolean): TypingState => {
  if (text.length === 0) {
    return { displayedText: '', isComplete: true, lastText: text, lastEnabled: enabled }
  }
  if (!enabled) {
    return { displayedText: text, isComplete: true, lastText: text, lastEnabled: enabled }
  }
  return { displayedText: '', isComplete: false, lastText: text, lastEnabled: enabled }
}

/**
 * 한 글자씩 점진적으로 표시되는 타이핑 효과 훅.
 *
 * - text가 바뀌면 항상 처음부터 다시 시작 (이전 timer는 cleanup).
 * - 빈 문자열이면 즉시 isComplete=true.
 * - skip() 호출 시 즉시 전체 표시.
 * - enabled=false면 typing 효과를 건너뛰고 즉시 전체 표시.
 *
 * 의도적으로 setInterval 대신 setTimeout 체인을 사용해 cleanup이 깔끔하다.
 * text/enabled 변경 감지는 single useState로 통합 — render 중 setState로 자기보정.
 */
export function useTypingEffect(
  text: string,
  options: UseTypingEffectOptions = {},
): UseTypingEffectResult {
  const { speed = 30, enabled = true, onComplete } = options

  const [state, setState] = useState<TypingState>(() => initialState(text, enabled))

  // 외부에서 text/enabled가 바뀌면 render 중에 동기 보정 (React 권장 패턴).
  // ref가 아닌 useState 비교로 처리하므로 react-hooks/refs 규칙을 우회한다.
  if (state.lastText !== text || state.lastEnabled !== enabled) {
    setState(initialState(text, enabled))
  }

  // onComplete는 ref로 안정화. setState 후 한 번만 호출하기 위해
  // effect에서 isComplete=true 진입을 감지한다.
  // ref.current 갱신은 effect 안에서만 — render 중 ref 수정 lint 규칙 회피.
  const onCompleteRef = useRef(onComplete)
  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  // text/enabled가 바뀌면 timer 새로 시작. isComplete=true면 timer 없이 onComplete 호출.
  useEffect(() => {
    if (text.length === 0) {
      onCompleteRef.current?.()
      return
    }
    if (!enabled) {
      onCompleteRef.current?.()
      return
    }

    let cancelled = false
    let index = 0
    const step = () => {
      if (cancelled) return
      index += 1
      setState((prev) => {
        if (prev.lastText !== text || prev.lastEnabled !== enabled) return prev
        const sliced = text.slice(0, index)
        return {
          ...prev,
          displayedText: sliced,
          isComplete: sliced.length >= text.length,
        }
      })
      if (index >= text.length) {
        onCompleteRef.current?.()
        return
      }
      timerId = window.setTimeout(step, speed)
    }
    let timerId = window.setTimeout(step, speed)
    return () => {
      cancelled = true
      window.clearTimeout(timerId)
    }
  }, [text, speed, enabled])

  const skip = () => {
    if (text.length === 0) return
    setState((prev) => ({
      ...prev,
      displayedText: text,
      isComplete: true,
    }))
    onCompleteRef.current?.()
  }

  return {
    displayedText: state.displayedText,
    isComplete: state.isComplete,
    skip,
  }
}
