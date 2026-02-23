import { Request, Response } from 'express';
import { chatCompletion, ChatMessage, DATA_TOOLS, detectIntent } from '../services/qwenService.js';
import { executeDataTool, fetchDataByIntent } from '../services/aiDataService.js';
import { AiChatMessageRepository } from '../repositories/aiChatMessageRepository.js';
import { logger } from '../utils/logger.js';

const aiChatMessageRepository = new AiChatMessageRepository();

const WEEKDAYS_KO: Record<string, string> = { Sun: '일', Mon: '월', Tue: '화', Wed: '수', Thu: '목', Fri: '금', Sat: '토' };

/** 서버 현재 시각(KST, Asia/Seoul)을 AI가 항상 참조하도록 블록 문자열로 반환 */
function getCurrentTimeBlock(): string {
  const now = new Date();
  const dateFmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = dateFmt.formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const year = get('year');
  const month = get('month');
  const day = get('day');
  const weekday = WEEKDAYS_KO[get('weekday')] ?? get('weekday');
  const hour = get('hour');
  const minute = get('minute');
  const dateStr = `${year}년 ${month}월 ${day}일 (${weekday}) ${hour.padStart(2, '0')}:${minute.padStart(2, '0')} KST`;
  return `[현재 시각(서버 기준)] ${dateStr}
날짜·시간 관련 질문(오늘, 현재, 이번 주, 며칠 등)은 **반드시** 위 시각을 기준으로 답하세요. '오늘'은 위 날짜를 의미합니다. 다른 날짜를 추측하지 마세요.`;
}

/** AI가 데이터를 만들어 내지 않도록 하는 규칙 (에이전트·의도 기반 공통) */
const DATA_INTEGRITY_RULES = `
[데이터 무결성 - 반드시 준수]
- **도구로 조회한 결과에 있는 데이터만** 답변에 사용하세요. 존재하지 않는 발주번호, 상품명, 금액, 날짜, 수량 등을 **절대 만들지 마세요**.
- 검색 결과가 비어 있거나 해당 조건에 맞는 항목이 없으면 "해당 데이터가 없습니다"라고만 하세요. 예시·샘플·가상의 행을 추가하지 마세요.
- 표나 목록에 넣는 모든 값(발주번호, 상품명, 코드, 금액, 수량, 날짜 등)은 **반드시** 조회 결과 JSON에 있던 값이어야 합니다. 추측·대표값·예시 데이터를 넣지 마세요.
`;

const DATA_CONTEXT_BASE = `아래는 사용자 질문에 맞춰 **페이징 없이 전체** 검색한 데이터입니다. 이 데이터만 사용해 답변하세요.

- 검색 결과는 이미 전체 데이터이므로, "추가 데이터를 요청해 주세요", "N페이지에 걸쳐 있습니다", "각 페이지당 N건" 등의 문구를 **사용하지 마세요**.
- 답변은 요약 문장, 표, 번호 목록 등 자유롭게 하세요. 항목이 많으면 요약·통계·표로 정리해 주세요.
- 항목이 없으면 "해당 데이터가 없습니다"라고 하세요. 숫자·단위(개, 건, 원)는 정확히 적어 주세요.
- 읽기 쉽게 **마크다운**을 활용하세요: 제목(##), 번호·글머리 목록, 표 등으로 구분해 주세요.`;

