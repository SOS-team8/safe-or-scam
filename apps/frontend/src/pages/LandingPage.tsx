import { Link } from 'react-router-dom'

export function LandingPage() {
  return (
    <section className="grid gap-8 py-10 md:grid-cols-[1.15fr_0.85fr] md:items-center">
      <div className="space-y-6">
        <p className="text-sm font-medium text-emerald-300">Interactive phishing defense training</p>
        <div className="space-y-4">
          <h1 className="max-w-3xl text-4xl font-semibold leading-tight text-white md:text-6xl">
            Safe or Scam
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-slate-300">
            실제 피싱 인텔리전스를 바탕으로 생성된 텍스트 어드벤처에서 의심 신호를 찾고
            안전한 선택을 연습하는 보안 교육 플랫폼입니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/signup"
            className="rounded-md bg-emerald-400 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-300"
          >
            훈련 시작하기
          </Link>
          <Link
            to="/login"
            className="rounded-md border border-white/15 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10"
          >
            로그인
          </Link>
        </div>
      </div>

      <div className="rounded-lg border border-white/10 bg-white/3 p-5">
        <div className="space-y-4">
          <div className="rounded-md border border-amber-300/30 bg-amber-300/10 p-4 text-left">
            <p className="text-sm font-semibold text-amber-200">문자 메시지</p>
            <p className="mt-2 text-slate-200">
              [긴급] 계정 보호를 위해 10분 안에 본인 인증을 완료하세요.
            </p>
          </div>
          <div className="grid gap-3 text-sm text-slate-300">
            <div className="rounded-md border border-white/10 p-3">링크 주소 확인</div>
            <div className="rounded-md border border-white/10 p-3">요구 정보 판단</div>
            <div className="rounded-md border border-white/10 p-3">안전한 대응 선택</div>
          </div>
        </div>
      </div>
    </section>
  )
}
