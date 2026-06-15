import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'

import { apiClient } from '@/shared/api/client'

import { historyApi } from '../api'

vi.mock('@/shared/api/client', () => ({
  apiClient: { get: vi.fn() },
}))

const mockedGet = apiClient.get as unknown as Mock

beforeEach(() => mockedGet.mockReset())

describe('historyApi endpoints', () => {
  it('getScenarioProgress → GET /history/progress, unwraps camelCase payload', async () => {
    const rows = [
      {
        scenarioId: 'sc-1',
        completionRate: 0.5,
        discoveredCategoryCount: 2,
        totalCategories: 4,
        lastPlayedAt: '2026-06-11T14:30:00',
      },
    ]
    mockedGet.mockResolvedValueOnce({ data: { data: rows } })

    const result = await historyApi.getScenarioProgress()

    expect(mockedGet).toHaveBeenCalledWith('/api/v1/users/me/history/progress')
    expect(result).toEqual(rows)
  })

  it('getPlayLogs → GET /history/play-logs with scenarioId param', async () => {
    mockedGet.mockResolvedValueOnce({ data: { data: [] } })

    await historyApi.getPlayLogs('sc-2')

    expect(mockedGet).toHaveBeenCalledWith('/api/v1/users/me/history/play-logs', {
      params: { scenarioId: 'sc-2' },
    })
  })

  it('getPlayLogDetail → GET /history/play-logs/{logId}', async () => {
    mockedGet.mockResolvedValueOnce({ data: { data: { logId: 'log-1' } } })

    await historyApi.getPlayLogDetail('log-1')

    expect(mockedGet).toHaveBeenCalledWith('/api/v1/users/me/history/play-logs/log-1')
  })
})
