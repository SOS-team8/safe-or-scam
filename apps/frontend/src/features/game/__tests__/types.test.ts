import { describe, it, expect, expectTypeOf } from 'vitest'

import type {
  ChoiceHistoryEntry,
  DangerFeedback,
  EducationalContent,
  GameSessionResponse,
  MoveResponse,
  ScenarioSummary,
} from '../types'

describe('game-engine API types (snake_case)', () => {
  it('ScenarioSummary uses snake_case fields per contract §3-1', () => {
    const sample: ScenarioSummary = {
      scenario_id: 's1',
      title: 't',
      description: 'd',
      phishing_type: 'smishing',
      difficulty: 'easy',
      total_endings: 4,
      total_good_endings: 2,
      total_bad_endings: 2,
      tags: [],
    }
    expect(sample.scenario_id).toBe('s1')
    expect(sample.phishing_type).toBe('smishing')
    expect(sample.total_endings).toBe(4)
  })

  it('GameSessionResponse contains snake_case current_node with embedded ScenarioNode', () => {
    expectTypeOf<GameSessionResponse>().toHaveProperty('current_node_id')
    expectTypeOf<GameSessionResponse>().toHaveProperty('current_node')
    expectTypeOf<GameSessionResponse>().toHaveProperty('dangerous_count')
    expectTypeOf<GameSessionResponse>().toHaveProperty('choices_history')
    expectTypeOf<GameSessionResponse>().toHaveProperty('started_at')
  })

  it('MoveResponse carries danger_feedback and educational_content as objects per v2', () => {
    expectTypeOf<MoveResponse>().toHaveProperty('danger_feedback')
    expectTypeOf<MoveResponse>().toHaveProperty('educational_content')
    expectTypeOf<MoveResponse>().toHaveProperty('is_finished')
    expectTypeOf<MoveResponse>().toHaveProperty('ending_category')
  })

  it('DangerFeedback has the 3 fields locked in scenario-tree v2 §4-1', () => {
    const sample: DangerFeedback = {
      why_dangerous: 'x',
      warning_signs: ['a'],
      safe_alternative: 'b',
    }
    expect(Object.keys(sample).sort()).toEqual([
      'safe_alternative',
      'warning_signs',
      'why_dangerous',
    ])
  })

  it('EducationalContent has the 4 fields locked in scenario-tree v2 §3', () => {
    const sample: EducationalContent = {
      title: 't',
      explanation: 'e',
      prevention_tips: ['p'],
      warning_signs: ['w'],
    }
    expect(Object.keys(sample).sort()).toEqual([
      'explanation',
      'prevention_tips',
      'title',
      'warning_signs',
    ])
  })

  it('ChoiceHistoryEntry has 4 fields per contract §3-4-1', () => {
    const entry: ChoiceHistoryEntry = {
      node_id: 'n0',
      choice_id: 'c1',
      is_dangerous: false,
      timestamp: '2026-05-18T00:00:00Z',
    }
    expect(Object.keys(entry).sort()).toEqual([
      'choice_id',
      'is_dangerous',
      'node_id',
      'timestamp',
    ])
  })
})
