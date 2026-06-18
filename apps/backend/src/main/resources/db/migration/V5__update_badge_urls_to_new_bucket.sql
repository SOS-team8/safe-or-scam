-- ============================================================================
-- V5: 배지 아이콘 URL을 신규 GCS 버킷으로 치환
-- ----------------------------------------------------------------------------
-- 구 버킷(skku-sos-storage)은 정지된 계정 소유 → 폐기. 신 버킷(safe-or-scam-images)로 이전.
-- V2/V3은 직접 수정하지 않음(checksum 보존). 신규 DB는 V2/V3 INSERT 후 본 UPDATE로 정정.
-- ============================================================================
UPDATE achievements
SET icon_url = REPLACE(icon_url, 'skku-sos-storage', 'safe-or-scam-images')
WHERE icon_url LIKE '%skku-sos-storage%';
