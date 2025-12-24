import { FileText, Plus, Trash2, User } from "lucide-react";

export interface Reply {
  id: string;
  content: string;
  userId: string;
  createdAt: string;
}

export interface Memo {
  id: string;
  content: string;
  userId: string;
  createdAt: string;
  replies: Reply[];
}

interface MemoSectionProps {
  memos: Memo[];
  newMemoContent: string;
  replyInputs: Record<string, string>;
  onSetNewMemoContent: (value: string) => void;
  onSetReplyInputs: (inputs: Record<string, string>) => void;
  onAddMemo: () => void;
  onDeleteMemo: (id: string) => void;
  onAddReply: (memoId: string) => void;
  onDeleteReply: (memoId: string, replyId: string) => void;
}

export function MemoSection({
  memos,
  newMemoContent,
  replyInputs,
  onSetNewMemoContent,
  onSetReplyInputs,
  onAddMemo,
  onDeleteMemo,
  onAddReply,
  onDeleteReply,
}: MemoSectionProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-2 bg-gradient-to-r from-orange-50 to-amber-50 px-4 py-2 rounded-lg border border-orange-200 mb-4">
        <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg flex items-center justify-center shadow-md">
          <FileText className="w-4 h-4 text-white" />
        </div>
        <h3 className="text-lg font-bold text-gray-900">메모</h3>
      </div>

      {/* 메모 리스트 */}
      <div className="space-y-3 mb-4">
        {memos
          .filter((memo) => memo.content.trim())
          .map((memo) => (
            <div
              key={memo.id}
              className="bg-yellow-50 border border-yellow-200 rounded-lg p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <User className="w-3 h-3 text-gray-600" />
                    <span className="text-xs text-gray-600 font-semibold">
                      {memo.userId}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(memo.createdAt).toLocaleDateString("ko-KR", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{memo.content}</p>
                </div>
                <button
                  onClick={() => onDeleteMemo(memo.id)}
                  className="text-red-500 hover:text-red-700 flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* 댓글 섹션 */}
              {memo.replies.length > 0 && (
                <div className="mt-3 ml-4 space-y-2 border-l-2 border-purple-200 pl-3">
                  {memo.replies.map((reply) => (
                    <div
                      key={reply.id}
                      className="bg-white border border-gray-200 rounded-lg p-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <User className="w-3 h-3 text-gray-600" />
                            <span className="text-xs text-gray-600 font-semibold">
                              {reply.userId}
                            </span>
                            <span className="text-xs text-gray-400">
                              {new Date(reply.createdAt).toLocaleDateString(
                                "ko-KR",
                                {
                                  year: "numeric",
                                  month: "2-digit",
                                  day: "2-digit",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">{reply.content}</p>
                        </div>
                        <button
                          onClick={() => onDeleteReply(memo.id, reply.id)}
                          className="text-red-500 hover:text-red-700 flex-shrink-0"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 댓글 입력 */}
              <div className="flex gap-2 mt-3 ml-4">
                <input
                  type="text"
                  value={replyInputs[memo.id] || ""}
                  onChange={(e) =>
                    onSetReplyInputs({
                      ...replyInputs,
                      [memo.id]: e.target.value,
                    })
                  }
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      onAddReply(memo.id);
                    }
                  }}
                  placeholder="댓글을 입력하세요..."
                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-xs"
                />
                <button
                  onClick={() => onAddReply(memo.id)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-xs"
                >
                  <Plus className="w-3 h-3" />
                  <span>댓글</span>
                </button>
              </div>
            </div>
          ))}
      </div>

      {/* 새 메모 입력 */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newMemoContent}
          onChange={(e) => onSetNewMemoContent(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === "Enter") {
              onAddMemo();
            }
          }}
          placeholder="새 메모를 입력하세요..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
        />
        <button
          onClick={onAddMemo}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>추가</span>
        </button>
      </div>
    </div>
  );
}
