export type AchievementSummary = {
  id: number
  code: string
  title: string
  description: string
  iconUrl: string | null
  isAchieved: boolean
  achievedAt: string | null
}

export type AchievementListResponse = {
  achievements: AchievementSummary[]
  achievedCount: number
  totalCount: number
}
