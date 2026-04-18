-- 마이그레이션: 101_create_product_collab_thread_views
-- 설명: 제품 개발 협업 스레드 페이지 조회(읽음) 커서 — 사용자×제품별 마지막으로 본 메시지 시각
-- 날짜: 2026-04-18

CREATE TABLE IF NOT EXISTS product_collab_thread_views (
  user_id VARCHAR(50) NOT NULL COMMENT '관리자 ID',
  product_id INT NOT NULL COMMENT '제품 ID',
  last_seen_message_created_at DATETIME(6) NOT NULL COMMENT '해당 제품 스레드에서 조회 시점까지 본 메시지·답글 중 최대 created_at',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, product_id),
  CONSTRAINT fk_pc_thread_views_product FOREIGN KEY (product_id) REFERENCES product_collab_products(id) ON DELETE CASCADE,
  INDEX idx_pc_thread_views_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='제품 협업 스레드 읽음 커서';
