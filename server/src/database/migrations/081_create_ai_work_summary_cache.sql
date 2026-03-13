-- 마이그레이션: 081_create_ai_work_summary_cache
-- 설명: AI 업무 요약 마지막 결과 캐시 (사용자·언어별 1건)
-- 날짜: 2025-03-08

CREATE TABLE IF NOT EXISTS ai_work_summary_cache (
  user_id VARCHAR(50) NOT NULL COMMENT '사용자 ID',
  lang VARCHAR(10) NOT NULL COMMENT '언어: ko | zh',
  result JSON NOT NULL COMMENT '요약 결과 JSON',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, lang)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI 업무 요약 마지막 캐시';
