import { ProductCollabRepository } from '../repositories/productCollabRepository.js';
import { getDelayInfo } from '../utils/delayRules.js';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
const OPENAI_SUMMARY_MODEL = process.env.OPENAI_SUMMARY_MODEL || process.env.OPENAI_TRANSLATION_MODEL || 'gpt-4o-mini';

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;
const QWEN_BASE_URL = process.env.QWEN_BASE_URL || 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1';
const SUMMARY_MODEL = process.env.QWEN_SUMMARY_MODEL || process.env.QWEN_MODEL || 'qwen-plus';
/** 연결/응답 타임아웃(ms). */
const QWEN_TIMEOUT_MS = Math.max(15000, parseInt(process.env.QWEN_SUMMARY_TIMEOUT_MS || '60000', 10) || 60000);
const SUMMARY_TIMEOUT_MS = Math.max(15000, parseInt(process.env.AI_SUMMARY_TIMEOUT_MS || '60000', 10) || 60000);
const QWEN_MAX_RETRIES = 2;
const QWEN_RETRY_DELAY_MS = 2000;

const BODY_SNIPPET_LEN = 200;

type ThreadMessageRow = { product_id: number; id: number; parent_id: number | null; author_name: string | null; body: string | null; created_at: Date };

function formatThreadMessages(messages: ThreadMessageRow[], lang: 'ko' | 'zh'): string {
  const replyLabel = lang === 'zh' ? ' (回复)' : ' (댓글)';
  const emptyBody = lang === 'zh' ? '(无)' : '(없음)';
  return messages
    .map((m) => {
      const dateStr = m.created_at instanceof Date ? m.created_at.toISOString() : String(m.created_at);
      const author = m.author_name ?? '-';
      const label = m.parent_id != null ? replyLabel : '';
      const body = (m.body ?? '').trim() || emptyBody;
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

export type SummaryProvider = 'openai' | 'qwen';

export interface AiWorkSummaryResult {
  overallSummary: OverallSummaryProduct[];
  myTasksSummary: MyTaskSummaryItem[];
  /** 요약 생성에 사용된 AI (OpenAI 1순위, 실패 시 Qwen) */
  provider?: SummaryProvider;
}

function snippet(s: string | null): string {
  if (!s || !s.trim()) return '';
  const t = s.trim();
  return t.length <= BODY_SNIPPET_LEN ? t : t.slice(0, BODY_SNIPPET_LEN) + '...';
}

export async function getAiWorkSummary(userId: string, lang: 'ko' | 'zh'): Promise<AiWorkSummaryResult | null> {
  console.log('[AI Work Summary] getAiWorkSummary 시작 lang=%s', lang);
  if (!OPENAI_API_KEY && !DASHSCOPE_API_KEY) {
    console.warn('[AI Work Summary] OPENAI_API_KEY와 DASHSCOPE_API_KEY 중 하나 이상 필요합니다.');
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
  // lang=zh일 때는 모델이 한국어로 잘 나오므로, 한국어로 요약한 뒤 번역 단계로 중국어 변환
  const promptLang: 'ko' | 'zh' = lang === 'zh' ? 'ko' : lang;
  const threadTextByProductId = new Map<number, string>();
  for (const [pid, msgs] of threadByProduct) {
    threadTextByProductId.set(pid, formatThreadMessages(msgs, promptLang));
  }

  const langInstruction = 'Respond in Korean only (한국어).';
  const noThread = '(쓰레드 없음)';
  const overallText = overallProducts
    .map((p) => {
      const header = `[제품 ${p.productName} (id:${p.productId})] 상태:${p.status} ${p.isDelayed ? `지연(${p.daysOverdue ?? 0}일 초과)` : ''}`;
      const threadText = threadTextByProductId.get(p.productId) ?? noThread;
      return `${header}\n${threadText}`;
    })
    .join('\n\n');

  const myTasksText = myTaskProducts
    .map((p) => {
      const header = `[제품 ${p.productName} (id:${p.productId})] 우선순위:${p.priority} 상태:${p.status} ${p.isDelayed ? '지연' : ''}`;
      const threadText = threadTextByProductId.get(p.productId) ?? noThread;
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

    let summaryProvider: SummaryProvider | undefined;
    if (overallProducts.length > 0) {
      console.log('[AI Work Summary] 전체 요약 API 호출 (lang=%s, 한국어 요약 후 zh면 번역)', lang);
      const overallRes = await callChatForSummary(overallPrompt);
      if (overallRes?.data && typeof overallRes.data === 'object') {
        summaryProvider = overallRes.provider;
        const products = overallRes.data.products as OverallSummaryProduct[] | undefined;
        const first = Array.isArray(products) && products[0] ? products[0] : null;
        if (first) {
          console.log('[AI Work Summary] 전체 요약 API 응답 샘플(첫 항목) productId=%s summary=%s delayedNote=%s', first.productId, (first as { summary?: string }).summary ?? '', (first as { delayedNote?: string }).delayedNote ?? '');
        }
      } else {
        console.log('[AI Work Summary] 전체 요약 API 응답: null 또는 비정상');
      }
      overallSummary = (overallRes?.data?.products as OverallSummaryProduct[] | undefined) ?? [];
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
      console.log('[AI Work Summary] 내 업무 요약 API 호출 (lang=%s)', lang);
      const myRes = await callChatForSummary(myTasksPrompt);
      if (myRes?.data && typeof myRes.data === 'object') {
        if (summaryProvider === undefined) summaryProvider = myRes.provider;
        const items = myRes.data.items as MyTaskSummaryItem[] | undefined;
        const first = Array.isArray(items) && items[0] ? items[0] : null;
        if (first) {
          console.log('[AI Work Summary] 내 업무 요약 API 응답 샘플(첫 항목) productId=%s summary=%s', first.productId, (first as { summary?: string }).summary ?? '');
        }
      } else {
        console.log('[AI Work Summary] 내 업무 요약 API 응답: null 또는 비정상');
      }
      myTasksSummary = (myRes?.data?.items as MyTaskSummaryItem[] | undefined) ?? [];
      if (myTasksSummary.length === 0) {
        myTasksSummary = myTaskProducts.map((p) => ({
          productId: p.productId,
          productName: p.productName,
          priority: p.priority,
          summary: '-',
        }));
      }
    }

    if (lang === 'zh' && (overallSummary.length > 0 || myTasksSummary.length > 0)) {
      console.log('[AI Work Summary] lang=zh: 한국어 요약을 중국어로 번역 단계 시작');
      const translated = await translateSummaryToChinese({ overallSummary, myTasksSummary });
      if (translated) {
        overallSummary = translated.overallSummary;
        myTasksSummary = translated.myTasksSummary;
        console.log('[AI Work Summary] 번역 완료');
      } else {
        console.warn('[AI Work Summary] 번역 실패, 한국어 결과 반환');
      }
    }
    console.log('[AI Work Summary] 반환: overallSummary %d건, myTasksSummary %d건, provider=%s', overallSummary.length, myTasksSummary.length, summaryProvider ?? '');
    if (overallSummary.length > 0 && overallSummary[0]) {
      console.log('[AI Work Summary] 최종 전체 요약 첫 건 summary=%s', overallSummary[0].summary ?? '');
    }
    if (myTasksSummary.length > 0 && myTasksSummary[0]) {
      console.log('[AI Work Summary] 최종 내 업무 요약 첫 건 summary=%s', myTasksSummary[0].summary ?? '');
    }
    return { overallSummary, myTasksSummary, provider: summaryProvider };
  } catch (err) {
    console.error('[AI Work Summary] Qwen error:', err);
    return null;
  }
}

/** lang=zh일 때: 한국어 요약 결과의 summary, delayedNote 만 중국어로 번역 */
async function translateSummaryToChinese(result: AiWorkSummaryResult): Promise<AiWorkSummaryResult | null> {
  const payload = JSON.stringify(result);
  const prompt = `Translate the following JSON to Simplified Chinese (简体中文). Translate ONLY the "summary" and "delayedNote" string values. Do not change productId, productName, priority, status, or any other field. Keep the exact same JSON structure. Output valid JSON only, no markdown or explanation.

Input:
${payload}`;
  const systemMsg = 'You are a translator. Output only valid JSON. Translate only the summary and delayedNote text values to Simplified Chinese. Keep all other fields unchanged.';
  const res = await callChatForSummary(prompt, systemMsg);
  const data = res?.data;
  if (!data || !Array.isArray(data.overallSummary) || !Array.isArray(data.myTasksSummary)) {
    return null;
  }
  const translated: AiWorkSummaryResult = {
    overallSummary: data.overallSummary as OverallSummaryProduct[],
    myTasksSummary: data.myTasksSummary as MyTaskSummaryItem[],
  };
  for (let i = 0; i < result.overallSummary.length && i < translated.overallSummary.length; i++) {
    translated.overallSummary[i].status = result.overallSummary[i].status;
    translated.overallSummary[i].priority = result.overallSummary[i].priority;
  }
  return translated;
}

type CallChatResult = { data: Record<string, unknown>; provider: SummaryProvider };

/** OpenAI 1순위, 실패 시 Qwen 2순위. 사용된 AI(provider) 함께 반환 */
async function callChatForSummary(userPrompt: string, systemMessage?: string): Promise<CallChatResult | null> {
  let result = await callOpenAI(userPrompt, systemMessage);
  if (result != null) return { data: result, provider: 'openai' };
  result = await callQwen(userPrompt, systemMessage);
  if (result != null) return { data: result, provider: 'qwen' };
  return null;
}

async function callOpenAI(userPrompt: string, systemMessage?: string): Promise<Record<string, unknown> | null> {
  if (!OPENAI_API_KEY) return null;
  const url = `${OPENAI_BASE_URL.replace(/\/$/, '')}/chat/completions`;
  const messages: Array<{ role: 'user' | 'system'; content: string }> = systemMessage
    ? [{ role: 'system', content: systemMessage }, { role: 'user', content: userPrompt }]
    : [{ role: 'user', content: userPrompt }];
  const payload = {
    model: OPENAI_SUMMARY_MODEL,
    messages,
    max_tokens: 2048,
    temperature: 0.3,
    response_format: { type: 'json_object' as const },
  };
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SUMMARY_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      const errBody = await res.text();
      console.warn('[AI Work Summary] OpenAI API error:', res.status, errBody.slice(0, 300));
      return null;
    }
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = data.choices?.[0]?.message?.content?.trim();
    if (!raw) return null;
    console.log('[AI Work Summary] OpenAI 원문 응답 길이=%d, 앞 400자=%s', raw.length, raw.slice(0, 400));
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      console.warn('[AI Work Summary] Invalid JSON from OpenAI:', raw.slice(0, 200));
      return null;
    }
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn('[AI Work Summary] OpenAI request failed, will try Qwen:', err instanceof Error ? err.message : err);
    return null;
  }
}

async function callQwen(userPrompt: string, systemMessage?: string): Promise<Record<string, unknown> | null> {
  if (!DASHSCOPE_API_KEY) return null;
  const url = `${QWEN_BASE_URL.replace(/\/$/, '')}/chat/completions`;
  const messages: Array<{ role: 'user' | 'system'; content: string }> = systemMessage
    ? [{ role: 'system', content: systemMessage }, { role: 'user', content: userPrompt }]
    : [{ role: 'user', content: userPrompt }];
  const payload = {
    model: SUMMARY_MODEL,
    messages,
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
      if (!raw) {
        console.log('[AI Work Summary] Qwen 응답 본문 없음');
        return null;
      }
      console.log('[AI Work Summary] Qwen 원문 응답 길이=%d, 앞 400자=%s', raw.length, raw.slice(0, 400));
      try {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        return parsed;
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
