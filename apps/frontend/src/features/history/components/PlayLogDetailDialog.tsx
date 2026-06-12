import { useEffect, useRef, useState, type MouseEvent } from 'react'

import { toApiError } from '@/shared/api/error'

import { endingTypeLabel } from '../format'
import { usePlayLogDetail } from '../hooks'

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

type PlayLogDetailDialogProps = {
  logId: string
  endingType: string
  onClose: () => void
}

export function PlayLogDetailDialog({ logId, endingType, onClose }: PlayLogDetailDialogProps) {
  const detailQuery = usePlayLogDetail(logId)
  const [hasImageError, setHasImageError] = useState(false)
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

  const detail = detailQuery.data
  const ending = endingTypeLabel(endingType)

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
        aria-labelledby="play-log-detail-title"
        tabIndex={-1}
        className="max-h-[calc(100vh-4rem)] w-full max-w-md overflow-y-auto rounded-xl border border-white/8 bg-slate-900 p-6 shadow-sos-dialog"
      >
        <p
          className={`text-sm font-semibold ${ending.isGood ? 'text-emerald-200' : 'text-red-200'}`}
        >
          {ending.label}
        </p>

        {detailQuery.isPending ? (
          <div className="mt-4 space-y-3">
            <div className="aspect-video w-full animate-pulse rounded-lg bg-slate-800" />
            <div className="h-4 w-full animate-pulse rounded bg-slate-800" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-slate-800" />
          </div>
        ) : null}

        {detailQuery.isError ? (
          <div className="mt-4 rounded-lg border border-red-300/25 bg-red-500/10 p-4">
            <p className="text-sm text-red-100">{toApiError(detailQuery.error).message}</p>
            <button
              type="button"
              onClick={() => void detailQuery.refetch()}
              className="mt-3 rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-300"
            >
              다시 시도
            </button>
          </div>
        ) : null}

        {detail ? (
          <>
            {detail.imageUrl && !hasImageError ? (
              <img
                src={detail.imageUrl}
                alt={detail.endingCategory?.label ?? '결말 이미지'}
                loading="lazy"
                decoding="async"
                onError={() => setHasImageError(true)}
                className="mt-4 aspect-video w-full rounded-lg object-cover"
              />
            ) : null}

            <h2
              id="play-log-detail-title"
              className="mt-4 text-xl font-semibold tracking-[-0.01em] text-white"
            >
              {detail.endingCategory?.label ?? '결말'}
            </h2>
            {detail.endingCategory?.description ? (
              <p className="mt-1 text-sm text-slate-400">{detail.endingCategory.description}</p>
            ) : null}
            <p className="mt-3 whitespace-pre-line text-[15px] leading-7 text-slate-200">
              {detail.text}
            </p>
          </>
        ) : null}

        <div className="mt-6 flex justify-end">
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-emerald-300 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}
