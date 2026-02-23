// QWEN 대화형 검색 API

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

function getAuthHeaders(): HeadersInit {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  const savedUser = localStorage.getItem('admin_user');
  if (savedUser) {
    try {
      const userData = JSON.parse(savedUser);
      if (userData.id) {
        (headers as Record<string, string>)['X-User-Id'] = userData.id;
      }
    } catch {
      // ignore
    }
  }
  return headers;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  success: boolean;
  data?: {
    message: { role: string; content: string };
    usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    id?: string;
  };
  error?: string;
}

export async function sendChat(
  messages: ChatMessage[],
  options?: { useAgent?: boolean }
): Promise<ChatResponse['data']> {
  const useAgent = options?.useAgent ?? true;
  const res = await fetch(`${API_BASE_URL}/qwen/chat`, {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify({ messages, useAgent }),
  });

  const json: ChatResponse = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) {
    const message = (json as { error?: string; message?: string }).error
      ?? (json as { error?: string; message?: string }).message
      ?? '채팅 요청에 실패했습니다.';
    throw new Error(message);
  }
  return json.data;
}

/** 저장된 대화 이력 조회 (인증 필요) */
export async function getConversation(limit?: number): Promise<{ messages: ChatMessage[] }> {
  const url = limit != null ? `${API_BASE_URL}/qwen/conversation?limit=${limit}` : `${API_BASE_URL}/qwen/conversation`;
  const res = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
    credentials: 'include',
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !(json as { success?: boolean }).success) {
    const message = (json as { error?: string }).error ?? '대화 이력을 불러올 수 없습니다.';
    throw new Error(message);
  }
  const data = (json as { data?: { messages?: ChatMessage[] } }).data;
  return { messages: data?.messages ?? [] };
}

/** 대화 턴 저장 (user + assistant 메시지, 인증 필요) */
export async function saveConversation(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<void> {
  if (messages.length === 0) return;
  const res = await fetch(`${API_BASE_URL}/qwen/conversation`, {
    method: 'POST',
    headers: getAuthHeaders(),
    credentials: 'include',
    body: JSON.stringify({ messages }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !(json as { success?: boolean }).success) {
    const message = (json as { error?: string }).error ?? '대화 저장에 실패했습니다.';
    throw new Error(message);
  }
}
