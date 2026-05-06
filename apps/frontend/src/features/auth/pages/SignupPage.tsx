import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'

import { toApiError } from '@/shared/api/error'

import { useSendSignupVerificationEmail } from '../hooks'
import { signupSchema, type SignupFormValues } from '../schemas'

export function SignupPage() {
  const sendVerificationMutation = useSendSignupVerificationEmail()
  const {
    clearErrors,
    formState: { errors },
    handleSubmit,
    register,
    setError,
  } = useForm<SignupFormValues>({
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
  })

  const serverError = sendVerificationMutation.error
    ? toApiError(sendVerificationMutation.error)
    : null

  const onSubmit = (values: SignupFormValues) => {
    clearErrors()
    const validation = signupSchema.safeParse(values)

    if (!validation.success) {
      validation.error.issues.forEach((issue) => {
        const field = issue.path[0]

        if (field === 'name' || field === 'email' || field === 'password') {
          setError(field, {
            type: 'zod',
            message: issue.message,
          })
        }
      })
      return
    }

    sendVerificationMutation.mutate(validation.data)
  }

  return (
    <section className="mx-auto max-w-md space-y-6 py-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-white">회원가입</h1>
        <p className="text-slate-300">피싱 대응 훈련을 위한 기본 계정을 만듭니다.</p>
      </div>

      <form className="space-y-4 rounded-lg border border-white/10 bg-white/3 p-6" onSubmit={handleSubmit(onSubmit)}>
        {serverError ? (
          <div className="whitespace-pre-line rounded-md border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
            {serverError.message}
          </div>
        ) : null}
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-200">이름</span>
          <input
            type="text"
            placeholder="홍길동"
            autoComplete="name"
            aria-invalid={Boolean(errors.name)}
            className="w-full rounded-md border border-white/10 bg-slate-900 px-3 py-3 text-white outline-none focus:border-emerald-300"
            {...register('name')}
          />
          {errors.name?.message ? <p className="text-sm text-red-200">{errors.name.message}</p> : null}
        </label>
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
            placeholder="10자 이상"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.password)}
            className="w-full rounded-md border border-white/10 bg-slate-900 px-3 py-3 text-white outline-none focus:border-emerald-300"
            {...register('password')}
          />
          {errors.password?.message ? <p className="text-sm text-red-200">{errors.password.message}</p> : null}
        </label>
        <button
          type="submit"
          disabled={sendVerificationMutation.isPending}
          className="block w-full rounded-md bg-emerald-400 px-4 py-3 text-center font-semibold text-slate-950 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
        >
          {sendVerificationMutation.isPending ? '발송 중...' : '인증 메일 받기'}
        </button>
      </form>

      <p className="text-sm text-slate-400">
        이미 계정이 있나요?{' '}
        <Link to="/login" className="font-medium text-emerald-300">
          로그인
        </Link>
      </p>
    </section>
  )
}
