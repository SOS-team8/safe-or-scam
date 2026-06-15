import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useScenarios } from '@/features/game/hooks'
import { toApiError } from '@/shared/api/error'

import { endingTypeLabel, formatDate, formatDateTime, formatDuration } from '../format'
import { usePlayLogs, useScenarioProgress } from '../hooks'
import type { ScenarioProgress } from '../types'
import { PlayLogDetailDialog } from './PlayLogDetailDialog'

type SelectedLog = { logId: string; endingType: string }

function HistorySkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1].map((index) => (
        <div key={index} className="space-y-3 rounded-lg border border-sos-line bg-sos-inset p-4">
          <div className="h-5 w-1/3 animate-pulse rounded bg-slate-800" />
          <div className="h-2 w-full animate-pulse rounded-full bg-slate-800" />
        </div>
      ))}
    </div>
  )
}

function PlayLogList({
  scenarioId,
  onSelect,
}: {
  scenarioId: string
  onSelect: (log: SelectedLog) => void
}) {
  const playLogsQuery = usePlayLogs(scenarioId)

  if (playLogsQuery.isPending) {
    return (
      <div className="space-y-2">
        {[0, 1].map((index) => (
          <div key={index} className="h-14 animate-pulse rounded-lg bg-slate-800/60" />
        ))}
      </div>
    )
  }

  if (playLogsQuery.isError) {
    return (
      <div className="rounded-lg border border-red-300/25 bg-red-500/10 p-4">
        <p className="text-sm text-red-100">{toApiError(playLogsQuery.error).message}</p>
        <button
          type="button"
          onClick={() => void playLogsQuery.refetch()}
          className="mt-3 rounded-lg bg-emerald-400 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-300"
        >
          다시 시도
        </button>
      </div>
    )
  }

  const playLogs = playLogsQuery.data

  if (playLogs.length === 0) {
    return (
      <p className="rounded-lg border border-sos-line bg-slate-950/40 p-4 text-center text-sm text-sos-faint">
        이 시나리오의 완료 기록이 아직 없어요.
      </p>
    )
  }

  return (
    <ul className="space-y-2">
      {playLogs.map((log) => {
        const ending = endingTypeLabel(log.endingType)

        return (
          <li key={log.logId}>
            <button
              type="button"
              onClick={() => onSelect({ logId: log.logId, endingType: log.endingType })}
              className="flex w-full items-center justify-between gap-3 rounded-lg border border-sos-line bg-slate-950/40 px-4 py-3 text-left transition hover:border-emerald-300/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200"
            >
              <div className="min-w-0">
                <span
                  className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                    ending.isGood
                      ? 'bg-emerald-300/10 text-emerald-200'
                      : 'bg-red-500/10 text-red-200'
                  }`}
                >
                  {ending.label}
                </span>
                <p className="mt-1.5 truncate text-xs text-sos-faint">
                  {formatDateTime(log.completedAt)} · {formatDuration(log.durationSeconds)}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold tabular-nums text-sos-strong">{log.totalScore}점</p>
                {log.dangerousCount > 0 ? (
                  <p className="text-xs tabular-nums text-red-200">
                    위험 선택 {log.dangerousCount}
                  </p>
                ) : (
                  <p className="text-xs text-emerald-200">무결점</p>
                )}
              </div>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function ScenarioProgressCard({
  progress,
  title,
  isExpanded,
  onToggle,
  onSelectLog,
}: {
  progress: ScenarioProgress
  title: string
  isExpanded: boolean
  onToggle: () => void
  onSelectLog: (log: SelectedLog) => void
}) {
  const rate = Math.round(progress.completionRate * 100)

  return (
    <article className="rounded-lg border border-sos-line bg-sos-inset p-4">
      <button
        type="button"
        aria-expanded={isExpanded}
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200"
      >
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-sos-strong">{title}</h3>
          <p className="mt-1 text-sm text-sos-muted">최근 플레이 {formatDate(progress.lastPlayedAt)}</p>
        </div>
        <svg
          viewBox="0 0 20 20"
          aria-hidden="true"
          className={`mt-1 size-5 shrink-0 text-sos-muted transition ${isExpanded ? 'rotate-180' : ''}`}
        >
          <path
            d="M6 8l4 4 4-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-xs text-sos-muted">
          <span>
            결말 유형 수집 {progress.discoveredCategoryCount}/{progress.totalCategories}
          </span>
          <span className="tabular-nums">{rate}%</span>
        </div>
        <div
          role="progressbar"
          aria-label="결말 유형 수집도"
          aria-valuenow={progress.discoveredCategoryCount}
          aria-valuemin={0}
          aria-valuemax={progress.totalCategories}
          className="h-2 overflow-hidden rounded-full bg-slate-800"
        >
          <div className="h-full rounded-full bg-emerald-400" style={{ width: `${rate}%` }} />
        </div>
      </div>

      {isExpanded ? (
        <div className="mt-4 border-t border-sos-line pt-4">
          <PlayLogList scenarioId={progress.scenarioId} onSelect={onSelectLog} />
        </div>
      ) : null}
    </article>
  )
}

export function HistoryTab() {
  const navigate = useNavigate()
  const progressQuery = useScenarioProgress()
  const scenariosQuery = useScenarios()
  const [expandedScenarioId, setExpandedScenarioId] = useState<string | null>(null)
  const [selectedLog, setSelectedLog] = useState<SelectedLog | null>(null)

  // 시나리오 제목 매핑 (game-engine). 실패해도 히스토리는 scenarioId 폴백으로 표시.
  const titleByScenarioId = useMemo(() => {
    const map = new Map<string, string>()
    for (const scenario of scenariosQuery.data ?? []) {
      map.set(scenario.scenario_id, scenario.title)
    }
    return map
  }, [scenariosQuery.data])

  if (progressQuery.isPending) {
    return <HistorySkeleton />
  }

  if (progressQuery.isError) {
    return (
      <div className="rounded-lg border border-red-300/25 bg-red-500/10 p-6">
        <p className="text-sm text-red-100">{toApiError(progressQuery.error).message}</p>
        <button
          type="button"
          onClick={() => void progressQuery.refetch()}
          className="mt-4 rounded-lg bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-300"
        >
          다시 시도
        </button>
      </div>
    )
  }

  const progressList = progressQuery.data

  if (progressList.length === 0) {
    return (
      <div className="rounded-lg border border-sos-line bg-sos-inset p-6 text-center">
        <p className="text-sm font-medium text-sos-body">아직 플레이 기록이 없어요.</p>
        <p className="mt-1 text-sm text-sos-faint">시나리오를 플레이하면 결과가 여기에 모입니다.</p>
        <button
          type="button"
          onClick={() => navigate('/lobby')}
          className="mt-4 rounded-lg border border-white/10 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-emerald-300 hover:text-sos-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200"
        >
          시나리오 보러 가기
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {progressList.map((progress) => (
        <ScenarioProgressCard
          key={progress.scenarioId}
          progress={progress}
          title={titleByScenarioId.get(progress.scenarioId) ?? progress.scenarioId}
          isExpanded={expandedScenarioId === progress.scenarioId}
          onToggle={() =>
            setExpandedScenarioId((current) =>
              current === progress.scenarioId ? null : progress.scenarioId,
            )
          }
          onSelectLog={setSelectedLog}
        />
      ))}

      {selectedLog ? (
        <PlayLogDetailDialog
          logId={selectedLog.logId}
          endingType={selectedLog.endingType}
          onClose={() => setSelectedLog(null)}
        />
      ) : null}
    </div>
  )
}
