// 결제내역 API 클라이언트

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export interface AdminCostItem {
  id: number;
  item_type: 'option' | 'labor';
  name: string;
  unit_price: number;
  quantity: number;
  cost: number;
}

export interface PaymentHistoryItem {
  id: string;
  source_type: 'purchase_order' | 'packing_list';
  source_id: string;
  po_number?: string;
  po_numbers_with_quantities?: string; // 발주코드:수량 형식 (예: "PO001:10|PO002:5")
  packing_code?: string;
  logistics_company?: string; // 물류회사
  product_name?: string;
  product_main_image?: string | null; // 상품 사진
  payment_type?: 'advance' | 'balance' | 'shipping'; // 패킹리스트용
  amount?: number; // 패킹리스트용
  payment_date?: string | null; // 패킹리스트용
  status?: 'paid' | 'pending'; // 패킹리스트용
  payment_request?: {
    id: number;
    request_number: string;
    status: '요청중' | '완료';
  };
  // 발주관리 상세 정보 (선금/잔금 통합)
  advance_payment_amount?: number;
  advance_payment_date?: string | null;
  advance_status?: 'paid' | 'pending';
  advance_payment_request?: {
    id: number;
    request_number: string;
    status: '요청중' | '완료';
  };
  balance_payment_amount?: number;
  balance_payment_date?: string | null;
  balance_status?: 'paid' | 'pending';
  balance_payment_request?: {
    id: number;
    request_number: string;
    status: '요청중' | '완료';
  };
  unit_price?: number;
  back_margin?: number; // 추가단가
  expected_final_unit_price?: number; // 최종 예상단가 (계산된 값)
  final_payment_amount?: number; // 발주금액 (계산된 값)
  quantity?: number;
  commission_rate?: number;
  shipping_cost?: number;
  warehouse_shipping_cost?: number;
  admin_cost_items?: AdminCostItem[]; // A레벨 관리자 입력 항목들
  admin_total_cost?: number; // 추가단가 + A레벨 관리자 입력 비용 합계
  admin_cost_paid?: boolean; // A레벨 관리자 비용 지불 완료 여부
  admin_cost_paid_date?: string | null; // A레벨 관리자 비용 지불 완료일
  order_date?: string | null; // 발주일 (정렬용)
  created_at?: string | null; // 생성일 (정렬용)
  // 패킹리스트 상세 정보
  pl_shipping_cost?: number;
  wk_payment_date?: string | null;
  calculated_weight?: number | null;
  actual_weight?: number | null;
  weight_ratio?: number | null;
  shipping_cost_difference?: number; // 실중량 배송비 - 비율 배송비 차액
  shipment_date?: string | null; // 발송일 (정렬용)
  pl_created_at?: string | null; // 패킹리스트 생성일 (정렬용)
  packing_list_ids?: string; // 패킹리스트 ID 목록 (쉼표로 구분)
}

export interface PaymentHistoryFilter {
  // type?: 'all' | 'purchase-orders' | 'packing-lists';
  type?: 'purchase-orders' | 'packing-lists';
  status?: 'all' | 'paid' | 'pending';
  start_date?: string;
  end_date?: string;
  search?: string;
}

// 결제내역 조회
export async function getPaymentHistory(
  filter?: PaymentHistoryFilter
): Promise<PaymentHistoryItem[]> {
  const params = new URLSearchParams();
  if (filter?.type) params.append('type', filter.type);
  if (filter?.status) params.append('status', filter.status);
  if (filter?.start_date) params.append('start_date', filter.start_date);
  if (filter?.end_date) params.append('end_date', filter.end_date);
  if (filter?.search) params.append('search', filter.search);
  // 캐시 방지를 위한 타임스탬프 추가
  params.append('_t', Date.now().toString());

  const response = await fetch(`${API_BASE_URL}/payment-requests/history?${params.toString()}`, {
    credentials: 'include',
    cache: 'no-cache', // 캐시 방지
  });

  if (!response.ok) {
    throw new Error('결제내역 조회에 실패했습니다.');
  }

  const data = await response.json();
  return data.success ? data.data : [];
}

