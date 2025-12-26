-- 마이그레이션: 011_create_po_package_info
-- 설명: 포장 정보 테이블 생성
-- 날짜: 2024-12-24

CREATE TABLE IF NOT EXISTS package_info (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '포장 정보 ID',
  delivery_set_id INT NOT NULL COMMENT '배송 세트 ID (FK)',
  
  -- 포장 정보
  types VARCHAR(100) NULL COMMENT '종류',
  pieces VARCHAR(50) NULL COMMENT '개수',
  sets VARCHAR(50) NULL COMMENT '세트 수',
  total VARCHAR(50) NULL COMMENT '합계',
  method ENUM('박스', '마대') NOT NULL DEFAULT '박스' COMMENT '포장 방법',
  weight VARCHAR(50) NULL COMMENT '무게',
  
  -- 표시 순서
  display_order INT NOT NULL DEFAULT 0 COMMENT '표시 순서',
  
  -- 메타데이터
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  
  -- 외래키 제약조건
  FOREIGN KEY (delivery_set_id) REFERENCES delivery_sets(id) ON DELETE CASCADE,
  
  -- 인덱스
  INDEX idx_delivery_set_id (delivery_set_id),
  INDEX idx_display_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='포장 정보 테이블';

