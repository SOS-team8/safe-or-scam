// 백엔드 history DTO는 camelCase 직렬화 (전역 snake_case 설정 없음). wire 매핑 불필요.

export type ScenarioProgress = {
  scenarioId: string
  completionRate: number // 0.0 ~ 1.0
  discoveredCategoryCount: number
  totalCategories: number
  lastPlayedAt: string // ISO 8601
}

export type PlayLogSummary = {
  logId: string
  endingType: string // 'ending_good' | 'ending_bad' 등
  totalScore: number
  dangerousCount: number
  durationSeconds: number
  completedAt: string // ISO 8601
}

export type EndingCategory = {
  label: string
  description: string
}

export type PlayLogDetail = {
  logId: string
  scenarioId: string
  imageUrl: string | null
  text: string
  endingCategory: EndingCategory | null
}
