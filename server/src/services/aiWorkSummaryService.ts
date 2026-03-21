import { ProductCollabRepository } from '../repositories/productCollabRepository.js';
import { getDelayInfo } from '../utils/delayRules.js';
import { setPhase } from '../state/aiWorkSummaryState.js';

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

/** AI 응답에서 마크다운 코드블록 제거 후 JSON 파싱. 실패 시 null */
function parseJSONFromRaw(raw: string): Record<string, unknown> | null {
  let s = raw.trim();
  const codeBlockMatch = s.match(/^```(?:json)?\s*([\s\S]*?)```\s*$/);
  if (codeBlockMatch) s = codeBlockMatch[1].trim();
  const first = s.indexOf('{');
  const last = s.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) s = s.slice(first, last + 1);
  try {
    return JSON.parse(s) as Record<string, unknown>;
  } catch {
    return null;
  }
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

/** 상태 카테고리별 한 덩어리 요약 (제품별 요약을 상태로 묶어 요약) */
export interface StatusCategorySummary {
  status: string;
  summary: string;
  productCount: number;
  /** 관련 제품 목록 (클라이언트에서 링크용) */
  products?: { productId: number; productName: string }[];
}

export interface AiWorkSummaryResult {
  overallSummary: OverallSummaryProduct[];
  myTasksSummary: MyTaskSummaryItem[];
  /** 내 업무 전체를 한 문장으로 요약(지연·문제 우선 강조) */
  myTasksOverallSummary?: string;
  /** 상태 카테고리별 요약 (전체 요약 제품을 상태로 그룹한 뒤 그룹당 1문단) */
  statusCategorySummaries?: StatusCategorySummary[];
  /** 요약 생성에 사용된 AI (OpenAI 1순위, 실패 시 Qwen) */
  provider?: SummaryProvider;
}

/** 전체 요약에 등장하는 상태의 표시 순서: 문제발생→발주대기→샘플테스트→구성확정→조사중→입고중→생산중→생산완료 */
const STATUS_ORDER_FOR_SUMMARY = [
  'ISSUE_OCCURRED',   // 1 문제발생
  'ORDER_PENDING',    // 2 발주대기
  'SAMPLE_TEST',      // 3 샘플테스트
  'CONFIG_CONFIRM',   // 4 구성확정중
  'RESEARCH',         // 5 조사중
  'INCOMING',         // 6 입고중
  'IN_PRODUCTION',    // 7 생산중
  'PRODUCTION_COMPLETE', // 8 생산완료
] as const;

/** 방식 B: 출력 언어별 프롬프트 문구. 사이트 설정 언어와 동일한 언어로 결과를 내도록 강하게 명시 */
const LANG_PROMPT = {
  ko: {
    outputLanguageBanner: 'OUTPUT LANGUAGE (REQUIRED): The site language is Korean (한국어). You MUST write ALL summary, delayedNote, and overallSummary text in Korean only. Use formal polite style (경어체): -합니다, -해요, -입니다. Do not use casual endings (-해, -야, -이다).',
    langInstruction: 'Respond in Korean only (한국어). Use formal polite style (경어체): -합니다, -해요, -입니다, -세요, -십시오. Do not use casual endings (-해, -야, -이다).',
    summaryStyle: 'Write all summary and delayedNote text in formal polite Korean (경어체). Every user-visible string in the JSON MUST be in Korean.',
    myTasksStyle: 'Write all summary text in formal polite Korean (경어체). Every user-visible string in the JSON MUST be in Korean.',
    noThread: '(쓰레드 없음)',
    statusLangInstruction: 'OUTPUT LANGUAGE (REQUIRED): Korean (한국어). The site language is Korean. You MUST write every status summary in Korean only. Use formal polite style (경어체).',
    statusFallbackSummary: (n: number) => `해당 상태 제품 ${n}건입니다.`,
    delayedLabel: '지연',
    fallbackDelayedNote: (days: number) => `${days}일 지연`,
  },
  zh: {
    outputLanguageBanner: 'OUTPUT LANGUAGE (REQUIRED): The site language is Simplified Chinese (简体中文). You MUST write ALL summary, delayedNote, and overallSummary text in 简体中文 only. If the input is in Korean or another language, translate your summary into Simplified Chinese before outputting. Do NOT output Korean in the result. Use formal polite style (敬语). Every user-visible string in the JSON MUST be in 简体中文.',
    langInstruction: 'Respond in Simplified Chinese only (简体中文). The site is set to Chinese; output must be in Chinese. Use formal polite style (敬语). Do not use Korean or casual expressions.',
    summaryStyle: 'Write all summary and delayedNote text in Simplified Chinese (简体中文) only. Translate any content into Chinese so the result matches the site language. Use formal polite style (敬语). Every user-visible string MUST be in 简体中文.',
    myTasksStyle: 'Write all summary text in Simplified Chinese (简体中文) only. Translate into Chinese so the result matches the site language. Use formal polite style (敬语). Every user-visible string MUST be in 简体中文.',
    noThread: '(无线程)',
    statusLangInstruction: 'OUTPUT LANGUAGE (REQUIRED): Simplified Chinese (简体中文). The site language is Chinese. You MUST write every status summary in 简体中文 only. Translate into Chinese if needed. Use formal polite style (敬语). Do not output Korean.',
    statusFallbackSummary: (n: number) => `该状态产品 ${n} 件。`,
    delayedLabel: '延迟',
    fallbackDelayedNote: (days: number) => `${days}天延迟`,
    /** 시스템 메시지: 모델이 출력 언어를 준수하도록 강제 (Qwen 등 일부 모델 대응) */
    systemMessageForSummary: 'You are a helpful assistant. CRITICAL RULE: The user interface language is Simplified Chinese (简体中文). You MUST write ALL text in the "summary", "delayedNote", "overallSummary" fields in 简体中文 ONLY. If the input is in Korean, translate it into Chinese. Never output Korean in these fields. Use formal polite style (敬语).',
    systemMessageForStatus: 'You are a helpful assistant. CRITICAL RULE: The user interface language is Simplified Chinese (简体中文). You MUST write every "summary" in statusSummaries in 简体中文 ONLY. Never output Korean. Use formal polite style (敬语).',
  },
} as const;

