import { useState, useEffect, useCallback } from "react";
import type { Memo, Reply } from "../components/MemoSection";

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface UseMemoManagementProps {
  currentUserId: string;
  purchaseOrderId: string | null; // null이면 새 발주 (저장 안 함)
  initialMemos?: Memo[];
}

interface UseMemoManagementReturn {
  memos: Memo[];
  newMemoContent: string;
  replyInputs: Record<string, string>;
  setNewMemoContent: (content: string) => void;
  setReplyInputs: (inputs: Record<string, string>) => void;
  addMemo: () => Promise<void>;
  deleteMemo: (id: string) => Promise<void>;
  addReply: (memoId: string) => Promise<void>;
  deleteReply: (memoId: string, replyId: string) => Promise<void>;
  setMemos: React.Dispatch<React.SetStateAction<Memo[]>>;
  loadMemos: () => Promise<void>;
}

/**
 * 메모 관리 Hook
 */
export function useMemoManagement({
  currentUserId,
  purchaseOrderId,
  initialMemos = [],
}: UseMemoManagementProps): UseMemoManagementReturn {
  const [memos, setMemos] = useState<Memo[]>(initialMemos);
  const [newMemoContent, setNewMemoContent] = useState("");
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});

  // 메모 로드
  const loadMemos = useCallback(async () => {
    if (!purchaseOrderId || purchaseOrderId === 'new') {
      setMemos([]);
      return;
    }

    try {
      console.log('[useMemoManagement] 메모 로드 시작, purchaseOrderId:', purchaseOrderId);
      const response = await fetch(`${API_BASE_URL}/purchase-orders/${purchaseOrderId}/memos`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('메모 조회에 실패했습니다.');
      }

      const result = await response.json();
      console.log('[useMemoManagement] 메모 로드 응답:', result);
      if (result.success && result.data) {
        // 서버 데이터를 클라이언트 형식으로 변환
        const transformedMemos: Memo[] = result.data.map((memo: any) => ({
          id: memo.id.toString(),
          content: memo.content,
          userId: memo.userId,
          createdAt: memo.createdAt,
          replies: (memo.replies || []).map((reply: any) => ({
            id: reply.id.toString(),
            content: reply.content,
            userId: reply.userId,
            createdAt: reply.createdAt,
          })),
        }));
        console.log('[useMemoManagement] 변환된 메모:', transformedMemos);
        setMemos(transformedMemos);
      } else {
        setMemos([]);
      }
    } catch (error: any) {
      console.error('메모 로드 오류:', error);
      setMemos([]);
    }
  }, [purchaseOrderId]);

  // 초기 로드 및 purchaseOrderId 변경 시 메모 로드
  useEffect(() => {
    if (purchaseOrderId && purchaseOrderId !== 'new') {
      loadMemos();
    } else {
      setMemos([]);
    }
  }, [purchaseOrderId, loadMemos]);

  // 메모 추가
  const addMemo = async () => {
    if (!newMemoContent.trim()) return;

    // 새 발주인 경우 로컬에만 저장
    if (!purchaseOrderId || purchaseOrderId === 'new') {
      const newMemo: Memo = {
        id: Date.now().toString(),
        content: newMemoContent,
        userId: currentUserId,
        createdAt: new Date().toISOString(),
        replies: [],
      };
      setMemos([...memos, newMemo]);
      setNewMemoContent("");
      return;
    }

    // 기존 발주인 경우 서버에 저장
    try {
      const response = await fetch(`${API_BASE_URL}/purchase-orders/${purchaseOrderId}/memos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          content: newMemoContent.trim(),
          userId: currentUserId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '메모 추가에 실패했습니다.');
      }

      // 성공 시 메모 다시 로드
      await loadMemos();
      setNewMemoContent("");
    } catch (error: any) {
      console.error('메모 추가 오류:', error);
      alert(error.message || '메모 추가에 실패했습니다.');
    }
  };

  // 메모 삭제
  const deleteMemo = async (id: string) => {
    // 새 발주인 경우 로컬에서만 삭제
    if (!purchaseOrderId || purchaseOrderId === 'new') {
      setMemos(memos.filter((memo) => memo.id !== id));
      return;
    }

    // 기존 발주인 경우 서버에서 삭제
    try {
      const response = await fetch(`${API_BASE_URL}/purchase-orders/${purchaseOrderId}/memos/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '메모 삭제에 실패했습니다.');
      }

      // 성공 시 메모 다시 로드
      await loadMemos();
    } catch (error: any) {
      console.error('메모 삭제 오류:', error);
      alert(error.message || '메모 삭제에 실패했습니다.');
    }
  };

  // 댓글 추가
  const addReply = async (memoId: string) => {
    const replyContent = replyInputs[memoId];
    if (!replyContent || !replyContent.trim()) return;

    // 새 발주인 경우 로컬에만 저장
    if (!purchaseOrderId || purchaseOrderId === 'new') {
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

      setReplyInputs({ ...replyInputs, [memoId]: "" });
      return;
    }

    // 기존 발주인 경우 서버에 저장
    try {
      const response = await fetch(`${API_BASE_URL}/purchase-orders/${purchaseOrderId}/memos/${memoId}/replies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          content: replyContent.trim(),
          userId: currentUserId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '댓글 추가에 실패했습니다.');
      }

      // 성공 시 메모 다시 로드
      await loadMemos();
      setReplyInputs({ ...replyInputs, [memoId]: "" });
    } catch (error: any) {
      console.error('댓글 추가 오류:', error);
      alert(error.message || '댓글 추가에 실패했습니다.');
    }
  };

  // 댓글 삭제
  const deleteReply = async (memoId: string, replyId: string) => {
    // 새 발주인 경우 로컬에서만 삭제
    if (!purchaseOrderId || purchaseOrderId === 'new') {
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
      return;
    }

    // 기존 발주인 경우 서버에서 삭제
    try {
      const response = await fetch(`${API_BASE_URL}/purchase-orders/${purchaseOrderId}/memos/${memoId}/replies/${replyId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '댓글 삭제에 실패했습니다.');
      }

      // 성공 시 메모 다시 로드
      await loadMemos();
    } catch (error: any) {
      console.error('댓글 삭제 오류:', error);
      alert(error.message || '댓글 삭제에 실패했습니다.');
    }
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
    loadMemos,
  };
}

