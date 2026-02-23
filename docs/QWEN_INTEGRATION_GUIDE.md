# QWEN(통의천문) 적용 단계별 가이드

현재 mjshop 시스템(React + Express + MySQL)에 Alibaba Cloud QWEN API를 연결하여 **대화형 데이터 검색**을 구현하는 방법을 단계별로 안내합니다.

---

## 목차

1. [사전 준비 (API 키 발급)](#1-사전-준비-api-키-발급)
2. [서버 환경 변수 설정](#2-서버-환경-변수-설정)
3. [서버: QWEN API 연동](#3-서버-qwen-api-연동)
4. [클라이언트: API 및 채팅 UI](#4-클라이언트-api-및-채팅-ui)
5. [라우트·메뉴 연결](#5-라우트메뉴-연결)
6. [동작 확인 및 선택 사항](#6-동작-확인-및-선택-사항)

---

## 1. 사전 준비 (API 키 발급)

### 1.1 Alibaba Cloud Model Studio 가입

1. **Alibaba Cloud International** 접속  
   - https://www.alibabacloud.com (영문) 또는  
   - https://www.aliyun.com (중국 본토)

2. **회원가입/로그인** 후 **Model Studio** 접속  
   - 제품 검색: "Model Studio" 또는 "DashScope"  
   - 문서: [Model Studio 시작하기](https://www.alibabacloud.com/help/en/model-studio/)

### 1.2 API 키 생성

1. Model Studio 콘솔에서 **API-KEY** 메뉴 이동  
2. **Create API Key** 클릭 후 키 생성  
3. 생성된 키(**sk-xxx** 형식)를 **안전한 곳에 복사** (한 번만 표시되는 경우 있음)  

- API 키 발급·환경변수 설정: [Get an API key](https://www.alibabacloud.com/help/en/model-studio/get-api-key)

### 1.3 리전 선택

| 리전 | base_url | 비고 |
|------|----------|------|
| **Singapore (International)** | `https://dashscope-intl.aliyuncs.com/compatible-mode/v1` | 한국에서 사용 권장, 무료 티어 있음 |
| US (Virginia) | `https://dashscope-us.aliyuncs.com/compatible-mode/v1` | 무료 티어 없음 |
| China (Beijing) | `https://dashscope.aliyuncs.com/compatible-mode/v1` | 중국 본토 |

- **권장:** International(Singapore) — 가이드 예제는 이 리전 기준입니다.

---

## 2. 서버 환경 변수 설정

### 2.1 `.env` 추가

`server/.env` 파일에 다음 변수를 추가합니다. (파일이 없으면 `server` 폴더에 생성)

```env
# QWEN (DashScope) - 대화형 검색용
DASHSCOPE_API_KEY=sk-xxxxxxxxxxxxxxxx
QWEN_BASE_URL=https://dashscope-intl.aliyuncs.com/compatible-mode/v1
QWEN_MODEL=qwen-turbo
```

- **DASHSCOPE_API_KEY:** 1.2에서 복사한 API 키  
- **QWEN_BASE_URL:** 사용할 리전의 base_url (위 표 참고)  
- **QWEN_MODEL:** `qwen-turbo`(저비용), `qwen-flash`, `qwen-plus` 등

### 2.2 보안 주의사항

- **절대** API 키를 클라이언트 코드나 Git에 올리지 마세요.  
- 서버에서만 `process.env.DASHSCOPE_API_KEY`로 읽어 사용합니다.  
- `.env`는 `.gitignore`에 포함되어 있는지 확인하세요.

---

## 3. 서버: QWEN API 연동

서버에서 QWEN OpenAI 호환 API를 호출하는 **서비스 → 컨트롤러 → 라우트**를 추가합니다.

### 3.1 서비스 생성

**파일:** `server/src/services/qwenService.ts`

```typescript
const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;
const QWEN_BASE_URL = process.env.QWEN_BASE_URL || 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1';
const QWEN_MODEL = process.env.QWEN_MODEL || 'qwen-turbo';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface QwenChatOptions {
  messages: ChatMessage[];
  stream?: boolean;
  max_tokens?: number;
}

export interface QwenChatResponse {
  id: string;
  choices: Array<{
    message: { role: string; content: string };
    finish_reason: string;
  }>;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

/**
 * QWEN 채팅 완료 API 호출 (비스트리밍)
 */
export async function chatCompletion(options: QwenChatOptions): Promise<QwenChatResponse> {
  if (!DASHSCOPE_API_KEY) {
    throw new Error('DASHSCOPE_API_KEY is not configured.');
  }

  const url = `${QWEN_BASE_URL}/chat/completions`;
  const body = {
    model: QWEN_MODEL,
    messages: options.messages,
    stream: false,
    max_tokens: options.max_tokens ?? 1024,
  };

  const response = await fetch(url, {
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

  return response.json();
}
```

- 시스템/사용자/어시스턴트 **대화 히스토리**를 그대로 `messages`에 넘기면 됩니다.  
- 데이터 검색용 **시스템 프롬프트**는 4단계에서 클라이언트 또는 서버에서 `role: 'system'` 메시지로 추가하면 됩니다.

### 3.2 컨트롤러 생성

**파일:** `server/src/controllers/qwenController.ts`

```typescript
import { Request, Response } from 'express';
import { chatCompletion, ChatMessage } from '../services/qwenService.js';

/**
 * POST /api/qwen/chat
 * Body: { messages: { role, content }[] }
 */
export async function postChat(req: Request, res: Response) {
  const { messages } = req.body as { messages: ChatMessage[] };

  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ success: false, error: 'messages array is required.' });
    return;
  }

  const result = await chatCompletion({ messages, stream: false });
  const assistantMessage = result.choices?.[0]?.message;

  res.json({
    success: true,
    data: {
      message: assistantMessage,
      usage: result.usage,
      id: result.id,
    },
  });
}
```

### 3.3 라우트 등록

**파일:** `server/src/routes/qwen.ts`

```typescript
import express from 'express';
import { postChat } from '../controllers/qwenController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = express.Router();
router.post('/chat', asyncHandler(postChat));
export default router;
```

**파일:** `server/src/routes/index.ts` — 기존 라우트 아래에 추가

```typescript
import qwenRoutes from './qwen.js';

// ... 기존 router.use ...

router.use('/qwen', qwenRoutes);
```

- `asyncHandler`로 감싸면 서비스에서 던진 에러가 Express 에러 핸들러로 전달됩니다. (미들웨어가 없다면 생략 가능)
- 이제 **POST /api/qwen/chat** 로 대화 요청을 보낼 수 있습니다.

---

## 4. 클라이언트: API 및 채팅 UI

### 4.1 API 함수

**파일:** `client/src/api/qwenApi.ts`

```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

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

export async function sendChat(messages: ChatMessage[]): Promise<ChatResponse['data']> {
  const res = await fetch(`${API_BASE_URL}/qwen/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ messages }),
  });

  const json: ChatResponse = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || '채팅 요청에 실패했습니다.');
  }
  return json.data;
}
```

- 다른 API와 동일하게 `credentials: 'include'`로 쿠키/세션을 보냅니다.  
- 필요하면 기존 인증(예: `X-User-Id`)을 서버에서 읽어 사용하도록 할 수 있습니다.

### 4.2 대화형 UI 컴포넌트 (최소 예시)

**파일:** `client/src/components/AiChatPanel.tsx`

```tsx
import { useState } from 'react';
import { sendChat, type ChatMessage } from '../api/qwenApi';

const SYSTEM_PROMPT = `당신은 쇼핑몰 관리 시스템의 데이터 검색 도우미입니다.
사용자의 질문에 맞게 발주, 상품, 재고, 결제 등 데이터를 검색·요약해서 답변합니다.
한국어로 답변하세요.`;

export function AiChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'system', content: SYSTEM_PROMPT },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const nextMessages: ChatMessage[] = [...messages, userMsg];
      const data = await sendChat(nextMessages);
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: data?.message?.content ?? '응답을 생성하지 못했습니다.',
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `오류: ${e.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[400px] border rounded-lg bg-white">
      <div className="p-2 border-b font-medium">AI 데이터 검색</div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages
          .filter((m) => m.role !== 'system')
          .map((m, i) => (
            <div
              key={i}
              className={`text-sm p-2 rounded ${
                m.role === 'user' ? 'bg-blue-50 ml-4' : 'bg-gray-100 mr-4'
              }`}
            >
              {m.role === 'user' ? '나: ' : 'AI: '}
              {m.content}
            </div>
          ))}
      </div>
      <div className="p-2 flex gap-2 border-t">
        <input
          className="flex-1 border rounded px-2 py-1 text-sm"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="질문을 입력하세요"
        />
        <button
          type="button"
          className="px-3 py-1 bg-purple-600 text-white rounded text-sm disabled:opacity-50"
          onClick={handleSend}
          disabled={loading}
        >
          {loading ? '전송 중…' : '전송'}
        </button>
      </div>
    </div>
  );
}
```

