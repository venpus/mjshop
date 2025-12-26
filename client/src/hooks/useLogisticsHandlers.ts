import { useCallback } from "react";
import type {
  DeliverySet,
  PackageInfo,
  LogisticsInfo,
} from "../components/tabs/LogisticsDeliveryTab";

interface UseLogisticsHandlersProps {
  orderId: string;
  deliverySets: DeliverySet[];
  setDeliverySets: React.Dispatch<React.SetStateAction<DeliverySet[]>>;
  newPackingCode: string;
  newPackingDate: string;
  setNewPackingCode: (value: string) => void;
  setNewPackingDate: (value: string) => void;
  API_BASE_URL: string;
  SERVER_BASE_URL: string;
  onSave?: () => Promise<void>; // 임시 ID일 때 자동 저장을 위한 콜백
}

interface UseLogisticsHandlersReturn {
  addDeliverySet: () => void;
  removeDeliverySet: (setId: string) => void;
  addPackageInfo: (setId: string) => void;
  removePackageInfo: (setId: string, pkgId: string) => void;
  updatePackageInfo: (
    setId: string,
    pkgId: string,
    field: keyof PackageInfo,
    value: any,
  ) => void;
  addLogisticsInfo: (setId: string) => void;
  removeLogisticsInfo: (setId: string, logId: string) => void;
  updateLogisticsInfo: (
    setId: string,
    logId: string,
    field: keyof LogisticsInfo,
    value: any,
  ) => void;
  handleLogisticsImageUpload: (
    setId: string,
    logisticsId: string,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => void;
  removeLogisticsImage: (
    setId: string,
    logId: string,
    imageIndex: number,
  ) => void;
  handleUpdatePackageInfo: (
    setId: string,
    pkgId: string,
    field: string,
    value: any,
  ) => void;
  handleUpdateLogisticsInfo: (
    setId: string,
    logisticsId: string,
    field: string,
    value: any,
  ) => void;
}

/**
 * 물류 배송 핸들러 Hook
 */
export function useLogisticsHandlers({
  orderId,
  deliverySets: _deliverySets, // 현재는 사용하지 않지만 타입 호환성을 위해 유지
  setDeliverySets,
  newPackingCode,
  newPackingDate,
  setNewPackingCode,
  setNewPackingDate,
  API_BASE_URL,
  SERVER_BASE_URL,
}: UseLogisticsHandlersProps): UseLogisticsHandlersReturn {
  // 배송 세트 추가
  const addDeliverySet = useCallback(() => {
    if (!newPackingCode || !newPackingDate) {
      alert("포장 코드와 날짜를 입력해주세요.");
      return;
    }

    const newSet: DeliverySet = {
      id: Date.now().toString(),
      packingCode: newPackingCode,
      date: newPackingDate,
      packageInfoList: [
        {
          id: "1",
          types: "",
          pieces: "",
          sets: "",
          total: "",
          method: "박스",
          weight: "",
        },
      ],
      logisticsInfoList: [
        { id: "1", trackingNumber: "", company: "", imageUrls: [] },
      ],
    };

    setDeliverySets((prev) => [...prev, newSet]);
    setNewPackingCode("");
    setNewPackingDate("");
  }, [
    newPackingCode,
    newPackingDate,
    setDeliverySets,
    setNewPackingCode,
    setNewPackingDate,
  ]);

  // 배송 세트 삭제
  const removeDeliverySet = useCallback(
    (setId: string) => {
      setDeliverySets((prev) => prev.filter((s) => s.id !== setId));
    },
    [setDeliverySets],
  );

  // 포장 정보 추가/삭제 함수
  const addPackageInfo = useCallback(
    (setId: string) => {
      setDeliverySets((prev) =>
        prev.map((set) => {
          if (set.id === setId) {
            const newId = (
              Math.max(
                ...set.packageInfoList.map((p) => parseInt(p.id)),
                0,
              ) + 1
            ).toString();
            return {
              ...set,
              packageInfoList: [
                ...set.packageInfoList,
                {
                  id: newId,
                  types: "",
                  pieces: "",
                  sets: "",
                  total: "",
                  method: "박스",
                  count: null,
                  weight: "",
                },
              ],
            };
          }
          return set;
        }),
      );
    },
    [setDeliverySets],
  );

  const removePackageInfo = useCallback(
    (setId: string, pkgId: string) => {
      setDeliverySets((prev) =>
        prev.map((set) => {
          if (set.id === setId && set.packageInfoList.length > 1) {
            return {
              ...set,
              packageInfoList: set.packageInfoList.filter(
                (p) => p.id !== pkgId,
              ),
            };
          }
          return set;
        }),
      );
    },
    [setDeliverySets],
  );

  const updatePackageInfo = useCallback(
    (
      setId: string,
      pkgId: string,
      field: keyof PackageInfo,
      value: any,
    ) => {
      setDeliverySets((prev) =>
        prev.map((set) => {
          if (set.id === setId) {
            return {
              ...set,
              packageInfoList: set.packageInfoList.map((p) => {
                if (p.id === pkgId) {
                  const updated = { ...p, [field]: value };
                  // 종, 개, 세트가 변경되면 합계 자동 계산
                  const types = field === "types" ? value : updated.types;
                  const pieces =
                    field === "pieces" ? value : updated.pieces;
                  const sets = field === "sets" ? value : updated.sets;

                  const typesNum = parseFloat(types) || 0;
                  const piecesNum = parseFloat(pieces) || 0;
                  const setsNum = parseFloat(sets) || 0;

                  updated.total = (typesNum * piecesNum * setsNum).toString();

                  return updated;
                }
                return p;
              }),
            };
          }
          return set;
        }),
      );
    },
    [setDeliverySets],
  );

  // 물류 정보 추가/삭제 함수
  const addLogisticsInfo = useCallback(
    (setId: string) => {
      setDeliverySets((prev) =>
        prev.map((set) => {
          if (set.id === setId) {
            const newId = (
              Math.max(
                ...set.logisticsInfoList.map((l) => parseInt(l.id)),
                0,
              ) + 1
            ).toString();
            return {
              ...set,
              logisticsInfoList: [
                ...set.logisticsInfoList,
                {
                  id: newId,
                  trackingNumber: "",
                  inlandCompanyId: null,
                  warehouseId: null,
                  imageUrls: [],
                },
              ],
            };
          }
          return set;
        }),
      );
    },
    [setDeliverySets],
  );

  const removeLogisticsInfo = useCallback(
    (setId: string, logId: string) => {
      setDeliverySets((prev) =>
        prev.map((set) => {
          if (set.id === setId && set.logisticsInfoList.length > 1) {
            return {
              ...set,
              logisticsInfoList: set.logisticsInfoList.filter(
                (l) => l.id !== logId,
              ),
            };
          }
          return set;
        }),
      );
    },
    [setDeliverySets],
  );

  const updateLogisticsInfo = useCallback(
    (
      setId: string,
      logId: string,
      field: keyof LogisticsInfo,
      value: any,
    ) => {
      setDeliverySets((prev) =>
        prev.map((set) => {
          if (set.id === setId) {
            return {
              ...set,
              logisticsInfoList: set.logisticsInfoList.map((l) =>
                l.id === logId ? { ...l, [field]: value } : l,
              ),
            };
          }
          return set;
        }),
      );
    },
    [setDeliverySets],
  );

  // 이미지 업로드 처리 (최대 10장, pendingImages 패턴 사용)
  const handleImageUpload = useCallback(
    (setId: string, logId: string, files: FileList) => {
      // 함수형 업데이트 내에서 logistics 찾기
      setDeliverySets((prev) => {
        const logistics = prev
          .find((set) => set.id === setId)
          ?.logisticsInfoList.find((log) => log.id === logId);
        
        if (!logistics) return prev;

        // 최대 10장 제한 확인 (서버 이미지 + pendingImages + 새로 선택한 파일)
        const serverImageCount = logistics.imageUrls.filter(url => !url.startsWith('blob:')).length;
        const pendingImageCount = logistics.pendingImages?.length || 0;
        const maxImages = 10;
        const remainingSlots = maxImages - serverImageCount - pendingImageCount;

        if (remainingSlots <= 0) {
          alert("최대 10장까지 업로드할 수 있습니다.");
          return prev;
        }

        const filesToAdd = Array.from(files).slice(0, remainingSlots);
        const newPendingImages = [...(logistics.pendingImages || []), ...filesToAdd];

        // blob: URL 생성 (즉시 미리보기용)
        const newPreviewUrls = filesToAdd.map(file => URL.createObjectURL(file));

        return prev.map((set) => {
          if (set.id === setId) {
            return {
              ...set,
              logisticsInfoList: set.logisticsInfoList.map((log) =>
                log.id === logId
                  ? {
                      ...log,
                      pendingImages: newPendingImages,
                      imageUrls: [...log.imageUrls.filter(url => !url.startsWith('blob:')), ...newPreviewUrls],
                    }
                  : log,
              ),
            };
          }
          return set;
        });
      });
    },
    [setDeliverySets],
  );

  // 이미지 삭제 (서버에서 삭제 후 재로드)
  const removeLogisticsImage = useCallback(
    async (setId: string, logId: string, imageIndex: number) => {
      // 먼저 현재 상태에서 logistics 찾기
      let logistics: LogisticsInfo | undefined;
      setDeliverySets((prev) => {
        logistics = prev
          .find((set) => set.id === setId)
          ?.logisticsInfoList.find((log) => log.id === logId);
        return prev; // 상태 변경 없이 정보만 가져옴
      });
      
      if (!logistics) return;

      const imageUrl = logistics.imageUrls[imageIndex];
      if (!imageUrl || imageUrl.startsWith('blob:')) {
        // blob: URL인 경우 (pendingImages) - 클라이언트에서만 제거
        const blobIndex = logistics.imageUrls.findIndex(url => url === imageUrl);
        const pendingIndex = blobIndex >= 0 ? blobIndex - logistics.imageUrls.filter(url => !url.startsWith('blob:')).length : -1;
        
        setDeliverySets((prev) =>
          prev.map((set) => {
            if (set.id === setId) {
              return {
                ...set,
                logisticsInfoList: set.logisticsInfoList.map((log) => {
                  if (log.id === logId) {
                    // blob: URL 제거
                    const newImageUrls = log.imageUrls.filter((_, idx) => idx !== imageIndex);
                    // pendingImages에서도 제거
                    const newPendingImages = log.pendingImages?.filter((_, idx) => idx !== pendingIndex) || [];
                    // blob: URL 메모리 해제
                    if (imageUrl.startsWith('blob:')) {
                      URL.revokeObjectURL(imageUrl);
                    }
                    return {
                      ...log,
                      imageUrls: newImageUrls,
                      pendingImages: newPendingImages.length > 0 ? newPendingImages : undefined,
                    };
                  }
                  return log;
                }),
              };
            }
            return set;
          }),
        );
        return;
      }

      // 서버 이미지인 경우 - 서버에서 삭제
      try {
        // 이미지 ID 조회
        const imageResponse = await fetch(
          `${API_BASE_URL}/purchase-orders/${orderId}/images/logistics_info?relatedId=${logId}`,
          {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
          }
        );

        if (imageResponse.ok) {
          const imageResult = await imageResponse.json();
          if (imageResult.success && imageResult.data && Array.isArray(imageResult.data)) {
            const imageToDelete = imageResult.data[imageIndex];
            if (imageToDelete && imageToDelete.id) {
              // 이미지 삭제 API 호출
              const deleteResponse = await fetch(
                `${API_BASE_URL}/images/${imageToDelete.id}`,
                {
                  method: 'DELETE',
                  credentials: 'include',
                }
              );

              if (deleteResponse.ok) {
                // 삭제 후 이미지 목록 다시 로드
                const reloadResponse = await fetch(
                  `${API_BASE_URL}/purchase-orders/${orderId}/images/logistics_info?relatedId=${logId}`,
                  {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                  }
                );

                if (reloadResponse.ok) {
                  const reloadResult = await reloadResponse.json();
                  if (reloadResult.success && reloadResult.data) {
                    const reloadedImages = reloadResult.data.map((img: any) => {
                      const url = typeof img === 'string' ? img : (img.image_url || img);
                      if (!url || typeof url !== 'string') return '';
                      if (url.startsWith('http://') || url.startsWith('https://')) return url;
                      const normalizedUrl = url.startsWith('/') ? url : `/${url}`;
                      return `${SERVER_BASE_URL}${normalizedUrl}`;
                    }).filter((url: string) => url !== '');

                    setDeliverySets((prev) =>
                      prev.map((set) => {
                        if (set.id === setId) {
                          return {
                            ...set,
                            logisticsInfoList: set.logisticsInfoList.map((log) =>
                              log.id === logId
                                ? {
                                    ...log,
                                    imageUrls: [...reloadedImages, ...(log.imageUrls.filter(url => url.startsWith('blob:')))],
                                  }
                                : log,
                            ),
                          };
                        }
                        return set;
                      }),
                    );
                  }
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('물류 이미지 삭제 오류:', error);
        alert('이미지 삭제에 실패했습니다.');
      }
    },
    [setDeliverySets, orderId, API_BASE_URL, SERVER_BASE_URL],
  );

  // LogisticsDeliveryTab을 위한 이미지 업로드 래퍼 함수
  const handleLogisticsImageUpload = useCallback(
    (
      setId: string,
      logisticsId: string,
      e: React.ChangeEvent<HTMLInputElement>,
    ) => {
      if (e.target.files && e.target.files.length > 0) {
        handleImageUpload(setId, logisticsId, e.target.files);
      }
    },
    [handleImageUpload],
  );

  // LogisticsDeliveryTab을 위한 updatePackageInfo 래퍼 함수
  const handleUpdatePackageInfo = useCallback(
    (setId: string, pkgId: string, field: string, value: any) => {
      updatePackageInfo(setId, pkgId, field as keyof PackageInfo, value);
    },
    [updatePackageInfo],
  );

  // LogisticsDeliveryTab을 위한 updateLogisticsInfo 래퍼 함수
  const handleUpdateLogisticsInfo = useCallback(
    (
      setId: string,
      logisticsId: string,
      field: string,
      value: any,
    ) => {
      updateLogisticsInfo(
        setId,
        logisticsId,
        field as keyof LogisticsInfo,
        value,
      );
    },
    [updateLogisticsInfo],
  );

  return {
    addDeliverySet,
    removeDeliverySet,
    addPackageInfo,
    removePackageInfo,
    updatePackageInfo,
    addLogisticsInfo,
    removeLogisticsInfo,
    updateLogisticsInfo,
    handleLogisticsImageUpload,
    removeLogisticsImage,
    handleUpdatePackageInfo,
    handleUpdateLogisticsInfo,
  };
}

