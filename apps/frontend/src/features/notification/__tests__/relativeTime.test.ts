import { describe, expect, it } from 'vitest'

import { formatRelativeTime } from '../relativeTime'

// 기준 시각 고정으로 결정적 테스트.
const NOW = new Date('2026-06-15T12:00:00')

describe('formatRelativeTime', () => {
  it('returns "방금 전" within a minute', () => {
    expect(formatRelativeTime('2026-06-15T11:59:30', NOW)).toBe('방금 전')
  })

  it('returns minutes for under an hour', () => {
    expect(formatRelativeTime('2026-06-15T11:57:00', NOW)).toBe('3분 전')
  })

  it('returns hours for under a day', () => {
    expect(formatRelativeTime('2026-06-15T09:00:00', NOW)).toBe('3시간 전')
  })

  it('returns "어제" for one day ago', () => {
    expect(formatRelativeTime('2026-06-14T11:00:00', NOW)).toBe('어제')
  })

  it('returns days for under a week', () => {
    expect(formatRelativeTime('2026-06-12T12:00:00', NOW)).toBe('3일 전')
  })

  it('returns absolute YYYY.MM.DD beyond a week', () => {
    expect(formatRelativeTime('2026-06-01T12:00:00', NOW)).toBe('2026.06.01')
  })

  it('returns the raw string for an invalid date', () => {
    expect(formatRelativeTime('not-a-date', NOW)).toBe('not-a-date')
  })
})
