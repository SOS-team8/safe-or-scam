import { useEffect, useRef } from 'react'

import type { DangerFeedback } from '../types'

type DangerFeedbackModalProps = {
  feedback: DangerFeedback
  choiceText?: string
  isOpen: boolean
  onClose: () => void
}

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export function DangerFeedbackModal({
  feedback,
  choiceText,
  isOpen,
  onClose,
}: DangerFeedbackModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isOpen) return
    previouslyFocused.current = document.activeElement as HTMLElement | null
    closeButtonRef.current?.focus()

    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
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
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 px-5 py-8"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="danger-feedback-title"
        tabIndex={-1}
        className="w-full max-w-lg space-y-5 rounded-lg border border-red-300/30 bg-slate-900 p-6 shadow-2xl shadow-slate-950/50 animate-sos-fade-slide"
      >
        <p className="text-sm font-semibold text-red-200">위험했던 선택</p>
        <h2 id="danger-feedback-title" className="text-2xl font-semibold text-white">
          {choiceText ?? '이 선택이 위험했던 이유'}
        </h2>

        <section className="space-y-2 rounded-md border border-red-300/30 bg-red-500/10 p-4">
          <h3 className="text-sm font-semibold text-red-100">왜 위험한가</h3>
          <p className="text-sm leading-6 text-slate-200">{feedback.why_dangerous}</p>
        </section>

        {feedback.warning_signs.length > 0 ? (
          <section className="space-y-2 rounded-md border border-amber-300/30 bg-amber-300/10 p-4">
            <h3 className="text-sm font-semibold text-amber-200">놓친 경고 신호</h3>
            <ul className="space-y-1.5 text-sm leading-6 text-slate-200">
              {feedback.warning_signs.map((sign, idx) => (
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

        <section className="space-y-2 rounded-md border border-emerald-300/30 bg-emerald-300/10 p-4">
          <h3 className="text-sm font-semibold text-emerald-200">더 안전했던 대안</h3>
          <p className="text-sm leading-6 text-slate-200">{feedback.safe_alternative}</p>
        </section>

        <div className="flex justify-end">
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="rounded-md border border-white/10 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-emerald-300 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}