export type AiWorkSummaryLogger = (msg: string) => void;

/**
 * 제품별 요약을 상태로 그룹한 뒤, 각 상태 그룹당 1~2문장 요약 생성
 */
async function buildStatusCategorySummaries(
  overallSummary: OverallSummaryProduct[],
  lang: 'ko' | 'zh',
  onLog?: AiWorkSummaryLogger
): Promise<StatusCategorySummary[]> {
  const byStatus = new Map<string, OverallSummaryProduct[]>();
  for (const p of overallSummary) {
    const s = p.status ?? 'UNKNOWN';
    if (!byStatus.has(s)) byStatus.set(s, []);
    byStatus.get(s)!.push(p);
  }
  const orderedStatuses = STATUS_ORDER_FOR_SUMMARY.filter((s) => byStatus.has(s));
  const otherStatuses = [...byStatus.keys()].filter((s) => !STATUS_ORDER_FOR_SUMMARY.includes(s as (typeof STATUS_ORDER_FOR_SUMMARY)[number]));
  const statuses = [...orderedStatuses, ...otherStatuses];
  if (statuses.length === 0) return [];

  const { statusLangInstruction, statusFallbackSummary, delayedLabel } = LANG_PROMPT[lang];
  const lines = statuses.map((status) => {
    const products = byStatus.get(status) ?? [];
    const productLines = products.map((p) => `- ${p.productName}: ${p.summary}${p.delayedNote ? ` (${delayedLabel}: ${p.delayedNote})` : ''}`);
    return `[상태: ${status}]\n${productLines.join('\n')}`;
  });
  const prompt = `당신은 완구, 봉제 인형, 잡화 분야의 전문 소싱, 제작, 판매 전문 관리자 입니다. You are an assistant that summarizes work by status category.
${statusLangInstruction}
Below are products grouped by status. Each group has a status label and the per-product summaries. For each status group, write ONE short summary (1-2 sentences) that captures the overall situation of that group. Output ONLY a valid JSON object with this exact structure (no markdown, no extra text):
{"statusSummaries":[{"status":"string","summary":"string"}]}

Input (status groups in order):
${lines.join('\n\n')}`;

  console.log('[AI Work Summary] AI 전달 프롬프트 (상태 카테고리 요약, lang=%s):\n%s', lang, prompt);
  onLog?.('상태별 요약 생성 중...');
  const statusSystemMsg = lang === 'zh' ? LANG_PROMPT.zh.systemMessageForStatus : undefined;
  const res = await callChatForSummary(prompt, statusSystemMsg);
  onLog?.('상태별 요약 완료');
  const raw = res?.data?.statusSummaries;
  const toProducts = (list: OverallSummaryProduct[]): { productId: number; productName: string }[] =>
    list.map((p) => ({ productId: p.productId, productName: p.productName }));

  if (!Array.isArray(raw) || raw.length === 0) {
    return statuses.map((status) => {
      const list = byStatus.get(status) ?? [];
      return {
        status,
        summary: statusFallbackSummary(list.length),
        productCount: list.length,
        products: toProducts(list),
      };
    });
  }
  const byStatusResult = new Map<string, { summary: string }>();
  for (const item of raw) {
    if (item && typeof item.status === 'string' && typeof item.summary === 'string') {
      byStatusResult.set(item.status, { summary: item.summary });
    }
  }
  return statuses.map((status) => {
    const list = byStatus.get(status) ?? [];
    return {
      status,
      summary: byStatusResult.get(status)?.summary ?? statusFallbackSummary(list.length),
      productCount: list.length,
      products: toProducts(list),
    };
  });
}

