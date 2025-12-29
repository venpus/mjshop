-- 마이그레이션: 033_create_packing_list_korea_arrivals
-- 설명: 패킹리스트 한국도착일 테이블 생성 (제품별 저장)
-- 날짜: 2024-12-24

CREATE TABLE IF NOT EXISTS packing_list_korea_arrivals (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '한국도착 ID',
  packing_list_item_id INT NOT NULL COMMENT '패킹리스트 아이템 ID (FK)',
  arrival_date DATE NOT NULL COMMENT '한국도착일',
  quantity INT NOT NULL COMMENT '도착 수량',
  
  -- 메타데이터
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  
  -- 외래키 제약조건
  FOREIGN KEY (packing_list_item_id) REFERENCES packing_list_items(id) ON DELETE CASCADE,
  
  -- 인덱스
  INDEX idx_packing_list_item_id (packing_list_item_id),
  INDEX idx_arrival_date (arrival_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='패킹리스트 한국도착일 테이블';

