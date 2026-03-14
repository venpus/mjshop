/**
 * 스레드 메시지 한↔중 번역
 *
 * 이 번역 기능은 봉제인형, 완구, 악세사리 사업의 제조·발주·QC·판매 등 전반적인 업무에서
 * 한국어·중국어 소통을 지원하기 위해 사용됩니다. 스레드에 작성된 원문 아래에 반대 언어로
 * 번역문을 표시하여 양국 팀 간 협업을 돕습니다.
 *
 * - DASHSCOPE_API_KEY가 있으면 QWEN(다스스코프) 사용 (중국 등에서 접근 용이)
 * - 없으면 OPENAI_API_KEY로 OpenAI 사용
 */

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;
const QWEN_BASE_URL = process.env.QWEN_BASE_URL || 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1';
const QWEN_MODEL = process.env.QWEN_MODEL || 'qwen-flash';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_TRANSLATION_MODEL || 'gpt-4o-mini';

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1500;

/** 한글/중문 비율로 원문 언어 추정 (번역 방향 결정용). 스크립트에서도 사용 */
export function detectSourceLanguage(text: string): 'ko' | 'zh' | 'unknown' {
  const t = text.replace(/\s/g, '');
  if (!t.length) return 'unknown';
  let korean = 0;
  let chinese = 0;
  for (const c of t) {
    const code = c.codePointAt(0) ?? 0;
    if (code >= 0xac00 && code <= 0xd7af) korean++;
    else if (code >= 0x4e00 && code <= 0x9fff) chinese++;
    else if (code >= 0x3400 && code <= 0x4dbf) chinese++;
  }
  if (korean > chinese) return 'ko';
  if (chinese > korean) return 'zh';
  return 'unknown';
}

const PERSONA = 'You are a translator specialized in toys, general merchandise, manufacturing, sales, and research (완구·잡화·제작·판매·조사 분야 전문가). ';

/** 제조 문서 번역용 페르소나: 완구, 봉제, 잡화 전문 + 한국어·중국어 능통 */
const MANUFACTURING_PERSONA =
  'You are an expert in toys, plush (봉제), and general merchandise (잡화), with strong proficiency in Korean and Chinese. You translate product and manufacturing-related text accurately and naturally for both languages. ';

/** 원문 언어에 따라 번역 방향 명시 (중국어→한국어, 한국어→중국어만) + 양쪽 모두 경어체 사용 */
function getSystemPrompt(sourceLang: 'ko' | 'zh' | 'unknown'): string {
  if (sourceLang === 'zh') {
    return `${PERSONA}The user's message is in Chinese. Translate it into Korean only.
- Input: Chinese. Output: Korean only (한국어).
- Use Korean honorific/polite form (경어체) in the translation: use formal polite endings such as -합니다, -해요, -입니다, -세요, -십시오. Do not use casual/informal endings like -해, -야, -이다.
- Output ONLY the Korean translation. No explanations, no "Translation:", no quotes. Never use English or Chinese in the output.
将用户的中文翻译成韩语，只输出韩语。请使用韩语敬语体（경어체），使用 -합니다、-해요、-입니다 等礼貌语尾。`;
  }
  if (sourceLang === 'ko') {
    return `${PERSONA}The user's message is in Korean. Translate it into Simplified Chinese only.
- Input: Korean. Output: Simplified Chinese only (简体中文).
- Use Chinese polite/formal style (敬语): use 您 instead of 你 when referring to the reader/listener; use formal expressions (e.g. 请、可以、能否、敬请); avoid casual or colloquial expressions. Keep the tone professional and respectful.
- Output ONLY the Chinese translation. No explanations, no "Translation:", no quotes. Never use English or Korean in the output.
将用户的韩语翻译成简体中文，只输出中文。请使用敬语体：用“您”代替“你”，使用“请”“可以”“能否”等礼貌表达，语气正式得体。`;
  }
  return `${PERSONA}Translate between Korean and Simplified Chinese only. Never use English.
- If the message is mainly Korean, output Simplified Chinese only. Use Chinese polite style (敬语): 您, 请, formal expressions.
- If the message is mainly Chinese, output Korean only. Use Korean honorific form (경어체): -합니다, -해요, -입니다, -세요.
- Output ONLY the translated text. No explanations, no prefixes, no quotes.`;
}

