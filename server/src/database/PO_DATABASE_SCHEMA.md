# 발주 관리 데이터베이스 스키마 (최적화 버전)

## 개요

발주 관리 시스템을 위한 최적화된 데이터베이스 스키마입니다. 데이터 정규화, 계산 필드 제거, 이미지 통합 관리 등의 최적화가 적용되었습니다.

## 테이블 구조

### 1. 메인 테이블

#### `purchase_orders` - 발주 메인 테이블
- **주요 최적화 포인트:**
  - `supplier_id`, `product_id` 외래키로 정규화 (문자열 중복 제거)
  - 계산 필드(`amount`, `work_status`, `factory_status`) 제거 → VIEW로 제공
  - 스냅샷 필드(`size`, `weight`)로 발주 시점 정보 보존
  - 선금/잔금 실제 지불액만 저장 (계산값은 VIEW에서 제공)

**주요 필드:**
- `id`: 발주 ID (PK)
- `po_number`: 발주번호 (UNIQUE)
- `supplier_id`: 공급업체 ID (FK → suppliers.id)
- `product_id`: 상품 ID (FK → products.id)
- `unit_price`: 단가
- `back_margin`: 백마진
- `order_unit_price`: 발주단가
- `expected_final_unit_price`: 예상최종 단가
- `quantity`: 수량
- `size`, `weight`, `packaging`: 스냅샷 필드
- `delivery_status`, `payment_status`: 상태 필드
- `work_start_date`, `work_end_date`: 작업 일정
- `advance_payment_amount`, `balance_payment_amount`: 실제 지불액

### 2. 공장 출고 관련

#### `factory_shipments` - 공장 출고
- 발주별 출고 이력 관리
- `purchase_order_id`로 연결 (CASCADE 삭제)

#### `return_exchanges` - 반품/교환
- 발주별 반품/교환 이력 관리
- `purchase_order_id`로 연결 (CASCADE 삭제)

### 3. 작업 관련

#### `work_items` - 가공/포장 작업 항목
- 작업 항목별 이미지, 설명, 완료 여부 관리
- `purchase_order_id`로 연결 (CASCADE 삭제)

### 4. 비용 관련

#### `po_cost_items` - 비용 항목 (옵션/인건비 통합)
- **최적화 포인트:** 옵션과 인건비를 단일 테이블로 통합
- `item_type`으로 구분 ('option' | 'labor')
- `purchase_order_id`로 연결 (CASCADE 삭제)

### 5. 배송 관련

#### `delivery_sets` - 배송 세트
- 포장 코드, 포장일 관리
- `purchase_order_id`로 연결 (CASCADE 삭제)

#### `package_info` - 포장 정보
- 배송 세트별 포장 상세 정보
- `delivery_set_id`로 연결 (CASCADE 삭제)

#### `logistics_info` - 물류 정보
- 배송 세트별 물류 정보 (운송장 번호, 물류 회사)
- `delivery_set_id`로 연결 (CASCADE 삭제)

### 6. 이미지 관리

#### `po_images` - 발주 이미지 통합 관리
- **최적화 포인트:** 모든 발주 관련 이미지를 단일 테이블로 통합
- `image_type`으로 구분 (factory_shipment, return_exchange, work_item, logistics, other)
- `related_id`로 관련 테이블 ID 참조
- `purchase_order_id`로 연결 (CASCADE 삭제)

### 7. 메모 관련

#### `po_memos` - 발주 메모
- 발주별 메모 관리
- `purchase_order_id`로 연결 (CASCADE 삭제)
- 최신순 조회를 위한 인덱스 최적화

#### `po_memo_replies` - 메모 댓글
- 메모별 댓글 관리
- `memo_id`로 연결 (CASCADE 삭제)

## VIEW (계산 필드 제공)

### `purchase_order_totals`
- 발주 총액 관련 계산 필드 제공
- `subtotal`, `basic_cost_total`, `commission_amount`
- `total_option_cost`, `total_labor_cost`
- `shipping_cost_total`, `final_payment_amount`
- `expected_final_unit_price`
- `calculated_advance_payment_amount`, `calculated_balance_payment_amount`

