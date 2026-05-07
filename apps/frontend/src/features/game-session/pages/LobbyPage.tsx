import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

const scenarios = [
  { title: '택배 배송 주소 확인', difficulty: '초급', status: '추천' },
  { title: '회사 보안 메일 점검', difficulty: '중급', status: '준비됨' },
  { title: '계좌 이상 거래 알림', difficulty: '중급', status: '준비됨' },
]

type LobbyLocationState = {
  onboardingComplete?: boolean
}

export function LobbyPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [isOnboardingPopupOpen, setIsOnboardingPopupOpen] = useState(
    Boolean((location.state as LobbyLocationState | null)?.onboardingComplete),
  )

  useEffect(() => {
    const isOnboardingComplete = Boolean(
      (location.state as LobbyLocationState | null)?.onboardingComplete,
    )

    if (!isOnboardingComplete) {
      return
    }

    navigate(location.pathname, { replace: true, state: null })
  }, [location.pathname, location.state, navigate])

  useEffect(() => {
    if (!isOnboardingPopupOpen) {
      return
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOnboardingPopupOpen(false)
      }
    }

    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('keydown', handleEscape)
    }
  }, [isOnboardingPopupOpen])

  return (
    <section className="space-y-8 py-6">
      {isOnboardingPopupOpen ? (
        <div
          role="presentation"
          className="fixed inset-0 z-20 flex items-center justify-center bg-slate-950/75 px-5 py-8"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="onboarding-complete-title"
            aria-describedby="onboarding-complete-description"
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
                className="rounded-md border border-white/10 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-emerald-300 hover:text-white"
              >
                조금 둘러볼게요
              </button>
              <button
                type="button"
                onClick={() => setIsOnboardingPopupOpen(false)}
                className="rounded-md bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300"
              >
                시나리오 플레이하기
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <p className="text-sm font-medium text-emerald-300">온보딩이 완료되었습니다</p>
        <h1 className="text-3xl font-semibold text-white">안녕하세요, 소영님</h1>
        <p className="text-slate-300">오늘은 실생활 메시지 피싱을 빠르게 판별하는 훈련을 추천합니다.</p>
      </div>

      <section className="rounded-lg border border-emerald-300/30 bg-emerald-300/10 p-5">
        <p className="text-sm font-semibold text-emerald-200">맞춤 추천</p>
        <div className="mt-3 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="text-xl font-semibold text-white">택배 배송 주소 확인</h2>
            <p className="mt-2 text-slate-300">짧은 문자와 링크를 보고 위험 신호를 판단하는 5분 시나리오입니다.</p>
          </div>
          <button type="button" className="rounded-md bg-emerald-400 px-4 py-3 font-semibold text-slate-950 hover:bg-emerald-300">
            시작하기
          </button>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-white">전체 시나리오</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {scenarios.map((scenario) => (
            <article key={scenario.title} className="rounded-lg border border-white/10 bg-white/3 p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-300">{scenario.difficulty}</span>
                <span className="text-xs font-medium text-emerald-300">{scenario.status}</span>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-white">{scenario.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">선택지 기반 텍스트 어드벤처로 구성될 예정입니다.</p>
            </article>
          ))}
        </div>
      </section>
    </section>
  )
}
