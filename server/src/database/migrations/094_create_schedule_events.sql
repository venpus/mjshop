-- 일정관리(A레벨) 일정 저장
CREATE TABLE IF NOT EXISTS schedule_events (
  id VARCHAR(64) NOT NULL PRIMARY KEY COMMENT '클라이언트 또는 서버 생성 ID',
  title VARCHAR(500) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  kind ENUM('production', 'shipment', 'other') NOT NULL,
  note TEXT NULL,
  created_by VARCHAR(64) NULL COMMENT '관리자 ID',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_schedule_overlap (start_date, end_date),
  INDEX idx_schedule_created_by (created_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='일정관리 일정';
