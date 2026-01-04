-- 마이그레이션: 057_add_c0_payment_history_permission
-- 설명: C0 레벨 관리자에게 결제내역 읽기 권한 부여
-- 날짜: 2024-12-24

-- C0 레벨 관리자에게 payment-history 리소스에 대한 읽기 권한 부여
INSERT INTO permission_settings (resource, level, can_read, can_write, can_delete)
VALUES ('payment-history', 'C0: 한국Admin', 1, 0, 0)
ON DUPLICATE KEY UPDATE
  can_read = 1,
  updated_at = CURRENT_TIMESTAMP;

