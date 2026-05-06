import { Link } from 'react-router-dom'

const jobs = ['학생', '대학(원)생', '구직자', '회사원', '프리랜서', '자영업자', '기타']
const ageGroups = ['10대', '20대', '30대', '40대', '50대', '60대 이상']
const genders = ['여성', '남성']

export function OnboardingPage() {
  return (
    <section className="mx-auto max-w-2xl space-y-6 py-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-white">온보딩</h1>
        <p className="text-slate-300">직업, 연령대, 성별을 선택하면 맞춤 훈련 추천에 활용됩니다.</p>
      </div>

      <div className="space-y-5 rounded-lg border border-white/10 bg-white/3 p-6">
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-white">직업</h2>
          <div className="grid gap-2 sm:grid-cols-4">
            {jobs.map((job) => (
              <button key={job} type="button" className="rounded-md border border-white/10 px-3 py-3 text-slate-200 hover:border-emerald-300">
                {job}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-white">연령대</h2>
          <div className="grid gap-2 sm:grid-cols-4">
            {ageGroups.map((ageGroup) => (
              <button key={ageGroup} type="button" className="rounded-md border border-white/10 px-3 py-3 text-slate-200 hover:border-emerald-300">
                {ageGroup}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold text-white">성별</h2>
          <div className="grid gap-2 sm:grid-cols-3">
            {genders.map((gender) => (
              <button key={gender} type="button" className="rounded-md border border-white/10 px-3 py-3 text-slate-200 hover:border-emerald-300">
                {gender}
              </button>
            ))}
          </div>
        </div>

        <Link
          to="/lobby"
          className="block rounded-md bg-emerald-400 px-4 py-3 text-center font-semibold text-slate-950 hover:bg-emerald-300"
        >
          온보딩 완료
        </Link>
      </div>
    </section>
  )
}
