import { getApiBaseUrl, getServerOrigin } from './baseUrl';
import type { ManufacturingDocument } from '../types/manufacturing';

const API_BASE = getApiBaseUrl();
const SERVER_ORIGIN = getServerOrigin();

export async function listManufacturingDocuments(params?: {
  purchaseOrderId?: string;
  limit?: number;
  offset?: number;
}): Promise<{ data: ManufacturingDocument[]; total: number }> {
  const q = new URLSearchParams();
  if (params?.purchaseOrderId != null) q.set('purchaseOrderId', params.purchaseOrderId);
  if (params?.limit != null) q.set('limit', String(params.limit));
  if (params?.offset != null) q.set('offset', String(params.offset));
  const url = `${API_BASE}/manufacturing-documents${q.toString() ? `?${q}` : ''}`;
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || '제조 문서 목록 조회에 실패했습니다.');
  }
  const json = await res.json();
  return { data: json.data || [], total: json.total ?? 0 };
}

export async function getManufacturingDocumentById(id: string): Promise<ManufacturingDocument | null> {
  const res = await fetch(`${API_BASE}/manufacturing-documents/${id}`, { credentials: 'include' });
  if (res.status === 404) return null;
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || '제조 문서 조회에 실패했습니다.');
  }
  const json = await res.json();
  return json.data ?? null;
}

export async function getManufacturingDocumentByPurchaseOrderId(purchaseOrderId: string): Promise<ManufacturingDocument | null> {
  const res = await fetch(`${API_BASE}/manufacturing-documents/by-purchase-order/${purchaseOrderId}`, { credentials: 'include' });
  if (res.status === 404) return null;
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || '제조 문서 조회에 실패했습니다.');
  }
  const json = await res.json();
  return json.data ?? null;
}

/** 제조 문서 파일 업로드 (엑셀 .xlsx/.xls 또는 PDF) */
export async function uploadManufacturingDocument(file: File, purchaseOrderId?: string | null): Promise<ManufacturingDocument> {
  const form = new FormData();
  form.append('document', file);
  form.append('originalFileName', file.name);
  if (purchaseOrderId != null && purchaseOrderId !== '') {
    form.append('purchaseOrderId', purchaseOrderId);
  }
  const res = await fetch(`${API_BASE}/manufacturing-documents/upload`, {
    method: 'POST',
    credentials: 'include',
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || '업로드에 실패했습니다.');
  }
  const json = await res.json();
  return json.data;
}

/** 제조 문서 파일 다운로드 (브라우저에서 저장) */
export async function downloadManufacturingDocument(id: string, suggestedFileName?: string): Promise<void> {
  const url = `${API_BASE}/manufacturing-documents/${id}/download`;
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || '다운로드에 실패했습니다.');
  }
  const blob = await res.blob();
  const name = suggestedFileName || res.headers.get('Content-Disposition')?.match(/filename="?([^";]+)"?/)?.[1] || 'document.xlsx';
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

export async function deleteManufacturingDocument(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/manufacturing-documents/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || '제조 문서 삭제에 실패했습니다.');
  }
}

