import firstClear from '@/assets/badges/first-clear.svg'
import flawless from '@/assets/badges/flawless.svg'
import fullCollection from '@/assets/badges/full-collection.svg'
import goodEnding5 from '@/assets/badges/good-ending-5.svg'
import play10 from '@/assets/badges/play-10.svg'
import play30 from '@/assets/badges/play-30.svg'

// 업적 code → 로컬 배지 이미지. 매핑이 없는 업적은 백엔드 iconUrl로 폴백한다.
export const badgeImageByCode: Record<string, string> = {
  FIRST_CLEAR: firstClear,
  FULL_COLLECTION: fullCollection,
  GOOD_ENDING_5: goodEnding5,
  FLAWLESS: flawless,
  PLAY_10: play10,
  PLAY_30: play30,
}
