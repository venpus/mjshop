-- 마이그레이션: 030_create_packing_list_items
-- 설명: 패킹리스트 아이템 테이블 생성 (제품별 정보)
-- 날짜: 2024-12-24

CREATE TABLE IF NOT EXISTS packing_list_items (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '패킹리스트 아이템 ID',
  packing_list_id INT NOT NULL COMMENT '패킹리스트 ID (FK)',
  purchase_order_id VARCHAR(50) NULL COMMENT '발주 ID (FK, NULL 가능 - 나중에 연결)',
  
  -- 제품 정보
  product_name VARCHAR(255) NOT NULL COMMENT '제품명',
  product_image_url VARCHAR(500) NULL COMMENT '제품사진 URL',
  entry_quantity VARCHAR(100) NULL COMMENT '입수량 (예: "2종 x 5개 x 3세트")',
  box_count INT NOT NULL COMMENT '박스수',
  unit ENUM('박스', '마대') NOT NULL DEFAULT '박스' COMMENT '단위',
  total_quantity INT NOT NULL COMMENT '총수량 (입수량 결과 × 박스수)',
  
  -- 메타데이터
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  
  -- 외래키 제약조건
  FOREIGN KEY (packing_list_id) REFERENCES packing_lists(id) ON DELETE CASCADE,
  FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE SET NULL,
  
  -- 인덱스
  INDEX idx_packing_list_id (packing_list_id),
  INDEX idx_purchase_order_id (purchase_order_id),
  INDEX idx_product_name (product_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='패킹리스트 아이템 테이블';

