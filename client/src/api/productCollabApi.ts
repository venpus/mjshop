import { getApiBaseUrl } from './baseUrl';

export function getAuthHeaders(): HeadersInit {
  const headers: HeadersInit = {};
  const savedUser = localStorage.getItem('admin_user');
  if (savedUser) {
    try {
      const userData = JSON.parse(savedUser);
      if (userData.id) {
        headers['X-User-Id'] = userData.id;
      }
    } catch {
      // ignore
    }
  }
  return headers;
}

import type {
  ProductCollabProductListItem,
  ProductCollabProductDetail,
  ProductCollabMessage,
  DashboardData,
} from '../components/product-collab/types';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface OverallSummaryProduct {
  productId: number;
  productName: string;
  summary: string;
  delayedNote?: string;
  /** 서버에서 병합: 제품 상태 */
  status?: string;
  /** 서버에서 병합: 1=문제발생, 2=지연, 3=그 외 */
  priority?: 'issue' | 'delayed' | 'normal';
}

export interface MyTaskSummaryItem {
  productId: number;
  productName: string;
  priority: 'issue' | 'delayed' | 'normal';
  summary: string;
}

export interface AiWorkSummaryResult {
  overallSummary: OverallSummaryProduct[];
  myTasksSummary: MyTaskSummaryItem[];
}

