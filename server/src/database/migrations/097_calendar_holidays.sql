-- 일정 달력용 수동 공휴일 (국가 구분 없음, 날짜당 1건)
CREATE TABLE IF NOT EXISTS calendar_holidays (
  id VARCHAR(36) NOT NULL PRIMARY KEY,
  holiday_date DATE NOT NULL COMMENT '공휴일 날짜',
  title VARCHAR(200) NOT NULL DEFAULT '' COMMENT '표시용 이름',
  created_by VARCHAR(64) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_calendar_holidays_date (holiday_date),
  INDEX idx_calendar_holidays_range (holiday_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='달력 공휴일(수동)';
