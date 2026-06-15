import { useEffect, useRef, useState, type MouseEvent } from 'react'

import { badgeImageByCode } from '../badges'

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export type UnlockedAchievementView = {
  code: string
  title: string
  description: string
  iconUrl: string | null
}

type AchievementUnlockedDialogProps = {
  achievements: UnlockedAchievementView[]
  onClose: () => void
}

function UnlockedBadge({ achievement }: { achievement: UnlockedAchievementView }) {
  const [hasImageError, setHasImageError] = useState(false)
  const imageSrc = badgeImageByCode[achievement.code] ?? achievement.iconUrl

  if (!imageSrc || hasImageError) {
    return (
      <div
        aria-hidden="true"
        className="flex size-20 items-center justify-center rounded-full bg-slate-700 text-2xl font-semibold text-slate-300"
      >
        {achievement.title.trim().slice(0, 1) || 'S'}
      </div>
    )
  }

  return (
    <img
      src={imageSrc}
      alt={achievement.title}
      loading="lazy"
      decoding="async"
      onError={() => setHasImageError(true)}
      className="size-20 object-contain"
    />
  )
}

// 결말 도달 직후 새로 달성한 업적을 축하하는 모달. EndingScreen 위에 떠서 표시된다.
export function AchievementUnlockedDialog({
  achievements,
  onClose,
}: AchievementUnlockedDialogProps) {
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
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/85 px-5 py-8"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="achievement-unlocked-title"
        tabIndex={-1}
        className="animate-sos-fade-slide max-h-[calc(100vh-4rem)] w-full max-w-md overflow-y-auto rounded-xl border border-emerald-300/30 bg-slate-900 p-6 text-center shadow-sos-dialog"
      >
        <p className="text-sm font-semibold uppercase tracking-widest text-emerald-200">
          Achievement unlocked
        </p>
        <h2
          id="achievement-unlocked-title"
          className="mt-2 text-2xl font-bold tracking-tight text-white"
        >
          업적 달성!
        </h2>

        <ul className="mt-6 space-y-5">
          {achievements.map((achievement) => (
            <li key={achievement.code} className="flex flex-col items-center">
              <UnlockedBadge achievement={achievement} />
              <h3 className="mt-3 text-lg font-semibold text-white">{achievement.title}</h3>
              <p className="mt-1 text-sm leading-6 text-slate-400">{achievement.description}</p>
            </li>
          ))}
        </ul>

        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-lg bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200"
        >
          확인
        </button>
      </div>
    </div>
  )
}
