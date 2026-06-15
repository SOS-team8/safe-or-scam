import { describe, expect, it } from 'vitest'

import { endingTypeLabel, formatDate, formatDateTime, formatDuration } from '../format'

describe('formatDate / formatDateTime', () => {
  it('formats date as YYYY.MM.DD', () => {
    expect(formatDate('2026-06-11T14:30:00')).toBe('2026.06.11')
  })

  it('formats datetime as YYYY.MM.DD HH:mm', () => {
    expect(formatDateTime('2026-06-11T14:30:00')).toBe('2026.06.11 14:30')
  })

  it('returns raw string for invalid input', () => {
    expect(formatDate('nope')).toBe('nope')
    expect(formatDateTime('nope')).toBe('nope')
  })
})

describe('formatDuration', () => {
  it('shows seconds only under a minute', () => {
    expect(formatDuration(8)).toBe('8초')
  })

  it('shows minutes and seconds', () => {
    expect(formatDuration(116)).toBe('1분 56초')
  })

  it('clamps negatives to 0초', () => {
    expect(formatDuration(-5)).toBe('0초')
  })
})

describe('endingTypeLabel', () => {
  it('maps ending_good to 안전한 결말 (isGood)', () => {
    expect(endingTypeLabel('ending_good')).toEqual({ label: '안전한 결말', isGood: true })
  })

  it('maps ending_bad to 주의가 필요한 결말', () => {
    expect(endingTypeLabel('ending_bad')).toEqual({ label: '주의가 필요한 결말', isGood: false })
  })

  it('falls back to the raw code for unknown types', () => {
    expect(endingTypeLabel('ending_weird')).toEqual({ label: 'ending_weird', isGood: false })
  })
})
