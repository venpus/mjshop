const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;
const QWEN_BASE_URL = process.env.QWEN_BASE_URL || 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1';
const QWEN_MODEL = process.env.QWEN_MODEL || 'qwen-flash';

/** fetch 반환 타입 최소 정의 (node-fetch와 global fetch 호환) */
interface FetchResponse {
  ok: boolean;
  status: number;
  text(): Promise<string>;
  json(): Promise<unknown>;
}

/** Node 18 미만에서는 global fetch가 없으므로 node-fetch 사용 */
async function getFetch(): Promise<(url: string | URL, init?: RequestInit) => Promise<FetchResponse>> {
  if (typeof globalThis.fetch === 'function') {
    return globalThis.fetch as (url: string | URL, init?: RequestInit) => Promise<FetchResponse>;
  }
  const mod = await import('node-fetch');
  return (mod.default ?? mod) as (url: string | URL, init?: RequestInit) => Promise<FetchResponse>;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_call_id?: string;
  name?: string;
  tool_calls?: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }>;
}

/** OpenAI 호환 도구 정의 (AI가 스스로 데이터 검색 시 사용) */
export interface ChatTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, { type: string; description?: string }>;
      required?: string[];
    };
  };
}

export interface QwenChatOptions {
  messages: ChatMessage[];
  stream?: boolean;
  max_tokens?: number;
  tools?: ChatTool[];
}

export interface QwenChatResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string | null;
      tool_calls?: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }>;
    };
    finish_reason: string;
  }>;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

