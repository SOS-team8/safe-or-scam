import { Link } from 'react-router-dom'

export function SignupPage() {
  return (
    <section className="mx-auto max-w-md space-y-6 py-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-white">회원가입</h1>
        <p className="text-slate-300">피싱 대응 훈련을 위한 기본 계정을 만듭니다.</p>
      </div>

      <form className="space-y-4 rounded-lg border border-white/10 bg-white/[0.03] p-6">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-200">이름</span>
          <input
            type="text"
            placeholder="홍길동"
            className="w-full rounded-md border border-white/10 bg-slate-900 px-3 py-3 text-white outline-none focus:border-emerald-300"
          />
        </label>
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
            placeholder="8자 이상"
            className="w-full rounded-md border border-white/10 bg-slate-900 px-3 py-3 text-white outline-none focus:border-emerald-300"
          />
        </label>
        <Link
          to="/signup/verify"
          className="block w-full rounded-md bg-emerald-400 px-4 py-3 text-center font-semibold text-slate-950 hover:bg-emerald-300"
        >
          인증 메일 받기
        </Link>
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