/** 발주·배송 수량/상태 정의 (AI가 동일한 의미로 사용하도록) */
const ORDER_TERMS_DEFINITION = `
[발주 수량·배송 상태 정의] (시스템 기준, 답변 시 이 정의를 사용하세요)

**수량 의미**
- **미입고 수량**: 발주 수량 - 업체(공장) 출고 수량. 아직 공장에서 출고하지 않은 수량.
- **미발송 수량**: 업체 출고 수량 - 패킹리스트 출고 수량. 공장은 출고했지만 패킹리스트에 올라가 발송되지 않은 수량. (미출고 발주 조회 시 사용하는 "미출고"는 이 미발송 구간을 의미)
- **배송중 수량**: 패킹리스트 출고 수량 - 한국도착 수량. 패킹리스트로 발송은 했지만 한국에 아직 도착·입고 처리되지 않은 수량.
- **한국도착 완료 수량**: 한국도착일로 입력된 수량. 한국에 도착해 입고 완료된 수량.

**배송 상태** (패킹리스트/물류 기준)
- **대기중**: 해당 발주가 패킹리스트에 아직 올라가지 않음.
- **내륙운송중**: 패킹리스트에 올랐지만 물류창고 도착일이 없음 (해외→물류창고 구간).
- **배송중**: 물류창고 도착일이 있지만 한국도착일이 아직 없음 (한국 입고 전).
- **한국도착**: 한국도착일이 하나라도 입력됨 (한국 입고 완료).

**발주 확인 상태** (order_status)
- **발주 대기**: 미확인
- **발주확인**: 확인됨
- **취소됨**: 취소된 발주
`;

/** 데이터 출처·도구 매핑 (한국도착 수량 등 수치를 "어디서 가져오는지" AI가 참조) */
const DATA_AND_API_REFERENCE = `
[데이터 출처·도구 참조] (수량·상태 질문 시 이 출처를 사용하세요)

**한국도착 완료 수량**
- DB: 테이블 packing_list_korea_arrivals 의 quantity 를 packing_list_items.purchase_order_id 로 묶어 발주별 합산. 뷰 v_purchase_order_shipping_summary.arrived_quantity 로 제공됨.
- 도구: get_purchase_orders 호출 시 각 항목의 **한국도착수량** 필드가 이 값임. get_not_arrived_analysis 호출 시 각 항목의 **입고수량** 필드가 같은 의미(한국도착 수량)임.
- "한국도착 수량 체크/확인" 요청 시 → get_purchase_orders 또는 get_not_arrived_analysis 를 호출한 뒤, 응답의 한국도착수량/입고수량만 사용해 답변하세요.

**기타 수량** (뷰 v_purchase_order_shipping_summary 기준)
- 미입고·미발송·배송중·한국도착 수량은 모두 이 뷰에서 계산되며, get_purchase_orders 응답에 **미입고수량, 미발송수량, 배송중수량, 한국도착수량** 으로 포함됨.
- get_not_arrived_analysis 응답에는 **입고수량**(한국도착), **배송중수량**, **한국미도착수량** 이 포함됨.
`;

const AGENT_SYSTEM = `당신은 쇼핑몰 관리자용 데이터 조회 도우미입니다.
사용자 질문에 따라 제공된 도구로 DB 데이터를 **페이징 없이 전체** 검색한 뒤, 그 결과만 바탕으로 한국어로 답변하세요.

검색 가능한 데이터: 발주·미출고·한국 미도착, 상품·프로젝트·지급 요청, 패킹리스트, 결제내역, 자재(부자재), 물류(운송회사·창고), 재고 출고, 관리자 계정, 권한 설정.
- 도구 호출 시 페이징/limit 없이 **전체 데이터**가 조회되므로, "추가 데이터를 요청해 주세요", "N페이지에 걸쳐 있으며" 등의 문구를 **사용하지 마세요**. 전체 결과를 요약·표·목록으로 보여 주세요.
- 필요한 도구를 스스로 선택해 호출하고, 여러 도구를 조합해 분석해도 됩니다.
- 데이터가 없으면 "해당 데이터가 없습니다"라고 하세요. 숫자·단위(개, 건, 원)는 정확히 적어 주세요.
- 답변은 읽기 쉽게 **마크다운**을 활용하세요: 제목(##), 번호 목록(1. 2.), 글머리 기호(-), 표 등으로 구분해 주세요.
- 발주·배송 관련 질문(미입고, 미발송, 배송중, 한국도착 등)에 답할 때는 반드시 위 [발주 수량·배송 상태 정의]의 의미를 사용하세요.
- **존재하지 않는 데이터를 만들지 마세요.** 답변에 넣는 모든 발주번호·상품명·코드·금액·수량·날짜는 반드시 도구 조회 결과에 있던 값만 사용하고, 검색 결과가 비어 있으면 예시나 가상 데이터를 넣지 말고 "해당 데이터가 없습니다"라고만 하세요.`;

