import { useState } from "react";

interface UseImageModalsReturn {
  // 상품 이미지 모달
  isImageModalOpen: boolean;
  setIsImageModalOpen: (open: boolean) => void;

  // 사진모아보기 모달
  isPhotoGalleryOpen: boolean;
  setIsPhotoGalleryOpen: (open: boolean) => void;
  selectedGalleryImage: string | null;
  setSelectedGalleryImage: (image: string | null) => void;

  // 업체 출고 이미지 모달
  selectedFactoryImage: string | null;
  setSelectedFactoryImage: (image: string | null) => void;

  // 물류 이미지 모달
  logisticsImageModalOpen: boolean;
  setLogisticsImageModalOpen: (open: boolean) => void;
  selectedLogisticsImage: string;
  setSelectedLogisticsImage: (image: string) => void;
  openLogisticsImageModal: (imageUrl: string) => void;

  // 이미지 미리보기 툴팁
  hoveredImage: string;
  setHoveredImage: (image: string) => void;
}

/**
 * 이미지 모달 관리 Hook
 * 여러 이미지 모달의 상태를 중앙에서 관리합니다.
 */
export function useImageModals(): UseImageModalsReturn {
  // 상품 이미지 모달
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  // 사진모아보기 모달
  const [isPhotoGalleryOpen, setIsPhotoGalleryOpen] = useState(false);
  const [selectedGalleryImage, setSelectedGalleryImage] = useState<string | null>(null);

  // 업체 출고 이미지 모달
  const [selectedFactoryImage, setSelectedFactoryImage] = useState<string | null>(null);

  // 물류 이미지 모달
  const [logisticsImageModalOpen, setLogisticsImageModalOpen] = useState<boolean>(false);
  const [selectedLogisticsImage, setSelectedLogisticsImage] = useState<string>("");
  const [hoveredImage, setHoveredImage] = useState<string>("");

  // 물류 이미지 모달 열기
  const openLogisticsImageModal = (imageUrl: string) => {
    setSelectedLogisticsImage(imageUrl);
    setLogisticsImageModalOpen(true);
  };

  return {
    // 상품 이미지 모달
    isImageModalOpen,
    setIsImageModalOpen,

    // 사진모아보기 모달
    isPhotoGalleryOpen,
    setIsPhotoGalleryOpen,
    selectedGalleryImage,
    setSelectedGalleryImage,

    // 업체 출고 이미지 모달
    selectedFactoryImage,
    setSelectedFactoryImage,

    // 물류 이미지 모달
    logisticsImageModalOpen,
    setLogisticsImageModalOpen,
    selectedLogisticsImage,
    setSelectedLogisticsImage,
    openLogisticsImageModal,

    // 이미지 미리보기 툴팁
    hoveredImage,
    setHoveredImage,
  };
}

