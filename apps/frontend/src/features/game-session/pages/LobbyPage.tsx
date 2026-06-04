import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { toGameEngineError } from '@/features/game/api'
import { ResumeOrRestartDialog } from '@/features/game/components/ResumeOrRestartDialog'
import {
  useCreateGameSession,
  useFetchActiveSession,
  useScenarios,
} from '@/features/game/hooks'
import { getRecommendedScenarios } from '@/features/game/recommendation'
import { useGameStore } from '@/features/game/store'
import type { Difficulty, ScenarioSummary } from '@/features/game/types'
import { useUserProfile } from '@/features/user/hooks'

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

type LobbyLocationState = {
  onboardingComplete?: boolean
}

const difficultyLabel: Record<Difficulty, string> = {
  easy: '초급',
  medium: '중급',
  hard: '고급',
}

function ScenarioCard({
  scenario,
  onStart,
  isBusy,
}: {
  scenario: ScenarioSummary
  onStart: (scenarioId: string) => void
  isBusy: boolean
}) {
  return (
    <article className="flex h-full flex-col rounded-lg border border-white/10 bg-white/5 p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-300">
          {difficultyLabel[scenario.difficulty] ?? scenario.difficulty}
        </span>
        <span className="text-xs font-medium text-emerald-300">
          {scenario.phishing_type}
        </span>
      </div>
      <h3 className="mt-4 text-lg font-semibold text-white">{scenario.title}</h3>
      <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-300">
        {scenario.description}
      </p>
      <div className="mt-auto pt-4">
        <button
          type="button"
          disabled={isBusy}
          onClick={() => onStart(scenario.scenario_id)}
          className="w-full rounded-md bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
        >
          {isBusy ? '세션 생성 중...' : '시작하기'}
        </button>
      </div>
    </article>
  )
}

type ResumePromptState = {
  scenarioId: string
  scenarioTitle: string
  existingSessionId: string
}