function snippet(s: string | null): string {
  if (!s || !s.trim()) return '';
  const t = s.trim();
  return t.length <= BODY_SNIPPET_LEN ? t : t.slice(0, BODY_SNIPPET_LEN) + '...';
}

export interface GetAiWorkSummaryOptions {
  onLog?: AiWorkSummaryLogger;
}

export async function getAiWorkSummary(userId: string, lang: 'ko' | 'zh', opts?: GetAiWorkSummaryOptions): Promise<AiWorkSummaryResult | null> {
  const onLog = opts?.onLog;
  console.log('[AI Work Summary] getAiWorkSummary 시작 lang=%s', lang);
  onLog?.('요약 생성 시작');
  setPhase(userId, lang, 'summarizing');
  if (!OPENAI_API_KEY && !DASHSCOPE_API_KEY) {
    onLog?.('오류: API 키가 설정되지 않았습니다.');
    console.warn('[AI Work Summary] OPENAI_API_KEY와 DASHSCOPE_API_KEY 중 하나 이상 필요합니다.');
    return null;
  }

  onLog?.('데이터 수집 중...');
  const repo = new ProductCollabRepository();
  const [allProductRows, myRows] = await Promise.all([
    repo.findActiveProductsForSummary(),
    repo.findMyTasksWithProductInfoForSummary(userId),
  ]);

  onLog?.(`제품 ${allProductRows.length}건, 내 업무 ${myRows.length}건 로드 완료`);
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
  // 방식 B: 요청 lang에 따라 프롬프트 출력 언어 지정 (한 번에 해당 언어로 요약, 별도 번역 없음)
  const promptLang: 'ko' | 'zh' = lang;
  const { outputLanguageBanner, langInstruction, summaryStyle, myTasksStyle, noThread, fallbackDelayedNote } = LANG_PROMPT[lang];
  const threadTextByProductId = new Map<number, string>();
  for (const [pid, msgs] of threadByProduct) {
    threadTextByProductId.set(pid, formatThreadMessages(msgs, promptLang));
  }

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

  const overallPrompt = `당신은 완구, 봉제 인형, 잡화 분야의 전문 소싱, 제작, 판매 전문 관리자 입니다. You are an assistant that summarizes work by product.
${outputLanguageBanner}
${langInstruction}
${summaryStyle}
Below is the full thread (all messages and replies in chronological order) for each product. For each product, write a short summary (1-2 sentences) based on the entire conversation. If the product is marked as 지연 (delayed), add a separate "delayedNote" that emphasizes the delay.
Output ONLY a valid JSON object with this exact structure (no markdown, no extra text):
{"products":[{"productId":number,"productName":"string","summary":"string","delayedNote":"string or omit if not delayed"}]}

Input:
${overallText}`;

  const myTasksPrompt = `당신은 완구, 봉제 인형, 잡화 분야의 전문 소싱, 제작, 판매 전문 관리자 입니다. You are an assistant that summarizes my assigned tasks in priority order: 1) issue (문제 제품), 2) delayed (지연), 3) normal.
${outputLanguageBanner}
${langInstruction}
${myTasksStyle}
Below is the full thread (all messages and replies in chronological order) for each product in my task list.
1) For each product, write a short summary (1-2 sentences) in "items".
2) Also write ONE "overallSummary" sentence (1-2 sentences) that summarizes ALL my tasks above. In this sentence, emphasize delayed and issue items FIRST and clearly (e.g. "지연·문제 업무를 우선 ...").
Output ONLY a valid JSON object with this exact structure (no markdown, no extra text):
{"items":[{"productId":number,"productName":"string","priority":"issue"|"delayed"|"normal","summary":"string"}],"overallSummary":"string"}

Input:
${myTasksText}`;

  console.log('[AI Work Summary] AI에 전달하는 제품 수: 전체 요약=%d, 내 업무 요약=%d', overallProducts.length, myTaskProducts.length);

  try {
    let overallSummary: OverallSummaryProduct[] = [];
    let myTasksSummary: MyTaskSummaryItem[] = [];
    let myTasksOverallSummary: string | undefined;
    let statusCategorySummaries: StatusCategorySummary[] = [];

    let summaryProvider: SummaryProvider | undefined;
    if (overallProducts.length > 0) {
      onLog?.('전체 요약 AI 처리 중...');
      console.log('[AI Work Summary] 전체 요약 API 호출 (lang=%s, 방식 B: 해당 언어로 직접 출력)', lang);
      console.log('[AI Work Summary] AI 전달 프롬프트 (전체 제품 요약):\n%s', overallPrompt);
      const overallSystemMsg = lang === 'zh' ? LANG_PROMPT.zh.systemMessageForSummary : undefined;
      const overallRes = await callChatForSummary(overallPrompt, overallSystemMsg);
      onLog?.('전체 요약 완료');
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
          delayedNote: p.isDelayed ? fallbackDelayedNote(p.daysOverdue ?? 0) : undefined,
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

      // 상태 카테고리별 요약 생성 (제품별 요약을 상태로 묶어 그룹당 1문단)
      statusCategorySummaries = await buildStatusCategorySummaries(overallSummary, lang, onLog);
    }

    if (myTaskProducts.length > 0) {
      onLog?.('내 업무 요약 AI 처리 중...');
      console.log('[AI Work Summary] 내 업무 요약 API 호출 (lang=%s)', lang);
      console.log('[AI Work Summary] AI 전달 프롬프트 (내 업무 요약):\n%s', myTasksPrompt);
      const myTasksSystemMsg = lang === 'zh' ? LANG_PROMPT.zh.systemMessageForSummary : undefined;
      const myRes = await callChatForSummary(myTasksPrompt, myTasksSystemMsg);
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
      onLog?.('내 업무 요약 완료');
      myTasksSummary = (myRes?.data?.items as MyTaskSummaryItem[] | undefined) ?? [];
      if (myTasksSummary.length === 0) {
        myTasksSummary = myTaskProducts.map((p) => ({
          productId: p.productId,
          productName: p.productName,
          priority: p.priority,
          summary: '-',
        }));
      }
      const rawOverall = myRes?.data?.overallSummary;
      myTasksOverallSummary =
        typeof rawOverall === 'string' && rawOverall.trim() ? rawOverall.trim() : undefined;
    }

    console.log('[AI Work Summary] 반환: overallSummary %d건, myTasksSummary %d건, provider=%s', overallSummary.length, myTasksSummary.length, summaryProvider ?? '');
    if (overallSummary.length > 0 && overallSummary[0]) {
      console.log('[AI Work Summary] 최종 전체 요약 첫 건 summary=%s', overallSummary[0].summary ?? '');
    }
    if (myTasksSummary.length > 0 && myTasksSummary[0]) {
      console.log('[AI Work Summary] 최종 내 업무 요약 첫 건 summary=%s', myTasksSummary[0].summary ?? '');
    }

    const result: AiWorkSummaryResult = {
      overallSummary,
      myTasksSummary,
      ...(myTasksOverallSummary != null && myTasksOverallSummary !== '' && { myTasksOverallSummary }),
      ...(statusCategorySummaries.length > 0 && { statusCategorySummaries }),
      provider: summaryProvider,
    };

    // lang=zh 요청인데 AI가 한국어로 응답한 경우: 기존 번역 API로 중국어 변환 후 반환 (Qwen 등 대응)
    if (lang === 'zh' && resultContainsKorean(result)) {
      onLog?.('중국어 번역 중...');
      console.log('[AI Work Summary] 응답에 한글 포함됨 → 중국어로 번역 후 반환');
      const translated = await translateSummaryToChinese(result, onLog);
      if (translated) {
        onLog?.('번역 완료');
        console.log('[AI Work Summary] 번역 완료, 중국어 결과 반환');
        return translated;
      }
      onLog?.('번역 실패');
      console.warn('[AI Work Summary] 번역 실패, 한글 포함 결과 그대로 반환');
    }

    onLog?.('요약 생성 완료');
    return result;
  } catch (err) {
    onLog?.('요약 생성 실패');
    console.error('[AI Work Summary] Qwen error:', err);
    return null;
  }
}

