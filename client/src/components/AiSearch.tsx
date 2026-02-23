import { AiChatPanel } from './AiChatPanel';

/**
 * AI 데이터 검색 페이지. 웹페이지 전체 높이를 사용하는 풀 레이아웃.
 */
export function AiSearch() {
  return (
    <div className="h-full min-h-0 flex flex-col bg-gray-50">
      <header className="shrink-0 px-4 py-3 lg:px-6 lg:py-4 border-b border-gray-200 bg-white">
        <h1 className="text-lg font-semibold text-gray-900">AI 데이터 검색</h1>
      </header>
      <AiChatPanel className="flex-1 min-h-0" />
    </div>
  );
}
