-- 마이그레이션: 126_create_kr_shop_sales_settlement_ledger
-- 설명: 판매금 정산 WK/인벤티오 정산 장부
-- 날짜: 2026-06-16

CREATE TABLE IF NOT EXISTS kr_shop_sales_settlement_ledger (
  id VARCHAR(36) NOT NULL PRIMARY KEY COMMENT '장부 항목 ID',
  partner ENUM('wk', 'inventio') NOT NULL COMMENT '정산 파트너',
  settlement_date DATE NOT NULL COMMENT '정산일',
  amount INT NOT NULL COMMENT '정산금액(KRW)',
  note VARCHAR(255) NULL COMMENT '메모',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_partner_settlement_date (partner, settlement_date DESC, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