- `SYSTEM_PROMPT`를 “발주/상품/재고/결제를 검색·요약하는 도우미”로 두었습니다.  
- 실제 데이터를 검색하려면 이후 단계에서 **Tool/Function Calling** 또는 **백엔드 검색 API**를 붙이면 됩니다.

---

## 5. 라우트·메뉴 연결

### 5.1 전용 페이지에 배치

- 예: **AI 검색** 전용 페이지를 만들어 배치합니다.

**파일:** `client/src/components/AiSearch.tsx`

```tsx
import { AiChatPanel } from './AiChatPanel';

export function AiSearch() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">AI 데이터 검색</h1>
      <AiChatPanel />
    </div>
  );
}
```

**파일:** `client/src/App.tsx` — Routes 안에 추가

```tsx
import { AiSearch } from './components/AiSearch';

// ... 기존 Route들 ...
<Route path="/ai-search" element={
  <PermissionCheckWrapper resource="dashboard" permissionType="read">
    <AiSearch />
  </PermissionCheckWrapper>
} />
```

- 권한 리소스는 실제 정책에 맞게 `dashboard` 또는 별도 리소스로 변경하면 됩니다.

### 5.2 사이드바 메뉴 추가

**파일:** `client/src/components/Sidebar.tsx` — 메뉴 항목 추가

