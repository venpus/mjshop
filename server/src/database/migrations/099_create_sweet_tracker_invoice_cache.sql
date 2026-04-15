-- 마이그레이션: 099_create_sweet_tracker_invoice_cache
-- 설명: 스위트트래커 대량 조회용 운송장 스냅샷 캐시 (배송완료 시 API 생략)
-- 날짜: 2026-04-15

CREATE TABLE IF NOT EXISTS sweet_tracker_invoice_cache (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  t_code VARCHAR(20) NOT NULL COMMENT '택배사 코드',
  invoice_no VARCHAR(120) NOT NULL COMMENT '운송장 번호',
  is_delivery_complete TINYINT(1) NOT NULL DEFAULT 0 COMMENT '배송완료 여부',
  item_name VARCHAR(500) NULL COMMENT '상품명 스냅샷',
  receiver_name VARCHAR(255) NULL COMMENT '수령인 스냅샷',
  sender_name VARCHAR(255) NULL COMMENT '발송인 스냅샷',
  level_code SMALLINT NULL COMMENT '스마트택배 level',
  last_kind VARCHAR(255) NULL COMMENT '마지막 추적 단계 종류',
  last_where VARCHAR(500) NULL COMMENT '마지막 위치',
  last_time_string VARCHAR(100) NULL COMMENT '마지막 시각 문자열',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_t_code_invoice (t_code, invoice_no),
  KEY idx_t_code (t_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='스위트트래커 운송장 조회 캐시';
