-- 일정 ↔ 발주 연결 (생산중/출고예정 연동)
ALTER TABLE schedule_events
  ADD COLUMN purchase_order_id VARCHAR(50) NULL COMMENT '발주 ID (FK purchase_orders.id)' AFTER note,
  ADD INDEX idx_schedule_purchase_order (purchase_order_id);
