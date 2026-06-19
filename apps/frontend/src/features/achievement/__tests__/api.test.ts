import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'

import { apiClient } from '@/shared/api/client'

import { achievementApi } from '../api'

vi.mock('@/shared/api/client', () => ({
  apiClient: { get: vi.fn() },
}))

const mockedGet = apiClient.get as unknown as Mock

beforeEach(() => mockedGet.mockReset())

describe('achievementApi.getAchievements', () => {
  it('maps snake_case wire to camelCase and computes counts', async () => {
    mockedGet.mockResolvedValueOnce({
      data: {
        data: [
          {
            achievement_id: 1,
            code: 'FIRST_CLEAR',
            title: '첫 판별',
            description: 'd',
            icon_url: 'https://x/y.png',
            unlocked: true,
            achieved_at: '2026-05-01T10:00:00',
            progress_current: 1,
            progress_target: 1,
          },
          {
            achievement_id: 2,
            code: 'FLAWLESS',
            title: '무결점',
            description: 'd2',
            icon_url: null,
            unlocked: false,
            achieved_at: null,
            // 누적 N/M 불가 업적은 progress 필드가 내려오지 않음 → null 정규화
          },
        ],
      },
    })

    const result = await achievementApi.getAchievements()

    expect(mockedGet).toHaveBeenCalledWith('/api/v1/users/me/achievements')
    expect(result.achievedCount).toBe(1)
    expect(result.totalCount).toBe(2)
    expect(result.achievements[0]).toEqual({
      id: 1,
      code: 'FIRST_CLEAR',
      title: '첫 판별',
      description: 'd',
      iconUrl: 'https://x/y.png',
      isAchieved: true,
      achievedAt: '2026-05-01T10:00:00',
      progressCurrent: 1,
      progressTarget: 1,
    })
    // progress 필드가 누락된 항목은 null 로 정규화된다.
    expect(result.achievements[1].progressCurrent).toBeNull()
    expect(result.achievements[1].progressTarget).toBeNull()
  })
})
