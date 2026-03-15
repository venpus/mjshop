-- 마이그레이션: 091_ai_work_summary_cache_stack
-- 설명: AI 업무 요약 캐시를 덮어쓰기 → 쌓아가기 방식으로 변경 (사용자·언어별 최신 1건 조회 유지)
-- 날짜: 2025-03-15

-- PK를 id로 변경하여 동일 (user_id, lang)에 여러 행 허용
ALTER TABLE ai_work_summary_cache
  DROP PRIMARY KEY,
  ADD COLUMN id BIGINT NOT NULL AUTO_INCREMENT FIRST,
  ADD PRIMARY KEY (id);

-- 사용자·언어별 최신 1건 조회용 인덱스
CREATE INDEX idx_ai_work_summary_cache_user_lang_created
  ON ai_work_summary_cache (user_id, lang, created_at DESC);