- `currentPage` 타입/목록에 `'ai-search'` 추가  
- 사이드바 링크: `/admin/ai-search` 로 이동하도록 추가

예시 (구조만):

```tsx
{ label: 'AI 검색', page: 'ai-search', icon: MessageCircle }  // 등
```

- `onPageChange`에서 `ai-search`일 때 `navigate('/admin/ai-search')` 되도록 하면 됩니다.

---

## 6. 동작 확인 및 선택 사항

### 6.1 확인 순서

1. **서버**
   - `server/.env`에 `DASHSCOPE_API_KEY`, `QWEN_BASE_URL`, `QWEN_MODEL` 설정
   - `npm run dev` 후 로그에 에러 없는지 확인

2. **API 직접 호출**
   - Postman 등으로 `POST http://localhost:3000/api/qwen/chat`  
   - Body: `{ "messages": [ { "role": "user", "content": "안녕" } ] }`  
   - 200과 함께 `data.message.content`가 오면 서버 연동 성공

3. **클라이언트**
   - `/admin/ai-search` 접속 후 질문 입력 → AI 응답이 채팅처럼 쌓이면 성공

### 6.2 AI가 스스로 데이터를 검색하는 방식 (에이전트 모드)

채팅 API는 **에이전트 모드**와 **의도 기반 모드** 두 가지를 지원합니다.

