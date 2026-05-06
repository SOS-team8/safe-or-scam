const jobs = ['학생', '대학(원)생', '구직자', '회사원', '프리랜서', '자영업자', '기타']
const ageGroups = ['10대', '20대', '30대', '40대', '50대', '60대 이상']
const genders = ['여성', '남성']

const scenarioHistory = [
  {
    title: '택배 배송 주소 확인',
    lastPlayedAt: '2026.05.06',
    result: '안전 대응',
    endingsCollected: 2,
    endingsTotal: 4,
  },
  {
    title: '회사 보안 메일 점검',
    lastPlayedAt: '2026.05.04',
    result: '위험 링크 차단',
    endingsCollected: 1,
    endingsTotal: 3,
  },
  {
    title: '계좌 이상 거래 알림',
    lastPlayedAt: '2026.05.01',
    result: '추가 확인 필요',
    endingsCollected: 3,
    endingsTotal: 5,
  },
]

export function MyPage() {
  return (
    <section className="mx-auto max-w-2xl space-y-6 py-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-white">마이페이지</h1>
        <p className="text-slate-300">가입 정보는 조회만 가능하며, 온보딩 답변만 수정할 수 있습니다.</p>
      </div>

      <section className="space-y-4 rounded-lg border border-white/10 bg-white/[0.03] p-6">
        <h2 className="text-lg font-semibold text-white">회원 정보</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-md border border-white/10 bg-slate-900 px-3 py-3">
            <p className="text-sm font-medium text-slate-400">이름</p>
            <p className="mt-1 font-semibold text-white">소영</p>
          </div>
          <div className="rounded-md border border-white/10 bg-slate-900 px-3 py-3">
            <p className="text-sm font-medium text-slate-400">메일</p>
            <p className="mt-1 font-semibold text-white">soyoung@example.com</p>
          </div>
        </div>
      </section>

      <form className="space-y-5 rounded-lg border border-white/10 bg-white/[0.03] p-6">
        <h2 className="text-lg font-semibold text-white">온보딩 답변</h2>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-200">직업</span>
          <select
            defaultValue="회사원"
            className="w-full rounded-md border border-white/10 bg-slate-900 px-3 py-3 text-white outline-none focus:border-emerald-300"
          >
            {jobs.map((job) => (
              <option key={job} value={job}>
                {job}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-200">연령대</span>
          <select
            defaultValue="20대"
            className="w-full rounded-md border border-white/10 bg-slate-900 px-3 py-3 text-white outline-none focus:border-emerald-300"
          >
            {ageGroups.map((ageGroup) => (
              <option key={ageGroup} value={ageGroup}>
                {ageGroup}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-200">성별</span>
          <select
            defaultValue="여성"
            className="w-full rounded-md border border-white/10 bg-slate-900 px-3 py-3 text-white outline-none focus:border-emerald-300"
          >
            {genders.map((gender) => (
              <option key={gender} value={gender}>
                {gender}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className="rounded-md bg-emerald-400 px-4 py-3 font-semibold text-slate-950 hover:bg-emerald-300"
        >
          온보딩 답변 저장
        </button>
      </form>

      <section className="space-y-4 rounded-lg border border-white/10 bg-white/[0.03] p-6">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-white">히스토리</h2>
          <p className="text-sm text-slate-400">
            플레이했던 시나리오와 결말 수집도를 표시할 예정인 mock 영역입니다.
          </p>
        </div>

        <div className="space-y-3">
          {scenarioHistory.map((scenario) => {
            const collectionRate = Math.round(
              (scenario.endingsCollected / scenario.endingsTotal) * 100,
            )

            return (
              <article key={scenario.title} className="rounded-md border border-white/10 bg-slate-900 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="font-semibold text-white">{scenario.title}</h3>
                    <p className="mt-1 text-sm text-slate-400">
                      최근 플레이 {scenario.lastPlayedAt} · {scenario.result}
                    </p>
                  </div>
                  <span className="w-fit rounded-md bg-emerald-300/10 px-2 py-1 text-xs font-medium text-emerald-300">
                    결말 {scenario.endingsCollected}/{scenario.endingsTotal}
                  </span>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>결말 수집도</span>
                    <span>{collectionRate}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full rounded-full bg-emerald-400" style={{ width: `${collectionRate}%` }} />
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <section className="rounded-lg border border-dashed border-white/15 p-5">
        <h2 className="text-lg font-semibold text-white">업적</h2>
        <p className="mt-2 text-sm text-slate-400">추후 achievement 도메인 연동 시 이 영역에 표시됩니다.</p>
      </section>
    </section>
  )
}
