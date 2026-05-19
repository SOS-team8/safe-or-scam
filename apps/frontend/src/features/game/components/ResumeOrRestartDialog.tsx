import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

type ResumeOrRestartDialogProps = {
  scenarioTitle: string
  /** 처음부터 시작 진행 중인지 (force_new 호출 중). 두 버튼 모두 disabled 처리. */
  isBusy?: boolean
  onResume: () => void
  onRestart: () => void
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

/**
 * 활성 세션이 있는 시나리오 카드를 다시 클릭했을 때 띄우는 다이얼로그.
 *
 * - "이어하기" (emerald primary) → 기존 session.session_id로 navigate
 * - "처음부터" (slate secondary, "기존 진행 기록은 사라집니다" 보조 텍스트) → force_new=true
 * - X 닫기 / ESC / 바깥 클릭으로 dismiss
 *
 * 디자인 톤: DangerFeedbackModal, MyPage WithdrawDialog 패턴 재사용
 * (bg-slate-900 + border emerald-300/30).
 */
export function ResumeOrRestartDialog({
  scenarioTitle,
  isBusy = false,
  onResume,
  onRestart,
  onClose,
}: ResumeOrRestartDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const primaryButtonRef = useRef<HTMLButtonElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement | null
    primaryButtonRef.current?.focus()

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
  }, [onClose])

  // createPortal: 상위 ancestor의 transform 속성(animate-sos-fade-slide 등)이
  // fixed 포지셔닝의 containing block을 바꾸는 문제 회피.
  return createPortal(
    <div
      role="presentation"
      onClick={(event) => {
        // overlay 클릭 시 닫기 — 내부 dialog 클릭은 stop.
        if (event.target === event.currentTarget) onClose()
      }}
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 px-5 py-8"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="resume-restart-title"
        aria-describedby="resume-restart-description"
        tabIndex={-1}
        className="relative w-full max-w-md space-y-5 rounded-lg border border-emerald-300/30 bg-slate-900 p-6 shadow-2xl shadow-slate-950/50 animate-sos-fade-slide"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="absolute right-3 top-3 rounded-md p-2 text-slate-400 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200"
        >
          <span aria-hidden="true">×</span>
        </button>

        <p className="text-sm font-semibold text-emerald-300">진행 중인 게임</p>
        <h2
          id="resume-restart-title"
          className="text-2xl font-semibold text-white"
        >
          이어서 플레이할까요?
        </h2>
        <p
          id="resume-restart-description"
          className="text-sm leading-7 text-slate-300"
        >
          <span className="font-semibold text-white">{scenarioTitle}</span>에 진행 중인
          게임이 있어요. 이어서 마저 풀거나 새로 시작할 수 있어요.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex flex-1 flex-col gap-1">
            <button
              type="button"
              onClick={onRestart}
              disabled={isBusy}
              className="w-full rounded-md border border-white/10 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-emerald-300 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              처음부터
            </button>
            <p className="text-xs text-slate-400/80">기존 진행 기록은 사라집니다</p>
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <button
              ref={primaryButtonRef}
              type="button"
              onClick={onResume}
              disabled={isBusy}
              className="w-full rounded-md bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 disabled:cursor-not-allowed disabled:bg-emerald-400/40 disabled:text-slate-900/60"
            >
              이어하기
            </button>
            <p className="text-xs text-slate-400/80" aria-hidden="true">&nbsp;</p>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
