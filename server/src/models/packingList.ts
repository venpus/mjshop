// 패킹리스트 관련 타입 및 인터페이스 정의

export interface PackingList {
  id: number;
  code: string;
  shipment_date: Date;
  logistics_company: string | null;
  warehouse_arrival_date: Date | null;
  actual_weight: number | null;
  weight_ratio: number | null;
  calculated_weight: number | null;
  shipping_cost: number;
  payment_date: Date | null;
  wk_payment_date: Date | null;
  repackaging_requirements: string | null;
  admin_cost_paid: boolean;
  admin_cost_paid_date: Date | null;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
  updated_by: string | null;
}

export interface PackingListItem {
  id: number;
  packing_list_id: number;
  purchase_order_id: string | null;
  product_name: string;
  product_image_url: string | null;
  entry_quantity: string | null;
  box_count: number;
  unit: '박스' | '마대';
  total_quantity: number;
  created_at: Date;
  updated_at: Date;
}

export interface DomesticInvoice {
  id: number;
  packing_list_id: number;
  invoice_number: string;
  created_at: Date;
  updated_at: Date;
}

export interface DomesticInvoiceImage {
  id: number;
  domestic_invoice_id: number;
  image_url: string;
  display_order: number;
  created_at: Date;
}

export interface KoreaArrival {
  id: number;
  packing_list_item_id: number;
  arrival_date: Date;
  quantity: number;
  created_at: Date;
  updated_at: Date;
}

// DTOs
export interface CreatePackingListDTO {
  code: string;
  shipment_date: string;
  logistics_company?: string;
  warehouse_arrival_date?: string;
  actual_weight?: number;
  weight_ratio?: number;
  calculated_weight?: number;
  shipping_cost?: number;
  payment_date?: string;
  wk_payment_date?: string;
  created_by?: string;
}

export interface UpdatePackingListDTO {
  code?: string;
  shipment_date?: string;
  logistics_company?: string;
  warehouse_arrival_date?: string;
  actual_weight?: number;
  weight_ratio?: number | null;
  calculated_weight?: number;
  shipping_cost?: number;
  payment_date?: string;
  wk_payment_date?: string | null;
  repackaging_requirements?: string | null;
  admin_cost_paid?: boolean;
  admin_cost_paid_date?: string;
  updated_by?: string;
}

export interface CreatePackingListItemDTO {
  packing_list_id: number;
  purchase_order_id?: string | null;
  product_name: string;
  product_image_url?: string;
  entry_quantity?: string;
  box_count: number;
  unit: '박스' | '마대';
  total_quantity: number;
  is_factory_to_warehouse?: boolean; // 공장→물류창고 플래그
}

export interface UpdatePackingListItemDTO {
  purchase_order_id?: string | null;
  product_name?: string;
  product_image_url?: string;
  entry_quantity?: string;
  box_count?: number;
  unit?: '박스' | '마대';
  total_quantity?: number;
}

export interface CreateDomesticInvoiceDTO {
  packing_list_id: number;
  invoice_number: string;
}

export interface UpdateDomesticInvoiceDTO {
  invoice_number?: string;
}

export interface CreateKoreaArrivalDTO {
  packing_list_item_id: number;
  arrival_date: string;
  quantity: number;
}

export interface UpdateKoreaArrivalDTO {
  arrival_date?: string;
  quantity?: number;
}

// 통합 조회용 인터페이스 (아이템과 함께 조회)
export interface PackingListWithItems extends PackingList {
  items: PackingListItemWithDetails[];
  overseas_invoices?: OverseasInvoice[];
}

export interface PackingListItemWithDetails extends PackingListItem {
  domestic_invoices?: DomesticInvoiceWithImages[];
  korea_arrivals?: KoreaArrival[];
}

export interface DomesticInvoiceWithImages extends DomesticInvoice {
  images?: DomesticInvoiceImage[];
}

export interface OverseasInvoice {
  id: number;
  packing_list_id: number;
  invoice_number: string;
  status: '출발대기' | '배송중' | '도착완료';
  inspection_quantity: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateOverseasInvoiceDTO {
  packing_list_id: number;
  invoice_number: string;
  status?: '출발대기' | '배송중' | '도착완료';
  inspection_quantity?: number;
}

export interface UpdateOverseasInvoiceDTO {
  invoice_number?: string;
  status?: '출발대기' | '배송중' | '도착완료';
  inspection_quantity?: number;
}

// 발주별 배송비 집계 결과
export interface PurchaseOrderShippingCost {
  purchase_order_id: string;
  ordered_quantity: number;
  total_shipping_cost: number;
  total_shipped_quantity: number;
  unit_shipping_cost: number; // 발주 단위당 배송비
}

// 발주별 배송 수량 집계 결과
export interface PurchaseOrderShippingSummary {
  purchase_order_id: string;
  ordered_quantity: number;
  shipped_quantity: number;
  arrived_quantity: number;
  unshipped_quantity: number;
  shipping_quantity: number;
  warehouse_arrival_date?: Date | null;
  has_korea_arrival?: number | boolean;
}