/** 제조 문서용: 한국어 → 중국어(간체)만. 완구·봉제·잡화 전문 페르소나 */
function getManufacturingKoToZhPrompt(): string {
  return `${MANUFACTURING_PERSONA}The user's message is in Korean. Translate it into Simplified Chinese only.
- Input: Korean. Output: Simplified Chinese only (简体中文).
- Use Chinese polite/formal style (敬语): use 您 instead of 你 when referring to the reader; use formal expressions (e.g. 请、可以、能否); keep the tone professional.
- Preserve product names, model numbers, and technical terms when appropriate; translate only natural language.
- Output ONLY the Chinese translation. No explanations, no "Translation:", no quotes. Never use English or Korean in the output.`;
}

export type TranslationProvider = 'openai' | 'qwen';

export interface TranslateResult {
  translated: string;
  detectedLang?: 'ko' | 'zh';
  provider?: TranslationProvider;
}

/** 번역 결과가 영어 위주면 사용하지 않음 (한·중만 표시) */
function isMostlyEnglish(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;
  const latinOrSpace = (trimmed.match(/[a-zA-Z\s]/g) || []).length;
  const total = trimmed.replace(/\s/g, '').length;
  if (total === 0) return true;
  return latinOrSpace / trimmed.length > 0.6;
}

function isRetryableError(err: unknown): boolean {
  if (err instanceof Error && err.cause instanceof Error) {
    const code = (err.cause as NodeJS.ErrnoException).code;
    return code === 'ECONNRESET' || code === 'ETIMEDOUT' || code === 'ECONNREFUSED';
  }
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes('fetch failed') || msg.includes('ECONNRESET');
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callChatCompletions(
  baseUrl: string,
  apiKey: string,
  model: string,
  systemPrompt: string,
  text: string,
  provider: string
): Promise<string | null> {
  const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text },
      ],
      max_tokens: 1024,
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    console.error(`[Translation] ${provider} error:`, res.status, errBody);
    return null;
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const raw = data.choices?.[0]?.message?.content?.trim();
  if (!raw) return null;
  if (isMostlyEnglish(raw)) return null;
  return raw;
}

/**
 * 한↔중 번역 (원문이 한국어면 중국어로, 중국어면 한국어로)
 * OpenAI 1순위, 실패 시 Qwen 2순위. 둘 다 없으면 null.
 */
export async function translateKoreanChinese(text: string): Promise<TranslateResult | null> {
  const trimmed = (text || '').trim();
  if (!trimmed) return null;

  const useOpenAI = !!OPENAI_API_KEY;
  const useQwen = !!DASHSCOPE_API_KEY;
  if (!useOpenAI && !useQwen) {
    console.warn('[Translation] Neither OPENAI_API_KEY nor DASHSCOPE_API_KEY is set. Skipping translation.');
    return null;
  }

  const providers: { name: string; key: TranslationProvider; fn: () => Promise<string | null> }[] = [];
  const sourceLang = detectSourceLanguage(trimmed);
  const systemPrompt = getSystemPrompt(sourceLang);

  if (useOpenAI) {
    providers.push({
      name: 'OpenAI',
      key: 'openai',
      fn: () =>
        callChatCompletions(
          'https://api.openai.com/v1',
          OPENAI_API_KEY!,
          OPENAI_MODEL,
          systemPrompt,
          trimmed,
          'OpenAI'
        ),
    });
  }
  if (useQwen) {
    providers.push({
      name: 'QWEN',
      key: 'qwen',
      fn: () => callChatCompletions(QWEN_BASE_URL, DASHSCOPE_API_KEY!, QWEN_MODEL, systemPrompt, trimmed, 'QWEN'),
    });
  }

  let lastErr: unknown;
  for (const provider of providers) {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const content = await provider.fn();
        if (content) {
          const detectedLang: 'ko' | 'zh' | undefined =
            sourceLang === 'ko' ? 'ko' : sourceLang === 'zh' ? 'zh' : undefined;
          return { translated: content, detectedLang, provider: provider.key };
        }
        break;
      } catch (err) {
        lastErr = err;
        if (attempt < MAX_RETRIES && isRetryableError(err)) {
          console.warn(
            `[Translation] ${provider.name} attempt ${attempt + 1} failed, retrying in ${RETRY_DELAY_MS}ms...`,
            err instanceof Error ? err.message : err
          );
          await delay(RETRY_DELAY_MS);
        } else {
          console.warn(`[Translation] ${provider.name} failed:`, err instanceof Error ? err.message : err);
        }
      }
    }
  }

  console.error('[Translation] All providers failed:', lastErr);
  return null;
}

