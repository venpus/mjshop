export type DeliveryStatus = '대기중' | '배송중' | '내륙운송중' | '항공운송중' | '해운운송중' | '통관및 배달' | '한국도착';
export type PaymentStatus = '미결제' | '선금결제' | '완료';
export type OrderStatus = '발주확인' | '발주 대기' | '취소됨';

export interface PurchaseOrder {
  id: string;
  po_number: string;
  product_id: string | null; // NULL 허용 (더 이상 필수 아님)
  unit_price: number;
  back_margin: number | null;
  order_unit_price: number | null;
  expected_final_unit_price: number | null;
  quantity: number;
  size: string | null;
  weight: string | null;
  packaging: number | null;
  // 상품 정보 필드 (독립적으로 저장)
  product_name: string;
  product_name_chinese: string | null;
  product_category: string;
  product_main_image: string | null;
  product_size: string | null;
  product_weight: string | null;
  product_packaging_size: string | null;
  product_set_count: number;
  product_small_pack_count: number;
  product_box_count: number;
  delivery_status: DeliveryStatus;
  payment_status: PaymentStatus;
  is_confirmed: boolean;
  order_status: OrderStatus;
  order_date: Date | null;
  estimated_delivery: Date | null;
  estimated_shipment_date: Date | null; // 예상 출고일
  work_start_date: Date | null;
  work_end_date: Date | null;
  shipping_cost: number;
  warehouse_shipping_cost: number;
  commission_rate: number;
  commission_type: string | null;
  advance_payment_rate: number;
  advance_payment_amount: number | null;
  advance_payment_date: Date | null;
  balance_payment_amount: number | null;
  balance_payment_date: Date | null;
  admin_cost_paid: boolean;
  admin_cost_paid_date: Date | null;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
  updated_by: string | null;
}

export interface PurchaseOrderPublic extends PurchaseOrder {
  product?: {
    id: string | null;
    name: string;
    name_chinese: string | null;
    main_image: string | null;
    category?: string;
    size?: string | null;
    weight?: string | null;
  };
  // 패킹리스트와 연동된 수량 정보 (선택적)
  factory_shipped_quantity?: number; // 업체 출고 수량
  unshipped_quantity?: number; // 미출고 수량
  shipped_quantity?: number; // 패킹리스트 출고 수량
  shipping_quantity?: number; // 배송중 수량
  arrived_quantity?: number; // 한국도착 수량
  unreceived_quantity?: number; // 미입고 수량 (발주 수량 - 업체 출고 수량)
}

export interface CreatePurchaseOrderDTO {
  // product_id: 제공되면 사용, 없으면 UUID로 자동 생성
  product_id?: string | null;
  // 상품 정보 직접 입력
  product_name: string;
  product_name_chinese?: string;
  product_category?: string;
  product_main_image?: string;
  product_size?: string;
  product_weight?: string;
  product_packaging_size?: string;
  product_set_count?: number;
  product_small_pack_count?: number;
  product_box_count?: number;
  unit_price: number;
  back_margin?: number | null;
  order_unit_price?: number;
  quantity: number;
  size?: string; // 스냅샷 필드 (유지)
  weight?: string; // 스냅샷 필드 (유지)
  packaging?: number; // 스냅샷 필드 (유지)
  order_date?: string;
  estimated_shipment_date?: string; // 예상 출고일
  created_by?: string;
}

export interface UpdatePurchaseOrderDTO {
  // 상품 정보 수정 가능
  product_name?: string;
  product_name_chinese?: string;
  product_category?: string;
  product_main_image?: string;
  product_size?: string;
  product_weight?: string;
  product_packaging_size?: string;
  product_set_count?: number;
  product_small_pack_count?: number;
  product_box_count?: number;
  unit_price?: number;
  back_margin?: number;
  order_unit_price?: number;
  expected_final_unit_price?: number;
  quantity?: number;
  size?: string;
  weight?: string;
  packaging?: number;
  delivery_status?: DeliveryStatus;
  payment_status?: PaymentStatus;
  is_confirmed?: boolean;
  order_status?: OrderStatus;
  order_date?: string;
  estimated_delivery?: string;
  estimated_shipment_date?: string;
  work_start_date?: string;
  work_end_date?: string;
  shipping_cost?: number;
  warehouse_shipping_cost?: number;
  commission_rate?: number;
  commission_type?: string;
  advance_payment_rate?: number;
  advance_payment_amount?: number;
  advance_payment_date?: string | null;
  balance_payment_amount?: number;
  balance_payment_date?: string | null;
  admin_cost_paid?: boolean;
  admin_cost_paid_date?: string;
  updated_by?: string;
}

export interface ReorderPurchaseOrderDTO {
  quantity: number; // 필수
  unit_price?: number; // 선택
  order_date?: string; // 선택
  estimated_shipment_date?: string; // 선택
}
