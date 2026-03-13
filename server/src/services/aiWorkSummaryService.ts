import { ProductCollabRepository } from '../repositories/productCollabRepository.js';
import { getDelayInfo } from '../utils/delayRules.js';

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;
const QWEN_BASE_URL = process.env.QWEN_BASE_URL || 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1';
const SUMMARY_MODEL = process.env.QWEN_SUMMARY_MODEL || process.env.QWEN_MODEL || 'qwen-plus';
/** 연결/응답 타임아웃(ms). */
const QWEN_TIMEOUT_MS = Math.max(15000, parseInt(process.env.QWEN_SUMMARY_TIMEOUT_MS || '60000', 10) || 60000);
const QWEN_MAX_RETRIES = 2;
const QWEN_RETRY_DELAY_MS = 2000;

const BODY_SNIPPET_LEN = 200;

type ThreadMessageRow = { product_id: number; id: number; parent_id: number | null; author_name: string | null; body: string | null; created_at: Date };

function formatThreadMessages(messages: ThreadMessageRow[]): string {
  return messages
    .map((m) => {
      const dateStr = m.created_at instanceof Date ? m.created_at.toISOString() : String(m.created_at);
      const author = m.author_name ?? '-';
      const label = m.parent_id != null ? ' (댓글)' : '';
      const body = (m.body ?? '').trim() || '(없음)';
      const line = `${dateStr} ${author}${label}`;
      return m.parent_id != null ? `  >> ${line}\n  ${body}` : `--- ${line} ---\n${body}`;
    })
    .join('\n\n');
}

