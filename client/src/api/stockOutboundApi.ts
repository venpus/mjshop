const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export interface StockOutboundRecord {
  id: number;
  groupKey: string;
  outboundDate: string;
  customerName: string;
  quantity: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
  updatedBy?: string | null;
}

export interface CreateStockOutboundRecordData {
  groupKey: string;
  outboundDate: string;
  customerName: string;
  quantity: number;
}

export interface UpdateStockOutboundRecordData {
  outboundDate?: string;
  customerName?: string;
  quantity?: number;
}

/**
 * groupKey로 출고 기록 목록 조회
 */
export async function getOutboundRecordsByGroupKey(groupKey: string): Promise<StockOutboundRecord[]> {
  const encodedGroupKey = encodeURIComponent(groupKey);
  const response = await fetch(`${API_BASE_URL}/stock-outbound/${encodedGroupKey}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || '출고 기록 조회에 실패했습니다.');
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || '출고 기록 조회에 실패했습니다.');
  }

  return data.data || [];
}

/**
 * 출고 기록 생성
 */
export async function createOutboundRecord(data: CreateStockOutboundRecordData): Promise<StockOutboundRecord> {
  const response = await fetch(`${API_BASE_URL}/stock-outbound`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || '출고 기록 생성에 실패했습니다.');
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || '출고 기록 생성에 실패했습니다.');
  }

  return result.data;
}

/**
 * 출고 기록 수정
 */
export async function updateOutboundRecord(
  id: number,
  data: UpdateStockOutboundRecordData
): Promise<StockOutboundRecord> {
  const response = await fetch(`${API_BASE_URL}/stock-outbound/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || '출고 기록 수정에 실패했습니다.');
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || '출고 기록 수정에 실패했습니다.');
  }

  return result.data;
}

/**
 * 출고 기록 삭제
 */
export async function deleteOutboundRecord(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/stock-outbound/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || '출고 기록 삭제에 실패했습니다.');
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || '출고 기록 삭제에 실패했습니다.');
  }
}

