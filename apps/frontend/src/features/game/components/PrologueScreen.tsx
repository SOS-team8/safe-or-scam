import { useState } from 'react'

import { useTypingEffect } from '@/shared/hooks/useTypingEffect'

type PrologueScreenProps = {
  title: string
  prologue: string
  onStart: () => void
  /** scenario detail이 아직 로딩 중인 경우 — prologue 텍스트는 빈 문자열로 들어온다. */
  isLoading?: boolean
  /**
   * 시나리오의 시각적 도입 이미지. 보통 root 노드의 image_url을 전달한다.
   * 절대 URL이거나 vite proxy 경유 상대 URL. NarrationPanel과 동일 패턴.
   */
  imageUrl?: string | null
}

/**
 * 게임 시작 전 시나리오 설명 화면.
 *
 * - prologue 텍스트를 타이핑 효과로 노출 (NarrationPanel과 동일 톤).
 * - "게임 시작하기" 버튼은 타이핑 완료 후 등장.
 * - 타이핑 중 본문 영역 클릭 시 즉시 전체 표시.
 * - imageUrl이 있으면 본문 위에 큰 영역으로 시각적 도입 제공.
 */
export function PrologueScreen({
  title,
  prologue,
  onStart,
  isLoading = false,
  imageUrl,
}: PrologueScreenProps) {
  const [isTypingComplete, setIsTypingComplete] = useState<boolean>(false)
  const { displayedText, isComplete, skip } = useTypingEffect(prologue, {
    speed: 25,
    enabled: !isLoading && prologue.length > 0,
    onComplete: () => setIsTypingComplete(true),
  })

  // imageUrl 변경 시 failed 초기화 (NarrationPanel 패턴 재사용).
  const [imageFailedState, setImageFailedState] = useState<{
    failed: boolean
    lastUrl: string | null | undefined
  }>({ failed: false, lastUrl: imageUrl })
  if (imageFailedState.lastUrl !== imageUrl) {
    setImageFailedState({ failed: false, lastUrl: imageUrl })
  }
  const showImage = Boolean(imageUrl) && !imageFailedState.failed

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
        className={`space-y-5 rounded-xl border border-white/8 bg-sos-surface-1 p-6 shadow-sos-raised transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/40 ${
          isComplete ? 'cursor-default' : 'cursor-pointer'
        }`}
      >
        {showImage ? (
          <div className="overflow-hidden rounded-md border border-white/10 bg-slate-900">
            <img
              src={imageUrl ?? undefined}
              alt=""
              aria-hidden="true"
              onError={() =>
                setImageFailedState({ failed: true, lastUrl: imageUrl })
              }
              className="block h-full w-full object-cover"
            />
          </div>
        ) : null}
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
