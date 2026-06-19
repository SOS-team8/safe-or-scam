import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { useAuthStore } from '@/features/auth/store'
import type { UserRole } from '@/features/auth/types'

import { ProtectedRoute } from '../ProtectedRoute'

function seedAuthStore(input: { role: UserRole | null; authenticated: boolean }) {
  const store = useAuthStore.getState()
  if (input.authenticated) {
    store.setAuth('access', 'refresh', input.role ?? 'USER')
    if (input.role === null) {
      // simulate token present but role missing
      useAuthStore.setState({ role: null })
    } else {
      useAuthStore.setState({ role: input.role })
    }
  } else {
    store.clearAuth()
  }
}

function renderProtectedRoute({
  allowedRoles,
  initialEntries = ['/protected'],
}: {
  allowedRoles?: UserRole[]
  initialEntries?: string[]
}) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/login" element={<div>login-page</div>} />
        <Route path="/onboarding" element={<div>onboarding-page</div>} />
        <Route path="/lobby" element={<div>lobby-page</div>} />
        <Route
          path="/protected"
          element={
            <ProtectedRoute allowedRoles={allowedRoles}>
              <div>protected-content</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute', () => {
  it('redirects unauthenticated users to /login', () => {
    seedAuthStore({ role: null, authenticated: false })

    renderProtectedRoute({ allowedRoles: ['USER'] })

    expect(screen.getByText('login-page')).toBeInTheDocument()
  })

  it('renders children when authenticated user role matches allowedRoles', () => {
    seedAuthStore({ role: 'USER', authenticated: true })

    renderProtectedRoute({ allowedRoles: ['USER'] })

    expect(screen.getByText('protected-content')).toBeInTheDocument()
  })

  it('redirects GUEST to /onboarding when route is USER-only', () => {
    seedAuthStore({ role: 'GUEST', authenticated: true })

    renderProtectedRoute({ allowedRoles: ['USER'] })

    expect(screen.getByText('onboarding-page')).toBeInTheDocument()
  })

  it('redirects USER to /lobby when route is GUEST-only', () => {
    seedAuthStore({ role: 'USER', authenticated: true })

    renderProtectedRoute({ allowedRoles: ['GUEST'] })

    expect(screen.getByText('lobby-page')).toBeInTheDocument()
  })
})
