import { useState, useRef, useEffect } from 'react';
import { sendChat, getConversation, saveConversation, type ChatMessage } from '../api/qwenApi';
import { ChatMessageContent } from './ChatMessageContent';
import { ScrollArea } from './ui/scroll-area';
import { Button } from './ui/button';
import { cn } from './ui/utils';
import { Send, User, Bot, Loader2 } from 'lucide-react';

const CONVERSATION_LIMIT = 100;

const SYSTEM_PROMPT = `당신은 쇼핑몰 관리 시스템의 데이터 검색 도우미입니다.
다음과 같은 질문에 대해 실제 데이터를 검색한 뒤 요약해서 답변합니다.
- 발주 목록 (예: 발주 목록 보여줘, 최근 발주 몇 건?)
- 미출고 발주 (예: 아직 출고 안 된 발주)
- 상품 목록 (예: 상품 목록, 재고 있는 상품)
- 프로젝트 목록 (예: 진행 중인 프로젝트)
- 결제/지급 요청 목록 (예: 지급 요청 목록)
한국어로 답변하세요.`;

interface AiChatPanelProps {
  /** 부모에서 높이를 채우려면 flex-1 min-h-0 등 전달 */
  className?: string;
}

export function AiChatPanel({ className }: AiChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'system', content: SYSTEM_PROMPT },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (historyLoaded) return;
    setHistoryLoaded(true);
    getConversation(CONVERSATION_LIMIT)
      .then(({ messages: saved }) => {
        if (saved.length > 0) {
          setMessages([{ role: 'system', content: SYSTEM_PROMPT }, ...saved]);
        }
      })
      .catch(() => {});
  }, [historyLoaded]);

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
      const assistantContent = data?.message?.content ?? '응답을 생성하지 못했습니다.';
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: assistantContent,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      saveConversation([
        { role: 'user', content: text },
        { role: 'assistant', content: assistantContent },
      ]).catch(() => {});
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : '오류가 발생했습니다.';
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `오류: ${message}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const displayMessages = messages.filter((m) => m.role !== 'system');

  return (
    <div className={cn('flex flex-col min-h-0 overflow-hidden bg-white', className)}>
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 space-y-4">
          {displayMessages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center text-gray-500 text-sm">
              <Bot className="w-10 h-10 text-gray-300 mb-2" />
              <p>질문을 입력하면 데이터를 검색해 요약해 드립니다.</p>
              <p className="mt-1">예: 발주 목록, 한국 미도착 물품, 미출고 발주</p>
            </div>
          )}
          {displayMessages.map((m, i) => (
            <div
              key={i}
              className={cn(
                'flex gap-3',
                m.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              )}
            >
              <div
                className={cn(
                  'flex h-8 w-8 shrink-0 rounded-full items-center justify-center',
                  m.role === 'user' ? 'bg-blue-100 text-blue-600' : 'bg-violet-100 text-violet-600'
                )}
              >
                {m.role === 'user' ? (
                  <User className="h-4 w-4" />
                ) : (
                  <Bot className="h-4 w-4" />
                )}
              </div>
              <div
                className={cn(
                  'max-w-[85%] rounded-xl px-4 py-3',
                  m.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-50 border border-gray-100 text-gray-800'
                )}
              >
                {m.role === 'user' ? (
                  <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
                    {m.content}
                  </p>
                ) : (
                  <ChatMessageContent content={m.content} />
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 rounded-full items-center justify-center bg-violet-100 text-violet-600">
                <Bot className="h-4 w-4" />
              </div>
              <div className="rounded-xl px-4 py-3 bg-gray-50 border border-gray-100 flex items-center gap-2 text-gray-500 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                검색 중…
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <div className="shrink-0 p-3 lg:p-4 border-t border-gray-200 bg-gray-50/80 flex gap-2">
        <input
          className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder="질문을 입력하세요 (Enter로 전송)"
          disabled={loading}
        />
        <Button
          type="button"
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="shrink-0 bg-violet-600 hover:bg-violet-700"
          aria-label={loading ? '전송 중' : '전송'}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
