// 지급요청 API 클라이언트

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

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
  request_date: string;
  payment_date: string | null;
  requested_by: string | null;
  completed_by: string | null;
  memo: string | null;
  created_at: string;
  updated_at: string;
  source_info?: {
    po_number?: string;
    packing_code?: string;
    product_name?: string;
  };
  requester_name?: string;
  completer_name?: string;
}

export interface CreatePaymentRequestDTO {
  source_type: PaymentRequestSourceType;
  source_id: string;
  payment_type: PaymentRequestPaymentType;
  amount: number;
  memo?: string;
}

export interface UpdatePaymentRequestDTO {
  memo?: string;
}

export interface CompletePaymentRequestDTO {
  payment_date: string; // YYYY-MM-DD 형식
}

export interface PaymentRequestFilter {
  status?: PaymentRequestStatus;
  source_type?: PaymentRequestSourceType;
  payment_type?: PaymentRequestPaymentType;
  start_date?: string;
  end_date?: string;
  search?: string;
}

// 모든 지급요청 조회
export async function getAllPaymentRequests(
  filter?: PaymentRequestFilter
): Promise<PaymentRequest[]> {
  const params = new URLSearchParams();
  if (filter?.status) params.append('status', filter.status);
  if (filter?.source_type) params.append('source_type', filter.source_type);
  if (filter?.payment_type) params.append('payment_type', filter.payment_type);
  if (filter?.start_date) params.append('start_date', filter.start_date);
  if (filter?.end_date) params.append('end_date', filter.end_date);
  if (filter?.search) params.append('search', filter.search);
  // 캐시 방지를 위한 타임스탬프 추가
  params.append('_t', Date.now().toString());

  const response = await fetch(`${API_BASE_URL}/payment-requests?${params.toString()}`, {
    credentials: 'include',
    cache: 'no-cache', // 캐시 방지
  });

  if (!response.ok) {
    throw new Error('지급요청 조회에 실패했습니다.');
  }

  const data = await response.json();
  return data.success ? data.data : [];
}

// ID로 지급요청 조회
export async function getPaymentRequestById(id: number): Promise<PaymentRequest | null> {
  const response = await fetch(`${API_BASE_URL}/payment-requests/${id}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error('지급요청 조회에 실패했습니다.');
  }

  const data = await response.json();
  return data.success ? data.data : null;
}

// 출처 정보로 지급요청 조회
export async function getPaymentRequestsBySource(
  sourceType: PaymentRequestSourceType,
  sourceId: string,
  paymentType?: PaymentRequestPaymentType
): Promise<PaymentRequest[]> {
  const params = new URLSearchParams();
  if (paymentType) params.append('payment_type', paymentType);

  const response = await fetch(
    `${API_BASE_URL}/payment-requests/source/${sourceType}/${sourceId}?${params.toString()}`,
    {
      credentials: 'include',
    }
  );

  if (!response.ok) {
    throw new Error('지급요청 조회에 실패했습니다.');
  }

  const data = await response.json();
  return data.success ? data.data : [];
}

// 지급요청 생성
export async function createPaymentRequest(
  data: CreatePaymentRequestDTO
): Promise<PaymentRequest> {
  const response = await fetch(`${API_BASE_URL}/payment-requests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || '지급요청 생성에 실패했습니다.');
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || '지급요청 생성에 실패했습니다.');
  }

  return result.data;
}

// 지급요청 수정
export async function updatePaymentRequest(
  id: number,
  data: UpdatePaymentRequestDTO
): Promise<PaymentRequest> {
  const response = await fetch(`${API_BASE_URL}/payment-requests/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || '지급요청 수정에 실패했습니다.');
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || '지급요청 수정에 실패했습니다.');
  }

  return result.data;
}

// 지급완료 처리
export async function completePaymentRequest(
  id: number,
  data: CompletePaymentRequestDTO
): Promise<PaymentRequest> {
  const response = await fetch(`${API_BASE_URL}/payment-requests/${id}/complete`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || '지급완료 처리에 실패했습니다.');
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || '지급완료 처리에 실패했습니다.');
  }

  return result.data;
}

// 일괄 지급완료 처리
export async function batchCompletePaymentRequests(
  ids: number[],
  paymentDate: string
): Promise<{ affectedRows: number }> {
  const response = await fetch(`${API_BASE_URL}/payment-requests/batch-complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      ids,
      payment_date: paymentDate,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || '일괄 지급완료 처리에 실패했습니다.');
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || '일괄 지급완료 처리에 실패했습니다.');
  }

  return result.data;
}

// 지급해제 처리
export async function revertPaymentRequest(id: number): Promise<PaymentRequest> {
  const response = await fetch(`${API_BASE_URL}/payment-requests/${id}/revert`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || '지급해제 처리에 실패했습니다.');
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || '지급해제 처리에 실패했습니다.');
  }

  return result.data;
}

// 일괄 지급해제 처리
export async function batchRevertPaymentRequests(
  ids: number[]
): Promise<{ affectedRows: number }> {
  const response = await fetch(`${API_BASE_URL}/payment-requests/batch-revert`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      ids,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || '일괄 지급해제 처리에 실패했습니다.');
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || '일괄 지급해제 처리에 실패했습니다.');
  }

  return result.data;
}

// 지급요청 삭제
export async function deletePaymentRequest(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/payment-requests/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || '지급요청 삭제에 실패했습니다.');
  }
}

