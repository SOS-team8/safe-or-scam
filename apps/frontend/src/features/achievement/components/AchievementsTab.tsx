import { useEffect, useRef, useState } from 'react'

import { toApiError } from '@/shared/api/error'

import { badgeImageByCode } from '../badges'
import { formatAchievedDate } from '../formatDate'
import { useAchievements } from '../hooks'
import type { AchievementSummary } from '../types'
import { AchievementDetailDialog } from './AchievementDetailDialog'

type AchievementsTabProps = {
  focusAchievementId: number | null
  onFocusHandled: () => void
}

// 업적 카드 표시 순서. 목록에 없는 code 는 뒤에 원래 순서로 붙는다.
const BADGE_DISPLAY_ORDER = [
  'FIRST_CLEAR',
  'PLAY_10',
  'PLAY_30',
  'FULL_COLLECTION',
  'GOOD_ENDING_5',
  'FLAWLESS',
]

const badgeDisplayRank = (code: string) => {
  const index = BADGE_DISPLAY_ORDER.indexOf(code)
  return index === -1 ? BADGE_DISPLAY_ORDER.length : index
}

function AchievementIcon({ achievement }: { achievement: AchievementSummary }) {
  const [hasImageError, setHasImageError] = useState(false)
  const imageSrc = badgeImageByCode[achievement.code] ?? achievement.iconUrl

  if (!imageSrc || hasImageError) {
    return (
      <div
        aria-hidden="true"
        className="flex size-24 items-center justify-center rounded-full bg-slate-700 text-3xl font-semibold text-sos-body"
      >
        {achievement.title.trim().slice(0, 1) || 'S'}
      </div>
    )
  }

  // 배지 원본이 투명 배경 전제 — 클리핑/배경 없이 카드 배경 위에 그대로 얹는다.
  return (
    <img
      src={imageSrc}
      alt={achievement.title}
      loading="lazy"
      decoding="async"
      onError={() => setHasImageError(true)}
      className="size-24 object-contain"
    />
  )
}

function AchievementGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className="flex flex-col items-center space-y-3 rounded-md border border-white/10 bg-slate-900 p-4"
        >
          <div className="size-24 animate-pulse rounded-full bg-slate-800" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-slate-800" />
          <div className="h-4 w-full animate-pulse rounded bg-slate-800" />
        </div>
      ))}
    </div>
  )
}