const MAX_TOOL_ROUNDS = 3;

/**
 * POST /api/qwen/chat
 * Body: { messages: { role, content }[] }, useAgent?: boolean (기본 true)
 * - useAgent true: AI가 도구를 스스로 호출해 데이터 검색 후 분석 (자유도 높음)
 * - useAgent false: 기존 방식(의도 판단 → 고정 검색 → 요약)
 */
export async function postChat(req: Request, res: Response) {
  try {
    const { messages, useAgent = true } = req.body as { messages: ChatMessage[]; useAgent?: boolean };

    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ success: false, error: 'messages array is required.' });
      return;
    }

    if (useAgent) {
      const agentResult = await runAgentChat(messages);
      res.json(agentResult);
      return;
    }

    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';
    let { queries } = await detectIntent(lastUserMessage);

    const notArrivedKeywords = /한국|도착|미도착|입고\s*안\s*된|아직\s*한국|안\s*온/;
    const wantsNotArrived = notArrivedKeywords.test(lastUserMessage);
    const hasNotArrived = queries.some((q) => q.intent === 'not_arrived');
    if (wantsNotArrived && !hasNotArrived) {
      queries = [{ intent: 'not_arrived', params: {} }, ...queries];
    }

    const sections: string[] = [];
    const labels: Record<string, string> = {
      purchase_orders: '발주 목록',
      purchase_orders_unshipped: '미출고 발주',
      not_arrived: '한국 미도착 물품',
      products: '상품 목록',
      projects: '프로젝트 목록',
      payment_requests: '지급 요청 목록',
      packing_lists: '패킹리스트',
      payment_history: '결제내역',
      materials: '자재(부자재)',
      logistics_options: '물류 옵션',
      stock_outbound: '재고 출고',
      admin_accounts: '관리자 계정',
      permissions: '권한 설정',
    };
    for (const q of queries) {
      const data = await fetchDataByIntent(q.intent, q.params);
      if (data.length > 0) {
        sections.push(`[${labels[q.intent] ?? q.intent}]\n${data}`);
      }
    }
    const dataContext = sections.join('\n\n');
    const timeBlock = getCurrentTimeBlock();
    const contextSystem =
      dataContext.length > 0
        ? `${timeBlock}\n\n${DATA_INTEGRITY_RULES}\n\n${ORDER_TERMS_DEFINITION}\n\n${DATA_AND_API_REFERENCE}\n\n${DATA_CONTEXT_BASE}\n\n[검색 결과]\n${dataContext}`
        : `${timeBlock}\n\n${DATA_INTEGRITY_RULES}\n\n${ORDER_TERMS_DEFINITION}\n\n${DATA_AND_API_REFERENCE}`;
    const messagesForApi: ChatMessage[] = [...messages, { role: 'system', content: contextSystem }];

    const result = await chatCompletion({ messages: messagesForApi, stream: false });
    const assistantMessage = result.choices?.[0]?.message;
    if (!assistantMessage?.content) {
      logger.warn('[qwen] Empty or invalid response from QWEN API', { result });
    }
    res.json({
      success: true,
      data: {
        message: assistantMessage ?? { role: 'assistant', content: '' },
        usage: result.usage,
        id: result.id,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('[qwen] postChat error:', err);
    res.status(500).json({ success: false, error: message });
  }
}

/**
 * 에이전트 모드: AI가 도구를 호출 → 서버가 실행 → 결과를 AI에 전달 → 최종 답변 (최대 MAX_TOOL_ROUNDS 회)
 */
async function runAgentChat(messages: ChatMessage[]): Promise<Record<string, unknown>> {
  const systemContent = `${getCurrentTimeBlock()}\n\n${DATA_INTEGRITY_RULES}\n\n${ORDER_TERMS_DEFINITION}\n\n${DATA_AND_API_REFERENCE}\n\n${AGENT_SYSTEM}`;
  const systemMessage: ChatMessage = { role: 'system', content: systemContent };
  let messagesForApi: ChatMessage[] = [systemMessage, ...messages];
  let lastResult: Awaited<ReturnType<typeof chatCompletion>> | null = null;

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    lastResult = await chatCompletion({
      messages: messagesForApi,
      tools: DATA_TOOLS,
      max_tokens: 8192,
    });

    const msg = lastResult?.choices?.[0]?.message;
    const toolCalls = msg?.tool_calls;

    if (!toolCalls?.length) {
      return {
        success: true,
        data: {
          message: msg ?? { role: 'assistant', content: '' },
          usage: lastResult?.usage,
          id: lastResult?.id,
        },
      };
    }

    const assistantMsg: ChatMessage = {
      role: 'assistant',
      content: msg?.content ?? null,
      tool_calls: toolCalls,
    };
    messagesForApi = [...messagesForApi, assistantMsg];

    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';
    const lastUserText = typeof lastUserMessage === 'string' ? lastUserMessage : '';

    for (const tc of toolCalls) {
      const name = tc.function?.name ?? '';
      let args: Record<string, unknown> = {};
      try {
        if (tc.function?.arguments?.trim()) {
          args = JSON.parse(tc.function.arguments) as Record<string, unknown>;
        }
      } catch (e) {
        logger.warn('[qwen] Tool arguments parse error', { name, raw: tc.function?.arguments });
      }
      const result = await executeDataTool(name, args, lastUserText);
      messagesForApi.push({
        role: 'tool',
        content: result.slice(0, 28000),
        tool_call_id: tc.id,
        name,
      });
    }
  }

  const finalResult = await chatCompletion({
    messages: messagesForApi,
    tools: DATA_TOOLS,
    max_tokens: 8192,
  });
  const finalMsg = finalResult?.choices?.[0]?.message;
  return {
    success: true,
    data: {
      message: finalMsg ?? { role: 'assistant', content: '검색 결과를 바탕으로 요약 중 오류가 발생했습니다.' },
      usage: finalResult?.usage,
      id: finalResult?.id,
    },
  };
}

