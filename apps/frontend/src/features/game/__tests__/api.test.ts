import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import axios from 'axios'

import { gameEngineClient } from '@/shared/api/client'

import { gameApi, toGameEngineError } from '../api'
import type {
  GameSessionResponse,
  MoveResponse,
  ScenarioSummary,
  ScenarioTree,
} from '../types'

vi.mock('@/shared/api/client', () => ({
  gameEngineClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

const mockedGet = gameEngineClient.get as unknown as Mock
const mockedPost = gameEngineClient.post as unknown as Mock

const baseNode = {
  id: 'n0',
  type: 'narrative' as const,
  text: 'hi',
  choices: [],
  educational_content: null,
  image_url: null,
  image_prompt: null,
  depth: 0,
  parent_node_id: null,
  parent_choice_id: null,
  ending_category: null,
}

describe('gameApi', () => {
  beforeEach(() => {
    mockedGet.mockReset()
    mockedPost.mockReset()
  })

  it('fetchScenarios hits GET /api/v1/scenarios and returns the array', async () => {
    const data: ScenarioSummary[] = [
      {
        scenario_id: 's1',
        title: 't',
        description: 'd',
        phishing_type: 'smishing',
        difficulty: 'easy',
        total_endings: 4,
        total_good_endings: 2,
        total_bad_endings: 2,
        tags: [],
      },
    ]
    mockedGet.mockResolvedValueOnce({ data })

    const result = await gameApi.fetchScenarios()

    expect(mockedGet).toHaveBeenCalledWith('/api/v1/scenarios', { params: undefined })
    expect(result).toEqual(data)
  })

  it('fetchScenarios forwards filters via query params', async () => {
    mockedGet.mockResolvedValueOnce({ data: [] })

    await gameApi.fetchScenarios({ difficulty: 'medium', phishing_type: 'smishing' })

    expect(mockedGet).toHaveBeenCalledWith('/api/v1/scenarios', {
      params: { difficulty: 'medium', phishing_type: 'smishing' },
    })
  })

  it('fetchScenarioDetail hits GET /api/v1/scenarios/{id}', async () => {
    const tree: Partial<ScenarioTree> = { scenario_id: 's1', title: 't' }
    mockedGet.mockResolvedValueOnce({ data: tree })

    const result = await gameApi.fetchScenarioDetail('s1')

    expect(mockedGet).toHaveBeenCalledWith('/api/v1/scenarios/s1')
    expect(result).toBe(tree)
  })

  it('createGameSession posts {scenario_id} (user_id from JWT)', async () => {
    const session: Partial<GameSessionResponse> = {
      session_id: 'abc',
      scenario_id: 's1',
      user_id: 42,
    }
    mockedPost.mockResolvedValueOnce({ data: session })

    const result = await gameApi.createGameSession('s1')

    expect(mockedPost).toHaveBeenCalledWith('/api/v1/game-sessions', { scenario_id: 's1' })
    expect(result).toBe(session)
  })

  it('submitChoice posts {choice_id} to /game-sessions/{id}/move', async () => {
    const move: Partial<MoveResponse> = { session_id: 'abc', is_finished: false }
    mockedPost.mockResolvedValueOnce({ data: move })

    const result = await gameApi.submitChoice('abc', 'n0_c1')

    expect(mockedPost).toHaveBeenCalledWith('/api/v1/game-sessions/abc/move', {
      choice_id: 'n0_c1',
    })
    expect(result).toBe(move)
  })

  it('getGameSession hits GET /game-sessions/{id}', async () => {
    const move: Partial<MoveResponse> = {
      session_id: 'abc',
      current_node: baseNode,
    }
    mockedGet.mockResolvedValueOnce({ data: move })

    const result = await gameApi.getGameSession('abc')

    expect(mockedGet).toHaveBeenCalledWith('/api/v1/game-sessions/abc')
    expect(result).toBe(move)
  })

  it('undoLastChoice posts to /game-sessions/{id}/undo', async () => {
    mockedPost.mockResolvedValueOnce({ data: { session_id: 'abc' } })

    await gameApi.undoLastChoice('abc')

    expect(mockedPost).toHaveBeenCalledWith('/api/v1/game-sessions/abc/undo')
  })
})

describe('toGameEngineError', () => {
  it('extracts FastAPI detail string', () => {
    const error = new Error('boom') as Error & {
      isAxiosError: true
      response: { data: { detail: string } }
    }
    error.isAxiosError = true
    error.response = { data: { detail: 'Session is not active' } }
    vi.spyOn(axios, 'isAxiosError').mockReturnValueOnce(true)

    const result = toGameEngineError(error)

    expect(result.message).toBe('Session is not active')
  })

  it('falls back to a default message for non-axios errors', () => {
    const result = toGameEngineError(new Error('generic'))
    expect(result.message).toMatch(/처리/)
  })

  it('falls back to a default message when detail is missing', () => {
    const error = new Error('boom') as Error & {
      isAxiosError: true
      response: { data: unknown }
    }
    error.isAxiosError = true
    error.response = { data: {} }
    vi.spyOn(axios, 'isAxiosError').mockReturnValueOnce(true)

    const result = toGameEngineError(error)

    expect(result.message).toMatch(/처리/)
  })
})
