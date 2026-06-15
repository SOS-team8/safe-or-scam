import { useScenarios } from '@/features/game/hooks'
import { useScenarioProgress } from '@/features/history/hooks'
import { toApiError } from '@/shared/api/error'

import { DonutChart } from './charts/DonutChart'

export function CollectionMapSection() {
  const progressQuery = useScenarioProgress()
  const scenariosQuery = useScenarios()

  if (progressQuery.isPending) {
    return <div className="h-32 animate-pulse rounded-lg bg-slate-800" />
  }

  if (progressQuery.isError) {
    return (
      <div className="rounded-lg border border-red-300/25 bg-red-500/10 p-4">
        <p className="text-sm text-red-100">{toApiError(progressQuery.error).message}</p>
        <button
          type="button"
          onClick={() => void progressQuery.refetch()}
          className="mt-3 rounded-lg bg-emerald-400 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-300"
        >
          다시 시도
        </button>
      </div>
    )
  }

  // 분자: 플레이한 시나리오에서 발견한 결말 유형 수(미플레이는 progress 문서가 없어 0 기여).
  const discovered = progressQuery.data.reduce((sum, p) => sum + p.discoveredCategoryCount, 0)
  // 분모: 서비스 전체 시나리오의 결말 유형 수.
  const total = (scenariosQuery.data ?? []).reduce((sum, s) => sum + (s.total_categories ?? 0), 0)

  if (total === 0) {
    return null
  }

  return (
    <section className="flex flex-col items-center gap-2 rounded-lg border border-sos-line bg-sos-inset p-4">
      <DonutChart value={discovered} max={total} label="결말 수집" />
      <p className="text-center text-xs text-sos-faint">
        서비스 전체 결말 유형 {total}개 중 {discovered}개를 발견했어요.
      </p>
    </section>
  )
}