/** 결과물에 한글이 포함되어 있는지 검사 (가-힣) */
function resultContainsKorean(result: AiWorkSummaryResult): boolean {
  const koreanRegex = /[가-힣]/;
  for (const p of result.overallSummary) {
    if (koreanRegex.test(p.summary ?? '') || koreanRegex.test(p.delayedNote ?? '')) return true;
  }
  for (const p of result.myTasksSummary) {
    if (koreanRegex.test(p.summary ?? '')) return true;
  }
  if (result.myTasksOverallSummary && koreanRegex.test(result.myTasksOverallSummary)) return true;
  for (const s of result.statusCategorySummaries ?? []) {
    if (koreanRegex.test(s.summary ?? '')) return true;
  }
  return false;
}

/** lang=zh일 때: 한국어 요약 결과의 summary, delayedNote, myTasksOverallSummary, statusCategorySummaries[].summary 만 중국어로 번역 */
async function translateSummaryToChinese(result: AiWorkSummaryResult, onLog?: AiWorkSummaryLogger): Promise<AiWorkSummaryResult | null> {
  const payload = JSON.stringify(result);
  const prompt = `The input below is a JSON object with text in **Korean (한국어)**. Your task is to translate ONLY the following fields **from Korean into Simplified Chinese (简体中文)**: "summary", "delayedNote", "myTasksOverallSummary", and each "summary" inside "statusCategorySummaries". All other fields (productId, productName, priority, status, productCount, etc.) must remain unchanged. Write the translated text in Chinese only; do not keep Korean in the output. Use Chinese polite/formal style (敬语). Keep the exact same JSON structure: same top-level keys (overallSummary, myTasksSummary, myTasksOverallSummary, statusCategorySummaries), same array lengths and order. Output valid JSON only, no markdown or explanation.

Input (Korean):
${payload}`;
  const systemMsg =
    '당신은 완구, 봉제 인형, 잡화 분야의 전문 소싱, 제작, 판매 전문 관리자 입니다. You are a translator. The input is in Korean. Output the same JSON with summary, delayedNote, myTasksOverallSummary, and statusCategorySummaries[].summary translated into Simplified Chinese (简体中文) only. Use formal polite style (敬语). Do not output Korean; the translated fields must be in Chinese. Keep all other fields unchanged. Preserve exact structure: same keys and array lengths. Output only valid JSON.';
  onLog?.('번역 AI 호출 중...');
  console.log('[AI Work Summary] AI 전달 프롬프트 (한→중 번역, user):\n%s', prompt);
  console.log('[AI Work Summary] AI 전달 프롬프트 (한→중 번역, system):\n%s', systemMsg);
  const res = await callChatForSummary(prompt, systemMsg, 4096);
  const data = res?.data;
  if (!data || typeof data !== 'object') {
    console.warn('[AI Work Summary] 번역 실패: API 응답 없음 또는 비객체');
    return null;
  }
  if (!Array.isArray(data.overallSummary) || !Array.isArray(data.myTasksSummary)) {
    console.warn('[AI Work Summary] 번역 실패: 응답 구조 이상 (overallSummary/myTasksSummary 배열 아님)');
    return null;
  }
  const arrOverall = data.overallSummary as OverallSummaryProduct[];
  const arrMyTasks = data.myTasksSummary as MyTaskSummaryItem[];
  if (arrOverall.length !== result.overallSummary.length || arrMyTasks.length !== result.myTasksSummary.length) {
    console.warn('[AI Work Summary] 번역 실패: 배열 길이 불일치');
    return null;
  }
  const translated: AiWorkSummaryResult = {
    overallSummary: arrOverall,
    myTasksSummary: arrMyTasks,
    myTasksOverallSummary:
      typeof data.myTasksOverallSummary === 'string' ? data.myTasksOverallSummary : (result.myTasksOverallSummary ?? undefined),
  };
  for (let i = 0; i < result.overallSummary.length && i < translated.overallSummary.length; i++) {
    translated.overallSummary[i].status = result.overallSummary[i].status;
    translated.overallSummary[i].priority = result.overallSummary[i].priority;
  }
  if (Array.isArray(result.statusCategorySummaries) && result.statusCategorySummaries.length > 0) {
    const translatedStatus = data.statusCategorySummaries as StatusCategorySummary[] | undefined;
    if (Array.isArray(translatedStatus) && translatedStatus.length === result.statusCategorySummaries.length) {
      translated.statusCategorySummaries = translatedStatus.map((item, i) => ({
        ...item,
        status: result.statusCategorySummaries![i].status,
        productCount: result.statusCategorySummaries![i].productCount,
        products: result.statusCategorySummaries![i].products,
      }));
    } else {
      console.warn('[AI Work Summary] 번역 실패: statusCategorySummaries 구조/길이 불일치');
      return null;
    }
  }
  return translated;
}

