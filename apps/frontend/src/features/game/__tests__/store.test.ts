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
})
