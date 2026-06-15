import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useNotifications } from '../hooks'
import { NotificationsTab } from './NotificationsTab'

type FeedbackState = {
  tone: 'success' | 'error'
  message: string
} | null

export function NotificationBell() {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [feedback, setFeedback] = useState<FeedbackState>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const notificationsQuery = useNotifications()
  const unreadCount = notificationsQuery.data?.unreadCount ?? 0

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
        buttonRef.current?.focus()
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  useEffect(() => {
    if (!feedback) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setFeedback(null)
    }, 2000)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [feedback])

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={unreadCount > 0 ? `알림, 읽지 않은 알림 ${unreadCount}개` : '알림'}
        onClick={() => setIsOpen((open) => !open)}
        className="relative flex size-9 items-center justify-center rounded-lg border border-white/10 text-sos-body transition hover:border-emerald-300 hover:text-sos-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5">
          <path
            d="M12 4a5.5 5.5 0 0 0-5.5 5.5v3.2L5 16.5h14l-1.5-3.8V9.5A5.5 5.5 0 0 0 12 4Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M10 19a2 2 0 0 0 4 0"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
        {unreadCount > 0 ? (
          <span
            aria-hidden="true"
            className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-300 px-1 text-[10px] font-bold tabular-nums text-slate-950"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div
          role="dialog"
          aria-label="알림 목록"
          className="absolute right-0 top-full z-40 mt-3 max-h-[28rem] w-80 max-w-[calc(100vw-2.5rem)] overflow-y-auto rounded-xl border border-white/10 bg-slate-900 p-4 text-left shadow-sos-dialog sm:w-96"
        >
          {feedback ? (
            <p
              role="status"
              className={`mb-3 rounded-lg px-3 py-2 text-xs font-semibold ${
                feedback.tone === 'success'
                  ? 'bg-emerald-300/10 text-emerald-200'
                  : 'bg-red-500/10 text-red-200'
              }`}
            >
              {feedback.message}
            </p>
          ) : null}
          <NotificationsTab
            onToast={setFeedback}
            onGoToAchievement={(achievementId) => {
              setIsOpen(false)
              navigate('/mypage', { state: { focusAchievementId: achievementId } })
            }}
            onNavigate={() => setIsOpen(false)}
          />
        </div>
      ) : null}
    </div>
  )
}