export async function postAiWorkSummary(lang: 'ko' | 'zh'): Promise<ApiResponse<AiWorkSummaryResult>> {
  const res = await fetch(`${getApiBaseUrl()}/product-collab/ai-work-summary?lang=${lang}`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  const json = await res.json();
  if (!res.ok) return { success: false, error: json.error || '요약 생성 실패' };
  return { success: true, data: json.data };
}

export async function getDashboard(): Promise<ApiResponse<DashboardData>> {
  const res = await fetch(`${getApiBaseUrl()}/product-collab/dashboard`, {
    headers: getAuthHeaders(),
  });
  const json = await res.json();
  if (!res.ok) return { success: false, error: json.error || '조회 실패' };
  return { success: true, data: json.data };
}

export type DashboardSectionKey = 'my-tasks' | 'confirmations' | 'replies' | 'assignee-tasks';

export async function getDashboardSection(
  section: DashboardSectionKey,
  params?: { limit?: number; offset?: number }
): Promise<ApiResponse<{ items: unknown[]; total: number }>> {
  const limit = params?.limit ?? 15;
  const offset = params?.offset ?? 0;
  const q = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  const res = await fetch(
    `${getApiBaseUrl()}/product-collab/dashboard/section/${section}?${q}`,
    { headers: getAuthHeaders() }
  );
  const json = await res.json();
  if (!res.ok) return { success: false, error: json.error || '조회 실패' };
  return { success: true, data: json.data };
}

export interface MentionableUser {
  id: string;
  name: string;
}

export async function getMentionableUsers(): Promise<ApiResponse<MentionableUser[]>> {
  const res = await fetch(`${getApiBaseUrl()}/product-collab/mentionable-users`, {
    headers: getAuthHeaders(),
  });
  const json = await res.json();
  if (!res.ok) return { success: false, error: json.error || '멘션 가능 사용자 조회 실패' };
  return { success: true, data: json.data ?? [] };
}

export async function completeTask(productId: number, taskId: number): Promise<ApiResponse<void>> {
  const res = await fetch(
    `${getApiBaseUrl()}/product-collab/products/${productId}/tasks/${taskId}/complete`,
    { method: 'PUT', headers: getAuthHeaders() }
  );
  const json = await res.json();
  if (!res.ok) return { success: false, error: json.error || '태스크 완료 실패' };
  return { success: true };
}

export async function getActiveProducts(params?: {
  status?: string;
  category?: string;
  assignee_id?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<ApiResponse<ProductCollabProductListItem[]> & { total?: number }> {
  const q = new URLSearchParams();
  if (params?.status) q.set('status', params.status);
  if (params?.category) q.set('category', params.category);
  if (params?.assignee_id) q.set('assignee_id', params.assignee_id);
  if (params?.search) q.set('search', params.search);
  if (params?.limit != null && params.limit > 0) q.set('limit', String(params.limit));
  if (params?.offset != null && params.offset > 0) q.set('offset', String(params.offset));
  const url = `${getApiBaseUrl()}/product-collab/products${q.toString() ? `?${q}` : ''}`;
  const res = await fetch(url, { headers: getAuthHeaders() });
  const json = await res.json();
  if (!res.ok) return { success: false, error: json.error || '조회 실패' };
  return { success: true, data: json.data, total: json.total };
}

export interface ProductCollabCounts {
  activeCount: number;
  archiveCount: number;
  cancelledCount: number;
}

export async function getProductCounts(): Promise<ApiResponse<ProductCollabCounts>> {
  const res = await fetch(`${getApiBaseUrl()}/product-collab/products/counts`, {
    headers: getAuthHeaders(),
  });
  const json = await res.json();
  if (!res.ok) return { success: false, error: json.error || '제품 수 조회 실패' };
  return { success: true, data: json.data };
}

export async function getCompletedProducts(params?: {
  search?: string;
}): Promise<ApiResponse<ProductCollabProductListItem[]>> {
  const q = params?.search ? `?search=${encodeURIComponent(params.search)}` : '';
  const res = await fetch(`${getApiBaseUrl()}/product-collab/products/archive${q}`, {
    headers: getAuthHeaders(),
  });
  const json = await res.json();
  if (!res.ok) return { success: false, error: json.error || '조회 실패' };
  return { success: true, data: json.data };
}

export async function getCancelledProducts(params?: {
  search?: string;
}): Promise<ApiResponse<ProductCollabProductListItem[]>> {
  const q = params?.search ? `?search=${encodeURIComponent(params.search)}` : '';
  const res = await fetch(`${getApiBaseUrl()}/product-collab/products/cancelled${q}`, {
    headers: getAuthHeaders(),
  });
  const json = await res.json();
  if (!res.ok) return { success: false, error: json.error || '조회 실패' };
  return { success: true, data: json.data };
}

export async function getProductById(id: number): Promise<ApiResponse<ProductCollabProductDetail>> {
  const res = await fetch(`${getApiBaseUrl()}/product-collab/products/${id}`, {
    headers: getAuthHeaders(),
  });
  const json = await res.json();
  if (!res.ok) return { success: false, error: json.error || '조회 실패' };
  return { success: true, data: json.data };
}

export async function createProduct(body: {
  name: string;
  category?: string | null;
  request_note?: string | null;
  request_links?: string[] | null;
  request_image_urls?: string[] | null;
}): Promise<ApiResponse<unknown>> {
  const res = await fetch(`${getApiBaseUrl()}/product-collab/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) return { success: false, error: json.error || '생성 실패' };
  return { success: true, data: json.data };
}

export async function updateProduct(
  id: number,
  body: Record<string, unknown>
): Promise<ApiResponse<unknown>> {
  const res = await fetch(`${getApiBaseUrl()}/product-collab/products/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) return { success: false, error: json.error || '수정 실패' };
  return { success: true, data: json.data };
}

export async function deleteProduct(id: number): Promise<ApiResponse<void>> {
  const res = await fetch(`${getApiBaseUrl()}/product-collab/products/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  const json = await res.json();
  if (!res.ok) return { success: false, error: json.error || '제품 삭제 실패' };
  return { success: true };
}

export async function createMessage(
  productId: number,
  body: {
    body?: string | null;
    tag?: string | null;
    parent_id?: number | null;
    attachment_urls?: { kind: 'image' | 'file'; url: string; original_filename?: string | null }[];
    mention_user_ids?: string[];
  }
): Promise<ApiResponse<ProductCollabMessage>> {
  const res = await fetch(`${getApiBaseUrl()}/product-collab/products/${productId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) return { success: false, error: json.error || '메시지 작성 실패' };
  return { success: true, data: json.data };
}

export async function updateMessage(
  productId: number,
  messageId: number,
  body: {
    body?: string | null;
    tag?: string | null;
    attachment_urls?: { kind: 'image' | 'file'; url: string; original_filename?: string | null }[];
  }
): Promise<ApiResponse<ProductCollabMessage>> {
  const res = await fetch(
    `${getApiBaseUrl()}/product-collab/products/${productId}/messages/${messageId}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(body),
    }
  );
  const json = await res.json();
  if (!res.ok) return { success: false, error: json.error || '메시지 수정 실패' };
  return { success: true, data: json.data };
}

export async function deleteMessage(
  productId: number,
  messageId: number
): Promise<ApiResponse<void>> {
  const res = await fetch(
    `${getApiBaseUrl()}/product-collab/products/${productId}/messages/${messageId}`,
    { method: 'DELETE', headers: getAuthHeaders() }
  );
  const json = await res.json();
  if (!res.ok) return { success: false, error: json.error || '메시지 삭제 실패' };
  return { success: true };
}

export async function addProductImage(
  productId: number,
  body: { image_url: string; set_as_main?: boolean }
): Promise<ApiResponse<{ id: number; image_url: string; kind: string }>> {
  const res = await fetch(`${getApiBaseUrl()}/product-collab/products/${productId}/images`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) return { success: false, error: json.error || '이미지 추가 실패' };
  return { success: true, data: json.data };
}

export async function setMainImage(
  productId: number,
  imageId: number
): Promise<ApiResponse<unknown>> {
  const res = await fetch(
    `${getApiBaseUrl()}/product-collab/products/${productId}/images/${imageId}/set-final`,
    { method: 'PUT', headers: getAuthHeaders() }
  );
  const json = await res.json();
  if (!res.ok) return { success: false, error: json.error || '대표 이미지 설정 실패' };
  return { success: true };
}

export async function deleteProductImage(
  productId: number,
  imageId: number
): Promise<ApiResponse<void>> {
  const res = await fetch(
    `${getApiBaseUrl()}/product-collab/products/${productId}/images/${imageId}`,
    { method: 'DELETE', headers: getAuthHeaders() }
  );
  const json = await res.json();
  if (!res.ok) return { success: false, error: json.error || '이미지 삭제 실패' };
  return { success: true };
}

/** 제품별 이미지 업로드 (스레드 첨부·대표 이미지용). 반환 URL을 createMessage(attachment_urls) 또는 addProductImage(image_url)에 사용 */
export async function uploadProductImages(
  productId: number,
  files: File[]
): Promise<ApiResponse<{ urls: string[] }>> {
  const form = new FormData();
  files.forEach((file) => form.append('images', file));
  const res = await fetch(`${getApiBaseUrl()}/product-collab/products/${productId}/upload`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: form,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = json?.error ?? (res.status === 413 ? '파일 크기가 너무 큽니다.' : res.status === 404 ? '업로드 경로를 찾을 수 없습니다.' : '업로드 실패');
    return { success: false, error: message };
  }
  if (!json.success || !Array.isArray(json.data?.urls)) {
    return { success: false, error: json?.error ?? '업로드 응답 형식 오류' };
  }
  return { success: true, data: { urls: json.data.urls } };
}
