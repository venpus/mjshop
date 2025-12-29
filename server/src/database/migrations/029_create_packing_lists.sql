-- 마이그레이션: 029_create_packing_lists
-- 설명: 패킹리스트 메인 테이블 생성
-- 날짜: 2024-12-24

CREATE TABLE IF NOT EXISTS packing_lists (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '패킹리스트 ID',
  code VARCHAR(50) NOT NULL UNIQUE COMMENT '패킹리스트 코드',
  shipment_date DATE NOT NULL COMMENT '발송일',
  
  -- 물류 정보
  logistics_company VARCHAR(100) NULL COMMENT '물류회사 (위해-한사장, 광저우-비전, 위해-비전, 정상해운)',
  warehouse_arrival_date DATE NULL COMMENT '물류창고 도착일',
  
  -- 중량 정보
  actual_weight DECIMAL(10, 2) NULL COMMENT '실중량 (kg)',
  weight_ratio DECIMAL(5, 2) NULL COMMENT '비율 (%, 5, 10, 15, 20)',
  calculated_weight DECIMAL(10, 2) NULL COMMENT '중량 (실중량 x (1+비율))',
  
  -- 배송비
  shipping_cost DECIMAL(12, 2) NOT NULL DEFAULT 0 COMMENT '배송비 (¥)',
  
  -- 결제 정보
  payment_date DATE NULL COMMENT '지급일',
  wk_payment_date DATE NULL COMMENT 'WK결제일',
  
  -- 메타데이터
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  created_by VARCHAR(50) NULL COMMENT '생성자 ID',
  updated_by VARCHAR(50) NULL COMMENT '수정자 ID',
  
  -- 인덱스
  INDEX idx_code (code),
  INDEX idx_shipment_date (shipment_date),
  INDEX idx_logistics_company (logistics_company),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='패킹리스트 메인 테이블';