export function AchievementsTab({ focusAchievementId, onFocusHandled }: AchievementsTabProps) {
  const achievementsQuery = useAchievements()
  const [selectedAchievement, setSelectedAchievement] = useState<AchievementSummary | null>(null)
  const [highlightedAchievementId, setHighlightedAchievementId] = useState<number | null>(null)
  const cardRefs = useRef(new Map<number, HTMLButtonElement>())

  const achievementList = achievementsQuery.data

  useEffect(() => {
    if (focusAchievementId === null || !achievementList) {
      return
    }

    const card = cardRefs.current.get(focusAchievementId)

    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setHighlightedAchievementId(focusAchievementId)
    }

    onFocusHandled()
  }, [focusAchievementId, achievementList, onFocusHandled])

  useEffect(() => {
    if (highlightedAchievementId === null) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setHighlightedAchievementId(null)
    }, 2000)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [highlightedAchievementId])

  if (achievementsQuery.isPending) {
    return <AchievementGridSkeleton />
  }

  if (achievementsQuery.isError) {
    return (
      <div className="rounded-md border border-red-300/25 bg-red-500/10 p-6">
        <p className="text-sm text-red-100">{toApiError(achievementsQuery.error).message}</p>
        <button
          type="button"
          onClick={() => void achievementsQuery.refetch()}
          className="mt-4 rounded-md bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-300"
        >
          다시 시도
        </button>
      </div>
    )
  }

  const { achievements, achievedCount, totalCount } = achievementsQuery.data
  const achievedRate = totalCount > 0 ? Math.round((achievedCount / totalCount) * 100) : 0
  // 표시 순서: 첫 시나리오 → 반복 숙련가 → 베테랑 → 나머지(원래 순서 유지)
  const orderedAchievements = [...achievements].sort(
    (a, b) => badgeDisplayRank(a.code) - badgeDisplayRank(b.code),
  )

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm text-sos-body">
          <span className="font-semibold text-emerald-200">{achievedCount}</span> / {totalCount}{' '}
          달성 ({achievedRate}%)
        </p>
        <div
          role="progressbar"
          aria-label="업적 달성 진행도"
          aria-valuenow={achievedCount}
          aria-valuemin={0}
          aria-valuemax={totalCount}
          className="h-2 overflow-hidden rounded-full bg-slate-800"
        >
          <div
            className="h-full rounded-full bg-emerald-400"
            style={{ width: `${achievedRate}%` }}
          />
        </div>
      </div>

      {achievements.length === 0 ? (
        <div className="rounded-md border border-white/10 bg-slate-900 p-6 text-center">
          <p className="text-sm font-medium text-sos-body">표시할 업적이 없어요.</p>
          <p className="mt-1 text-sm text-sos-faint">시나리오를 플레이하며 업적을 달성해보세요.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
          {orderedAchievements.map((achievement) => (
            <button
              key={achievement.id}
              ref={(element) => {
                if (element) {
                  cardRefs.current.set(achievement.id, element)
                } else {
                  cardRefs.current.delete(achievement.id)
                }
              }}
              type="button"
              onClick={() => setSelectedAchievement(achievement)}
              className={`relative flex flex-col items-center rounded-md border bg-slate-900 p-4 text-center transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 ${
                achievement.isAchieved
                  ? 'border-white/10 hover:border-emerald-300/60'
                  : 'border-dashed border-white/15 opacity-60 hover:opacity-80'
              } ${highlightedAchievementId === achievement.id ? 'ring-2 ring-emerald-300' : ''}`}
            >
              {achievement.isAchieved ? (
                <span
                  aria-label="달성한 업적"
                  className="absolute right-3 top-3 flex size-5 items-center justify-center rounded-full bg-emerald-400 text-xs font-bold text-slate-950"
                >
                  ✓
                </span>
              ) : (
                <span className="absolute right-3 top-3 text-xs font-medium text-sos-faint">
                  잠금
                </span>
              )}

              <AchievementIcon achievement={achievement} />
              <h3 className="mt-3 font-semibold text-sos-strong">{achievement.title}</h3>
              <p className="mt-1 line-clamp-2 text-sm leading-6 text-sos-muted">
                {achievement.description}
              </p>
              <p className="mt-3 text-xs text-sos-faint">
                {achievement.isAchieved && achievement.achievedAt
                  ? `달성일 ${formatAchievedDate(achievement.achievedAt)}`
                  : '잠금'}
              </p>
              {/* 누적형 업적만 진행 바 표시. per-play/per-scenario 업적은 progressTarget 이 null 이라 생략. */}
              {achievement.progressTarget != null &&
              achievement.progressTarget > 0 &&
              achievement.progressCurrent != null ? (
                <div className="mt-3 w-full">
                  <div
                    role="progressbar"
                    aria-valuenow={achievement.progressCurrent}
                    aria-valuemin={0}
                    aria-valuemax={achievement.progressTarget}
                    aria-label={`진행 ${achievement.progressCurrent}/${achievement.progressTarget}`}
                    className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800"
                  >
                    <div
                      className="h-full rounded-full bg-emerald-400 transition-[width]"
                      style={{
                        width: `${Math.round(
                          (achievement.progressCurrent / achievement.progressTarget) * 100,
                        )}%`,
                      }}
                    />
                  </div>
                  <p className="mt-1 text-xs tabular-nums text-sos-faint">
                    {achievement.progressCurrent}/{achievement.progressTarget}
                  </p>
                </div>
              ) : null}
            </button>
          ))}
        </div>
      )}

      {selectedAchievement !== null ? (
        <AchievementDetailDialog
          achievement={selectedAchievement}
          onClose={() => setSelectedAchievement(null)}
        />
      ) : null}
    </div>
  )
}
