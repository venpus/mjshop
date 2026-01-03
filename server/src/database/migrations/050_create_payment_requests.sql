-- 마이그레이션: 050_create_payment_requests
-- 설명: 지급요청 테이블 생성
-- 날짜: 2025-01-02

CREATE TABLE IF NOT EXISTS payment_requests (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '지급요청 ID',
  request_number VARCHAR(50) NOT NULL UNIQUE COMMENT '지급요청 번호 (예: PR-2024-001)',
  
  -- 출처 정보
  source_type ENUM('purchase_order', 'packing_list') NOT NULL COMMENT '출처 타입',
  source_id VARCHAR(50) NOT NULL COMMENT '출처 ID (발주번호 또는 패킹리스트 ID)',
  payment_type ENUM('advance', 'balance', 'shipping') NOT NULL COMMENT '지급 유형 (선금/잔금/배송비)',
  
  -- 금액 및 상태
  amount DECIMAL(12, 2) NOT NULL COMMENT '지급 요청 금액 (¥)',
  status ENUM('요청중', '완료') NOT NULL DEFAULT '요청중' COMMENT '상태',
  
  -- 날짜 정보
  request_date DATE NOT NULL COMMENT '요청일',
  payment_date DATE NULL COMMENT '실제 지급일',
  
  -- 사용자 정보
  requested_by VARCHAR(50) NULL COMMENT '요청자 ID',
  completed_by VARCHAR(50) NULL COMMENT '지급완료 처리자 ID',
  
  -- 비고
  memo TEXT NULL COMMENT '비고',
  
  -- 메타데이터
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  
  -- 인덱스
  INDEX idx_request_number (request_number),
  INDEX idx_source_type (source_type),
  INDEX idx_source_id (source_id),
  INDEX idx_payment_type (payment_type),
  INDEX idx_status (status),
  INDEX idx_request_date (request_date),
  INDEX idx_payment_date (payment_date),
  INDEX idx_requested_by (requested_by),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='지급요청 테이블';

