import { useCallback } from "react";
import type { WorkItem } from "../components/tabs/ProcessingPackagingTab";

interface UseWorkItemHandlersProps {
  workItems: WorkItem[];
  setWorkItems: React.Dispatch<React.SetStateAction<WorkItem[]>>;
  workEndDate: string;
  setWorkEndDate: (date: string) => void;
}

interface UseWorkItemHandlersReturn {
  handleWorkImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleWorkItemComplete: (id: string, checked: boolean) => void;
  removeWorkItem: (id: string) => void;
  updateWorkItemDescription: (
    id: string,
    field: "descriptionKo" | "descriptionZh",
    value: string,
  ) => void;
}

/**
 * 가공/포장 작업 항목 핸들러 Hook
 */
export function useWorkItemHandlers({
  workItems,
  setWorkItems,
  workEndDate,
  setWorkEndDate,
}: UseWorkItemHandlersProps): UseWorkItemHandlersReturn {
  // 가공/포장 작업 이미지 업로드 핸들러 (파일 선택 시 즉시 업로드하지 않고 파일만 저장)
  const handleWorkImageUpload = useCallback((
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // 각 파일마다 새로운 WorkItem 생성
    const newWorkItems: WorkItem[] = Array.from(files).map((file) => {
      // 임시 ID 생성
      const tempId = Date.now().toString() + Math.random();
      
      // 미리보기를 위한 blob URL 생성
      const previewUrl = URL.createObjectURL(file);
      
      return {
        id: tempId,
        images: [previewUrl], // 미리보기용 blob URL
        descriptionKo: "",
        descriptionZh: "",
        isCompleted: false,
        pendingImages: [file], // 실제 파일 저장
      };
    });

    // 기존 항목에 새 항목 추가
    setWorkItems((prev) => [...prev, ...newWorkItems]);
    
    // input 초기화
    if (e.target) {
      e.target.value = '';
    }
  }, [setWorkItems]);

  // 작업 완료 체크 처리
  const handleWorkItemComplete = useCallback((
    id: string,
    checked: boolean,
  ) => {
    setWorkItems((prev) => {
      const updatedItems = prev.map((item) =>
        item.id === id ? { ...item, isCompleted: checked } : item,
      );

      // 모든 작업이 완료되었는지 확인
      const allCompleted = updatedItems.every(
        (item) => item.isCompleted,
      );
      if (allCompleted && updatedItems.length > 0) {
        // 모든 작업이 완료되면 오늘 날짜로 작업완료일 자동 설정
        const today = new Date().toISOString().split("T")[0];
        setWorkEndDate(today);
      } else if (!allCompleted && workEndDate) {
        // 하나라도 체크 해제되면 작업완료일 초기화
        setWorkEndDate("");
      }

      return updatedItems;
    });
  }, [setWorkItems, workEndDate, setWorkEndDate]);

  // 가공/포장 작업 항목 삭제
  const removeWorkItem = useCallback((id: string) => {
    console.log('작업 항목 삭제 요청:', id);
    setWorkItems((prev) => {
      const itemToRemove = prev.find(item => item.id === id);
      
      // blob URL 정리 (메모리 누수 방지)
      if (itemToRemove?.images) {
        itemToRemove.images
          .filter(url => url.startsWith('blob:'))
          .forEach(url => URL.revokeObjectURL(url));
      }
      
      const filtered = prev.filter((item) => item.id !== id);
      console.log('삭제 전 개수:', prev.length, '삭제 후 개수:', filtered.length);
      return filtered;
    });
  }, [setWorkItems]);

  // 가공/포장 작업 설명 업데이트
  const updateWorkItemDescription = useCallback((
    id: string,
    field: "descriptionKo" | "descriptionZh",
    value: string,
  ) => {
    setWorkItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );
  }, [setWorkItems]);

  return {
    handleWorkImageUpload,
    handleWorkItemComplete,
    removeWorkItem,
    updateWorkItemDescription,
  };
}
