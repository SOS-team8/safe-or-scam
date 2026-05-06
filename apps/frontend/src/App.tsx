import { Link, Navigate, Route, Routes } from 'react-router-dom'

import { useAuthBootstrap, useLogout } from '@/features/auth/hooks'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { SignupPage } from '@/features/auth/pages/SignupPage'
import { EmailVerificationPage } from '@/features/auth/pages/EmailVerificationPage'
import { useAuthStore } from '@/features/auth/store'
import { LobbyPage } from '@/features/game-session/pages/LobbyPage'
import { MyPage } from '@/features/user/pages/MyPage'
import { OnboardingPage } from '@/features/user/pages/OnboardingPage'
import { LandingPage } from '@/pages/LandingPage'
import { ProtectedRoute } from '@/routes/ProtectedRoute'

function App() {
  useAuthBootstrap()

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const logoutMutation = useLogout()

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-white/10 bg-slate-950/90">
        <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4">
          <Link to={isAuthenticated ? '/lobby' : '/'} className="text-lg font-semibold tracking-normal">
            Safe or Scam
          </Link>
          <div className="flex items-center gap-4 text-sm text-slate-300">
            {isAuthenticated ? (
              <>
                <Link to="/lobby" className="hover:text-white">
                  로비
                </Link>
                <Link to="/mypage" className="hover:text-white">
                  마이페이지
                </Link>
                <button
                  type="button"
                  disabled={logoutMutation.isPending}
                  onClick={() => logoutMutation.mutate()}
                  className="rounded-md border border-white/10 px-3 py-1.5 text-slate-200 hover:border-emerald-300 hover:text-white disabled:cursor-not-allowed disabled:text-slate-500"
                >
                  {logoutMutation.isPending ? '로그아웃 중...' : '로그아웃'}
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="hover:text-white">
                  로그인
                </Link>
                <Link to="/signup" className="hover:text-white">
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
              <ProtectedRoute>
                <OnboardingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/lobby"
            element={
              <ProtectedRoute>
                <LobbyPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mypage"
            element={
              <ProtectedRoute>
                <MyPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
