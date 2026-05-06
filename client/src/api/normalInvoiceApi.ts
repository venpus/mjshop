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
  invoice_file: { id: number; file_path: string; original_name: string } | null;
  photo_files: { id: number; file_path: string; original_name: string }[];
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

function parseFilenameFromContentDisposition(cd: string | null): string | undefined {
  if (!cd) return undefined;
  const utf8 = cd.match(/filename\*=UTF-8''([^;\s]+)/i);
  if (utf8?.[1]) {
    try {
      return decodeURIComponent(utf8[1]);
    } catch {
      return utf8[1];
    }
  }
  const quoted = cd.match(/filename="([^"]+)"/i);
  if (quoted?.[1]) return quoted[1];
  const plain = cd.match(/filename=([^;\s]+)/i);
  if (plain?.[1]) return plain[1].replace(/^"|"$/g, '');
  return undefined;
}

async function saveBlobAsDownload(res: Response, fallbackName: string): Promise<void> {
  const blob = await res.blob();
  const name = parseFilenameFromContentDisposition(res.headers.get('Content-Disposition')) || fallbackName;
  const a = document.createElement('a');
  const blobUrl = URL.createObjectURL(blob);
  a.href = blobUrl;
  a.download = name;
  a.click();
  URL.revokeObjectURL(blobUrl);
}

/** 정상 인보이스 — 인보이스 파일 다운로드 */
export async function downloadNormalInvoiceInvoiceFile(entryId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/normal-invoices/${entryId}/invoice/download`, {
    credentials: 'include',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || '다운로드에 실패했습니다.');
  }
  await saveBlobAsDownload(res, 'invoice');
}

/** 정상 인보이스 — 사진 파일 다운로드 */
export async function downloadNormalInvoicePhotoFile(entryId: number, photoFileId: number): Promise<void> {
  const res = await fetch(`${API_BASE}/normal-invoices/${entryId}/photos/${photoFileId}/download`, {
    credentials: 'include',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || '다운로드에 실패했습니다.');
  }
  await saveBlobAsDownload(res, 'photo');
}
