import { useState } from 'react'
import { Link, Navigate, Route, Routes } from 'react-router-dom'

import { useAuthBootstrap, useLogout } from '@/features/auth/hooks'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { SignupPage } from '@/features/auth/pages/SignupPage'
import { EmailVerificationPage } from '@/features/auth/pages/EmailVerificationPage'
import { useAuthStore } from '@/features/auth/store'
import { GamePlayPage } from '@/features/game/pages/GamePlayPage'
import { LobbyPage } from '@/features/game-session/pages/LobbyPage'
import { MyPage } from '@/features/user/pages/MyPage'
import { OnboardingPage } from '@/features/user/pages/OnboardingPage'
import { LandingPage } from '@/pages/LandingPage'
import { ProtectedRoute } from '@/routes/ProtectedRoute'

function App() {
  const { hasMeIntegrityError, retryMe } = useAuthBootstrap()

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const logoutMutation = useLogout()
  const [isIntegrityToastDismissed, setIsIntegrityToastDismissed] = useState(false)
  const isIntegrityToastVisible = hasMeIntegrityError && !isIntegrityToastDismissed

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100">
      <header className="border-b border-white/10 bg-slate-950/90">
        <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4">
          <Link
            to={isAuthenticated ? '/lobby' : '/'}
            className="text-glow-cyan rounded-sm text-lg font-bold tracking-normal text-white transition hover:text-cyan-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            Safe or Scam
          </Link>
          <div className="flex items-center gap-4 text-sm text-slate-300">
            {isAuthenticated ? (
              <>
                <Link
                  to="/lobby"
                  className="rounded-sm transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                >
                  로비
                </Link>
                <Link
                  to="/mypage"
                  className="rounded-sm transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                >
                  마이페이지
                </Link>
                <button
                  type="button"
                  disabled={logoutMutation.isPending}
                  onClick={() => logoutMutation.mutate()}
                  className="rounded-md border border-white/10 px-3 py-1.5 text-slate-200 transition hover:border-emerald-300 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:text-slate-500"
                >
                  {logoutMutation.isPending ? '로그아웃 중...' : '로그아웃'}
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-sm transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                >
                  로그인
                </Link>
                <Link
                  to="/signup"
                  className="rounded-sm transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                >
                  회원가입
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl px-5 py-8">
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
