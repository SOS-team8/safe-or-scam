import { useState } from 'react'

import { useTypingEffect } from '@/shared/hooks/useTypingEffect'

type NarrationPanelProps = {
  text: string
  imageUrl?: string | null
  /**
   * 타이핑 효과 속도 (ms/char). 기본 25ms.
   * 0 또는 음수로 설정하면 typing 효과를 끄고 즉시 전체 표시한다.
   */
  typingSpeed?: number
  /**
   * 타이핑 완료 시 1회 호출. ChoicePanel 노출 등 후속 조작에 사용.
   */
  onTypingComplete?: () => void
}

type ImageFailedState = {
  failed: boolean
  lastUrl: string | null | undefined
}

export function NarrationPanel({
  text,
  imageUrl,
  typingSpeed = 25,
  onTypingComplete,
}: NarrationPanelProps) {
  // imageUrl 변경 시 render-time에 failed 상태 초기화.
  // useState로 lastUrl을 추적해 ref 변경 lint 규칙을 우회.
  const [imageFailedState, setImageFailedState] = useState<ImageFailedState>({
    failed: false,
    lastUrl: imageUrl,
  })
  if (imageFailedState.lastUrl !== imageUrl) {
    setImageFailedState({ failed: false, lastUrl: imageUrl })
  }
  const imageFailed = imageFailedState.failed
  const setImageFailed = (failed: boolean) =>
    setImageFailedState({ failed, lastUrl: imageUrl })

  const showImage = Boolean(imageUrl) && !imageFailed

  // typingSpeed가 0 이하이면 효과를 끈다.
  const typingEnabled = typingSpeed > 0
  const { displayedText, isComplete, skip } = useTypingEffect(text, {
    speed: typingSpeed,
    enabled: typingEnabled,
    onComplete: onTypingComplete,
  })

  // 사용자가 클릭/스페이스/엔터로 typing skip.
  const handleSkip = () => {
    if (!isComplete) skip()
  }

  return (
    <article
      aria-label="시나리오 나레이션"
      onClick={handleSkip}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          handleSkip()
        }
      }}
      role="button"
      tabIndex={isComplete ? -1 : 0}
      aria-pressed={false}
      className={`space-y-5 rounded-lg border border-white/10 bg-white/5 p-6 shadow-2xl shadow-slate-950/20 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/40 ${
        isComplete ? 'cursor-default' : 'cursor-pointer'
      }`}
    >
      {showImage ? (
        <div className="overflow-hidden rounded-md border border-white/10 bg-slate-900">
          <img
            src={imageUrl ?? undefined}
            alt=""
            aria-hidden="true"
            onError={() => setImageFailed(true)}
            className="block h-full w-full object-cover"
          />
        </div>
      ) : null}
      <div className="space-y-3 text-base leading-7 text-slate-200">
        {displayedText.split(/\n+/).map((paragraph, idx) => (
          <p key={idx}>
            {paragraph}
            {!isComplete && idx === displayedText.split(/\n+/).length - 1 ? (
              <span
                aria-hidden="true"
                className="ml-0.5 inline-block w-[2px] -translate-y-0.5 bg-emerald-300/80 align-middle"
                style={{ height: '1em', animation: 'sosNarrationCursor 1s steps(2) infinite' }}
              />
            ) : null}
          </p>
        ))}
      </div>
      {!isComplete ? (
        <p
          aria-live="polite"
          className="text-xs text-slate-400/80"
        >
          클릭하면 전체 텍스트를 바로 볼 수 있어요
        </p>
      ) : null}
    </article>
  )
}