/**
 * GET /api/qwen/conversation
 * 현재 사용자의 저장된 대화 이력 조회 (AI 컨텍스트/학습용). 인증 필요.
 */
export async function getConversation(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id as string | undefined;
    if (!userId) {
      res.status(401).json({ success: false, error: '인증이 필요합니다.' });
      return;
    }
    const limit = Math.min(Number(req.query.limit) || 100, 200);
    const rows = await aiChatMessageRepository.findByUserId(userId, limit);
    const messages = rows.map((r) => ({ role: r.role, content: r.content }));
    res.json({ success: true, data: { messages } });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('[qwen] getConversation error:', err);
    res.status(500).json({ success: false, error: message });
  }
}

/**
 * POST /api/qwen/conversation
 * 대화 턴 저장 (user + assistant 메시지). 인증 필요.
 * Body: { messages: { role: 'user'|'assistant', content: string }[] }
 */
export async function saveConversation(req: Request, res: Response) {
  try {
    const userId = (req as any).user?.id as string | undefined;
    if (!userId) {
      res.status(401).json({ success: false, error: '인증이 필요합니다.' });
      return;
    }
    const { messages } = req.body as { messages?: Array<{ role: string; content: string }> };
    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ success: false, error: 'messages array is required.' });
      return;
    }
    const valid = messages.filter(
      (m): m is { role: 'user' | 'assistant'; content: string } =>
        (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string'
    );
    if (valid.length > 0) {
      await aiChatMessageRepository.insertMany(userId, valid);
    }
    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('[qwen] saveConversation error:', err);
    res.status(500).json({ success: false, error: message });
  }
}
