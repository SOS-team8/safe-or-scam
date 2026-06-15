import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

import type { EducationalContent } from '../types'

type EducationalPopupProps = {
  content: EducationalContent
  isOpen: boolean
  onDismiss: () => void
}

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export function EducationalPopup({ content, isOpen, onDismiss }: EducationalPopupProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const dismissButtonRef = useRef<HTMLButtonElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isOpen) return
    previouslyFocused.current = document.activeElement as HTMLElement | null
    dismissButtonRef.current?.focus()

    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onDismiss()
        return
      }
      if (event.key !== 'Tab') return

      const dialog = dialogRef.current
      const focusables = Array.from(
        dialog?.querySelectorAll<HTMLElement>(focusableSelector) ?? [],
      ).filter((el) => el.getAttribute('aria-hidden') !== 'true')
      if (!dialog || focusables.length === 0) {
        event.preventDefault()
        dialog?.focus()
        return
      }
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', handler)
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = originalOverflow
      previouslyFocused.current?.focus()
    }
  }, [isOpen, onDismiss])

  if (!isOpen) return null

  // createPortal: 상위 ancestor에 transform 속성이 있으면 fixed 포지셔닝이
  // 부모 기준으로 잡혀 모달이 화면 중앙에서 어긋난다 (DangerFeedbackModal과
  // 동일 회귀 방지).
  return createPortal(
    <div
      role="presentation"
      className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/80 px-5 py-8"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="educational-popup-title"
        aria-describedby="educational-popup-description"
        tabIndex={-1}
        className="w-full max-w-lg max-h-[85vh] overflow-y-auto space-y-5 rounded-xl border border-emerald-300/30 bg-slate-900 p-6 shadow-sos-dialog animate-sos-fade-slide"
      >
        <p className="text-sm font-semibold text-emerald-300">학습 포인트</p>
        <h2 id="educational-popup-title" className="text-2xl font-semibold text-sos-strong">
          {content.title}
        </h2>
        <p
          id="educational-popup-description"
          className="text-base leading-7 text-slate-200"
        >
          {content.explanation}
        </p>

        {content.warning_signs.length > 0 ? (
          <section className="space-y-2 rounded-md border border-amber-300/30 bg-amber-300/10 p-4">
            <h3 className="text-sm font-semibold text-amber-200">놓치기 쉬운 경고 신호</h3>
            <ul className="space-y-1.5 text-sm leading-6 text-slate-200">
              {content.warning_signs.map((sign, idx) => (
                <li key={idx} className="flex gap-2">
                  <span aria-hidden="true" className="text-amber-300">
                    !
                  </span>
                  <span>{sign}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {content.prevention_tips.length > 0 ? (
          <section className="space-y-2 rounded-md border border-emerald-300/30 bg-emerald-300/10 p-4">
            <h3 className="text-sm font-semibold text-emerald-200">안전한 대응</h3>
            <ul className="space-y-1.5 text-sm leading-6 text-slate-200">
              {content.prevention_tips.map((tip, idx) => (
                <li key={idx} className="flex gap-2">
                  <span aria-hidden="true" className="text-emerald-300">
                    ✓
                  </span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className="flex justify-end">
          <button
            ref={dismissButtonRef}
            type="button"
            onClick={onDismiss}
            className="rounded-md bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200"
          >
            계속하기
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
