-- ============================================================================
-- V3: 누적 완료 횟수 기반 업적 2종 추가
-- ----------------------------------------------------------------------------
-- code 는 AchievementService.isSatisfied() switch 와 1:1. condition_value 는 임계값.
-- icon_url 은 placeholder(GCS 호스팅 예정) — 프론트가 로컬 SVG 로 override 한다.
-- 멱등 삽입: 같은 code 가 있으면 건너뜀.
-- ============================================================================
INSERT INTO achievements (code, title, description, icon_url, condition_value)
VALUES
    ('PLAY_10', '반복 숙련가',
     '시나리오를 10회 완료하면 열립니다.',
     'https://storage.googleapis.com/skku-sos-storage/badges/play_10.png', '10'),
    ('PLAY_30', '베테랑',
     '시나리오를 30회 완료하면 열립니다.',
     'https://storage.googleapis.com/skku-sos-storage/badges/play_30.png', '30')
ON CONFLICT (code) DO NOTHING;
