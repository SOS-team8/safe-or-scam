export type AchievementSummary = {
  id: number
  code: string
  title: string
  description: string
  iconUrl: string | null
  isAchieved: boolean
  achievedAt: string | null
  // 누적 진행 수치. 누적 N/M 이 불가한 업적(FLAWLESS·FULL_COLLECTION)은 null → 진행 바 미표시.
  progressCurrent: number | null
  progressTarget: number | null
}

export type AchievementListResponse = {
  achievements: AchievementSummary[]
  achievedCount: number
  totalCount: number
}
