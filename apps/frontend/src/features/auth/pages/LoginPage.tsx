import { Link } from 'react-router-dom'

export function LoginPage() {
  return (
    <section className="mx-auto max-w-md space-y-6 py-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-white">로그인</h1>
        <p className="text-slate-300">학습 기록과 맞춤 시나리오를 이어서 확인합니다.</p>
      </div>

      <form className="space-y-4 rounded-lg border border-white/10 bg-white/[0.03] p-6">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-200">이메일</span>
          <input
            type="email"
            placeholder="sos@example.com"
            className="w-full rounded-md border border-white/10 bg-slate-900 px-3 py-3 text-white outline-none focus:border-emerald-300"
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-200">비밀번호</span>
          <input
            type="password"
            placeholder="비밀번호"
            className="w-full rounded-md border border-white/10 bg-slate-900 px-3 py-3 text-white outline-none focus:border-emerald-300"
          />
        </label>
        <button
          type="button"
          className="w-full rounded-md bg-emerald-400 px-4 py-3 font-semibold text-slate-950 hover:bg-emerald-300"
        >
          로그인
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
