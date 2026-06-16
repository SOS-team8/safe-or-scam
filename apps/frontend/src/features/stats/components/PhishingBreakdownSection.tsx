import { toApiError } from '@/shared/api/error'

import { usePhishingBreakdown } from '../hooks'
import type { PhishingBreakdown } from '../types'

// phishing_type 은 시드마다 자유 문자열(주로 한국어) 또는 영문 슬러그. 알려진 슬러그만
// 한국어로 치환하고, 그 외(이미 한국어 라벨)는 원문 그대로 노출한다.
const TYPE_LABEL: Record<string, string> = {
  smishing: '스미싱',
  voice_phishing: '보이스피싱',
  vishing: '보이스피싱',
  romance_scam: '로맨스 스캠',
  investment_scam: '투자 사기',
  pharming: '파밍',
  phishing: '피싱',
}

const typeLabel = (phishingType: string) => TYPE_LABEL[phishingType] ?? phishingType

// 안전 결말률이 낮을수록 더 연습이 필요한 유형 → 빨강, 높을수록 초록.
const barColor = (rate: number) =>
  rate < 40 ? 'bg-red-400' : rate < 70 ? 'bg-amber-400' : 'bg-emerald-400'

type Row = PhishingBreakdown & { safeRate: number }

function ChartRow({ item }: { item: Row }) {
  return (
    <li className="space-y-1">
      <div className="flex items-baseline justify-between gap-3 text-xs">
        <span className="min-w-0 flex-1 truncate font-medium text-sos-body">
          {typeLabel(item.phishingType)}
        </span>
        <span className="shrink-0 tabular-nums text-sos-muted">
          {item.safeRate}% · {item.playCount}판
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={`${typeLabel(item.phishingType)} 안전 결말률`}
        aria-valuenow={item.safeRate}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2.5 overflow-hidden rounded-full bg-slate-800"
      >
        <div
          className={`h-full rounded-full ${barColor(item.safeRate)}`}
          style={{ width: `${item.safeRate}%` }}
        />
      </div>
      <p className="text-[11px] tabular-nums text-sos-faint">
        판당 평균 위험 {item.avgDangerous.toFixed(1)} · 평균 점수 {item.avgScore.toFixed(0)}
      </p>
    </li>
  )
}

export function PhishingBreakdownSection() {
  const breakdownQuery = usePhishingBreakdown()

  if (breakdownQuery.isPending) {
    return <div className="h-28 animate-pulse rounded-lg bg-slate-800" />
  }

  if (breakdownQuery.isError) {
    return (
      <div className="rounded-lg border border-red-300/25 bg-red-500/10 p-4">
        <p className="text-sm text-red-100">{toApiError(breakdownQuery.error).message}</p>
        <button
          type="button"
          onClick={() => void breakdownQuery.refetch()}
          className="mt-3 rounded-lg bg-emerald-400 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-300"
        >
          다시 시도
        </button>
      </div>
    )
  }

  if (breakdownQuery.data.length === 0) {
    return null
  }

  // 안전 결말률 오름차순 → 약한 유형(빨강)이 위로 와서 한눈에 들어온다.
  const rows: Row[] = breakdownQuery.data
    .map((item) => ({
      ...item,
      safeRate: item.playCount > 0 ? Math.round((item.goodCount / item.playCount) * 100) : 0,
    }))
    .sort((a, b) => a.safeRate - b.safeRate)

  return (
    <section className="space-y-3 rounded-lg border border-sos-line bg-sos-inset p-4">
      <div>
        <h3 className="text-sm font-semibold text-sos-strong">사기 유형별 강약점</h3>
        <p className="mt-0.5 text-xs text-sos-faint">
          안전 결말률이 낮은(빨강) 유형일수록 더 연습이 필요해요.
        </p>
      </div>

      {/* 0/50/100 기준선 위에 막대를 그려 하나의 차트로 보이게 한다. */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-0 flex justify-between">
          <span className="w-px bg-slate-700/50" />
          <span className="w-px bg-slate-700/50" />
          <span className="w-px bg-slate-700/50" />
        </div>
        <ul className="relative space-y-3">
          {rows.map((item) => (
            <ChartRow key={item.phishingType} item={item} />
          ))}
        </ul>
      </div>

      <div className="flex justify-between text-[10px] tabular-nums text-sos-faint">
        <span>0%</span>
        <span>50%</span>
        <span>100%</span>
      </div>
    </section>
  )
}
