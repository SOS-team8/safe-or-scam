import { describe, expect, it } from 'vitest'

import { badgeImageByCode } from '../badges'

// 백엔드 시드 업적 code 와 1:1로 로컬 배지가 매핑돼 있어야 한다(누락 시 iconUrl 폴백).
const SEEDED_CODES = [
  'FIRST_CLEAR',
  'FULL_COLLECTION',
  'GOOD_ENDING_5',
  'FLAWLESS',
  'PLAY_10',
  'PLAY_30',
]

describe('badgeImageByCode', () => {
  it('maps every seeded achievement code to a truthy asset', () => {
    for (const code of SEEDED_CODES) {
      expect(badgeImageByCode[code], `missing badge for ${code}`).toBeTruthy()
    }
  })

  it('returns undefined for unknown codes (frontend falls back to iconUrl)', () => {
    expect(badgeImageByCode.UNKNOWN_CODE).toBeUndefined()
  })
})