### `purchase_order_work_status`
- 작업 상태 자동 계산
- `work_status`: '작업대기' | '작업중' | '완료'
- 작업 항목 통계

### `purchase_order_factory_status`
- 공장 출고 상태 자동 계산
- `factory_status`: '출고대기' | '배송중' | '수령완료'
- 출고/반품 수량 집계

## 주요 최적화 사항

### 1. 데이터 정규화
- ✅ `supplier_id`, `product_id` 외래키 사용
- ✅ 중복 문자열 데이터 제거
- ✅ 스냅샷 필드로 발주 시점 정보 보존

### 2. 계산 필드 제거
- ✅ `amount`, `work_status`, `factory_status` 제거
- ✅ VIEW로 계산값 제공
- ✅ 실제 지불액만 저장 (일관성 보장)

### 3. 이미지 관리 통합
- ✅ 단일 `po_images` 테이블로 통합
- ✅ `image_type`으로 구분
- ✅ 중복 저장 방지

### 4. 비용 항목 통합
- ✅ 옵션/인건비 단일 테이블 관리
- ✅ `item_type`으로 구분

### 5. 인덱스 최적화
- ✅ 검색 성능 향상 (po_number, supplier_id, product_id)
- ✅ 조인 성능 향상 (외래키 인덱스)
- ✅ 정렬 성능 향상 (created_at DESC)

### 6. CASCADE 삭제
- ✅ 데이터 무결성 보장
- ✅ 관련 데이터 자동 정리

## 테이블 관계도

```
suppliers (1) ──< (N) purchase_orders (1) ──< (N) factory_shipments
products (1) ──<                          ──< (N) return_exchanges
                                          ──< (N) work_items
                                          ──< (N) po_cost_items
                                          ──< (N) delivery_sets (1) ──< (N) package_info
                                          ──< (N) po_images                                    ──< (N) logistics_info
                                          ──< (N) po_memos (1) ──< (N) po_memo_replies
```

## 마이그레이션 파일 목록

1. `005_create_purchase_orders.sql` - 발주 메인 테이블
2. `006_create_po_factory_shipments.sql` - 공장 출고
3. `007_create_po_return_exchanges.sql` - 반품/교환
4. `008_create_po_work_items.sql` - 작업 항목
5. `009_create_po_cost_items.sql` - 비용 항목
6. `010_create_po_delivery_sets.sql` - 배송 세트
7. `011_create_po_package_info.sql` - 포장 정보
8. `012_create_po_logistics_info.sql` - 물류 정보
9. `013_create_po_images.sql` - 이미지 통합 관리
10. `014_create_po_memos.sql` - 메모
11. `015_create_po_memo_replies.sql` - 메모 댓글
12. `016_create_po_views.sql` - 계산 필드 VIEW

## 사용 예시

### 발주 목록 조회 (계산 필드 포함)
```sql
SELECT 
  po.*,
  pot.final_payment_amount,
  pot.expected_final_unit_price,
  pos.work_status,
  pfs.factory_status
FROM purchase_orders po
LEFT JOIN purchase_order_totals pot ON po.id = pot.id
LEFT JOIN purchase_order_work_status pos ON po.id = pos.id
LEFT JOIN purchase_order_factory_status pfs ON po.id = pfs.id;
```

### 발주 상세 조회 (모든 관련 데이터)
```sql
SELECT 
  po.*,
  s.name AS supplier_name,
  p.name AS product_name,
  p.main_image AS product_image,
  pot.*,
  pos.work_status,
  pfs.factory_status
FROM purchase_orders po
JOIN suppliers s ON po.supplier_id = s.id
JOIN products p ON po.product_id = p.id
LEFT JOIN purchase_order_totals pot ON po.id = pot.id
LEFT JOIN purchase_order_work_status pos ON po.id = pos.id
LEFT JOIN purchase_order_factory_status pfs ON po.id = pfs.id
WHERE po.id = ?;
```

