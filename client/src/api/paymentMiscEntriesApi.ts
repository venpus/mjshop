import { getApiBaseUrl, getServerOrigin } from './baseUrl';

const base = () => `${getApiBaseUrl()}/payment-misc-entries`;

export interface PaymentMiscEntry {
  id: number;
  entry_date: string;
  description: string | null;
  amount_cny: number;
  is_completed: boolean;
  file_relative_path: string | null;
  original_filename: string | null;
  created_at: string;
  updated_at: string;
}

export function getMiscEntryFileUrl(entry: PaymentMiscEntry): string | null {
  if (!entry.file_relative_path) return null;
  return `${getServerOrigin()}/uploads/${entry.file_relative_path.replace(/^\/+/, '')}`;
}

export async function fetchPaymentMiscTotalCny(): Promise<number> {
  const res = await fetch(`${base()}/summary`, { credentials: 'include' });
  const j = await res.json();
  if (!res.ok || !j.success) throw new Error(j.error || '합계 조회 실패');
  return Number(j.data?.total_cny ?? 0);
}

export async function fetchPaymentMiscEntries(): Promise<PaymentMiscEntry[]> {
  const res = await fetch(`${base()}`, { credentials: 'include' });
  const j = await res.json();
  if (!res.ok || !j.success) throw new Error(j.error || '목록 조회 실패');
  return j.data;
}

export async function createPaymentMiscEntry(body?: Partial<PaymentMiscEntry>): Promise<PaymentMiscEntry> {
  const res = await fetch(`${base()}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
  const j = await res.json();
  if (!res.ok || !j.success) throw new Error(j.error || '추가 실패');
  return j.data;
}

export async function updatePaymentMiscEntry(
  id: number,
  body: Partial<{
    entry_date: string;
    description: string | null;
    amount_cny: number;
    is_completed: boolean;
  }>
): Promise<PaymentMiscEntry> {
  const res = await fetch(`${base()}/${id}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const j = await res.json();
  if (!res.ok || !j.success) throw new Error(j.error || '저장 실패');
  return j.data;
}

export async function deletePaymentMiscEntry(id: number): Promise<void> {
  const res = await fetch(`${base()}/${id}`, { method: 'DELETE', credentials: 'include' });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || !j.success) throw new Error(j.error || '삭제 실패');
}

export async function uploadPaymentMiscFile(id: number, file: File): Promise<PaymentMiscEntry> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(`${base()}/${id}/file`, {
    method: 'POST',
    credentials: 'include',
    body: fd,
  });
  const j = await res.json();
  if (!res.ok || !j.success) throw new Error(j.error || '파일 업로드 실패');
  return j.data;
}

export async function removePaymentMiscFile(id: number): Promise<PaymentMiscEntry> {
  const res = await fetch(`${base()}/${id}/file`, { method: 'DELETE', credentials: 'include' });
  const j = await res.json();
  if (!res.ok || !j.success) throw new Error(j.error || '파일 제거 실패');
  return j.data;
}
