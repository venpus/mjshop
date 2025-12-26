import { useCallback } from "react";
import type { FactoryShipment, ReturnExchangeItem } from "../components/tabs/FactoryShippingTab";

interface UseFactoryShipmentHandlersProps {
  orderId: string;
  factoryShipments: FactoryShipment[];
  setFactoryShipments: React.Dispatch<React.SetStateAction<FactoryShipment[]>>;
  returnExchangeItems: ReturnExchangeItem[];
  setReturnExchangeItems: React.Dispatch<React.SetStateAction<ReturnExchangeItem[]>>;
  API_BASE_URL: string;
  SERVER_BASE_URL: string;
}

interface UseFactoryShipmentHandlersReturn {
  // 업체 출고 핸들러
  addFactoryShipment: () => void;
  removeFactoryShipment: (id: string) => void;
  updateFactoryShipment: (id: string, field: keyof FactoryShipment, value: any) => void;
  handleFactoryImageUpload: (shipmentId: string, e: React.ChangeEvent<HTMLInputElement>) => void;
  removeFactoryImage: (shipmentId: string, imageIndex: number, imageUrl: string) => Promise<void>;

  // 반품/교환 핸들러
  addReturnExchangeItem: () => void;
  removeReturnExchangeItem: (id: string) => void;
  updateReturnExchangeItem: (id: string, field: keyof ReturnExchangeItem, value: any) => void;
  handleReturnExchangeImageUpload: (itemId: string, e: React.ChangeEvent<HTMLInputElement>) => void;
  removeReturnExchangeImage: (itemId: string, imageIndex: number, imageUrl: string) => Promise<void>;
}

/**
 * 업체 출고 및 반품/교환 항목 핸들러 Hook
 */
