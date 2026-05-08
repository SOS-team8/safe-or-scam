import { Link } from 'react-router-dom'

const featureHighlights = [
  {
    title: '실전형 메시지 판별',
    description: '긴급 인증, 배송, 금융 알림처럼 익숙한 상황에서 의심 신호를 직접 찾습니다.',
    icon: (
      <svg viewBox="0 0 48 48" aria-hidden="true" className="size-11">
        <path
          d="M10 15.5c0-3 2.4-5.5 5.5-5.5h17c3 0 5.5 2.4 5.5 5.5v10c0 3-2.4 5.5-5.5 5.5H24l-8 6v-6h-.5c-3 0-5.5-2.4-5.5-5.5v-10Z"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.5"
        />
        <path
          d="M17 18h14M17 24h8"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="2.5"
        />
      </svg>
    ),
  },
  {
    title: '선택 기반 대응 훈련',
    description: '링크 확인, 정보 제공, 신고 여부를 고르며 안전한 대응 루틴을 익힙니다.',
    icon: (
      <svg viewBox="0 0 48 48" aria-hidden="true" className="size-11">
        <path
          d="M24 7 38 12v10.5C38 31.5 32.2 38 24 41c-8.2-3-14-9.5-14-18.5V12L24 7Z"
          fill="none"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="2.5"
        />
        <path
          d="m18 24 4 4 8-9"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.5"
        />
      </svg>
    ),
  },
  {
    title: '개인화 시나리오 추천',
    description: '온보딩 답변을 바탕으로 자주 노출될 가능성이 높은 사기 유형을 먼저 연습합니다.',
    icon: (
      <svg viewBox="0 0 48 48" aria-hidden="true" className="size-11">
        <path
          d="M24 9v6M24 33v6M9 24h6M33 24h6M13.4 13.4l4.2 4.2M30.4 30.4l4.2 4.2M34.6 13.4l-4.2 4.2M17.6 30.4l-4.2 4.2"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="2.4"
        />
        <circle cx="24" cy="24" r="6.5" fill="none" stroke="currentColor" strokeWidth="2.5" />
      </svg>
    ),
  },
]

function HeroSignal() {
  return (
    <svg
      viewBox="0 0 520 420"
      role="img"
      aria-labelledby="hero-signal-title"
      className="mx-auto w-full max-w-md overflow-visible text-cyan-300 md:max-w-none"
    >
      <title id="hero-signal-title">의심 메시지를 나타내는 말풍선 아이콘</title>
      <defs>
        <linearGradient id="bubbleFill" x1="88" x2="430" y1="74" y2="330" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0f172a" />
          <stop offset="1" stopColor="#03111d" />
        </linearGradient>
        <linearGradient id="bubbleStroke" x1="96" x2="424" y1="88" y2="316" gradientUnits="userSpaceOnUse">
          <stop stopColor="#22d3ee" />
          <stop offset="1" stopColor="#34d399" />
        </linearGradient>
        <filter id="bubbleGlow" x="-18%" y="-18%" width="136%" height="136%">
          <feGaussianBlur stdDeviation="10" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <ellipse cx="260" cy="354" rx="178" ry="24" fill="#020617" opacity="0.68" />
      <g filter="url(#bubbleGlow)">
        <path
          d="M104 100c0-25.4 20.6-46 46-46h220c25.4 0 46 20.6 46 46v118c0 25.4-20.6 46-46 46h-92l-86 74v-74h-42c-25.4 0-46-20.6-46-46V100Z"
          fill="url(#bubbleFill)"
          stroke="url(#bubbleStroke)"
          strokeLinejoin="round"
          strokeWidth="3"
        />
      </g>

      <path d="M146 96h228M146 126h174M146 156h214" stroke="#22d3ee" strokeLinecap="round" strokeOpacity="0.26" strokeWidth="8" />
      <path d="M146 204h132M146 232h78" stroke="#94a3b8" strokeLinecap="round" strokeOpacity="0.5" strokeWidth="8" />

      <g>
        <circle cx="348" cy="220" r="42" fill="#34d399" fillOpacity="0.1" stroke="#34d399" strokeOpacity="0.82" strokeWidth="3" />
        <path d="m326 221 16 16 31-38" fill="none" stroke="#34d399" strokeLinecap="round" strokeLinejoin="round" strokeWidth="7" />
      </g>

      <g>
        <circle cx="318" cy="154" r="19" fill="#fbbf24" fillOpacity="0.12" stroke="#fbbf24" strokeOpacity="0.75" strokeWidth="2.5" />
        <path d="M318 143v14M318 166v1" stroke="#fbbf24" strokeLinecap="round" strokeWidth="3.5" />
      </g>

      <path d="M128 88h264" stroke="#ffffff" strokeOpacity="0.06" />
      <path d="M128 186h264M128 284h116" stroke="#22d3ee" strokeOpacity="0.06" />
    </svg>
  )
}

