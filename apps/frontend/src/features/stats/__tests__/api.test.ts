import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'

import { apiClient } from '@/shared/api/client'

import { statsApi } from '../api'

vi.mock('@/shared/api/client', () => ({
  apiClient: { get: vi.fn() },
}))

const mockedGet = apiClient.get as unknown as Mock

beforeEach(() => mockedGet.mockReset())

describe('statsApi.getUserStats', () => {
  it('GET /users/me/stats and unwraps the camelCase payload', async () => {
    const stats = {
      totalPlays: 18,
      completePlays: 15,
      goodEndings: 11,
      badEndings: 4,
      totalDangerousChoices: 7,
      avgScore: 78.5,
      bestScore: 95,
    }
    mockedGet.mockResolvedValueOnce({ data: { data: stats } })

    const result = await statsApi.getUserStats()

    expect(mockedGet).toHaveBeenCalledWith('/api/v1/users/me/stats')
    expect(result).toEqual(stats)
  })
})
