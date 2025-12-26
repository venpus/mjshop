-- 마이그레이션: 019_create_logistics_dropdown_options
-- 설명: 물류 드롭다운 옵션 테이블 생성 (내륙운송회사, 도착 창고)
-- 날짜: 2024-12-24

-- 내륙운송회사 테이블
CREATE TABLE IF NOT EXISTS inland_companies (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '내륙운송회사 ID',
  name VARCHAR(255) NOT NULL UNIQUE COMMENT '내륙운송회사명',
  display_order INT NOT NULL DEFAULT 0 COMMENT '표시 순서',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  
  INDEX idx_display_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='내륙운송회사 목록';

-- 도착 창고 테이블
CREATE TABLE IF NOT EXISTS warehouses (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '도착 창고 ID',
  name VARCHAR(255) NOT NULL UNIQUE COMMENT '도착 창고명',
  display_order INT NOT NULL DEFAULT 0 COMMENT '표시 순서',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  
  INDEX idx_display_order (display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='도착 창고 목록';

-- 내륙운송회사 초기 데이터 삽입
INSERT INTO inland_companies (name, display_order) VALUES
('壹米滴答', 1),
('顺心建达', 2),
('中通', 3),
('安能', 4),
('顺丰', 5)
ON DUPLICATE KEY UPDATE name = name; -- 중복 시 업데이트 없이 무시

-- 도착 창고 초기 데이터 삽입
INSERT INTO warehouses (name, display_order) VALUES
('위해-한사장(威海-韩彬)', 1),
('비전-광저우(白云)', 2),
('비전-위해(威海BNK)', 3),
('정상해운(正常海运)', 4)
ON DUPLICATE KEY UPDATE name = name; -- 중복 시 업데이트 없이 무시