| 방식 | 설명 |
|------|------|
| **에이전트 모드** (`useAgent: true`, **기본값**) | AI에게 도구 목록(발주, 한국 미도착, 미출고, 상품, 프로젝트, 지급 요청 등)을 제공합니다. AI가 질문을 보고 **스스로** 필요한 도구를 선택해 호출하고, 서버가 데이터를 조회한 뒤 결과를 AI에 돌려줍니다. 여러 도구를 조합해 검색·분석할 수 있어 **자유도가 높습니다**. |
| **의도 기반 모드** (`useAgent: false`) | 사용자 메시지에서 "의도"를 한 번만 판단하고, 해당 의도에 맞는 데이터를 한 번에 가져와 AI에게 전달합니다. 동작이 단순하고 토큰 사용량을 줄일 수 있으나, AI가 검색 범위를 스스로 넓히거나 줄일 수 없습니다. |

- **API:** `POST /api/qwen/chat` Body에 `{ "messages": [...], "useAgent": true }` (기본) 또는 `"useAgent": false`
- **클라이언트:** `sendChat(messages)` 는 기본적으로 에이전트 모드입니다. 의도 기반만 쓰려면 `sendChat(messages, { useAgent: false })` 로 호출합니다.

### 6.3 선택 사항

| 항목 | 설명 |
|------|------|
| **스트리밍** | 응답을 토큰 단위로 받으려면 서버에서 `stream: true`로 QWEN 호출 후, SSE 등으로 클라이언트에 전달 |
| **Tool/Function Calling** | “발주 목록 조회” 등을 QWEN이 도구로 호출하게 하려면 `tools` 파라미터와 서버에서의 에이전트 모드로 구현됨. `DATA_TOOLS`에 도구를 추가하면 AI가 새 데이터 종류도 스스로 호출 가능 |
| **데이터베이스 직접 검색** | QWEN이 생성한 쿼리/파라미터를 서버에서 검증 후 MySQL 등에 실행해 결과만 답변에 포함시키는 방식으로 확장 |
| **인증** | `/api/qwen/chat`에 `authenticateUser` 미들웨어를 붙이고, `req.user`로 권한/로그 기록 처리 가능 |

### 6.4 문제 해결

- **401 Invalid API key**  
  - `.env`의 `DASHSCOPE_API_KEY` 값과 Model Studio에 표시된 키가 동일한지 확인  
  - 앞뒤 공백, 줄바꿈 없는지 확인  

- **429 Rate limit**  
  - 무료 한도 또는 분당 요청 수 제한. 잠시 후 재시도 또는 유료 플랜 검토  

- **CORS**  
  - 현재 서버 `index.ts`의 `allowedOrigins`에 클라이언트 주소가 포함되어 있으면 됨.  
  - 프로덕션 도메인을 `CLIENT_URL`에 추가  

- **네트워크/타임아웃**  
  - Singapore 리전이 아닌 경우 지연이 클 수 있음. `QWEN_BASE_URL`을 Singapore로 두고 재시도  

---

## 요약 체크리스트

- [ ] Alibaba Cloud Model Studio 가입 및 API 키 발급  
- [ ] `server/.env`에 `DASHSCOPE_API_KEY`, `QWEN_BASE_URL`, `QWEN_MODEL` 설정  
- [ ] `server/src/services/qwenService.ts` 생성  
- [ ] `server/src/controllers/qwenController.ts` 생성  
- [ ] `server/src/routes/qwen.ts` 생성 및 `routes/index.ts`에 등록  
- [ ] `client/src/api/qwenApi.ts` 생성  
- [ ] `client/src/components/AiChatPanel.tsx`, `AiSearch.tsx` 생성  
- [ ] `App.tsx`에 `/admin/ai-search` 라우트 추가  
- [ ] Sidebar에 AI 검색 메뉴 추가  
- [ ] 브라우저에서 대화 테스트  

위 단계를 순서대로 진행하면 현재 시스템에 QWEN을 기준으로 대화형 데이터 검색을 적용할 수 있습니다.