export interface TranslateAiWorkSummaryOptions {
  onLog?: AiWorkSummaryLogger;
}

/** 한국어 요약 캐시를 읽어 중국어로 번역한 결과 반환. 캐시 없거나 번역 실패 시 null */
export async function translateAiWorkSummaryFromCache(userId: string, opts?: TranslateAiWorkSummaryOptions): Promise<AiWorkSummaryResult | null> {
  const onLog = opts?.onLog;
  onLog?.('번역 시작 (한국어 → 중국어)');
  const { getAiWorkSummaryCache } = await import('../repositories/aiWorkSummaryCacheRepository.js');
  const cached = await getAiWorkSummaryCache(userId, 'ko');
  if (!cached?.result) {
    onLog?.('오류: 한국어 요약 캐시가 없습니다.');
    console.warn('[AI Work Summary] 번역 불가: 한국어 요약 캐시 없음 userId=%s', userId);
    return null;
  }
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (attempt > 1) onLog?.(`번역 재시도 (${attempt}/${maxAttempts})`);
    const translated = await translateSummaryToChinese(cached.result, onLog);
    if (translated) {
      onLog?.('번역 완료');
      return translated;
    }
    if (attempt < maxAttempts) {
      console.warn('[AI Work Summary] 번역 실패, 재시도 %d/%d', attempt, maxAttempts);
      await delay(1500);
    }
  }
  onLog?.('번역 실패');
  console.warn('[AI Work Summary] 번역 실패(%d회 시도)', maxAttempts);
  return null;
}