/** AI 에이전트용 데이터 검색 도구 정의 (AI가 필요한 데이터를 스스로 선택해 호출) */
export const DATA_TOOLS: ChatTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_not_arrived_analysis',
      description: '한국에 아직 도착하지 않은 물품(미도착) 분석. "한국 미도착", "아직 입고 안 된", "도착하지 않은 제품" 등 질의 시 사용. 응답: 입고수량(한국도착 수량), 배송중수량, 한국미도착수량, 발주번호, 상품명 등.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_purchase_orders',
      description: '발주 목록 **전체** 조회 (페이징 없음). search로 검색어만 지정 가능. 응답 항목에 미입고수량, 미발송수량, 배송중수량, 한국도착수량 포함. 한국도착 완료 수량 확인 시 이 도구 사용.',
      parameters: {
        type: 'object',
        properties: {
          search: { type: 'string', description: '검색어 (발주번호·상품명 등, 선택)' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_unshipped_orders',
      description: '공장/창고 미출고 발주 **전체** 조회 (페이징 없음). "미출고 발주" 질의 시 사용.',
      parameters: {
        type: 'object',
        properties: {
          search: { type: 'string', description: '검색어 (선택)' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_products',
      description: '상품 목록 **전체** 조회 (페이징 없음).',
      parameters: {
        type: 'object',
        properties: { search: { type: 'string', description: '검색어 (선택)' } },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_projects',
      description: '프로젝트 목록 **전체** 조회 (페이징 없음).',
      parameters: {
        type: 'object',
        properties: { search: { type: 'string', description: '검색어 (선택)' } },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_payment_requests',
      description: '지급 요청 목록 **전체** 조회 (페이징 없음).',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_packing_lists',
      description: '패킹리스트 목록 조회 (페이징 없음). "최근 2주" 등 기간 질의 시 start_date·end_date(YYYY-MM-DD)를 사용하세요. [현재 시각] 기준 오늘에서 14일 전~오늘. 연도·월만 지정하려면 year·month 사용.',
      parameters: {
        type: 'object',
        properties: {
          start_date: { type: 'string', description: '시작일 YYYY-MM-DD (예: 최근 2주면 오늘-14일)' },
          end_date: { type: 'string', description: '종료일 YYYY-MM-DD (예: 오늘)' },
          year: { type: 'number', description: '연도 (예: 2026)' },
          month: { type: 'number', description: '월 (1-12)' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_payment_history',
      description: '결제내역 **전체** 조회 (페이징 없음, 발주·패킹리스트 결제 통합). "결제 내역", "입금 내역" 등 질의 시 사용.',
      parameters: {
        type: 'object',
        properties: {
          type: { type: 'string', description: 'purchase-orders 또는 packing-lists (선택)' },
          status: { type: 'string', description: 'all, paid, pending (선택)' },
          start_date: { type: 'string', description: 'YYYY-MM-DD (선택)' },
          end_date: { type: 'string', description: 'YYYY-MM-DD (선택)' },
          search: { type: 'string', description: '검색어 (선택)' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_materials',
      description: '부자재(자재) 목록 **전체** 조회 (페이징 없음). "자재", "부자재", "소재" 질의 시 사용.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_logistics_options',
      description: '물류 옵션 조회: 내륙운송회사 목록, 도착 창고 목록. "물류 회사", "창고", "운송" 질의 시 사용.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_stock_outbound',
      description: '재고 출고 기록 **전체** 조회 (페이징 없음). "출고", "재고 출고" 질의 시 사용.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_admin_accounts',
      description: '관리자 계정 목록 **전체** 조회 (페이징 없음). "관리자", "어드민" 질의 시 사용.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_permissions',
      description: '권한 설정 목록 조회 (리소스별). "권한", "퍼미션" 질의 시 사용.',
      parameters: { type: 'object', properties: {} },
    },
  },
];

/**
 * QWEN 채팅 완료 API 호출 (비스트리밍)
 */
export async function chatCompletion(options: QwenChatOptions): Promise<QwenChatResponse> {
  if (!DASHSCOPE_API_KEY) {
    throw new Error('DASHSCOPE_API_KEY is not configured.');
  }

  const url = `${QWEN_BASE_URL}/chat/completions`;
  const body: Record<string, unknown> = {
    model: QWEN_MODEL,
    messages: options.messages.map((m) => {
      const msg: Record<string, unknown> = { role: m.role, content: m.content ?? '' };
      if (m.tool_call_id) msg.tool_call_id = m.tool_call_id;
      if (m.name && m.role === 'tool') msg.name = m.name;
      if (m.tool_calls?.length) msg.tool_calls = m.tool_calls;
      return msg;
    }),
    stream: false,
    max_tokens: options.max_tokens ?? 8192,
  };
  if (options.tools?.length) body.tools = options.tools;

  const fetchFn = await getFetch();
  const response = await fetchFn(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DASHSCOPE_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    let message = `QWEN API error: ${response.status}`;
    try {
      const errJson = JSON.parse(errText);
      message = errJson?.error?.message ?? message;
    } catch {
      message = errText || message;
    }
    throw new Error(message);
  }

  const data = await response.json();
  return data as QwenChatResponse;
}

const INTENT_SYSTEM = `You are a query planner for a shopping mall admin system. Given the user's message in Korean or English, decide which data to fetch. Reply with ONLY a JSON object, no other text.

Format: { "queries": [ { "intent": "...", "params": { "limit": 15, "search": "", "page": 1, "year": 2024, "month": 1, "type": "purchase-orders", "status": "paid", "start_date": "2024-01-01", "end_date": "2024-12-31" } }, ... ] }

Valid intents (can use multiple in one message):
- purchase_orders: purchase order list (일반 발주 목록)
- purchase_orders_unshipped: items NOT YET SHIPPED from factory/warehouse (공장·창고 미출고)
- not_arrived: items NOT YET ARRIVED IN KOREA (한국 미도착). "한국 미도착", "입고 안 된" 등.
- products: product list (상품)
- projects: project list (프로젝트)
- payment_requests: payment request list (지급 요청)
- packing_lists: packing list (패킹리스트, 출고 리스트)
- payment_history: payment/transaction history (결제내역, 입금 내역)
- materials: materials/parts list (부자재, 자재, 소재)
- logistics_options: logistics companies and warehouses (물류 회사, 창고)
- stock_outbound: stock outbound records (재고 출고)
- admin_accounts: admin account list (관리자 계정)
- permissions: permission settings by resource (권한 설정)

CRITICAL: "한국 미도착", "도착하지 않은" → not_arrived. "미출고 발주" → purchase_orders_unshipped.

Params: limit (1-30), search, page, year, month (1-12), type (purchase-orders|packing-lists), status (all|paid|pending), start_date, end_date (YYYY-MM-DD)

If the user wants several things, include multiple objects in "queries". If just greeting, use: { "queries": [] }.

Examples:
- "패킹리스트 보여줘" → {"queries":[{"intent":"packing_lists","params":{"limit":15}}]}
- "결제 내역 알려줘" → {"queries":[{"intent":"payment_history","params":{"limit":20}}]}
- "자재 목록" → {"queries":[{"intent":"materials","params":{"limit":15}}]}
- "물류 회사 목록" → {"queries":[{"intent":"logistics_options","params":{}}]}
- "출고 기록" → {"queries":[{"intent":"stock_outbound","params":{"limit":20}}]}
- "관리자 목록" → {"queries":[{"intent":"admin_accounts","params":{"limit":20}}]}
- "권한 설정" → {"queries":[{"intent":"permissions","params":{}}]}`;

export interface DetectedQuery {
  intent: string;
  params: { limit?: number; search?: string; page?: number; year?: number; month?: number; type?: string; status?: string; start_date?: string; end_date?: string };
}

export interface DetectedIntent {
  intent: string;
  params: DetectedQuery['params'];
}

const VALID_INTENTS = [
  'purchase_orders', 'purchase_orders_unshipped', 'not_arrived', 'products', 'projects', 'payment_requests',
  'packing_lists', 'payment_history', 'materials', 'logistics_options', 'stock_outbound', 'admin_accounts', 'permissions',
];

function parseParams(params: Record<string, unknown>): DetectedQuery['params'] {
  return {
    limit: typeof params.limit === 'number' ? Math.min(30, Math.max(1, params.limit)) : undefined,
    search: typeof params.search === 'string' ? params.search : undefined,
    page: typeof params.page === 'number' ? Math.max(1, params.page) : undefined,
    year: typeof params.year === 'number' ? params.year : undefined,
    month: typeof params.month === 'number' ? Math.min(12, Math.max(1, params.month)) : undefined,
    type: typeof params.type === 'string' ? params.type : undefined,
    status: typeof params.status === 'string' ? params.status : undefined,
    start_date: typeof params.start_date === 'string' ? params.start_date : undefined,
    end_date: typeof params.end_date === 'string' ? params.end_date : undefined,
  };
}

/**
 * 사용자 메시지에서 검색할 항목(복수 가능)과 파라미터를 추출합니다.
 */
export async function detectIntent(userMessage: string): Promise<{ queries: DetectedQuery[] }> {
  const normalized = userMessage.trim();
  if (!normalized) {
    return { queries: [] };
  }

  const result = await chatCompletion({
    messages: [
      { role: 'system', content: INTENT_SYSTEM },
      { role: 'user', content: normalized },
    ],
    max_tokens: 256,
  });

  const raw = result.choices?.[0]?.message?.content?.trim() ?? '';
  let jsonStr = raw;
  const codeBlock = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) jsonStr = codeBlock[1].trim();

  try {
    const parsed = JSON.parse(jsonStr) as { queries?: Array<{ intent?: string; params?: Record<string, unknown> }> };
    const list = Array.isArray(parsed?.queries) ? parsed.queries : [];
    const queries: DetectedQuery[] = [];
    for (const q of list) {
      const intent = String(q?.intent ?? '').toLowerCase();
      if (!VALID_INTENTS.includes(intent)) continue;
      queries.push({
        intent,
        params: q?.params && typeof q.params === 'object' ? parseParams(q.params) : {},
      });
    }
    return { queries };
  } catch {
    return { queries: [] };
  }
}
