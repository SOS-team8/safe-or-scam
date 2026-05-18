import { useState } from 'react'

import { useTypingEffect } from '@/shared/hooks/useTypingEffect'

type PrologueScreenProps = {
  title: string
  prologue: string
  onStart: () => void
  /** scenario detail이 아직 로딩 중인 경우 — prologue 텍스트는 빈 문자열로 들어온다. */
  isLoading?: boolean
}

/**
 * 게임 시작 전 시나리오 설명 화면.
 *
 * - prologue 텍스트를 타이핑 효과로 노출 (NarrationPanel과 동일 톤).
 * - "게임 시작하기" 버튼은 타이핑 완료 후 등장.
 * - 타이핑 중 본문 영역 클릭 시 즉시 전체 표시.
 */
export function PrologueScreen({
  title,
  prologue,
  onStart,
  isLoading = false,
}: PrologueScreenProps) {
  const [isTypingComplete, setIsTypingComplete] = useState<boolean>(false)
  const { displayedText, isComplete, skip } = useTypingEffect(prologue, {
    speed: 25,
    enabled: !isLoading && prologue.length > 0,
    onComplete: () => setIsTypingComplete(true),
  })

  const handleSkipTyping = () => {
    if (!isComplete) skip()
  }

  return (
    <section
      aria-label="시나리오 소개"
      className="space-y-6 animate-sos-fade-slide"
    >
      <header className="space-y-2 rounded-lg border border-emerald-300/30 bg-emerald-300/10 p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-200">
          새로운 시나리오
        </p>
        <h1 className="text-2xl font-semibold text-white sm:text-3xl">
          {title || '시나리오 로딩 중...'}
        </h1>
      </header>

      <article
        aria-label="시나리오 프롤로그"
        onClick={handleSkipTyping}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            handleSkipTyping()
          }
        }}
        role="button"
        tabIndex={isComplete ? -1 : 0}
        aria-pressed={false}
        className={`space-y-5 rounded-lg border border-white/10 bg-white/5 p-6 shadow-2xl shadow-slate-950/20 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/40 ${
          isComplete ? 'cursor-default' : 'cursor-pointer'
        }`}
      >
        {isLoading ? (
          <p className="text-sm text-slate-400">시나리오를 불러오고 있어요...</p>
        ) : (
          <div className="space-y-3 text-base leading-7 text-slate-200">
            {displayedText.split(/\n+/).map((paragraph, idx, arr) => (
              <p key={idx}>
                {paragraph}
                {!isComplete && idx === arr.length - 1 ? (
                  <span
                    aria-hidden="true"
                    className="ml-0.5 inline-block w-[2px] -translate-y-0.5 bg-emerald-300/80 align-middle"
                    style={{
                      height: '1em',
                      animation: 'sosNarrationCursor 1s steps(2) infinite',
                    }}
                  />
                ) : null}
              </p>
            ))}
          </div>
        )}
        {!isComplete && !isLoading && prologue.length > 0 ? (
          <p aria-live="polite" className="text-xs text-slate-400/80">
            클릭하면 전체 텍스트를 바로 볼 수 있어요
          </p>
        ) : null}
      </article>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onStart}
          disabled={isLoading || (prologue.length > 0 && !isTypingComplete)}
          className="rounded-md bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 disabled:cursor-not-allowed disabled:bg-emerald-400/40 disabled:text-slate-900/60"
        >
          게임 시작하기
        </button>
      </div>
    </section>
  )
}
