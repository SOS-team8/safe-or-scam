import { describe, expect, it } from 'vitest'

import { filterScenarios } from '../search'
import type { ScenarioSummary } from '../types'

const make = (
  scenario_id: string,
  title: string,
  phishing_type: string,
  description = '설명',
): ScenarioSummary => ({
  scenario_id,
  title,
  description,
  phishing_type,
  difficulty: 'easy',
  total_endings: 1,
  total_good_endings: 1,
  total_bad_endings: 0,
  tags: [],
})

const scenarios = [
  make('s1', '택배 사칭 문자', '스미싱'),
  make('s2', '검찰 사칭 전화', '보이스피싱'),
  make('s3', '로맨스 스캠', '연애 빙자 사기', '소개팅 앱에서 만난 상대'),
]

describe('filterScenarios', () => {
  it('returns the full list for an empty or whitespace query', () => {
    expect(filterScenarios(scenarios, '')).toHaveLength(3)
    expect(filterScenarios(scenarios, '   ')).toHaveLength(3)
  })

  it('matches by title (case-insensitive)', () => {
    expect(filterScenarios(scenarios, '택배').map((s) => s.scenario_id)).toEqual(['s1'])
  })

  it('matches by phishing type', () => {
    expect(filterScenarios(scenarios, '보이스피싱').map((s) => s.scenario_id)).toEqual(['s2'])
  })

  it('matches by description', () => {
    expect(filterScenarios(scenarios, '소개팅').map((s) => s.scenario_id)).toEqual(['s3'])
  })

  it('returns an empty array when nothing matches', () => {
    expect(filterScenarios(scenarios, '존재하지않는검색어')).toEqual([])
  })

  it('handles undefined input', () => {
    expect(filterScenarios(undefined, '택배')).toEqual([])
  })
})