export function LobbyPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const profileQuery = useUserProfile()
  const scenariosQuery = useScenarios()
  const createSessionMutation = useCreateGameSession()
  const fetchActiveMutation = useFetchActiveSession()

  const dialogRef = useRef<HTMLDivElement>(null)
  const primaryActionRef = useRef<HTMLButtonElement>(null)
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null)
  const [isOnboardingPopupOpen, setIsOnboardingPopupOpen] = useState(
    Boolean((location.state as LobbyLocationState | null)?.onboardingComplete),
  )
  const [resumePrompt, setResumePrompt] = useState<ResumePromptState | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const userName = profileQuery.data?.name?.trim() || '회원'

  useEffect(() => {
    const isOnboardingComplete = Boolean(
      (location.state as LobbyLocationState | null)?.onboardingComplete,
    )
    if (!isOnboardingComplete) return
    navigate(location.pathname, { replace: true, state: null })
  }, [location.pathname, location.state, navigate])

  useEffect(() => {
    if (!isOnboardingPopupOpen) return
    previouslyFocusedElementRef.current = document.activeElement as HTMLElement | null
    primaryActionRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOnboardingPopupOpen(false)
        return
      }
      if (event.key !== 'Tab') return
      const dialog = dialogRef.current
      const focusableElements = Array.from(
        dialog?.querySelectorAll<HTMLElement>(focusableSelector) ?? [],
      ).filter(
        (el) =>
          !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden'),
      )
      if (!dialog || focusableElements.length === 0) {
        event.preventDefault()
        dialog?.focus()
        return
      }
      const first = focusableElements[0]
      const last = focusableElements[focusableElements.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      previouslyFocusedElementRef.current?.focus()
    }
  }, [isOnboardingPopupOpen])

  const handleStart = (scenarioId: string) => {
    setErrorMessage(null)
    // 카드 클릭 시 우선 활성 세션을 확인.
    // - 없으면 곧장 새 세션 생성 → /play/{id}
    // - 있으면 다이얼로그를 띄워 이어하기/처음부터 선택을 받음.
    fetchActiveMutation.mutate(scenarioId, {
      onSuccess: (response) => {
        if (response.active && response.session) {
          const scenarioTitle =
            scenariosQuery.data?.find((s) => s.scenario_id === scenarioId)?.title ??
            '진행 중인 시나리오'
          setResumePrompt({
            scenarioId,
            scenarioTitle,
            existingSessionId: response.session.session_id,
          })
          return
        }
        createSessionMutation.mutate(
          { scenarioId },
          {
            onSuccess: (session) => {
              navigate(`/play/${session.session_id}`)
            },
            onError: (error) => {
              setErrorMessage(toGameEngineError(error).message)
            },
          },
        )
      },
      onError: (error) => {
        setErrorMessage(toGameEngineError(error).message)
      },
    })
  }

  const handleResume = () => {
    if (!resumePrompt) return
    const sessionId = resumePrompt.existingSessionId
    setResumePrompt(null)
    // 이어하기는 GameContainer가 GET /game-sessions/{id} 응답으로 store를 hydrate한다.
    // 그 사이 잔존 snapshot이 flash로 보이지 않도록 즉시 reset.
    useGameStore.getState().reset()
    navigate(`/play/${sessionId}`)
  }

  const handleRestart = () => {
    if (!resumePrompt) return
    setErrorMessage(null)
    const scenarioId = resumePrompt.scenarioId
    createSessionMutation.mutate(
      { scenarioId, forceNew: true },
      {
        onSuccess: (session) => {
          setResumePrompt(null)
          navigate(`/play/${session.session_id}`)
        },
        onError: (error) => {
          setErrorMessage(toGameEngineError(error).message)
          setResumePrompt(null)
        },
      },
    )
  }

  const isStartingSession =
    fetchActiveMutation.isPending || createSessionMutation.isPending

  const recommendedScenarios = useMemo(
    () => getRecommendedScenarios(profileQuery.data, scenariosQuery.data, 2),
    [profileQuery.data, scenariosQuery.data],
  )

  return (
    <section className="space-y-8 py-6">
      {isOnboardingPopupOpen ? (
        <div
          role="presentation"
          className="fixed inset-0 z-20 flex items-center justify-center bg-slate-950/75 px-5 py-8"
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="onboarding-complete-title"
            aria-describedby="onboarding-complete-description"
            tabIndex={-1}
            className="w-full max-w-md rounded-lg border border-emerald-300/30 bg-slate-900 p-6 shadow-2xl shadow-slate-950/50"
          >
            <p className="text-sm font-semibold text-emerald-300">프로필 저장 완료</p>
            <h2 id="onboarding-complete-title" className="mt-3 text-2xl font-semibold text-white">
              맞춤 시나리오가 준비됐어요
            </h2>
            <p id="onboarding-complete-description" className="mt-3 leading-7 text-slate-300">
              답변해주신 생활 패턴을 바탕으로 추천 훈련을 골라두었어요. 이제 실제 메시지처럼
              보이는 상황을 플레이하며 안전 신호와 위험 신호를 연습해볼까요?
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setIsOnboardingPopupOpen(false)}
                className="rounded-md border border-white/10 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-emerald-300 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200"
              >
                조금 둘러볼게요
              </button>
              <button
                ref={primaryActionRef}
                type="button"
                onClick={() => setIsOnboardingPopupOpen(false)}
                className="rounded-md bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200"
              >
                시나리오 둘러보기
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <p className="text-sm font-medium text-emerald-300">오늘의 피싱 훈련</p>
        <h1 className="text-3xl font-semibold text-white">안녕하세요, {userName}님</h1>
        <p className="text-slate-300">실제 메시지처럼 보이는 시나리오로 위험 신호를 찾아보세요.</p>
      </div>

      {errorMessage ? (
        <p
          role="alert"
          className="rounded-md border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100"
        >
          {errorMessage}
        </p>
      ) : null}

      {scenariosQuery.isPending ? (
        <p role="status" aria-live="polite" className="text-sm text-slate-300">
          시나리오를 불러오고 있어요...
        </p>
      ) : null}

      {scenariosQuery.isError ? (
        <section
          role="alert"
          className="space-y-3 rounded-lg border border-red-300/30 bg-red-500/10 p-6"
        >
          <p className="text-sm font-semibold text-red-100">시나리오 목록을 불러오지 못했어요</p>
          <p className="text-sm text-red-100/80">
            {toGameEngineError(scenariosQuery.error).message}
          </p>
          <button
            type="button"
            onClick={() => void scenariosQuery.refetch()}
            className="rounded-md bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-300"
          >
            다시 시도
          </button>
        </section>
      ) : null}

      {scenariosQuery.isSuccess && scenariosQuery.data.length === 0 ? (
        <section className="rounded-lg border border-white/10 bg-white/5 p-6 text-center text-slate-300">
          <p>표시할 시나리오가 아직 없어요. 잠시 후 다시 확인해주세요.</p>
        </section>
      ) : null}

      {recommendedScenarios.length > 0 ? (
        <section className="rounded-lg border border-emerald-300/30 bg-emerald-300/10 p-5">
          <p className="text-sm font-semibold text-emerald-200">맞춤 추천</p>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            {recommendedScenarios.map((scenario, index) => (
              <article
                key={scenario.scenario_id}
                className="flex h-full flex-col rounded-lg border border-emerald-200/20 bg-slate-950/35 p-4"
              >
                <p className="text-xs font-semibold text-emerald-200">
                  추천 {index + 1}
                </p>
                <h2 className="mt-2 text-xl font-semibold text-white">{scenario.title}</h2>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-300">
                  {scenario.description}
                </p>
                <button
                  type="button"
                  disabled={isStartingSession}
                  onClick={() => handleStart(scenario.scenario_id)}
                  className="mt-auto rounded-md bg-emerald-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                >
                  {isStartingSession ? '세션 생성 중...' : '바로 시작하기'}
                </button>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {scenariosQuery.data && scenariosQuery.data.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-white">전체 시나리오</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {scenariosQuery.data.map((scenario) => (
              <ScenarioCard
                key={scenario.scenario_id}
                scenario={scenario}
                onStart={handleStart}
                isBusy={isStartingSession}
              />
            ))}
          </div>
        </section>
      ) : null}

      {resumePrompt ? (
        <ResumeOrRestartDialog
          scenarioTitle={resumePrompt.scenarioTitle}
          isBusy={createSessionMutation.isPending}
          onResume={handleResume}
          onRestart={handleRestart}
          onClose={() => setResumePrompt(null)}
        />
      ) : null}
    </section>
  )
}
