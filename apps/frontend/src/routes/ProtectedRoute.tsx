import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { useAuthStore } from '@/features/auth/store'
import type { UserRole } from '@/features/auth/types'

type ProtectedRouteProps = {
  children: ReactNode
  allowedRoles?: UserRole[]
}

const getRedirectPathForRole = (role: UserRole) => {
  if (role === 'GUEST') {
    return '/onboarding'
  }

  if (role === 'ADMIN') {
    return '/'
  }

  return '/mypage'
}

export function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const location = useLocation()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const role = useAuthStore((state) => state.role)

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (!role) {
    return (
      <div className="py-16 text-center text-sm text-slate-300">
        인증 상태를 확인하고 있습니다.
      </div>
    )
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to={getRedirectPathForRole(role)} replace />
  }

  return children
}
