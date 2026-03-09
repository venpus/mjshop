-- 마이그레이션: 074_create_product_collab_tasks
-- 설명: product_collab_tasks 테이블이 없는 경우 생성 (073이 일부만 적용된 DB 보정)
-- 날짜: 2025-03-08

CREATE TABLE IF NOT EXISTS product_collab_tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  message_id INT NOT NULL COMMENT '멘션된 메시지',
  assignee_id VARCHAR(50) NOT NULL COMMENT '담당자(멘션된 사용자)',
  completed_at DATETIME NULL COMMENT '완료 시각',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES product_collab_products(id) ON DELETE CASCADE,
  FOREIGN KEY (message_id) REFERENCES product_collab_messages(id) ON DELETE CASCADE,
  INDEX idx_assignee (assignee_id),
  INDEX idx_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='제품 개발 협업 - @멘션 업무';
