// 백엔드 UserStatResponse 는 camelCase 직렬화 (history DTO 와 동일 규약). wire 매핑 불필요.

export type UserStat = {
  totalPlays: number
  completePlays: number
  goodEndings: number
  badEndings: number
  totalDangerousChoices: number
  avgScore: number
  bestScore: number
}
