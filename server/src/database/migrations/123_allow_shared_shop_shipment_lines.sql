-- 마이그레이션: 123_allow_shared_shop_shipment_lines
-- 설명: 배송 묶음(batch) 단위로 주문건을 공유하고, 여러 송장번호가 동일 주문건을 참조
-- 날짜: 2026-06-14

CREATE TABLE IF NOT EXISTS kr_shop_shipment_batch_lines (
  id VARCHAR(36) NOT NULL PRIMARY KEY COMMENT '배송 묶음-주문건 연결 ID',
  batch_id VARCHAR(36) NOT NULL COMMENT '등록 묶음 ID',
  shop_order_id VARCHAR(36) NOT NULL COMMENT '주문 ID',
  line_id VARCHAR(36) NOT NULL COMMENT '주문 라인 ID',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_shop_shipment_batch_line (line_id),
  INDEX idx_shop_shipment_batch_id (batch_id),
  CONSTRAINT fk_shop_shipment_batch_lines_batch
    FOREIGN KEY (batch_id) REFERENCES kr_shop_shipment_batches(id) ON DELETE CASCADE,
  CONSTRAINT fk_shop_shipment_batch_lines_order
    FOREIGN KEY (shop_order_id) REFERENCES kr_shop_orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_shop_shipment_batch_lines_line
    FOREIGN KEY (line_id) REFERENCES kr_shop_order_lines(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO kr_shop_shipment_batch_lines (id, batch_id, shop_order_id, line_id)
SELECT
  sl.id,
  s.batch_id,
  sl.shop_order_id,
  sl.line_id
FROM kr_shop_shipment_lines sl
INNER JOIN kr_shop_shipments s ON s.id = sl.shipment_id
WHERE NOT EXISTS (
  SELECT 1 FROM kr_shop_shipment_batch_lines bl WHERE bl.line_id = sl.line_id
);
