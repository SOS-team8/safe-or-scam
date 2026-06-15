import { useEffect, useRef, type MouseEvent } from 'react'

import { formatAchievedDate } from '../formatDate'
import type { AchievementSummary } from '../types'

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

type AchievementDetailDialogProps = {
  achievement: AchievementSummary
  onClose: () => void
}

// TODO(BE): 업적 상세(달성 조건) 조회 API가 추가되면 conditionValue 노출로 확장
export function AchievementDetailDialog({ achievement, onClose }: AchievementDetailDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    previouslyFocusedElementRef.current = document.activeElement as HTMLElement | null
    closeButtonRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }

      if (event.key !== 'Tab') {
        return
      }

      const dialog = dialogRef.current
      const focusableElements = Array.from(
        dialog?.querySelectorAll<HTMLElement>(focusableSelector) ?? [],
      ).filter((element) => element.getAttribute('aria-hidden') !== 'true')

      if (!dialog || focusableElements.length === 0) {
        event.preventDefault()
        dialog?.focus()
        return
      }

      const firstFocusableElement = focusableElements[0]
      const lastFocusableElement = focusableElements[focusableElements.length - 1]

      if (event.shiftKey && document.activeElement === firstFocusableElement) {
        event.preventDefault()
        lastFocusableElement.focus()
        return
      }

      if (!event.shiftKey && document.activeElement === lastFocusableElement) {
        event.preventDefault()
        firstFocusableElement.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      previouslyFocusedElementRef.current?.focus()
    }
  }, [onClose])

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose()
    }
  }

  return (
    <div
      role="presentation"
      onClick={handleBackdropClick}
      className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/80 px-5 py-8"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="achievement-detail-title"
        tabIndex={-1}
        className="w-full max-w-md rounded-xl border border-white/8 bg-slate-900 p-6 shadow-sos-dialog"
      >
        <p className="text-sm font-semibold text-emerald-200">업적 상세</p>
        <h2 id="achievement-detail-title" className="mt-3 text-2xl font-semibold text-white">
          {achievement.title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-300">{achievement.description}</p>

        <dl className="mt-5 space-y-3 text-sm">
          <div className="rounded-md border border-white/10 bg-slate-950 px-3 py-3">
            <dt className="font-medium text-slate-400">달성 여부</dt>
            <dd
              className={`mt-1 font-semibold ${
                achievement.isAchieved ? 'text-emerald-200' : 'text-slate-400'
              }`}
            >
              {achievement.isAchieved ? '달성' : '미달성'}
            </dd>
          </div>
          {achievement.isAchieved && achievement.achievedAt ? (
            <div className="rounded-md border border-white/10 bg-slate-950 px-3 py-3">
              <dt className="font-medium text-slate-400">달성일</dt>
              <dd className="mt-1 text-slate-200">
                {formatAchievedDate(achievement.achievedAt)}
              </dd>
            </div>
          ) : null}
        </dl>

        <div className="mt-6 flex justify-end">
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
