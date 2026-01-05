// 지급요청 타입 정의

export type PaymentRequestSourceType = 'purchase_order' | 'packing_list';
export type PaymentRequestPaymentType = 'advance' | 'balance' | 'shipping';
export type PaymentRequestStatus = '요청중' | '완료';

export interface PaymentRequest {
  id: number;
  request_number: string;
  source_type: PaymentRequestSourceType;
  source_id: string;
  payment_type: PaymentRequestPaymentType;
  amount: number;
  status: PaymentRequestStatus;
  request_date: Date;
  payment_date: Date | null;
  requested_by: string | null;
  completed_by: string | null;
  memo: string | null;
  created_at: Date;
  updated_at: Date;
}

// 클라이언트에 전달할 때 추가 정보 포함
export interface PaymentRequestPublic extends PaymentRequest {
  source_info?: {
    po_number?: string;
    packing_code?: string;
    product_name?: string;
    product_image?: string;
    shipping_date?: string;
  };
  requester_name?: string;
  completer_name?: string;
}

// 지급요청 생성 시 사용하는 DTO
export interface CreatePaymentRequestDTO {
  source_type: PaymentRequestSourceType;
  source_id: string;
  payment_type: PaymentRequestPaymentType;
  amount: number;
  memo?: string;
  requested_by?: string;
}

// 지급요청 수정 시 사용하는 DTO
export interface UpdatePaymentRequestDTO {
  memo?: string;
}

// 지급완료 처리 시 사용하는 DTO
export interface CompletePaymentRequestDTO {
  payment_date: string; // YYYY-MM-DD 형식
  completed_by?: string;
}

// 지급요청 조회 필터
export interface PaymentRequestFilter {
  status?: PaymentRequestStatus;
  source_type?: PaymentRequestSourceType;
  payment_type?: PaymentRequestPaymentType;
  start_date?: string;
  end_date?: string;
  search?: string;
}

