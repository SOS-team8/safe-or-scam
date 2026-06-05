-- ============================================================================
-- V2: 업적 마스터 데이터 시드
-- ----------------------------------------------------------------------------
-- code 는 백엔드 AchievementService 의 평가 switch 와 1:1 매핑된다.
-- condition_value 는 평가 임계값(문자열). 평가 규칙은 code 별로 코드에 정의.
-- icon_url 은 배지 이미지(GCS 호스팅 예정). 실제 에셋 미배포 시 프론트가 fallback 렌더.
-- 멱등 삽입: 이미 같은 code 가 있으면 건너뜀 (재실행/baseline 안전).
-- ============================================================================
INSERT INTO achievements (code, title, description, icon_url, condition_value)
VALUES
    ('FIRST_CLEAR', '첫 시나리오 플레이 완료',
     '첫 시나리오를 끝까지 플레이하면 열립니다.',
     'https://storage.googleapis.com/skku-sos-storage/badges/first_clear.png', '1'),
    ('FULL_COLLECTION', '결말 수집가',
     '한 시나리오의 모든 결말을 수집하면 열립니다.',
     'https://storage.googleapis.com/skku-sos-storage/badges/full_collection.png', '1.0'),
    ('GOOD_ENDING_5', '안전 길잡이',
     '안전한 결말을 누적 5회 달성하면 열립니다.',
     'https://storage.googleapis.com/skku-sos-storage/badges/good_ending_5.png', '5'),
    ('FLAWLESS', '무결점 판별',
     '위험한 선택 없이 시나리오를 완주하면 열립니다.',
     'https://storage.googleapis.com/skku-sos-storage/badges/flawless.png', '0')
ON CONFLICT (code) DO NOTHING;
