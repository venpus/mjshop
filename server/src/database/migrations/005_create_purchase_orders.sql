-- 마이그레이션: 005_create_purchase_orders
-- 설명: 발주 관리 메인 테이블 생성 (최적화 버전)
-- 날짜: 2024-12-24

CREATE TABLE IF NOT EXISTS purchase_orders (
  id VARCHAR(50) PRIMARY KEY COMMENT '발주 ID',
  po_number VARCHAR(50) NOT NULL UNIQUE COMMENT '발주번호 (예: PO-001)',
  
  -- 외래키 관계 (정규화)
  supplier_id INT NOT NULL COMMENT '공급업체 ID (FK)',
  product_id VARCHAR(50) NOT NULL COMMENT '상품 ID (FK)',
  
  -- 발주 기본 정보
  unit_price DECIMAL(10, 2) NOT NULL COMMENT '단가 (¥)',
  back_margin DECIMAL(10, 2) NULL COMMENT '백마진 (¥)',
  order_unit_price DECIMAL(10, 2) NULL COMMENT '발주단가 (¥)',
  expected_final_unit_price DECIMAL(10, 2) NULL COMMENT '예상최종 단가 (¥)',
  quantity INT NOT NULL COMMENT '수량',
  
  -- 스냅샷 필드 (발주 시점의 상품 정보 보존)
  size VARCHAR(100) NULL COMMENT '크기 (발주 시점 스냅샷)',
  weight VARCHAR(50) NULL COMMENT '무게 (발주 시점 스냅샷)',
  packaging INT NULL COMMENT '소포장 개수',
  
  -- 상태 필드 (자동 계산 가능한 것은 제거, 필요한 것만 저장)
  delivery_status ENUM('대기중', '내륙운송중', '항공운송중', '해운운송중', '통관및 배달', '한국도착') NOT NULL DEFAULT '대기중' COMMENT '배송 상태',
  payment_status ENUM('미결제', '선금결제', '완료') NOT NULL DEFAULT '미결제' COMMENT '결제 상태',
  is_confirmed BOOLEAN NOT NULL DEFAULT FALSE COMMENT '발주 컨펌 여부',
  
  -- 날짜 필드
  order_date DATE NULL COMMENT '발주일',
  estimated_delivery DATE NULL COMMENT '예상 배송일',
  estimated_shipment_date DATE NULL COMMENT '예상 출고일',
  work_start_date DATE NULL COMMENT '작업 시작일',
  work_end_date DATE NULL COMMENT '작업 완료일',
  
  -- 비용 필드
  shipping_cost DECIMAL(10, 2) NOT NULL DEFAULT 0 COMMENT '운송비',
  warehouse_shipping_cost DECIMAL(10, 2) NOT NULL DEFAULT 0 COMMENT '창고 운송비',
  commission_rate DECIMAL(5, 2) NOT NULL DEFAULT 0 COMMENT '수수료율 (%)',
  commission_type VARCHAR(255) NULL COMMENT '수수료 유형',
  
  -- 선금/잔금 (계산값이지만 결제 이력 보존을 위해 저장)
  advance_payment_rate INT NOT NULL DEFAULT 50 COMMENT '선금 지불 비율 (%)',
  advance_payment_amount DECIMAL(10, 2) NULL COMMENT '선금 금액 (실제 지불액)',
  advance_payment_date DATE NULL COMMENT '선금 지불일',
  balance_payment_amount DECIMAL(10, 2) NULL COMMENT '잔금 금액 (실제 지불액)',
  balance_payment_date DATE NULL COMMENT '잔금 지불일',
  
  -- 메타데이터
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  created_by VARCHAR(50) NULL COMMENT '생성자 ID',
  updated_by VARCHAR(50) NULL COMMENT '수정자 ID',
  
  -- 외래키 제약조건
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  
  -- 인덱스
  INDEX idx_po_number (po_number),
  INDEX idx_supplier_id (supplier_id),
  INDEX idx_product_id (product_id),
  INDEX idx_order_date (order_date),
  INDEX idx_delivery_status (delivery_status),
  INDEX idx_payment_status (payment_status),
  INDEX idx_is_confirmed (is_confirmed),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='발주 관리 메인 테이블';

