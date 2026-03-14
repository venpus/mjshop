import { getApiBaseUrl } from './baseUrl';
import type { AccessLogListResponse } from '../types/accessLog';

const API_BASE = getApiBaseUrl();

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  try {
    const saved = localStorage.getItem('admin_user');
    if (saved) {
      const user = JSON.parse(saved);
      if (user?.id) headers['X-User-Id'] = user.id;
    }
  } catch {
    // ignore
  }
  return headers;
}

export interface GetAccessLogsParams {
  page: number;
  limit: number;
  userName?: string;
  /** 등록된 사용자 외 접속 로그만 조회 */
  othersOnly?: boolean;
}

export interface AdminAccountOption {
  id: string;
  name: string;
}

/** 접속 로그 사용자 필터용 관리자 목록 (드롭다운 옵션) */
export async function getAdminAccountOptions(): Promise<AdminAccountOption[]> {
  const res = await fetch(`${API_BASE}/admin-accounts`, {
    credentials: 'include',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || '관리자 목록을 불러올 수 없습니다.');
  }
  const body = await res.json();
  const list = body.success && body.data ? body.data : [];
  return list.map((a: { id: string; name: string }) => ({ id: a.id, name: a.name }));
}

export async function getAccessLogs(
  params: GetAccessLogsParams
): Promise<AccessLogListResponse> {
  const search = new URLSearchParams();
  search.set('page', String(params.page));
  search.set('limit', String(params.limit));
  if (params.othersOnly) {
    search.set('othersOnly', '1');
  } else if (params.userName?.trim()) {
    search.set('userName', params.userName.trim());
  }
  const res = await fetch(`${API_BASE}/access-logs?${search.toString()}`, {
    credentials: 'include',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || '접속 로그 조회에 실패했습니다.');
  }
  const body = await res.json();
  return {
    data: body.data ?? [],
    pagination: body.pagination ?? {
      total: 0,
      page: params.page,
      limit: params.limit,
      totalPages: 0,
    },
  };
}
