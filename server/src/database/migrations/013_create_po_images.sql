-- 마이그레이션: 013_create_po_images
-- 설명: 발주 이미지 통합 관리 테이블 생성
-- 날짜: 2024-12-24

CREATE TABLE IF NOT EXISTS po_images (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '이미지 ID',
  purchase_order_id VARCHAR(50) NOT NULL COMMENT '발주 ID (FK)',
  
  -- 이미지 정보
  image_type ENUM('factory_shipment', 'return_exchange', 'work_item', 'logistics', 'other') NOT NULL COMMENT '이미지 유형',
  related_id INT NOT NULL COMMENT '관련 테이블 ID (factory_shipments.id, work_items.id, logistics_info.id 등)',
  image_url VARCHAR(500) NOT NULL COMMENT '이미지 경로',
  
  -- 표시 순서
  display_order INT NOT NULL DEFAULT 0 COMMENT '표시 순서',
  
  -- 메타데이터
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  
  -- 외래키 제약조건
  FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
  
  -- 인덱스 (이미지 타입별 조회 최적화)
  INDEX idx_po_image_type (purchase_order_id, image_type, related_id),
  INDEX idx_image_type (image_type),
  INDEX idx_display_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='발주 이미지 통합 관리 테이블';