type CallChatResult = { data: Record<string, unknown>; provider: SummaryProvider };

/** OpenAI 1순위, 실패 시 Qwen 2순위. 사용된 AI(provider) 함께 반환. maxTokens 기본 2048, 번역 시 4096 권장 */
async function callChatForSummary(userPrompt: string, systemMessage?: string, maxTokens = 2048): Promise<CallChatResult | null> {
  let result = await callOpenAI(userPrompt, systemMessage, maxTokens);
  if (result != null) return { data: result, provider: 'openai' };
  result = await callQwen(userPrompt, systemMessage, maxTokens);
  if (result != null) return { data: result, provider: 'qwen' };
  return null;
}

async function callOpenAI(userPrompt: string, systemMessage?: string, maxTokens = 2048): Promise<Record<string, unknown> | null> {
  if (!OPENAI_API_KEY) return null;
  const url = `${OPENAI_BASE_URL.replace(/\/$/, '')}/chat/completions`;
  const messages: Array<{ role: 'user' | 'system'; content: string }> = systemMessage
    ? [{ role: 'system', content: systemMessage }, { role: 'user', content: userPrompt }]
    : [{ role: 'user', content: userPrompt }];
  const payload = {
    model: OPENAI_SUMMARY_MODEL,
    messages,
    max_tokens: maxTokens,
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
    const parsed = parseJSONFromRaw(raw);
    if (parsed) return parsed;
    console.warn('[AI Work Summary] Invalid JSON from OpenAI:', raw.slice(0, 200));
    return null;
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn('[AI Work Summary] OpenAI request failed, will try Qwen:', err instanceof Error ? err.message : err);
    return null;
  }
}

async function callQwen(userPrompt: string, systemMessage?: string, maxTokens = 2048): Promise<Record<string, unknown> | null> {
  if (!DASHSCOPE_API_KEY) return null;
  const url = `${QWEN_BASE_URL.replace(/\/$/, '')}/chat/completions`;
  const messages: Array<{ role: 'user' | 'system'; content: string }> = systemMessage
    ? [{ role: 'system', content: systemMessage }, { role: 'user', content: userPrompt }]
    : [{ role: 'user', content: userPrompt }];
  const payload = {
    model: SUMMARY_MODEL,
    messages,
    max_tokens: maxTokens,
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
      const parsed = parseJSONFromRaw(raw);
      if (parsed) return parsed;
      console.error('[AI Work Summary] Invalid JSON from Qwen:', raw.slice(0, 200));
      return null;
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
