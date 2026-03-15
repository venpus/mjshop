import { getApiBaseUrl } from './baseUrl';
import { getAdminUser } from '../utils/authStorage';

const API_BASE = getApiBaseUrl();

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const user = getAdminUser();
  if (user?.id) headers['X-User-Id'] = user.id;
  return headers;
}

export interface NormalInvoiceEntryResponse {
  id: number;
  entry_date: string;
  product_name: string;
  invoice_file: { file_path: string; original_name: string } | null;
  photo_files: { file_path: string; original_name: string }[];
}

export async function fetchNormalInvoices(): Promise<NormalInvoiceEntryResponse[]> {
  const res = await fetch(`${API_BASE}/normal-invoices`, {
    credentials: 'include',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || '목록을 불러올 수 없습니다.');
  }
  const body = await res.json();
  if (!body.success || !Array.isArray(body.data)) return [];
  return body.data;
}

export async function createNormalInvoice(form: FormData): Promise<NormalInvoiceEntryResponse> {
  const res = await fetch(`${API_BASE}/normal-invoices`, {
    method: 'POST',
    credentials: 'include',
    headers: getAuthHeaders(),
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || '등록에 실패했습니다.');
  if (!data.success || !data.data) throw new Error('응답 형식이 올바르지 않습니다.');
  return data.data;
}

export async function updateNormalInvoice(id: number, form: FormData): Promise<NormalInvoiceEntryResponse> {
  const res = await fetch(`${API_BASE}/normal-invoices/${id}`, {
    method: 'PUT',
    credentials: 'include',
    headers: getAuthHeaders(),
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || '수정에 실패했습니다.');
  if (!data.success || !data.data) throw new Error('응답 형식이 올바르지 않습니다.');
  return data.data;
}

export async function deleteNormalInvoice(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/normal-invoices/${id}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || '삭제에 실패했습니다.');
  }
}
