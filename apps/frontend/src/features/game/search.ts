import type { ScenarioSummary } from '@/features/game/types'

/**
 * 로비 시나리오 검색. 제목·사기 유형·설명을 대소문자 무시 부분일치로 필터링한다.
 * 공백 쿼리는 전체 목록을 그대로 반환한다(클라이언트 측, 로드된 목록 대상).
 */
export const filterScenarios = (
  scenarios: ScenarioSummary[] | undefined,
  query: string,
): ScenarioSummary[] => {
  const list = scenarios ?? []
  const q = query.trim().toLowerCase()
  if (!q) return list

  return list.filter((scenario) =>
    [scenario.title, scenario.phishing_type, scenario.description]
      .join('\n')
      .toLowerCase()
      .includes(q),
  )
}
