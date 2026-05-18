import { describe, it, expect, beforeEach } from 'vitest'

import { useGameStore } from '../store'
import type { GameSessionResponse, MoveResponse, ScenarioNode } from '../types'

const baseNode: ScenarioNode = {
  id: 'n0',
  type: 'narrative',
  text: 'opening',
  choices: [],
  educational_content: null,
  image_url: null,
  image_prompt: null,
  depth: 0,
  parent_node_id: null,
  parent_choice_id: null,
  ending_category: null,
}

const baseSession: GameSessionResponse = {
  session_id: 'sess1',
  scenario_id: 'scn1',
  user_id: 42,
  current_node_id: 'n0',
  current_node: baseNode,
  resources: { trust: 3, money: 3, awareness: 1 },
  status: 'playing',
  dangerous_count: 0,
  choices_history: [],
  started_at: '2026-05-18T00:00:00Z',
  completed_at: null,
}

describe('useGameStore', () => {
  beforeEach(() => {
    useGameStore.getState().reset()
  })

  it('hydrates from a created session with no previous resources', () => {
    useGameStore.getState().hydrateFromSession(baseSession)
    const snap = useGameStore.getState().snapshot
    expect(snap?.sessionId).toBe('sess1')
    expect(snap?.previousResources).toBeNull()
    expect(snap?.history).toEqual([])
    expect(snap?.isFinished).toBe(false)
  })

  it('records previousResources when a move arrives after hydration', () => {
    useGameStore.getState().hydrateFromSession(baseSession)

    const move: MoveResponse = {
      session_id: 'sess1',
      scenario_id: 'scn1',
      current_node_id: 'n1',
      current_node: { ...baseNode, id: 'n1' },
      resources: { trust: 3, money: 1, awareness: 0 },
      status: 'playing',
      dangerous_count: 1,
      choices_history: [
        {
          node_id: 'n0',
          choice_id: 'n0_c1',
          is_dangerous: true,
          timestamp: '2026-05-18T00:00:10Z',
        },
      ],
      danger_feedback: {
        why_dangerous: 'because',
        warning_signs: ['s'],
        safe_alternative: 'a',
      },
      educational_content: {
        title: 't',
        explanation: 'e',
        prevention_tips: ['p'],
        warning_signs: ['w'],
      },
      is_finished: false,
      ending_type: null,
      ending_category: null,
      started_at: '2026-05-18T00:00:00Z',
      completed_at: null,
    }

    useGameStore.getState().applyMove(move)
    const snap = useGameStore.getState().snapshot
    expect(snap?.previousResources).toEqual({ trust: 3, money: 3, awareness: 1 })
    expect(snap?.resources).toEqual({ trust: 3, money: 1, awareness: 0 })
    expect(snap?.dangerousCount).toBe(1)
    expect(snap?.pendingEducationalContent?.title).toBe('t')
    expect(snap?.pendingDangerFeedback?.safe_alternative).toBe('a')
  })

  it('dismissPopup clears pending education and danger objects', () => {
    useGameStore.getState().hydrateFromSession(baseSession)
    useGameStore.setState((s) => ({
      snapshot: {
        ...s.snapshot!,
        pendingEducationalContent: {
          title: 't',
          explanation: 'e',
          prevention_tips: [],
          warning_signs: [],
        },
        pendingDangerFeedback: {
          why_dangerous: 'x',
          warning_signs: [],
          safe_alternative: 'y',
        },
      },
    }))
    useGameStore.getState().dismissPopup()
    const snap = useGameStore.getState().snapshot
    expect(snap?.pendingEducationalContent).toBeNull()
    expect(snap?.pendingDangerFeedback).toBeNull()
  })

  it('reset clears the snapshot', () => {
    useGameStore.getState().hydrateFromSession(baseSession)
    expect(useGameStore.getState().snapshot).not.toBeNull()
    useGameStore.getState().reset()
    expect(useGameStore.getState().snapshot).toBeNull()
  })

  it('hydrateFromSession with prologue text sets phase=prologue', () => {
    useGameStore
      .getState()
      .hydrateFromSession(baseSession, { prologue: '안녕하세요, 게임을 시작합니다.' })
    expect(useGameStore.getState().snapshot?.phase).toBe('prologue')
  })

  it('hydrateFromSession without prologue (null/empty) sets phase=playing', () => {
    useGameStore.getState().hydrateFromSession(baseSession, { prologue: null })
    expect(useGameStore.getState().snapshot?.phase).toBe('playing')
    useGameStore.getState().reset()
    useGameStore.getState().hydrateFromSession(baseSession, { prologue: '   ' })
    expect(useGameStore.getState().snapshot?.phase).toBe('playing')
  })

  it('startGameAfterPrologue moves prologue → playing; no-op otherwise', () => {
    useGameStore
      .getState()
      .hydrateFromSession(baseSession, { prologue: '시작 안내' })
    expect(useGameStore.getState().snapshot?.phase).toBe('prologue')

    useGameStore.getState().startGameAfterPrologue()
    expect(useGameStore.getState().snapshot?.phase).toBe('playing')

    // Repeating once playing is a no-op.
    useGameStore.getState().startGameAfterPrologue()
    expect(useGameStore.getState().snapshot?.phase).toBe('playing')
  })

  it('applyMove transitions phase to ended when is_finished', () => {
    useGameStore.getState().hydrateFromSession(baseSession)
    const move: MoveResponse = {
      session_id: 'sess1',
      scenario_id: 'scn1',
      current_node_id: 'n_end',
      current_node: { ...baseNode, id: 'n_end', type: 'ending_good' },
      resources: { trust: 3, money: 3, awareness: 2 },
      status: 'completed',
      dangerous_count: 0,
      choices_history: [],
      danger_feedback: null,
      educational_content: null,
      is_finished: true,
      ending_type: 'ending_good',
      ending_category: null,
      started_at: '2026-05-18T00:00:00Z',
      completed_at: '2026-05-18T00:00:10Z',
    }
    useGameStore.getState().applyMove(move)
    expect(useGameStore.getState().snapshot?.phase).toBe('ended')
  })
})
