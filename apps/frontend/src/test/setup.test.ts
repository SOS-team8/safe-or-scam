import { describe, expect, it } from 'vitest'

describe('test infra', () => {
  it('runs vitest with jsdom and sessionStorage available', () => {
    sessionStorage.setItem('probe', 'ok')
    expect(sessionStorage.getItem('probe')).toBe('ok')
  })
})