export function LandingPage() {
  return (
    <section className="scanlines relative -mx-5 -my-8 overflow-hidden px-5 py-8 sm:py-12">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgb(34_211_238/0.045)_1px,transparent_1px),linear-gradient(rgb(52_211_153/0.035)_1px,transparent_1px)] bg-[size:48px_48px]" />
      <div className="relative z-10 mx-auto w-full max-w-6xl">
        <div className="grid min-h-[calc(100vh-9rem)] gap-10 pb-10 md:grid-cols-[1.02fr_0.98fr] md:items-center md:pb-16">
          <div className="space-y-7">
            <p className="w-fit rounded-full border border-cyan-300/25 bg-cyan-300/8 px-3 py-1.5 text-xs font-semibold text-cyan-200">
              Interactive phishing defense training
            </p>
            <div className="space-y-5">
              <h1 className="text-glow-cyan max-w-3xl text-4xl font-bold leading-tight text-white sm:text-5xl md:text-6xl">
                Safe or Scam
                <span className="mt-2 block bg-linear-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">
                  피싱 예방 시뮬레이터
                </span>
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
                실제 생활에서 마주칠 법한 문자, 메신저, 금융 알림을 읽고 무엇이 수상한지 판단합니다.
                안전한 선택을 반복해 사기 대응 감각을 몸에 익혀보세요.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                to="/signup"
                className="rounded-md bg-emerald-400 px-5 py-3 text-center text-sm font-bold text-slate-950 transition hover:-translate-y-0.5 hover:bg-emerald-300 hover:shadow-lg hover:shadow-emerald-400/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                회원가입하고 시작하기
              </Link>
              <Link
                to="/login"
                className="rounded-md border border-cyan-300/30 px-5 py-3 text-center text-sm font-bold text-cyan-100 transition hover:-translate-y-0.5 hover:border-cyan-200 hover:bg-cyan-300/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                로그인
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-x-10 top-8 h-px bg-cyan-300/40 shadow-[0_0_28px_rgb(34_211_238/0.45)]" />
            <HeroSignal />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {featureHighlights.map((feature) => (
            <article
              key={feature.title}
              className="surface-card rounded-lg p-5 text-slate-300 transition hover:-translate-y-1 hover:border-cyan-300/45 hover:shadow-[0_18px_50px_rgb(34_211_238/0.12)]"
            >
              <div className="text-cyan-300">{feature.icon}</div>
              <h2 className="mt-5 text-lg font-bold text-white">{feature.title}</h2>
              <p className="mt-3 text-sm leading-6">{feature.description}</p>
            </article>
          ))}
        </div>

        <div className="mt-8 border-t border-cyan-300/20 pt-6 text-sm leading-6 text-slate-300">
          <p>
            낯선 링크를 누르기 전, 한 번 더 멈추는 습관이 가장 강한 방어입니다.
            <Link
              to="/signup"
              className="ml-2 font-bold text-cyan-200 underline decoration-cyan-300/50 underline-offset-4 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              지금 첫 훈련을 시작하세요.
            </Link>
          </p>
        </div>
      </div>
    </section>
  )
}
