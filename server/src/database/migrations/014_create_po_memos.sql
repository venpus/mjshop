-- 마이그레이션: 014_create_po_memos
-- 설명: 발주 메모 테이블 생성
-- 날짜: 2024-12-24

CREATE TABLE IF NOT EXISTS po_memos (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '메모 ID',
  purchase_order_id VARCHAR(50) NOT NULL COMMENT '발주 ID (FK)',
  
  -- 메모 정보
  content TEXT NOT NULL COMMENT '메모 내용',
  user_id VARCHAR(50) NOT NULL COMMENT '작성자 ID',
  
  -- 메타데이터
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  
  -- 외래키 제약조건
  FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
  
  -- 인덱스 (최신순 조회 최적화)
  INDEX idx_po_id_created (purchase_order_id, created_at DESC),
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='발주 메모 테이블';