/**
 * 제조 문서용 한국어 → 중국어 번역 (OpenAI 1순위, Qwen 2순위, 완구·봉제·잡화 전문 페르소나)
 */
export async function translateManufacturingKoToZh(text: string): Promise<TranslateResult | null> {
  const trimmed = (text || '').trim();
  if (!trimmed) return null;

  const useOpenAI = !!OPENAI_API_KEY;
  const useQwen = !!DASHSCOPE_API_KEY;
  if (!useOpenAI && !useQwen) {
    console.warn('[Translation] Neither OPENAI_API_KEY nor DASHSCOPE_API_KEY is set. Skipping manufacturing translation.');
    return null;
  }

  const systemPrompt = getManufacturingKoToZhPrompt();
  const providers: { name: string; key: TranslationProvider; fn: () => Promise<string | null> }[] = [];
  if (useOpenAI) {
    providers.push({
      name: 'OpenAI',
      key: 'openai',
      fn: () =>
        callChatCompletions(
          'https://api.openai.com/v1',
          OPENAI_API_KEY!,
          OPENAI_MODEL,
          systemPrompt,
          trimmed,
          'OpenAI'
        ),
    });
  }
  if (useQwen) {
    providers.push({
      name: 'QWEN',
      key: 'qwen',
      fn: () => callChatCompletions(QWEN_BASE_URL, DASHSCOPE_API_KEY!, QWEN_MODEL, systemPrompt, trimmed, 'QWEN'),
    });
  }

  let lastErr: unknown;
  for (const provider of providers) {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const content = await provider.fn();
        if (content) {
          return { translated: content, detectedLang: 'ko', provider: provider.key };
        }
        break;
      } catch (err) {
        lastErr = err;
        if (attempt < MAX_RETRIES && isRetryableError(err)) {
          await delay(RETRY_DELAY_MS);
        }
      }
    }
  }
  console.error('[Translation] Manufacturing translate failed:', lastErr);
  return null;
}

export interface ManufacturingTranslateInput {
  product_name: string;
  steps: { process_name: string; work_method: string | null }[];
}

export interface ManufacturingTranslateResult {
  product_name_zh: string | null;
  steps: { process_name_zh: string | null; work_method_zh: string | null }[];
  provider?: TranslationProvider;
}

/**
 * 제조 문서 전체 번역: 제품명 + 공정명·작업방법을 한꺼번에 한국어→중국어로 번역
 */
export async function translateManufacturingDocument(input: ManufacturingTranslateInput): Promise<ManufacturingTranslateResult> {
  const result: ManufacturingTranslateResult = {
    product_name_zh: null,
    steps: input.steps.map(() => ({ process_name_zh: null, work_method_zh: null })),
  };
  let provider: TranslationProvider | undefined;

  const productResult = await translateManufacturingKoToZh(input.product_name);
  if (productResult) {
    result.product_name_zh = productResult.translated;
    provider = productResult.provider;
  }

  for (let i = 0; i < input.steps.length; i++) {
    const step = input.steps[i];
    const nameResult = await translateManufacturingKoToZh(step.process_name);
    if (nameResult) {
      result.steps[i].process_name_zh = nameResult.translated;
      provider = provider ?? nameResult.provider;
    }
    const method = (step.work_method || '').trim();
    if (method) {
      const methodResult = await translateManufacturingKoToZh(method);
      if (methodResult) {
        result.steps[i].work_method_zh = methodResult.translated;
        provider = provider ?? methodResult.provider;
      }
    }
  }
  result.provider = provider;
  return result;
}
