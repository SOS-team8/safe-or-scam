import { Link } from 'react-router-dom'

export function EmailVerificationPage() {
  return (
    <section className="mx-auto max-w-md space-y-6 py-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-white">메일 인증</h1>
        <p className="text-slate-300">이메일로 받은 6자리 인증 코드를 입력하세요.</p>
      </div>

      <form className="space-y-5 rounded-lg border border-white/10 bg-white/[0.03] p-6">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-200">인증 코드</span>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            className="w-full rounded-md border border-white/10 bg-slate-900 px-3 py-3 text-center text-2xl font-semibold tracking-normal text-white outline-none focus:border-emerald-300"
          />
        </label>
        <Link
          to="/onboarding"
          className="block w-full rounded-md bg-emerald-400 px-4 py-3 text-center font-semibold text-slate-950 hover:bg-emerald-300"
        >
          인증 완료
        </Link>
      </form>
    </section>
  )
}
