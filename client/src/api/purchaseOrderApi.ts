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
 */
export async function getPurchaseOrdersWithUnshipped(): Promise<PurchaseOrderWithUnshipped[]> {
  const response = await fetch(`${API_BASE_URL}/purchase-orders/unshipped`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('미출고 발주 목록 조회에 실패했습니다.');
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || '미출고 발주 목록 조회에 실패했습니다.');
  }

  return data.data.map((po: any) => ({
    id: po.id,
    po_number: po.po_number,
    product_name: po.product_name,
    product_main_image: po.product_main_image,
    quantity: po.quantity || 0,
    unshipped_quantity: po.unshipped_quantity || 0,
    product_name_chinese: po.product_name_chinese || null,
  }));
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

