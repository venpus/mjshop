import { useState, useRef, useEffect } from "react";
import { Images, X, Download, Image, Upload, Loader2 } from "lucide-react";

interface PhotoGalleryModalProps {
  isOpen: boolean;
  productName: string;
  poNumber: string;
  images: string[];
  productId?: string; // 상품 이미지 업로드용
  purchaseOrderId?: string; // 발주 이미지 업로드용
  onClose: () => void;
  onImageClick: (imageUrl: string) => void;
  onImagesUpdated?: () => void;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const SERVER_BASE_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

export function PhotoGalleryModal({
  isOpen,
  productName,
  poNumber,
  images,
  productId,
  purchaseOrderId,
  onClose,
  onImageClick,
  onImagesUpdated,
}: PhotoGalleryModalProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleDownloadImage = async (
    e: React.MouseEvent,
    imageUrl: string,
    index: number,
  ) => {
    e.stopPropagation();
    if (imageUrl) {
      try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = `${productName}_${poNumber}_${index + 1}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      } catch (error) {
        console.error("이미지 다운로드 실패:", error);
        alert("이미지 다운로드에 실패했습니다.");
      }
    }
  };

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    // 발주 이미지 업로드인 경우
    if (purchaseOrderId) {
      setIsUploading(true);
      
      try {
        const formData = new FormData();
        
        // 이미지 파일들을 FormData에 추가
        files.forEach((file) => {
          formData.append('images', file);
        });

        // 발주 이미지 업로드 API 호출 (타입: other, relatedId: 0)
        const uploadResponse = await fetch(`${API_BASE_URL}/purchase-orders/${purchaseOrderId}/images/other/0`, {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json().catch(() => ({}));
          throw new Error(errorData.error || '이미지 업로드에 실패했습니다.');
        }

        const uploadData = await uploadResponse.json();
        if (!uploadData.success) {
          throw new Error(uploadData.error || '이미지 업로드에 실패했습니다.');
        }

        alert('이미지가 성공적으로 업로드되었습니다.');
        
        // 이미지 목록 갱신
        if (onImagesUpdated) {
          onImagesUpdated();
        }

        // 파일 input 초기화
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (error: any) {
        console.error('발주 이미지 업로드 오류:', error);
        alert(error.message || '이미지 업로드 중 오류가 발생했습니다.');
      } finally {
        setIsUploading(false);
      }
      return;
    }

    // 상품 이미지 업로드인 경우 (기존 로직)
    if (!productId) return;

    setIsUploading(true);
    
    try {
      // 1. 현재 상품 정보 가져오기
      const productResponse = await fetch(`${API_BASE_URL}/products/${productId}`, {
        credentials: 'include',
      });

      if (!productResponse.ok) {
        throw new Error('상품 정보를 불러오는데 실패했습니다.');
      }

      const productData = await productResponse.json();
      if (!productData.success || !productData.data) {
        throw new Error('상품 정보를 불러오는데 실패했습니다.');
      }

      const product = productData.data;

      // 2. FormData 생성 (기존 상품 정보 포함)
      const formData = new FormData();
      
      // 기존 상품 기본 정보 추가
      formData.append('name', product.name || '');
      if (product.name_chinese) {
        formData.append('nameChinese', product.name_chinese);
      }
      formData.append('category', product.category || '');
      formData.append('price', String(product.price || 0));
      if (product.size) {
        formData.append('size', product.size);
      }
      if (product.packaging_size) {
        formData.append('packagingSize', product.packaging_size);
      }
      if (product.weight) {
        formData.append('weight', product.weight);
      }
      formData.append('setCount', String(product.set_count || 1));
      if (product.small_pack_count) {
        formData.append('smallPackCount', String(product.small_pack_count));
      }
      if (product.box_count) {
        formData.append('boxCount', String(product.box_count));
      }

      // 공급상 정보 추가 (있는 경우)
      if (product.supplier?.name) {
        formData.append('supplierName', product.supplier.name);
        if (product.supplier.url) {
          formData.append('supplierUrl', product.supplier.url);
        }
      }

      // 3. 기존 이미지 URL 추가 (서버가 반환한 형식 그대로 사용 - 상대 경로)
      // main_image는 existingMainImageUrl로 처리
      if (product.main_image) {
        // 서버가 반환한 main_image 형식 그대로 사용 (상대 경로)
        formData.append('existingMainImageUrl', product.main_image);
      }

      // existingInfoImageUrls에 현재 모든 이미지 URL 포함 (서버 형식 그대로 - 상대 경로)
      const existingImageUrls: string[] = [];
      
      // images 배열에 있는 모든 이미지 추가 (서버가 반환한 상대 경로 형식 그대로 사용)
      if (Array.isArray(product.images)) {
        product.images.forEach((img: string) => {
          // 서버에서 반환하는 images는 이미 상대 경로 형식이므로 그대로 사용
          existingImageUrls.push(img);
        });
      }

      // JSON 문자열로 변환하여 전송
      if (existingImageUrls.length > 0) {
        formData.append('existingInfoImageUrls', JSON.stringify(existingImageUrls));
      }

      // 4. 새로 업로드할 이미지 파일 추가
      files.forEach((file) => {
        formData.append('infoImages', file);
      });

      // 5. PUT 요청 전송
      const uploadResponse = await fetch(`${API_BASE_URL}/products/${productId}`, {
        method: 'PUT',
        body: formData,
        credentials: 'include',
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json().catch(() => ({}));
        throw new Error(errorData.error || '이미지 업로드에 실패했습니다.');
      }

      const uploadData = await uploadResponse.json();
      if (!uploadData.success) {
        throw new Error(uploadData.error || '이미지 업로드에 실패했습니다.');
      }

      alert('이미지가 성공적으로 업로드되었습니다.');
      
      // 6. 이미지 목록 갱신
      if (onImagesUpdated) {
        onImagesUpdated();
      }

      // 파일 input 초기화
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error('이미지 업로드 오류:', error);
      alert(error.message || '이미지 업로드 중 오류가 발생했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center shadow-md">
              <Images className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-gray-900">사진첩</h3>
              <p className="text-sm text-gray-600 mt-0.5">
                {productName} ({poNumber})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {images && images.length > 0 ? (
            <div className="grid grid-cols-5 gap-4">
              {images.map((imageUrl, index) => (
                <div
                  key={index}
                  className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center border-2 border-gray-200 hover:border-purple-400 transition-all cursor-pointer group"
                  onClick={() => onImageClick(imageUrl)}
                >
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={`${productName} ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Image className="w-12 h-12 text-gray-400" />
                  )}

                  {/* 다운로드 버튼 */}
                  <button
                    onClick={(e) => handleDownloadImage(e, imageUrl, index)}
                    className="absolute top-2 right-2 p-2 bg-white rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-purple-50"
                    title="다운로드"
                  >
                    <Download className="w-4 h-4 text-purple-600" />
                  </button>

                  {/* 이미지 번호 */}
                  <div className="absolute bottom-2 left-2 px-2 py-1 bg-black bg-opacity-60 text-white text-xs rounded">
                    #{index + 1}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <Image className="w-16 h-16 text-gray-400 mb-4" />
              <p className="text-gray-600">표시할 이미지가 없습니다.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          {/* 업로드 버튼 (productId 또는 purchaseOrderId가 있는 경우 표시) */}
          {(productId || purchaseOrderId) && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <button
                onClick={handleUploadClick}
                disabled={isUploading}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>업로드 중...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>사진 업로드</span>
                  </>
                )}
              </button>
            </>
          )}
          
          <div className="flex items-center gap-3 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
