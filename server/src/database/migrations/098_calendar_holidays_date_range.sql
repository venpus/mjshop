-- 공휴일: 단일일 → 시작/종료 기간, 날짜당 중복 허용(유니크 제거)
ALTER TABLE calendar_holidays
  ADD COLUMN start_date DATE NULL AFTER id,
  ADD COLUMN end_date DATE NULL AFTER start_date;

UPDATE calendar_holidays SET start_date = holiday_date, end_date = holiday_date WHERE holiday_date IS NOT NULL;

ALTER TABLE calendar_holidays
  MODIFY start_date DATE NOT NULL,
  MODIFY end_date DATE NOT NULL;

ALTER TABLE calendar_holidays DROP INDEX uk_calendar_holidays_date;

ALTER TABLE calendar_holidays DROP COLUMN holiday_date;

ALTER TABLE calendar_holidays ADD INDEX idx_calendar_holidays_overlap (start_date, end_date);
