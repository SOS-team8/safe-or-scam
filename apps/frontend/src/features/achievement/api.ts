import type { AxiosResponse } from 'axios'

import { apiClient } from '@/shared/api/client'

import type { AchievementListResponse, AchievementSummary } from './types'

type ApiResponse<T> = {
  data: T
}

const unwrapData = <T>(response: AxiosResponse<ApiResponse<T>>) => response.data.data

// 백엔드 AchievementResponse 와 동일한 wire 포맷 (snake_case)
type AchievementWire = {
  achievement_id: number
  code: string
  title: string
  description: string
  icon_url: string | null
  unlocked: boolean
  achieved_at: string | null
}

const toAchievementSummary = (wire: AchievementWire): AchievementSummary => ({
  id: wire.achievement_id,
  code: wire.code,
  title: wire.title,
  description: wire.description,
  iconUrl: wire.icon_url,
  isAchieved: wire.unlocked,
  achievedAt: wire.achieved_at,
})

export const achievementApi = {
  getAchievements: async (): Promise<AchievementListResponse> => {
    const response = await apiClient.get<ApiResponse<AchievementWire[]>>(
      '/api/v1/users/me/achievements',
    )
    const payload = unwrapData(response)
    const achievements = (Array.isArray(payload) ? payload : []).map(toAchievementSummary)

    return {
      achievements,
      achievedCount: achievements.filter((achievement) => achievement.isAchieved).length,
      totalCount: achievements.length,
    }
  },
}
