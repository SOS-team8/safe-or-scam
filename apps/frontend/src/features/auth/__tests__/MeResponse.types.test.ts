import { describe, expectTypeOf, it } from 'vitest'

import type { MeResponse, UserRole } from '../types'

describe('MeResponse type (ADR-006 + auth-boundary §4)', () => {
  it('requires the auth-boundary §4 mandatory fields', () => {
    expectTypeOf<MeResponse>().toHaveProperty('id').toEqualTypeOf<number>()
    expectTypeOf<MeResponse>().toHaveProperty('email').toEqualTypeOf<string>()
    expectTypeOf<MeResponse>().toHaveProperty('name').toEqualTypeOf<string>()
    expectTypeOf<MeResponse>().toHaveProperty('role').toEqualTypeOf<UserRole>()
    expectTypeOf<MeResponse>().toHaveProperty('status').toEqualTypeOf<string>()
    expectTypeOf<MeResponse>().toHaveProperty('createdAt').toEqualTypeOf<string>()
  })

  it('accepts a payload with only the mandatory fields (extension fields optional)', () => {
    const mandatoryOnly: MeResponse = {
      id: 1,
      email: 'a@b.com',
      name: 'foo',
      role: 'USER',
      status: 'ACTIVE',
      createdAt: '2026-05-18T00:00:00Z',
    }
    expectTypeOf(mandatoryOnly).toMatchTypeOf<MeResponse>()
  })

  it('accepts a payload that also carries the legacy profile fields', () => {
    const withExtensions: MeResponse = {
      id: 2,
      email: 'a@b.com',
      name: 'foo',
      role: 'USER',
      status: 'ACTIVE',
      createdAt: '2026-05-18T00:00:00Z',
      occupation: 'EMPLOYEE',
      gender: 'FEMALE',
      ageGroup: 'TWENTIES',
    }
    expectTypeOf(withExtensions).toMatchTypeOf<MeResponse>()
  })
})
