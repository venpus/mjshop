export type DeliveryStatus = '대기중' | '내륙운송중' | '항공운송중' | '해운운송중' | '통관및 배달' | '한국도착';
export type PaymentStatus = '미결제' | '선금결제' | '완료';
export type OrderStatus = '발주확인' | '발주 대기' | '취소됨';

export interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: number;
  product_id: string;
  unit_price: number;
  back_margin: number | null;
  order_unit_price: number | null;
  expected_final_unit_price: number | null;
  quantity: number;
  size: string | null;
  weight: string | null;
  packaging: number | null;
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
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
  updated_by: string | null;
}

export interface PurchaseOrderPublic extends PurchaseOrder {
  supplier?: {
    id: number;
    name: string;
    url: string | null;
  };
  product?: {
    id: string;
    name: string;
    name_chinese: string | null;
    main_image: string | null;
  };
}

export interface CreatePurchaseOrderDTO {
  product_id: string;
  supplier_id?: number;
  supplier_name?: string; // supplier_id가 없을 경우 이름으로 조회
  unit_price: number;
  order_unit_price?: number;
  quantity: number;
  size?: string;
  weight?: string;
  packaging?: number;
  order_date?: string;
  estimated_shipment_date?: string; // 예상 출고일
  created_by?: string;
}

export interface UpdatePurchaseOrderDTO {
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
  advance_payment_date?: string;
  balance_payment_amount?: number;
  balance_payment_date?: string;
  updated_by?: string;
}

export interface ReorderPurchaseOrderDTO {
  quantity: number; // 필수
  unit_price?: number; // 선택
  order_date?: string; // 선택
  estimated_shipment_date?: string; // 선택
}
