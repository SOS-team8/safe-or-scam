import { Suspense, lazy, useState } from 'react'
import { Link, Navigate, Route, Routes } from 'react-router-dom'

import { useAuthBootstrap, useLogout } from '@/features/auth/hooks'
import { useAuthStore } from '@/features/auth/store'
import { NotificationBell } from '@/features/notification/components/NotificationBell'
import { ProtectedRoute } from '@/routes/ProtectedRoute'

// 라우트 레벨 코드 분할: 각 페이지를 별도 청크로 분리해 초기 번들을 줄인다.
// named export 라 .then 으로 default 매핑.
const LandingPage = lazy(() =>
  import('@/pages/LandingPage').then((m) => ({ default: m.LandingPage })),
)
const LoginPage = lazy(() =>
  import('@/features/auth/pages/LoginPage').then((m) => ({ default: m.LoginPage })),
)
const SignupPage = lazy(() =>
  import('@/features/auth/pages/SignupPage').then((m) => ({ default: m.SignupPage })),
)
const EmailVerificationPage = lazy(() =>
  import('@/features/auth/pages/EmailVerificationPage').then((m) => ({
    default: m.EmailVerificationPage,
  })),
)
const OnboardingPage = lazy(() =>
  import('@/features/user/pages/OnboardingPage').then((m) => ({ default: m.OnboardingPage })),
)
const LobbyPage = lazy(() =>
  import('@/features/game-session/pages/LobbyPage').then((m) => ({ default: m.LobbyPage })),
)
const MyPage = lazy(() => import('@/features/user/pages/MyPage').then((m) => ({ default: m.MyPage })))
const GamePlayPage = lazy(() =>
  import('@/features/game/pages/GamePlayPage').then((m) => ({ default: m.GamePlayPage })),
)

function RouteFallback() {
  return (
    <div className="py-16 text-center text-sm text-slate-400" role="status" aria-live="polite">
      불러오는 중...
    </div>
  )
}

function App() {
  const { hasMeIntegrityError, retryMe } = useAuthBootstrap()

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const role = useAuthStore((state) => state.role)
  const logoutMutation = useLogout()
  const [isIntegrityToastDismissed, setIsIntegrityToastDismissed] = useState(false)
  const isIntegrityToastVisible = hasMeIntegrityError && !isIntegrityToastDismissed

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100">
      <header className="border-b border-white/10 bg-slate-950/90">
        <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4">
          <Link
            to={isAuthenticated ? '/lobby' : '/'}
            className="text-glow-emerald rounded-sm text-lg font-bold tracking-normal text-white transition hover:text-emerald-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            Safe or Scam
          </Link>
          <div className="flex items-center gap-4 text-sm text-slate-300">
            {isAuthenticated ? (
              <>
                <Link
                  to="/lobby"
                  className="rounded-sm transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                >
                  로비
                </Link>
                <Link
                  to="/mypage"
                  className="rounded-sm transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                >
                  마이페이지
                </Link>
                {role === 'USER' ? <NotificationBell /> : null}
                <button
                  type="button"
                  disabled={logoutMutation.isPending}
                  onClick={() => logoutMutation.mutate()}
                  className="rounded-md border border-white/10 px-3 py-1.5 text-slate-200 transition hover:border-emerald-300 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:text-slate-500"
                >
                  {logoutMutation.isPending ? '로그아웃 중...' : '로그아웃'}
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-sm transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                >
                  로그인
                </Link>
                <Link
                  to="/signup"
                  className="rounded-sm transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                >
                  회원가입
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl px-5 py-8">
        <Suspense fallback={<RouteFallback />}>
          <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/signup/verify" element={<EmailVerificationPage />} />
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute allowedRoles={['GUEST']}>
                <OnboardingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/lobby"
            element={
              <ProtectedRoute allowedRoles={['USER']}>
                <LobbyPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mypage"
            element={
              <ProtectedRoute allowedRoles={['USER']}>
                <MyPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/play/:sessionId"
            element={
              <ProtectedRoute allowedRoles={['USER']}>
                <GamePlayPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>

      {isIntegrityToastVisible ? (
        <div
          role="alert"
          aria-live="assertive"
          className="fixed right-5 top-20 z-50 max-w-sm space-y-2 rounded-md border border-amber-300/30 bg-slate-900 px-4 py-3 text-sm shadow-lg shadow-slate-950/40"
        >
          <p className="font-semibold text-amber-200">계정 정보를 확인하고 있어요</p>
          <p className="text-slate-300">
            서버 응답이 일시적으로 불완전합니다. 다시 시도하거나 로그아웃 후 재로그인을 시도해주세요.
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsIntegrityToastDismissed(true)}
              className="rounded-md border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:border-emerald-300 hover:text-white"
            >
              닫기
            </button>
            <button
              type="button"
              onClick={() => {
                setIsIntegrityToastDismissed(true)
                void retryMe()
              }}
              className="rounded-md bg-emerald-400 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-emerald-300"
            >
              다시 시도
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default App
