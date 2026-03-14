-- 마이그레이션: 083_create_manufacturing_documents
-- 설명: 제조관리 문서 및 공정 테이블 생성
-- 날짜: 2025-03-14

-- 제조 문서 (발주 연결 optional, 발주 없이도 생성 가능)
CREATE TABLE IF NOT EXISTS manufacturing_documents (
  id VARCHAR(50) NOT NULL PRIMARY KEY COMMENT '제조 문서 ID (UUID)',
  purchase_order_id VARCHAR(50) NULL COMMENT '연결된 발주 ID (FK, nullable)',
  product_name VARCHAR(500) NOT NULL DEFAULT '' COMMENT '제품명 (한국어)',
  product_name_zh VARCHAR(500) NULL DEFAULT NULL COMMENT '제품명 (중국어, 번역/수정)',
  product_image VARCHAR(500) NULL DEFAULT NULL COMMENT '제품 사진 URL',
  quantity INT NOT NULL DEFAULT 0 COMMENT '수량',
  finished_product_image VARCHAR(500) NULL DEFAULT NULL COMMENT '완성품 사진 URL',
  small_pack_count INT NULL DEFAULT NULL COMMENT '소포장 개수',
  quantity_per_box INT NULL DEFAULT NULL COMMENT '한 박스 입수량',
  packing_list_code VARCHAR(100) NULL DEFAULT NULL COMMENT '패킹리스트 코드',
  barcode VARCHAR(200) NULL DEFAULT NULL COMMENT '바코드',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by VARCHAR(100) NULL DEFAULT NULL,
  updated_by VARCHAR(100) NULL DEFAULT NULL,
  INDEX idx_manufacturing_po (purchase_order_id),
  INDEX idx_manufacturing_created (created_at),
  CONSTRAINT fk_manufacturing_po FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='제조 문서';

-- 제조 공정 단계
CREATE TABLE IF NOT EXISTS manufacturing_process_steps (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '공정 ID',
  manufacturing_document_id VARCHAR(50) NOT NULL COMMENT '제조 문서 ID (FK)',
  display_order INT NOT NULL DEFAULT 0 COMMENT '표시 순서',
  process_name VARCHAR(500) NOT NULL DEFAULT '' COMMENT '공정명 (한국어)',
  process_name_zh VARCHAR(500) NULL DEFAULT NULL COMMENT '공정명 (중국어)',
  work_method TEXT NULL COMMENT '작업 방법 (한국어)',
  work_method_zh TEXT NULL COMMENT '작업 방법 (중국어)',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_mfg_steps_doc (manufacturing_document_id),
  CONSTRAINT fk_mfg_steps_doc FOREIGN KEY (manufacturing_document_id) REFERENCES manufacturing_documents(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='제조 공정 단계';

-- 공정별 사진 예시
CREATE TABLE IF NOT EXISTS manufacturing_step_images (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '이미지 ID',
  manufacturing_process_step_id INT NOT NULL COMMENT '공정 단계 ID (FK)',
  image_url VARCHAR(500) NOT NULL COMMENT '이미지 경로',
  display_order INT NOT NULL DEFAULT 0 COMMENT '표시 순서',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_mfg_step_images_step (manufacturing_process_step_id),
  CONSTRAINT fk_mfg_step_images_step FOREIGN KEY (manufacturing_process_step_id) REFERENCES manufacturing_process_steps(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='제조 공정 사진 예시';
