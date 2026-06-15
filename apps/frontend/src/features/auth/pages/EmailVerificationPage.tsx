import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import { toApiError } from '@/shared/api/error'

import { useSignup, useVerifyEmail } from '../hooks'
import {
  emailVerificationSchema,
  type EmailVerificationFormValues,
} from '../schemas'
import { useAuthStore } from '../store'

export function EmailVerificationPage() {
  const signupDraft = useAuthStore((state) => state.signupDraft)
  const [verificationToken, setVerificationToken] = useState<string | null>(null)
  const verifyEmailMutation = useVerifyEmail()
  const signupMutation = useSignup()
  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<EmailVerificationFormValues>({
    resolver: zodResolver(emailVerificationSchema),
    mode: 'onTouched',
    defaultValues: {
      code: '',
    },
  })

  const pending = verifyEmailMutation.isPending || signupMutation.isPending
  const serverError = verifyEmailMutation.error
    ? toApiError(verifyEmailMutation.error)
    : signupMutation.error
      ? toApiError(signupMutation.error)
      : null

  const onSubmit = (values: EmailVerificationFormValues) => {
    if (!signupDraft) {
      return
    }

    if (verificationToken) {
      signupMutation.mutate({
        verificationToken,
        password: signupDraft.password,
        name: signupDraft.name,
      })
      return
    }

    verifyEmailMutation.mutate(
      {
        email: signupDraft.email,
        code: values.code,
        purpose: 'SIGNUP',
      },
      {
        onSuccess: ({ verificationToken: nextVerificationToken }) => {
          setVerificationToken(nextVerificationToken)
          signupMutation.mutate({
            verificationToken: nextVerificationToken,
            password: signupDraft.password,
            name: signupDraft.name,
          })
        },
      },
    )
  }

  return (
    <section className="mx-auto max-w-md space-y-6 py-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-sos-strong">메일 인증</h1>
        <p className="text-sos-body">이메일로 받은 6자리 인증 코드를 입력하세요.</p>
      </div>

      <form className="space-y-5 rounded-lg border border-white/10 bg-white/3 p-6" onSubmit={handleSubmit(onSubmit)}>
        {!signupDraft ? (
          <div className="rounded-md border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
            회원가입 정보를 찾을 수 없습니다. 다시 가입 정보를 입력해주세요.
          </div>
        ) : null}
        {serverError ? (
          <div className="whitespace-pre-line rounded-md border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
            {serverError.message}
          </div>
        ) : null}
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-200">인증 코드</span>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            autoComplete="one-time-code"
            aria-invalid={Boolean(errors.code)}
            disabled={!signupDraft || pending}
            className="w-full rounded-md border border-white/10 bg-slate-900 px-3 py-3 text-center text-2xl font-semibold tracking-normal text-sos-strong outline-none focus:border-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-sos-faint"
            {...register('code')}
          />
          {errors.code?.message ? <p className="text-sm text-red-200">{errors.code.message}</p> : null}
        </label>
        <button
          type="submit"
          disabled={!signupDraft || pending}
          className="block w-full rounded-md bg-emerald-400 px-4 py-3 text-center font-semibold text-slate-950 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-sos-body"
        >
          {pending ? '확인 중...' : '인증 완료'}
        </button>
      </form>

      {!signupDraft ? (
        <p className="text-sm text-sos-muted">
          <Link to="/signup" className="font-medium text-emerald-300">
            회원가입으로 돌아가기
          </Link>
        </p>
      ) : null}
    </section>
  )
}
