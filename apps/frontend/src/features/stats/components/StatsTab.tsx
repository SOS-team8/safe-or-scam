import { useNavigate } from 'react-router-dom'

import { useAchievements } from '@/features/achievement/hooks'
import { toApiError } from '@/shared/api/error'

import { useUserStats } from '../hooks'

function StatsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="h-20 animate-pulse rounded-lg bg-slate-800" />
        ))}
      </div>
      <div className="h-16 animate-pulse rounded-lg bg-slate-800" />
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/8 bg-sos-inset px-4 py-3">
      <p className="text-[13px] font-medium text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-white">{value}</p>
    </div>
  )
}

export function StatsTab() {
  const navigate = useNavigate()
  const statsQuery = useUserStats()
  const achievementsQuery = useAchievements()

  if (statsQuery.isPending) {
    return <StatsSkeleton />
  }

  if (statsQuery.isError) {
    return (
      <div className="rounded-lg border border-red-300/25 bg-red-500/10 p-6">
        <p className="text-sm text-red-100">{toApiError(statsQuery.error).message}</p>
        <button
          type="button"
          onClick={() => void statsQuery.refetch()}
          className="mt-4 rounded-lg bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-300"
        >
          다시 시도
        </button>
      </div>
    )
  }

  const stats = statsQuery.data

  if (stats.completePlays === 0) {
    return (
      <div className="rounded-lg border border-white/8 bg-sos-inset p-6 text-center">
        <p className="text-sm font-medium text-slate-300">아직 통계가 없어요.</p>
        <p className="mt-1 text-sm text-slate-500">
          시나리오를 완료하면 훈련 통계가 여기에 쌓입니다.
        </p>
        <button
          type="button"
          onClick={() => navigate('/lobby')}
          className="mt-4 rounded-lg border border-white/10 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-emerald-300 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200"
        >
          시나리오 보러 가기
        </button>
      </div>
    )
  }

  const decided = stats.goodEndings + stats.badEndings
  const goodRate = decided > 0 ? Math.round((stats.goodEndings / decided) * 100) : 0
  const achievements = achievementsQuery.data

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard label="완료 플레이" value={`${stats.completePlays}회`} />
        <MetricCard label="평균 점수" value={stats.avgScore.toFixed(1)} />
        <MetricCard label="최고 점수" value={String(stats.bestScore)} />
        <MetricCard label="누적 위험 선택" value={String(stats.totalDangerousChoices)} />
      </div>

      <div className="rounded-lg border border-white/8 bg-sos-inset p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-slate-300">안전 vs 주의 결말</span>
          <span className="tabular-nums text-slate-400">안전 {goodRate}%</span>
        </div>
        <div
          role="progressbar"
          aria-label="안전 결말 비율"
          aria-valuenow={goodRate}
          aria-valuemin={0}
          aria-valuemax={100}
          className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-slate-800"
        >
          <div className="h-full bg-emerald-400" style={{ width: `${goodRate}%` }} />
          <div className="h-full bg-red-400" style={{ width: `${100 - goodRate}%` }} />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="tabular-nums text-emerald-200">안전 {stats.goodEndings}</span>
          <span className="tabular-nums text-red-200">주의 {stats.badEndings}</span>
        </div>
      </div>

      {achievements ? (
        <div className="rounded-lg border border-white/8 bg-sos-inset px-4 py-3">
          <p className="text-[13px] font-medium text-slate-400">업적 달성도</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-white">
            {achievements.achievedCount}
            <span className="text-base font-medium text-slate-400">
              {' '}
              / {achievements.totalCount}
            </span>
          </p>
        </div>
      ) : null}
    </div>
  )
}