function isRetryableNetworkError(err: unknown): boolean {
  const code = err && typeof err === 'object' && 'cause' in err && err.cause && typeof (err.cause as { code?: string }).code === 'string'
    ? (err.cause as { code: string }).code
    : '';
  const msg = err instanceof Error ? err.message : String(err);
  return (
    code === 'UND_ERR_CONNECT_TIMEOUT' ||
    code === 'ECONNRESET' ||
    code === 'ETIMEDOUT' ||
    code === 'ECONNREFUSED' ||
    msg.includes('fetch failed') ||
    msg.includes('timeout')
  );
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface ProductSummaryInput {
  productId: number;
  productName: string;
  status: string;
  isDelayed: boolean;
  daysOverdue?: number;
  tasks: { assigneeName: string | null; bodySnippet: string; createdAt: string }[];
}

export interface MyTaskSummaryInput {
  productId: number;
  productName: string;
  status: string;
  priority: 'issue' | 'delayed' | 'normal';
  isDelayed: boolean;
  tasks: { bodySnippet: string; createdAt: string }[];
}

export interface OverallSummaryProduct {
  productId: number;
  productName: string;
  summary: string;
  delayedNote?: string;
  /** AI 요약 응답 시 서버에서 병합: 제품 상태(DB 값) */
  status?: string;
  /** AI 요약 응답 시 서버에서 병합: 1=문제발생, 2=지연, 3=그 외 */
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

function snippet(s: string | null): string {
  if (!s || !s.trim()) return '';
  const t = s.trim();
  return t.length <= BODY_SNIPPET_LEN ? t : t.slice(0, BODY_SNIPPET_LEN) + '...';
}

export async function getAiWorkSummary(userId: string, lang: 'ko' | 'zh'): Promise<AiWorkSummaryResult | null> {
  if (!DASHSCOPE_API_KEY) {
    console.warn('[AI Work Summary] DASHSCOPE_API_KEY not set.');
    return null;
  }

  const repo = new ProductCollabRepository();
  const [allProductRows, myRows] = await Promise.all([
    repo.findActiveProductsForSummary(),
    repo.findMyTasksWithProductInfoForSummary(userId),
  ]);

  console.log('[AI Work Summary] 1단계: findActiveProductsForSummary() 결과 (조건: 취소·생산완료 제외한 모든 제품)');
  console.log('[AI Work Summary]   - 제품(행) 수: %d', allProductRows.length);
  allProductRows.forEach((r, i) => {
    console.log('[AI Work Summary]   - [%d] product_id=%d name=%s status=%s', i, r.product_id, r.product_name ?? '', r.product_status);
  });

  const productMap = new Map<
    number,
    {
      productId: number;
      productName: string;
      status: string;
      lastActivityAt: Date;
      tasks: { assigneeName: string | null; bodySnippet: string; createdAt: string }[];
    }
  >();
  for (const r of allProductRows) {
    productMap.set(r.product_id, {
      productId: r.product_id,
      productName: r.product_name,
      status: r.product_status,
      lastActivityAt: r.last_activity_at,
      tasks: [],
    });
  }

  console.log('[AI Work Summary] 2단계: productMap 구성 (제품 1건당 1엔트리, 태스크 목록은 미사용)');
  console.log('[AI Work Summary]   - 제품 수: %d', productMap.size);
  for (const [pid, ent] of productMap) {
    console.log('[AI Work Summary]   - product_id=%d name=%s status=%s', pid, ent.productName, ent.status);
  }

  const overallProducts: ProductSummaryInput[] = [];
  for (const [, ent] of productMap) {
    const info = getDelayInfo(ent.status, ent.lastActivityAt);
    overallProducts.push({
      productId: ent.productId,
      productName: ent.productName,
      status: ent.status,
      isDelayed: info.isDelayed,
      daysOverdue: info.daysOverdue,
      tasks: ent.tasks,
    });
  }
  const overallOrder = (p: ProductSummaryInput) => {
    if (p.status === 'ISSUE_OCCURRED') return 0;
    if (p.isDelayed) return 1;
    return 2;
  };
  overallProducts.sort((a, b) => overallOrder(a) - overallOrder(b));
  console.log('[AI Work Summary] 3단계: overallProducts = productMap을 지연정보 포함해 리스트화 (정렬: 1순위 문제발생, 2순위 지연, 3순위 그 외)');
  console.log('[AI Work Summary]   - 전체 요약에 넘길 제품 수: %d', overallProducts.length);
  overallProducts.forEach((p, i) => {
    console.log('[AI Work Summary]   - [%d] productId=%d %s status=%s isDelayed=%s', i, p.productId, p.productName, p.status, p.isDelayed);
  });

  const myProductMap = new Map<
    number,
    {
      productId: number;
      productName: string;
      status: string;
      lastActivityAt: Date;
      isDelayed: boolean;
      tasks: { bodySnippet: string; createdAt: string }[];
    }
  >();
  for (const r of myRows) {
    const key = r.product_id;
    if (!myProductMap.has(key)) {
      const info = getDelayInfo(r.product_status, r.last_activity_at);
      myProductMap.set(key, {
        productId: r.product_id,
        productName: r.product_name,
        status: r.product_status,
        lastActivityAt: r.last_activity_at,
        isDelayed: info.isDelayed,
        tasks: [],
      });
    }
    const ent = myProductMap.get(key)!;
    ent.tasks.push({ bodySnippet: snippet(r.body), createdAt: String(r.created_at) });
  }

  const myTaskProducts: MyTaskSummaryInput[] = [];
  for (const [, ent] of myProductMap) {
    const info = getDelayInfo(ent.status, ent.lastActivityAt);
    let priority: 'issue' | 'delayed' | 'normal' = 'normal';
    if (ent.status === 'ISSUE_OCCURRED') priority = 'issue';
    else if (info.isDelayed) priority = 'delayed';
    myTaskProducts.push({
      productId: ent.productId,
      productName: ent.productName,
      status: ent.status,
      priority,
      isDelayed: info.isDelayed,
      tasks: ent.tasks,
    });
  }
  myTaskProducts.sort((a, b) => {
    const order = { issue: 0, delayed: 1, normal: 2 };
    return order[a.priority] - order[b.priority];
  });

  const productIds = Array.from(new Set([...productMap.keys(), ...myProductMap.keys()]));
  const threadRows = await repo.findThreadMessagesForSummary(productIds);
  const threadByProduct = new Map<number, ThreadMessageRow[]>();
  for (const row of threadRows) {
    if (!threadByProduct.has(row.product_id)) threadByProduct.set(row.product_id, []);
    threadByProduct.get(row.product_id)!.push(row);
  }
  const threadTextByProductId = new Map<number, string>();
  for (const [pid, msgs] of threadByProduct) {
    threadTextByProductId.set(pid, formatThreadMessages(msgs));
  }

  const langInstruction =
    lang === 'zh'
      ? 'Respond in Simplified Chinese only (简体中文).'
      : 'Respond in Korean only (한국어).';

  const overallText = overallProducts
    .map((p) => {
      const header = `[제품 ${p.productName} (id:${p.productId})] 상태:${p.status} ${p.isDelayed ? `지연(${p.daysOverdue ?? 0}일 초과)` : ''}`;
      const threadText = threadTextByProductId.get(p.productId) ?? '(쓰레드 없음)';
      return `${header}\n${threadText}`;
    })
    .join('\n\n');

  const myTasksText = myTaskProducts
    .map((p) => {
      const header = `[제품 ${p.productName} (id:${p.productId})] 우선순위:${p.priority} 상태:${p.status} ${p.isDelayed ? '지연' : ''}`;
      const threadText = threadTextByProductId.get(p.productId) ?? '(쓰레드 없음)';
      return `${header}\n${threadText}`;
    })
    .join('\n\n');

  const overallPrompt = `You are an assistant that summarizes work by product.
${langInstruction}
Below is the full thread (all messages and replies in chronological order) for each product. For each product, write a short summary (1-2 sentences) based on the entire conversation. If the product is marked as 지연 (delayed), add a separate "delayedNote" that emphasizes the delay.
Output ONLY a valid JSON object with this exact structure (no markdown, no extra text):
{"products":[{"productId":number,"productName":"string","summary":"string","delayedNote":"string or omit if not delayed"}]}

Input:
${overallText}`;

  const myTasksPrompt = `You are an assistant that summarizes my assigned tasks in priority order: 1) issue (문제 제품), 2) delayed (지연), 3) normal.
${langInstruction}
Below is the full thread (all messages and replies in chronological order) for each product in my task list. For each product, write a short summary (1-2 sentences) based on the entire conversation. Include the priority: "issue", "delayed", or "normal".
Output ONLY a valid JSON object with this exact structure (no markdown, no extra text):
{"items":[{"productId":number,"productName":"string","priority":"issue"|"delayed"|"normal","summary":"string"}]}

Input:
${myTasksText}`;

  console.log('[AI Work Summary] AI에 전달하는 제품 수: 전체 요약=%d, 내 업무 요약=%d', overallProducts.length, myTaskProducts.length);

  try {
    let overallSummary: OverallSummaryProduct[] = [];
    let myTasksSummary: MyTaskSummaryItem[] = [];

    if (overallProducts.length > 0) {
      const overallRes = await callQwen(overallPrompt);
      overallSummary = (overallRes?.products as OverallSummaryProduct[] | undefined) ?? [];
      if (overallSummary.length === 0) {
        overallSummary = overallProducts.map((p) => ({
          productId: p.productId,
          productName: p.productName,
          summary: '-',
          delayedNote: p.isDelayed ? (lang === 'zh' ? `已延迟 ${p.daysOverdue ?? 0} 天` : `${p.daysOverdue ?? 0}일 지연`) : undefined,
        }));
      }
      const priorityOf = (p: ProductSummaryInput): 'issue' | 'delayed' | 'normal' =>
        p.status === 'ISSUE_OCCURRED' ? 'issue' : p.isDelayed ? 'delayed' : 'normal';
      const productMeta = new Map(
        overallProducts.map((p) => [p.productId, { status: p.status, priority: priorityOf(p) }])
      );
      const metaKey = (id: number | string): number => (typeof id === 'number' ? id : Number(id));
      overallSummary = overallSummary.map((item) => {
        const pid = metaKey(item.productId);
        const meta = productMeta.get(pid);
        return {
          ...item,
          productId: pid,
          status: meta?.status,
          priority: meta?.priority ?? 'normal',
        };
      });
      overallSummary.sort((a, b) => {
        const order: Record<string, number> = { issue: 0, delayed: 1, normal: 2 };
        return (order[a.priority ?? 'normal'] ?? 2) - (order[b.priority ?? 'normal'] ?? 2);
      });
    }

    if (myTaskProducts.length > 0) {
      const myRes = await callQwen(myTasksPrompt);
      myTasksSummary = (myRes?.items as MyTaskSummaryItem[] | undefined) ?? [];
      if (myTasksSummary.length === 0) {
        myTasksSummary = myTaskProducts.map((p) => ({
          productId: p.productId,
          productName: p.productName,
          priority: p.priority,
          summary: '-',
        }));
      }
    }

    return { overallSummary, myTasksSummary };
  } catch (err) {
    console.error('[AI Work Summary] Qwen error:', err);
    return null;
  }
}

async function callQwen(userPrompt: string): Promise<Record<string, unknown> | null> {
  if (!DASHSCOPE_API_KEY) return null;
  const url = `${QWEN_BASE_URL.replace(/\/$/, '')}/chat/completions`;
  const payload = {
    model: SUMMARY_MODEL,
    messages: [{ role: 'user', content: userPrompt }],
    max_tokens: 2048,
    temperature: 0.3,
    response_format: { type: 'json_object' as const },
  };

  let lastErr: unknown;
  for (let attempt = 0; attempt <= QWEN_MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), QWEN_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${DASHSCOPE_API_KEY}`,
        },
        body: JSON.stringify(payload),
      });
      clearTimeout(timeoutId);
      if (!res.ok) {
        const errBody = await res.text();
        console.error('[AI Work Summary] Qwen API error:', res.status, errBody);
        return null;
      }
      const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const raw = data.choices?.[0]?.message?.content?.trim();
      if (!raw) return null;
      try {
        return JSON.parse(raw) as Record<string, unknown>;
      } catch {
        console.error('[AI Work Summary] Invalid JSON from Qwen:', raw.slice(0, 200));
        return null;
      }
    } catch (err) {
      clearTimeout(timeoutId);
      lastErr = err;
      if (attempt < QWEN_MAX_RETRIES && isRetryableNetworkError(err)) {
        console.warn('[AI Work Summary] Qwen request failed, retrying...', err instanceof Error ? err.message : err);
        await delay(QWEN_RETRY_DELAY_MS);
        continue;
      }
      break;
    }
  }
  console.error('[AI Work Summary] Qwen error:', lastErr);
  return null;
}