export function useFactoryShipmentHandlers({
  orderId,
  factoryShipments,
  setFactoryShipments,
  returnExchangeItems,
  setReturnExchangeItems,
  API_BASE_URL,
  SERVER_BASE_URL,
}: UseFactoryShipmentHandlersProps): UseFactoryShipmentHandlersReturn {
  // 업체 출고 항목 추가
  const addFactoryShipment = useCallback(() => {
    const newShipment: FactoryShipment = {
      id: Date.now().toString(),
      date: "",
      quantity: 0,
      trackingNumber: "",
      receiveDate: "",
      images: [],
      pendingImages: [],
    };
    setFactoryShipments((prev) => [...prev, newShipment]);
  }, [setFactoryShipments]);

  // 업체 출고 항목 삭제
  const removeFactoryShipment = useCallback((id: string) => {
    console.log('출고 항목 삭제 요청:', id);
    setFactoryShipments((prev) => {
      const filtered = prev.filter((s) => s.id !== id);
      console.log('삭제 전 개수:', prev.length, '삭제 후 개수:', filtered.length);
      return filtered;
    });
  }, [setFactoryShipments]);

  // 업체 출고 항목 업데이트
  const updateFactoryShipment = useCallback((
    id: string,
    field: keyof FactoryShipment,
    value: any,
  ) => {
    setFactoryShipments((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, [field]: value } : s,
      ),
    );
  }, [setFactoryShipments]);

  // 업체 출고 이미지 선택 핸들러 (즉시 업로드하지 않고 파일만 저장)
  const handleFactoryImageUpload = useCallback((
    shipmentId: string,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const shipment = factoryShipments.find(
      (s) => s.id === shipmentId,
    );
    if (!shipment || !orderId) return;

    // 최대 5장 제한 확인 (이미 업로드된 서버 이미지 + pendingImages + 새로 선택한 파일)
    // blob: URL은 미리보기용이므로 카운트에서 제외
    const serverImageCount = shipment.images.filter(url => !url.startsWith('blob:')).length;
    const pendingImageCount = shipment.pendingImages?.length || 0;
    const maxImages = 5;
    const remainingSlots = maxImages - serverImageCount - pendingImageCount;
    
    if (remainingSlots <= 0) {
      alert('이미지는 최대 5장까지 업로드할 수 있습니다.');
      if (e.target) e.target.value = '';
      return;
    }

    // 추가 가능한 개수만큼만 선택
    const filesToAdd = Array.from(files).slice(0, remainingSlots);
    if (files.length > remainingSlots) {
      alert(`이미지는 최대 5장까지 업로드할 수 있습니다. ${remainingSlots}장만 추가됩니다.`);
    }

    // File 객체를 pendingImages에 추가
    const newPendingImages = [...(shipment.pendingImages || []), ...filesToAdd];
    
    // 미리보기를 위한 임시 URL 생성 (새로 선택한 파일만)
    const newPreviewUrls = filesToAdd.map(file => URL.createObjectURL(file));
    
    // shipment.images에서 blob: URL(미리보기 URL)은 제외하고, 서버 URL만 유지
    // 새로 선택한 파일의 미리보기 URL을 추가
    const serverUrls = shipment.images.filter(url => !url.startsWith('blob:'));
    const allPreviewUrls = [...serverUrls, ...newPreviewUrls];

    updateFactoryShipment(shipmentId, "pendingImages", newPendingImages);
    updateFactoryShipment(shipmentId, "images", allPreviewUrls);
    
    console.log(`[handleFactoryImageUpload] shipmentId=${shipmentId}, 서버 이미지=${serverUrls.length}개, 새 파일=${filesToAdd.length}개, 총=${allPreviewUrls.length}개`);

    // input 초기화
    if (e.target) {
      e.target.value = '';
    }
  }, [factoryShipments, orderId, updateFactoryShipment]);

  // 업체 출고 이미지 삭제
  const removeFactoryImage = useCallback(async (
    shipmentId: string,
    imageIndex: number,
    imageUrl: string,
  ) => {
    const shipment = factoryShipments.find(
      (s) => s.id === shipmentId,
    );
    if (!shipment || !orderId) return;

    // imageUrl에서 서버 베이스 URL 제거하여 상대 경로로 변환
    const relativeImageUrl = imageUrl.startsWith('http') 
      ? imageUrl.replace(SERVER_BASE_URL, '')
      : imageUrl;

    try {
      // 먼저 이미지 목록을 조회하여 imageId 찾기
      const MAX_INT = 2147483647;
      const relatedId = parseInt(shipmentId);
      
      if (isNaN(relatedId) || relatedId > MAX_INT || relatedId < 0) {
        // 임시 ID인 경우 클라이언트에서만 삭제
        updateFactoryShipment(
          shipmentId,
          "images",
          shipment.images.filter((_, i) => i !== imageIndex),
        );
        return;
      }

      const imageListResponse = await fetch(
        `${API_BASE_URL}/purchase-orders/${orderId}/images/factory_shipment?relatedId=${relatedId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        }
      );

      if (!imageListResponse.ok) {
        throw new Error('이미지 목록 조회에 실패했습니다.');
      }

      const imageListResult = await imageListResponse.json();
      if (!imageListResult.success || !imageListResult.data) {
        throw new Error('이미지 목록을 가져올 수 없습니다.');
      }

      // 해당 imageUrl과 일치하는 이미지 찾기
      const targetImage = imageListResult.data.find((img: any) => {
        const imgUrl = typeof img === 'string' ? img : img.image_url;
        // 두 URL을 정규화하여 비교 (앞뒤 슬래시 제거, 대소문자 구분)
        const normalizeUrl = (url: string) => url.replace(/^\/+|\/+$/g, '').toLowerCase();
        const normalizedImgUrl = normalizeUrl(imgUrl.startsWith('http') ? imgUrl.replace(SERVER_BASE_URL, '') : imgUrl);
        const normalizedTargetUrl = normalizeUrl(relativeImageUrl);
        return normalizedImgUrl === normalizedTargetUrl || imgUrl === imageUrl;
      });

      if (!targetImage || !targetImage.id) {
        // imageId를 찾을 수 없으면 클라이언트에서만 삭제
        updateFactoryShipment(
          shipmentId,
          "images",
          shipment.images.filter((_, i) => i !== imageIndex),
        );
        return;
      }

      // 서버에 삭제 요청
      const deleteResponse = await fetch(
        `${API_BASE_URL}/purchase-orders/images/${targetImage.id}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );

      if (!deleteResponse.ok) {
        const errorData = await deleteResponse.json().catch(() => ({}));
        throw new Error(errorData.error || '이미지 삭제에 실패했습니다.');
      }

      // 삭제 후 모든 이미지 다시 조회
      const updatedImageListResponse = await fetch(
        `${API_BASE_URL}/purchase-orders/${orderId}/images/factory_shipment?relatedId=${relatedId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        }
      );

      if (updatedImageListResponse.ok) {
        const updatedImageListResult = await updatedImageListResponse.json();
        if (updatedImageListResult.success && updatedImageListResult.data) {
          const allImageUrls = updatedImageListResult.data.map((img: any) => {
            const url = typeof img === 'string' ? img : img.image_url;
            return url.startsWith('http') ? url : `${SERVER_BASE_URL}${url}`;
          });
          
          setFactoryShipments(prev => prev.map(s => 
            s.id === shipmentId 
              ? { ...s, images: allImageUrls }
              : s
          ));
        }
      }
    } catch (err: any) {
      console.error('이미지 삭제 오류:', err);
      alert(err.message || '이미지 삭제 중 오류가 발생했습니다.');
    }
  }, [factoryShipments, orderId, API_BASE_URL, SERVER_BASE_URL, updateFactoryShipment, setFactoryShipments]);

  // 반품/교환 항목 추가
  const addReturnExchangeItem = useCallback(() => {
    const newItem: ReturnExchangeItem = {
      id: Date.now().toString(),
      date: "",
      quantity: 0,
      trackingNumber: "",
      receiveDate: "",
      images: [],
      pendingImages: [],
    };
    setReturnExchangeItems((prev) => [...prev, newItem]);
  }, [setReturnExchangeItems]);

  // 반품/교환 항목 삭제
  const removeReturnExchangeItem = useCallback((id: string) => {
    console.log('반품/교환 항목 삭제 요청:', id);
    setReturnExchangeItems((prev) => {
      const filtered = prev.filter((item) => item.id !== id);
      console.log('삭제 전 개수:', prev.length, '삭제 후 개수:', filtered.length);
      return filtered;
    });
  }, [setReturnExchangeItems]);

  // 반품/교환 항목 업데이트
  const updateReturnExchangeItem = useCallback((
    id: string,
    field: keyof ReturnExchangeItem,
    value: any,
  ) => {
    setReturnExchangeItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );
  }, [setReturnExchangeItems]);

  // 반품/교환 이미지 선택 핸들러 (즉시 업로드하지 않고 파일만 저장)
  const handleReturnExchangeImageUpload = useCallback((
    itemId: string,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const item = returnExchangeItems.find(
      (i) => i.id === itemId,
    );
    if (!item || !orderId) return;

    // 최대 5장 제한 확인 (이미 업로드된 서버 이미지 + pendingImages + 새로 선택한 파일)
    // blob: URL은 미리보기용이므로 카운트에서 제외
    const serverImageCount = item.images.filter(url => !url.startsWith('blob:')).length;
    const pendingImageCount = item.pendingImages?.length || 0;
    const maxImages = 5;
    const remainingSlots = maxImages - serverImageCount - pendingImageCount;
    
    if (remainingSlots <= 0) {
      alert('이미지는 최대 5장까지 업로드할 수 있습니다.');
      if (e.target) e.target.value = '';
      return;
    }

    // 추가 가능한 개수만큼만 선택
    const filesToAdd = Array.from(files).slice(0, remainingSlots);
    if (files.length > remainingSlots) {
      alert(`이미지는 최대 5장까지 업로드할 수 있습니다. ${remainingSlots}장만 추가됩니다.`);
    }

    // File 객체를 pendingImages에 추가
    const newPendingImages = [...(item.pendingImages || []), ...filesToAdd];
    
    // 미리보기를 위한 임시 URL 생성 (새로 선택한 파일만)
    const newPreviewUrls = filesToAdd.map(file => URL.createObjectURL(file));
    
    // item.images에서 blob: URL(미리보기 URL)은 제외하고, 서버 URL만 유지
    // 새로 선택한 파일의 미리보기 URL을 추가
    const serverUrls = item.images.filter(url => !url.startsWith('blob:'));
    const allPreviewUrls = [...serverUrls, ...newPreviewUrls];

    updateReturnExchangeItem(itemId, "pendingImages", newPendingImages);
    updateReturnExchangeItem(itemId, "images", allPreviewUrls);
    
    console.log(`[handleReturnExchangeImageUpload] itemId=${itemId}, 서버 이미지=${serverUrls.length}개, 새 파일=${filesToAdd.length}개, 총=${allPreviewUrls.length}개`);

    // input 초기화
    if (e.target) {
      e.target.value = '';
    }
  }, [returnExchangeItems, orderId, updateReturnExchangeItem]);

  // 반품/교환 이미지 삭제
  const removeReturnExchangeImage = useCallback(async (
    itemId: string,
    imageIndex: number,
    imageUrl: string,
  ) => {
    const item = returnExchangeItems.find(
      (i) => i.id === itemId,
    );
    if (!item || !orderId) return;

    // imageUrl에서 서버 베이스 URL 제거하여 상대 경로로 변환
    const relativeImageUrl = imageUrl.startsWith('http') 
      ? imageUrl.replace(SERVER_BASE_URL, '')
      : imageUrl;

    try {
      // 먼저 이미지 목록을 조회하여 imageId 찾기
      const MAX_INT = 2147483647;
      const relatedId = parseInt(itemId);
      
      if (isNaN(relatedId) || relatedId > MAX_INT || relatedId < 0) {
        // 임시 ID인 경우 클라이언트에서만 삭제
        updateReturnExchangeItem(
          itemId,
          "images",
          item.images.filter((_, i) => i !== imageIndex),
        );
        return;
      }

      const imageListResponse = await fetch(
        `${API_BASE_URL}/purchase-orders/${orderId}/images/return_exchange?relatedId=${relatedId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        }
      );

      if (!imageListResponse.ok) {
        throw new Error('이미지 목록 조회에 실패했습니다.');
      }

      const imageListResult = await imageListResponse.json();
      if (!imageListResult.success || !imageListResult.data) {
        throw new Error('이미지 목록을 가져올 수 없습니다.');
      }

      // 해당 imageUrl과 일치하는 이미지 찾기
      const targetImage = imageListResult.data.find((img: any) => {
        const imgUrl = typeof img === 'string' ? img : img.image_url;
        // 두 URL을 정규화하여 비교 (앞뒤 슬래시 제거, 대소문자 구분)
        const normalizeUrl = (url: string) => url.replace(/^\/+|\/+$/g, '').toLowerCase();
        const normalizedImgUrl = normalizeUrl(imgUrl.startsWith('http') ? imgUrl.replace(SERVER_BASE_URL, '') : imgUrl);
        const normalizedTargetUrl = normalizeUrl(relativeImageUrl);
        return normalizedImgUrl === normalizedTargetUrl || imgUrl === imageUrl;
      });

      if (!targetImage || !targetImage.id) {
        // imageId를 찾을 수 없으면 클라이언트에서만 삭제
        updateReturnExchangeItem(
          itemId,
          "images",
          item.images.filter((_, i) => i !== imageIndex),
        );
        return;
      }

      // 서버에 삭제 요청
      const deleteResponse = await fetch(
        `${API_BASE_URL}/purchase-orders/images/${targetImage.id}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );

      if (!deleteResponse.ok) {
        const errorData = await deleteResponse.json().catch(() => ({}));
        throw new Error(errorData.error || '이미지 삭제에 실패했습니다.');
      }

      // 삭제 후 모든 이미지 다시 조회
      const updatedImageListResponse = await fetch(
        `${API_BASE_URL}/purchase-orders/${orderId}/images/return_exchange?relatedId=${relatedId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        }
      );

      if (updatedImageListResponse.ok) {
        const updatedImageListResult = await updatedImageListResponse.json();
        if (updatedImageListResult.success && updatedImageListResult.data) {
          const allImageUrls = updatedImageListResult.data.map((img: any) => {
            const url = typeof img === 'string' ? img : img.image_url;
            return url.startsWith('http') ? url : `${SERVER_BASE_URL}${url}`;
          });
          
          setReturnExchangeItems(prev => prev.map(item => 
            item.id === itemId 
              ? { ...item, images: allImageUrls }
              : item
          ));
        }
      }
    } catch (err: any) {
      console.error('이미지 삭제 오류:', err);
      alert(err.message || '이미지 삭제 중 오류가 발생했습니다.');
    }
  }, [returnExchangeItems, orderId, API_BASE_URL, SERVER_BASE_URL, updateReturnExchangeItem, setReturnExchangeItems]);

  return {
    // 업체 출고 핸들러
    addFactoryShipment,
    removeFactoryShipment,
    updateFactoryShipment,
    handleFactoryImageUpload,
    removeFactoryImage,

    // 반품/교환 핸들러
    addReturnExchangeItem,
    removeReturnExchangeItem,
    updateReturnExchangeItem,
    handleReturnExchangeImageUpload,
    removeReturnExchangeImage,
  };
}

