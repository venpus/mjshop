-- 마이그레이션: 060_sync_product_main_image_from_purchase_orders
-- 설명: 기존 발주 데이터의 product_main_image를 products 테이블의 main_image로 동기화
-- 날짜: 2024-12-24
-- 목적: 발주 메인이미지 변경 시 products 테이블도 함께 업데이트하도록 수정한 후,
--       기존에 이미 변경된 발주 데이터를 products 테이블에 반영
-- 
-- MySQL 8.0 이상 버전용 (ROW_NUMBER() 사용)
-- MySQL 5.7 이하 버전을 사용하는 경우 아래 주석 처리된 쿼리를 사용하세요

-- 방법 1: MySQL 8.0+ (ROW_NUMBER() 사용)
UPDATE products p
INNER JOIN (
    SELECT 
        po.product_id,
        po.product_main_image,
        ROW_NUMBER() OVER (
            PARTITION BY po.product_id 
            ORDER BY po.updated_at DESC, po.created_at DESC
        ) AS rn
    FROM purchase_orders po
    WHERE po.product_id IS NOT NULL
      AND po.product_main_image IS NOT NULL
      AND po.product_main_image != ''
) latest_po ON p.id = latest_po.product_id AND latest_po.rn = 1
SET p.main_image = latest_po.product_main_image,
    p.updated_at = NOW()
WHERE p.main_image IS NULL 
   OR p.main_image != latest_po.product_main_image;

-- 방법 2: MySQL 5.7 이하 버전용 (서브쿼리 사용)
-- UPDATE products p
-- INNER JOIN (
--     SELECT 
--         po1.product_id,
--         po1.product_main_image
--     FROM purchase_orders po1
--     INNER JOIN (
--         SELECT 
--             product_id,
--             MAX(updated_at) AS max_updated_at
--         FROM purchase_orders
--         WHERE product_id IS NOT NULL
--           AND product_main_image IS NOT NULL
--           AND product_main_image != ''
--         GROUP BY product_id
--     ) latest ON po1.product_id = latest.product_id 
--              AND po1.updated_at = latest.max_updated_at
--     WHERE po1.product_id IS NOT NULL
--       AND po1.product_main_image IS NOT NULL
--       AND po1.product_main_image != ''
--     GROUP BY po1.product_id, po1.product_main_image
-- ) latest_po ON p.id = latest_po.product_id
-- SET p.main_image = latest_po.product_main_image,
--     p.updated_at = NOW()
-- WHERE p.main_image IS NULL 
--    OR p.main_image != latest_po.product_main_image;

