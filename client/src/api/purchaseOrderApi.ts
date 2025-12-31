// 발주 관련 API 함수

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const SERVER_BASE_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

export interface PurchaseOrderWithUnshipped {
  id: string;
  po_number: string;
  product_name: string;
  product_main_image: string | null;
  quantity: number;
  unshipped_quantity: number;
  product_name_chinese?: string | null;
}

/**
 * 미출고 수량이 있는 발주 목록 조회
 * @param searchTerm 검색어 (선택사항)
 * @param page 페이지 번호 (1부터 시작)
 * @param limit 페이지당 항목 수
 */
export async function getPurchaseOrdersWithUnshipped(
  searchTerm?: string,
  page?: number,
  limit?: number
): Promise<{
  data: PurchaseOrderWithUnshipped[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const params = new URLSearchParams();
  if (searchTerm && searchTerm.trim()) {
    params.set('search', searchTerm.trim());
  }
  if (page !== undefined) {
    params.set('page', page.toString());
  }
  if (limit !== undefined) {
    params.set('limit', limit.toString());
  }
  
  const queryString = params.toString();
  const url = `${API_BASE_URL}/purchase-orders/unshipped${queryString ? `?${queryString}` : ''}`;
  
  const response = await fetch(url, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('미출고 발주 목록 조회에 실패했습니다.');
  }

  const responseData = await response.json();
  if (!responseData.success) {
    throw new Error(responseData.error || '미출고 발주 목록 조회에 실패했습니다.');
  }

  return {
    data: responseData.data.map((po: any) => ({
      id: po.id,
      po_number: po.po_number,
      product_name: po.product_name,
      product_main_image: po.product_main_image,
      quantity: po.quantity || 0,
      unshipped_quantity: po.unshipped_quantity || 0,
      product_name_chinese: po.product_name_chinese || null,
    })),
    total: responseData.pagination?.total || responseData.data.length,
    page: responseData.pagination?.page || 1,
    limit: responseData.pagination?.limit || responseData.data.length,
    totalPages: responseData.pagination?.totalPages || 1,
  };
}

/**
 * 이미지 URL을 전체 URL로 변환
 */
export function getFullImageUrl(imageUrl: string | null | undefined): string {
  if (!imageUrl) return '';
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  return `${SERVER_BASE_URL}${imageUrl}`;
}

