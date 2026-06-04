import { describe, expect, it } from 'vitest'

import type { ScenarioSummary } from '@/features/game/types'
import type { UserProfile } from '@/features/user/types'

import {
  buildUserSurveyTags,
  getRecommendedScenarios,
  scoreScenario,
} from '../recommendation'

const profile: UserProfile = {
  name: '테스터',
  email: 'tester@example.com',
  occupation: 'SELF_EMPLOYED',
  gender: 'MALE',
  ageGroup: 'FORTIES',
  economicActivities: ['INVESTMENT', 'NONE'],
  communicateChannels: ['PHONE', 'SMS'],
  onlineActivities: ['GOVERNMENT'],
  financialChannels: ['MOBILE_BANKING'],
  familyType: 'WITH_CHILDREN',
}

const makeScenario = (
  scenarioId: string,
  title: string,
  tags: string[],
): ScenarioSummary => ({
  scenario_id: scenarioId,
  title,
  description: `${title} 설명`,
  phishing_type: 'test',
  difficulty: 'medium',
  total_endings: 3,
  total_good_endings: 1,
  total_bad_endings: 2,
  tags,
})

describe('scenario recommendation', () => {
  it('builds survey tags from user onboarding fields and excludes NONE', () => {
    const tags = buildUserSurveyTags(profile)

    expect(tags).toContain('occupation:self_employed')
    expect(tags).toContain('age_group:forties')
    expect(tags).toContain('gender:male')
    expect(tags).toContain('economic:investment')
    expect(tags).toContain('communicate:phone')
    expect(tags).toContain('communicate:sms')
    expect(tags).toContain('online:government')
    expect(tags).toContain('financial:mobile_banking')
    expect(tags).toContain('family:with_children')
    expect(tags).not.toContain('economic:none')
  })

  it('scores matched scenario tags with weighted prefixes', () => {
    const tags = buildUserSurveyTags(profile)

    expect(
      scoreScenario(tags, [
        'financial:mobile_banking',
        'communicate:phone',
        'online:government',
        'gender:male',
      ]),
    ).toBe(12)
  })

  it('returns the top two scenarios by score while preserving order for ties', () => {
    const scenarios = [
      makeScenario('s1', '기본 시나리오', ['gender:male', 'age_group:forties']),
      makeScenario('s2', '정부기관 사칭', [
        'online:government',
        'financial:mobile_banking',
      ]),
      makeScenario('s3', '전화 투자사기', [
        'communicate:phone',
        'economic:investment',
      ]),
    ]

    const recommended = getRecommendedScenarios(profile, scenarios, 2)

    expect(recommended.map((scenario) => scenario.scenario_id)).toEqual(['s2', 's3'])
  })

  it('falls back to the first two scenarios when profile details or tags are missing', () => {
    const scenarios = [
      makeScenario('s1', '첫 번째', []),
      makeScenario('s2', '두 번째', []),
      makeScenario('s3', '세 번째', []),
    ]

    expect(getRecommendedScenarios(undefined, scenarios, 2)).toEqual(
      scenarios.slice(0, 2),
    )
    expect(getRecommendedScenarios(profile, scenarios, 2)).toEqual(
      scenarios.slice(0, 2),
    )
  })
})
