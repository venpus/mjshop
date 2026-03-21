-- 일정: 물류발송 / 한국도착 예정 유형 및 짝(pair) 필드
ALTER TABLE schedule_events
  MODIFY COLUMN kind ENUM(
    'production',
    'shipment',
    'other',
    'logistics_dispatch',
    'korea_arrival_expected'
  ) NOT NULL;

ALTER TABLE schedule_events
  ADD COLUMN pair_id VARCHAR(36) NULL COMMENT '물류발송-한국도착예정 짝 UUID' AFTER purchase_order_id,
  ADD COLUMN transit_days INT NULL COMMENT '물류발송 배송 소요일(달력일), 도착일=종료일+N' AFTER pair_id,
  ADD INDEX idx_schedule_pair_id (pair_id);
