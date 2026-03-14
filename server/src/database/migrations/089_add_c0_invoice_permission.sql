-- 마이그레이션: 089_add_c0_invoice_permission
-- 설명: C0 레벨 관리자에게 정상 인보이스(invoice) 리소스 접근 권한 부여
-- 날짜: 2025-03-14

-- C0 레벨 관리자에게 invoice 리소스에 대한 읽기/쓰기/삭제 권한 부여
INSERT INTO permission_settings (resource, level, can_read, can_write, can_delete)
VALUES ('invoice', 'C0: 한국Admin', 1, 1, 1)
ON DUPLICATE KEY UPDATE
  can_read = 1,
  can_write = 1,
  can_delete = 1,
  updated_at = CURRENT_TIMESTAMP;
