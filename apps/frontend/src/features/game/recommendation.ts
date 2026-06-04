import type { ScenarioSummary } from '@/features/game/types'
import type { UserProfile } from '@/features/user/types'

type TagPrefix =
  | 'occupation'
  | 'age_group'
  | 'gender'
  | 'economic'
  | 'communicate'
  | 'online'
  | 'financial'
  | 'family'

const tagWeights: Record<TagPrefix, number> = {
  financial: 4,
  communicate: 4,
  online: 3,
  economic: 3,
  occupation: 2,
  family: 2,
  age_group: 1,
  gender: 1,
}

const toTagValue = (value: string) => value.toLowerCase()

const addSingleTag = (
  tags: Set<string>,
  prefix: TagPrefix,
  value: string | null | undefined,
) => {
  if (!value || value === 'NONE') return
  tags.add(`${prefix}:${toTagValue(value)}`)
}

const addArrayTags = (
  tags: Set<string>,
  prefix: TagPrefix,
  values: string[] | undefined,
) => {
  values?.forEach((value) => addSingleTag(tags, prefix, value))
}

const getTagPrefix = (tag: string): TagPrefix | null => {
  const [prefix] = tag.split(':', 1)
  return prefix in tagWeights ? (prefix as TagPrefix) : null
}

export const buildUserSurveyTags = (profile: UserProfile | null | undefined) => {
  const tags = new Set<string>()
  if (!profile) return tags

  addSingleTag(tags, 'occupation', profile.occupation)
  addSingleTag(tags, 'age_group', profile.ageGroup)
  addSingleTag(tags, 'gender', profile.gender)
  addArrayTags(tags, 'economic', profile.economicActivities)
  addArrayTags(tags, 'communicate', profile.communicateChannels)
  addArrayTags(tags, 'online', profile.onlineActivities)
  addArrayTags(tags, 'financial', profile.financialChannels)
  addSingleTag(tags, 'family', profile.familyType)

  return tags
}

export const scoreScenario = (
  userTags: Set<string>,
  scenarioTags: string[] | undefined,
) => {
  const uniqueScenarioTags = new Set(scenarioTags ?? [])

  return Array.from(uniqueScenarioTags).reduce((score, tag) => {
    if (!userTags.has(tag)) return score

    const prefix = getTagPrefix(tag)
    if (!prefix) return score

    return score + tagWeights[prefix]
  }, 0)
}

export const getRecommendedScenarios = (
  profile: UserProfile | null | undefined,
  scenarios: ScenarioSummary[] | undefined,
  limit = 2,
) => {
  if (!scenarios || scenarios.length === 0) return []

  const fallback = scenarios.slice(0, limit)
  const userTags = buildUserSurveyTags(profile)
  if (userTags.size === 0) return fallback

  const scoredScenarios = scenarios.map((scenario, index) => ({
    scenario,
    index,
    score: scoreScenario(userTags, scenario.tags),
  }))

  if (scoredScenarios.every(({ score }) => score === 0)) {
    return fallback
  }

  return [...scoredScenarios]
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map(({ scenario }) => scenario)
}
