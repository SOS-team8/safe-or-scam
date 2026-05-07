import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { toApiError } from '@/shared/api/error'

import { useLogin } from '../hooks'
import { loginSchema, type LoginFormValues } from '../schemas'

type LoginLocationState = {
  withdrawalComplete?: boolean
}

export function LoginPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const loginMutation = useLogin()
  const [notice, setNotice] = useState<string | null>(() =>
    (location.state as LoginLocationState | null)?.withdrawalComplete
      ? '탈퇴가 완료되었어요.'
      : null,
  )
  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onTouched',
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const serverError = loginMutation.error ? toApiError(loginMutation.error) : null

  useEffect(() => {
    if (!(location.state as LoginLocationState | null)?.withdrawalComplete) {
      return
    }

    navigate(location.pathname, { replace: true, state: null })
  }, [location.pathname, location.state, navigate])

  useEffect(() => {
    if (!notice) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setNotice(null)
    }, 2000)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [notice])

  const onSubmit = (values: LoginFormValues) => {
    loginMutation.mutate(values)
  }

  return (
    <section className="mx-auto max-w-md space-y-6 py-10">
      {notice ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed right-5 top-20 z-40 rounded-md border border-emerald-300/30 bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-slate-950/30"
        >
          {notice}
        </div>
      ) : null}

      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-white">로그인</h1>
        <p className="text-slate-300">학습 기록과 맞춤 시나리오를 이어서 확인합니다.</p>
      </div>

      <form className="space-y-4 rounded-lg border border-white/10 bg-white/3 p-6" onSubmit={handleSubmit(onSubmit)}>
        {serverError ? (
          <div className="whitespace-pre-line rounded-md border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
            {serverError.message}
          </div>
        ) : null}
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-200">이메일</span>
          <input
            type="email"
            placeholder="sos@example.com"
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            className="w-full rounded-md border border-white/10 bg-slate-900 px-3 py-3 text-white outline-none focus:border-emerald-300"
            {...register('email')}
          />
          {errors.email?.message ? <p className="text-sm text-red-200">{errors.email.message}</p> : null}
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-200">비밀번호</span>
          <input
            type="password"
            placeholder="비밀번호"
            autoComplete="current-password"
            aria-invalid={Boolean(errors.password)}
            className="w-full rounded-md border border-white/10 bg-slate-900 px-3 py-3 text-white outline-none focus:border-emerald-300"
            {...register('password')}
          />
          {errors.password?.message ? <p className="text-sm text-red-200">{errors.password.message}</p> : null}
        </label>
        <button
          type="submit"
          disabled={loginMutation.isPending}
          className="w-full rounded-md bg-emerald-400 px-4 py-3 font-semibold text-slate-950 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
        >
          {loginMutation.isPending ? '로그인 중...' : '로그인'}
        </button>
      </form>

      <p className="text-sm text-slate-400">
        계정이 없나요?{' '}
        <Link to="/signup" className="font-medium text-emerald-300">
          회원가입
        </Link>
      </p>
    </section>
  )
}
