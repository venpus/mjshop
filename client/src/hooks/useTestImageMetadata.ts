import { useState, useEffect, useCallback } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export interface TestImageMetadata {
  id: number;
  materialId: number;
  imageUrl: string;
  reaction: 'like' | 'dislike' | null;
  memo: string | null;
  confirmedBy: string | null;
  confirmedAt: string | null;
  updatedAt: string;
}

export interface TestImageMetadataUpdate {
  reaction?: 'like' | 'dislike' | null;
  memo?: string | null;
  confirmed?: boolean;
  confirmedBy?: string;
}

/**
 * 테스트 이미지 메타데이터 관리 훅
 */
export function useTestImageMetadata(materialId: number | null) {
  const [metadata, setMetadata] = useState<TestImageMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 메타데이터 로드
   */
  const loadMetadata = useCallback(async () => {
    if (!materialId) {
      setMetadata([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/materials/${materialId}/test-images/metadata`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '메타데이터 로드에 실패했습니다.');
      }

      const data = await response.json();
      if (data.success) {
        setMetadata(data.data || []);
      } else {
        throw new Error(data.error || '메타데이터 로드에 실패했습니다.');
      }
    } catch (err: any) {
      setError(err.message || '메타데이터 로드 중 오류가 발생했습니다.');
      console.error('메타데이터 로드 오류:', err);
      setMetadata([]);
    } finally {
      setIsLoading(false);
    }
  }, [materialId]);

  /**
   * 메타데이터 업데이트
   */
  const updateMetadata = useCallback(
    async (imageUrl: string, updateData: TestImageMetadataUpdate): Promise<TestImageMetadata | null> => {
      if (!materialId) {
        throw new Error('부자재 ID가 없습니다.');
      }

      try {
        // imageUrl을 URL 인코딩하여 전송 (특수문자 처리)
        const encodedImageUrl = encodeURIComponent(imageUrl);

        const response = await fetch(
          `${API_BASE_URL}/materials/${materialId}/test-images/${encodedImageUrl}/metadata`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(updateData),
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || '메타데이터 업데이트에 실패했습니다.');
        }

        const data = await response.json();
        if (data.success) {
          const updatedMetadata = data.data;

          // 로컬 state 업데이트
          setMetadata((prev) => {
            const existingIndex = prev.findIndex((m) => m.imageUrl === imageUrl);
            if (existingIndex >= 0) {
              // 기존 항목 업데이트
              const updated = [...prev];
              updated[existingIndex] = updatedMetadata;
              return updated;
            } else {
              // 새 항목 추가
              return [...prev, updatedMetadata];
            }
          });

          return updatedMetadata;
        } else {
          throw new Error(data.error || '메타데이터 업데이트에 실패했습니다.');
        }
      } catch (err: any) {
        console.error('메타데이터 업데이트 오류:', err);
        throw err;
      }
    },
    [materialId]
  );

  // materialId 변경 시 메타데이터 로드
  useEffect(() => {
    loadMetadata();
  }, [loadMetadata]);

  /**
   * 이미지 URL에 해당하는 메타데이터 조회
   */
  const getMetadataByImageUrl = useCallback(
    (imageUrl: string): TestImageMetadata | null => {
      // 전체 URL에서 상대 경로로 변환
      const relativeUrl = imageUrl.replace(/^https?:\/\/[^/]+/, '');

      return metadata.find((m) => m.imageUrl === relativeUrl || m.imageUrl === imageUrl) || null;
    },
    [metadata]
  );

  return {
    metadata,
    isLoading,
    error,
    loadMetadata,
    updateMetadata,
    getMetadataByImageUrl,
  };
}

