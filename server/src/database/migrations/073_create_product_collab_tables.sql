-- 마이그레이션: 073_create_product_collab_tables
-- 설명: 제품 개발 협업(Product Collaboration) 모듈 전용 테이블 (기존 시스템과 독립)
-- 날짜: 2025-03-08

-- 제품 단계 상태
-- REQUEST, RESEARCH, CANDIDATE_REVIEW, SAMPLE, MODEL_SELECT, SPEC_INPUT, ORDER_APPROVAL, ORDER_REGISTERED, COMPLETED
-- READY_FOR_ORDER = 모델선택+스펙입력 완료 후 발주 대기

CREATE TABLE IF NOT EXISTS product_collab_products (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '제품 ID',
  name VARCHAR(255) NOT NULL COMMENT '제품 이름',
  status VARCHAR(32) NOT NULL DEFAULT 'REQUEST' COMMENT '현재 단계',
  category VARCHAR(32) NULL COMMENT '카테고리: Plush / Goods / Figure',
  assignee_id VARCHAR(50) NULL COMMENT '담당자 ID',
  main_image_id INT NULL COMMENT '최종 선택 이미지 ID (product_collab_product_images.id)',
  price VARCHAR(100) NULL COMMENT '가격 (최종값만)',
  moq VARCHAR(100) NULL,
  lead_time VARCHAR(100) NULL,
  packaging VARCHAR(255) NULL,
  supplier VARCHAR(255) NULL,
  sku_count VARCHAR(100) NULL,
  last_activity_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '마지막 활동 시각',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by VARCHAR(50) NULL,
  updated_by VARCHAR(50) NULL,
  INDEX idx_status (status),
  INDEX idx_category (category),
  INDEX idx_assignee (assignee_id),
  INDEX idx_last_activity (last_activity_at DESC),
  INDEX idx_created_at (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='제품 개발 협업 - 제품';

CREATE TABLE IF NOT EXISTS product_collab_messages (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '메시지 ID',
  product_id INT NOT NULL COMMENT '제품 ID',
  parent_id INT NULL COMMENT '답글인 경우 부모 메시지 ID',
  author_id VARCHAR(50) NOT NULL COMMENT '작성자 ID',
  body TEXT NULL COMMENT '본문',
  tag VARCHAR(32) NULL COMMENT 'REQUEST, RESEARCH, CANDIDATE, SAMPLE, PRICE, DECISION, FINAL',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES product_collab_products(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES product_collab_messages(id) ON DELETE CASCADE,
  INDEX idx_product_created (product_id, created_at DESC),
  INDEX idx_parent (parent_id),
  INDEX idx_author (author_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='제품 개발 협업 - 스레드 메시지';

CREATE TABLE IF NOT EXISTS product_collab_attachments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  message_id INT NOT NULL,
  kind VARCHAR(16) NOT NULL COMMENT 'image / file',
  url VARCHAR(512) NOT NULL COMMENT '저장 경로 또는 URL',
  display_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (message_id) REFERENCES product_collab_messages(id) ON DELETE CASCADE,
  INDEX idx_message (message_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='제품 개발 협업 - 첨부(이미지/파일)';

CREATE TABLE IF NOT EXISTS product_collab_mentions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  message_id INT NOT NULL,
  user_id VARCHAR(50) NOT NULL COMMENT '멘션된 사용자 ID',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (message_id) REFERENCES product_collab_messages(id) ON DELETE CASCADE,
  UNIQUE KEY uk_message_user (message_id, user_id),
  INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='제품 개발 협업 - @멘션';

CREATE TABLE IF NOT EXISTS product_collab_product_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  image_url VARCHAR(512) NOT NULL,
  kind VARCHAR(16) NOT NULL DEFAULT 'candidate' COMMENT 'candidate / final',
  display_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(50) NULL,
  FOREIGN KEY (product_id) REFERENCES product_collab_products(id) ON DELETE CASCADE,
  INDEX idx_product_kind (product_id, kind)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='제품 개발 협업 - 제품 이미지(후보/최종)';

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

ALTER TABLE product_collab_products
  ADD CONSTRAINT fk_pc_product_main_image
  FOREIGN KEY (main_image_id) REFERENCES product_collab_product_images(id) ON DELETE SET NULL;
