const scenarios = [
  { title: '택배 배송 주소 확인', difficulty: '초급', status: '추천' },
  { title: '회사 보안 메일 점검', difficulty: '중급', status: '준비됨' },
  { title: '계좌 이상 거래 알림', difficulty: '중급', status: '준비됨' },
]

export function LobbyPage() {
  return (
    <section className="space-y-8 py-6">
      <div className="space-y-2">
        <p className="text-sm font-medium text-emerald-300">온보딩이 완료되었습니다</p>
        <h1 className="text-3xl font-semibold text-white">안녕하세요, 소영님</h1>
        <p className="text-slate-300">오늘은 실생활 메시지 피싱을 빠르게 판별하는 훈련을 추천합니다.</p>
      </div>

      <section className="rounded-lg border border-emerald-300/30 bg-emerald-300/10 p-5">
        <p className="text-sm font-semibold text-emerald-200">맞춤 추천</p>
        <div className="mt-3 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="text-xl font-semibold text-white">택배 배송 주소 확인</h2>
            <p className="mt-2 text-slate-300">짧은 문자와 링크를 보고 위험 신호를 판단하는 5분 시나리오입니다.</p>
          </div>
          <button type="button" className="rounded-md bg-emerald-400 px-4 py-3 font-semibold text-slate-950 hover:bg-emerald-300">
            시작하기
          </button>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-white">전체 시나리오</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {scenarios.map((scenario) => (
            <article key={scenario.title} className="rounded-lg border border-white/10 bg-white/3 p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-300">{scenario.difficulty}</span>
                <span className="text-xs font-medium text-emerald-300">{scenario.status}</span>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-white">{scenario.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">선택지 기반 텍스트 어드벤처로 구성될 예정입니다.</p>
            </article>
          ))}
        </div>
      </section>
    </section>
  )
}
