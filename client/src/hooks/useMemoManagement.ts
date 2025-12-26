import { useState } from "react";
import type { Memo, Reply } from "../components/MemoSection";

interface UseMemoManagementProps {
  currentUserId: string;
  initialMemos?: Memo[];
}

interface UseMemoManagementReturn {
  memos: Memo[];
  newMemoContent: string;
  replyInputs: Record<string, string>;
  setNewMemoContent: (content: string) => void;
  setReplyInputs: (inputs: Record<string, string>) => void;
  addMemo: () => void;
  deleteMemo: (id: string) => void;
  addReply: (memoId: string) => void;
  deleteReply: (memoId: string, replyId: string) => void;
  setMemos: React.Dispatch<React.SetStateAction<Memo[]>>;
}

/**
 * 메모 관리 Hook
 */
export function useMemoManagement({
  currentUserId,
  initialMemos = [],
}: UseMemoManagementProps): UseMemoManagementReturn {
  const [memos, setMemos] = useState<Memo[]>(initialMemos);
  const [newMemoContent, setNewMemoContent] = useState("");
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});

  // 메모 추가
  const addMemo = () => {
    if (!newMemoContent.trim()) return;

    const newMemo: Memo = {
      id: Date.now().toString(),
      content: newMemoContent,
      userId: currentUserId,
      createdAt: new Date().toISOString(),
      replies: [],
    };

    setMemos([...memos, newMemo]);
    setNewMemoContent("");
  };

  // 메모 삭제
  const deleteMemo = (id: string) => {
    setMemos(memos.filter((memo) => memo.id !== id));
  };

  // 댓글 추가
  const addReply = (memoId: string) => {
    const replyContent = replyInputs[memoId];
    if (!replyContent || !replyContent.trim()) return;

    const newReply: Reply = {
      id: Date.now().toString(),
      content: replyContent,
      userId: currentUserId,
      createdAt: new Date().toISOString(),
    };

    setMemos(
      memos.map((memo) =>
        memo.id === memoId
          ? { ...memo, replies: [...memo.replies, newReply] }
          : memo,
      ),
    );

    // 입력창 초기화
    setReplyInputs({ ...replyInputs, [memoId]: "" });
  };

  // 댓글 삭제
  const deleteReply = (memoId: string, replyId: string) => {
    setMemos(
      memos.map((memo) =>
        memo.id === memoId
          ? {
              ...memo,
              replies: memo.replies.filter(
                (reply) => reply.id !== replyId,
              ),
            }
          : memo,
      ),
    );
  };

  return {
    memos,
    newMemoContent,
    replyInputs,
    setNewMemoContent,
    setReplyInputs,
    addMemo,
    deleteMemo,
    addReply,
    deleteReply,
    setMemos,
  };
}

