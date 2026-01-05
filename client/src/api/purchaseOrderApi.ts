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
 * 이미지 URL을 전체 URL로 변환 (캐시 버스팅 포함)
 */
export function getFullImageUrl(imageUrl: string | null | undefined): string {
  if (!imageUrl) return '';
  
  let fullUrl: string;
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    fullUrl = imageUrl;
  } else {
    fullUrl = `${SERVER_BASE_URL}${imageUrl}`;
  }
  
  // 캐시 버스팅: 이미 쿼리 파라미터가 있으면 추가하지 않음
  if (!fullUrl.includes('?')) {
    // 파일의 수정 시간을 기반으로 한 캐시 버스팅
    // 현재 시간을 초 단위로 추가 (하루에 한 번 갱신)
    const cacheBuster = Math.floor(Date.now() / (1000 * 60 * 60 * 24)); // 일 단위
    return `${fullUrl}?v=${cacheBuster}`;
  }
  
  return fullUrl;
}

/**
 * A레벨 관리자 비용 지불 완료 상태 업데이트
 */
export async function updateAdminCostPaid(
  orderId: string,
  adminCostPaid: boolean
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/purchase-orders/${orderId}/admin-cost-paid`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      admin_cost_paid: adminCostPaid,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'A레벨 관리자 비용 지불 완료 상태 업데이트에 실패했습니다.');
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'A레벨 관리자 비용 지불 완료 상태 업데이트에 실패했습니다.');
  }
}

/**
 * 모든 발주 목록 조회 (갤러리용)
 */
export async function getAllPurchaseOrders(): Promise<Array<{
  id: string;
  po_number: string;
  product_name: string;
  product_main_image: string | null;
  product_name_chinese?: string | null;
}>> {
  const response = await fetch(`${API_BASE_URL}/purchase-orders?limit=10000`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('발주 목록 조회에 실패했습니다.');
  }

  const responseData = await response.json();
  if (!responseData.success) {
    throw new Error(responseData.error || '발주 목록 조회에 실패했습니다.');
  }

  return responseData.data.map((po: any) => {
    // 상품의 main_image를 우선 사용 (product 객체가 있는 경우)
    // product_main_image는 /purchase-orders/ 경로를 포함할 수 있어서 제외
    let mainImage: string | null = null;
    if (po.product?.main_image) {
      mainImage = po.product.main_image;
    } else if (po.product_main_image && !po.product_main_image.includes('/purchase-orders/')) {
      mainImage = po.product_main_image;
    }
    
    return {
      id: po.id,
      po_number: po.po_number,
      product_name: po.product_name || po.product?.name || '',
      product_main_image: mainImage,
      product_name_chinese: po.product_name_chinese || po.product?.name_chinese || null,
    };
  });
}

/**
 * 발주별 이미지 조회
 */
export interface PurchaseOrderImage {
  id: number;
  url: string;
  type: 'factory_shipment' | 'return_exchange' | 'work_item' | 'logistics' | 'other';
  display_order: number;
}

export async function getPurchaseOrderImages(
  purchaseOrderId: string,
  type: 'factory_shipment' | 'return_exchange' | 'work_item' | 'logistics' | 'other'
): Promise<PurchaseOrderImage[]> {
  const response = await fetch(`${API_BASE_URL}/purchase-orders/${purchaseOrderId}/images/${type}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('발주 이미지 조회에 실패했습니다.');
  }

  const responseData = await response.json();
  if (!responseData.success) {
    throw new Error(responseData.error || '발주 이미지 조회에 실패했습니다.');
  }

  return responseData.data.map((img: any) => ({
    id: img.id,
    url: getFullImageUrl(img.image_url || img.url),
    type: img.image_type || type,
    display_order: img.display_order || 0,
  }));
}

/**
 * 발주별 모든 이미지 조회 (모든 타입 포함)
 */
export async function getAllPurchaseOrderImages(purchaseOrderId: string): Promise<PurchaseOrderImage[]> {
  const imageTypes: Array<'factory_shipment' | 'return_exchange' | 'work_item' | 'logistics' | 'other'> = [
    'factory_shipment',
    'return_exchange',
    'work_item',
    'logistics',
    'other',
  ];

  const allImages: PurchaseOrderImage[] = [];

  for (const type of imageTypes) {
    try {
      const images = await getPurchaseOrderImages(purchaseOrderId, type);
      allImages.push(...images);
    } catch (error) {
      console.error(`이미지 타입 ${type} 조회 실패:`, error);
    }
  }

  return allImages.sort((a, b) => a.display_order - b.display_order);
}

