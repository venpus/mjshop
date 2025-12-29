import { useState } from 'react';
import { Plus, X, Upload } from 'lucide-react';
import type { PackingListItem, DomesticInvoice } from '../types';
import { uploadDomesticInvoiceImages, deleteDomesticInvoiceImage } from '../../../api/packingListApi';
import { getGroupId } from '../../../utils/packingListUtils';
import { ProductImagePreview } from '../../../components/ui/product-image-preview';

const SERVER_BASE_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

/**
 * 서버 이미지 URL을 전체 URL로 변환
 */
function getFullImageUrl(imageUrl: string | null | undefined): string {
  if (!imageUrl) return '';
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  return `${SERVER_BASE_URL}${imageUrl}`;
}

interface DomesticInvoiceCellProps {
  item: PackingListItem;
  groupId: string;
  onInvoiceChange: (groupId: string, invoices: DomesticInvoice[]) => void;
  onImageClick?: (imageUrl: string) => void;
}

export function DomesticInvoiceCell({
  item,
  groupId,
  onInvoiceChange,
  onImageClick,
}: DomesticInvoiceCellProps) {
  const [hoveredImage, setHoveredImage] = useState<{ url: string; mousePosition: { x: number; y: number } } | null>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (hoveredImage) {
      setHoveredImage({
        ...hoveredImage,
        mousePosition: { x: e.clientX, y: e.clientY },
      });
    }
  };

  const handleInvoiceNumberChange = (invoiceIndex: number, number: string) => {
    const newInvoices = [...(item.domesticInvoice || [])];
    if (newInvoices[invoiceIndex]) {
      newInvoices[invoiceIndex] = { ...newInvoices[invoiceIndex], number };
    } else {
      newInvoices[invoiceIndex] = { number, images: [] };
    }
    onInvoiceChange(groupId, newInvoices);
  };

  const handleImageUpload = async (invoiceIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    const invoice = item.domesticInvoice?.[invoiceIndex];
    
    // packingListId 추출
    const parts = item.id.split('-');
    const packingListId = parseInt(parts[0]);
    if (isNaN(packingListId)) {
      console.error('Invalid packing list ID:', item.id);
      alert('패킹리스트 ID를 찾을 수 없습니다.');
      e.target.value = '';
      return;
    }

    try {
      let invoiceId = invoice?.id;
      
      // 내륙송장이 아직 서버에 생성되지 않은 경우, 먼저 생성 (송장번호 없이도 가능)
      if (!invoiceId) {
        const { createDomesticInvoice } = await import('../../../api/packingListApi');
        const newInvoice = await createDomesticInvoice(packingListId, {
          invoice_number: invoice?.number || '', // 송장번호가 없으면 빈 문자열
        });
        invoiceId = newInvoice.id;
        
        // 로컬 상태 업데이트 (생성된 ID 반영)
        const newInvoices = [...(item.domesticInvoice || [])];
        if (newInvoices[invoiceIndex]) {
          newInvoices[invoiceIndex] = { ...newInvoices[invoiceIndex], id: invoiceId };
        } else {
          newInvoices[invoiceIndex] = { number: invoice?.number || '', images: [], id: invoiceId };
        }
        onInvoiceChange(groupId, newInvoices);
      }

      // 서버에 이미지 업로드
      const result = await uploadDomesticInvoiceImages(packingListId, invoiceId, fileArray);
      
      // 업로드된 이미지들을 기존 이미지 목록에 추가 (URL 전체 경로로 변환)
      const newInvoices = [...(item.domesticInvoice || [])];
      if (newInvoices[invoiceIndex]) {
        const currentImages = newInvoices[invoiceIndex].images || [];
        const newImages = result.images.map(img => ({ 
          id: img.id, 
          url: getFullImageUrl(img.url) // 전체 URL로 변환
        }));
        const updatedImages = [...currentImages, ...newImages].slice(0, 10); // 최대 10장
        newInvoices[invoiceIndex] = { ...newInvoices[invoiceIndex], images: updatedImages, id: invoiceId };
        onInvoiceChange(groupId, newInvoices);
      }
    } catch (error: any) {
      console.error('이미지 업로드 오류:', error);
      alert(error.message || '이미지 업로드에 실패했습니다.');
    }

    // 입력 초기화 (같은 파일을 다시 선택할 수 있도록)
    e.target.value = '';
  };

  const handleImageDelete = async (invoiceIndex: number, imageIndex: number) => {
    const invoice = item.domesticInvoice?.[invoiceIndex];
    const image = invoice?.images?.[imageIndex];
    
    if (!image) return;

    // 서버에 저장된 이미지인 경우 서버에서도 삭제
    if (image.id) {
      try {
        await deleteDomesticInvoiceImage(image.id);
      } catch (error: any) {
        console.error('이미지 삭제 오류:', error);
        alert(error.message || '이미지 삭제에 실패했습니다.');
        return;
      }
    }

    // 로컬 상태에서도 제거
    const newInvoices = [...(item.domesticInvoice || [])];
    if (newInvoices[invoiceIndex]) {
      const newImages = newInvoices[invoiceIndex].images.filter((_, idx) => idx !== imageIndex);
      newInvoices[invoiceIndex] = { ...newInvoices[invoiceIndex], images: newImages };
      onInvoiceChange(groupId, newInvoices);
    }
  };

  const handleInvoiceDelete = (invoiceIndex: number) => {
    const newInvoices = (item.domesticInvoice || []).filter((_, idx) => idx !== invoiceIndex);
    onInvoiceChange(groupId, newInvoices);
  };

  const handleAddInvoice = () => {
    const newInvoices = [...(item.domesticInvoice || []), { number: '', images: [], pendingImages: [] }];
    onInvoiceChange(groupId, newInvoices);
  };

  return (
    <div className="flex flex-col gap-2">
      {item.domesticInvoice && item.domesticInvoice.length > 0 ? (
        item.domesticInvoice.map((invoice, invoiceIndex) => (
          <div key={invoiceIndex} className="flex flex-col gap-2 items-center border border-gray-200 rounded p-2">
            {/* 송장번호 입력 및 버튼 */}
            <div className="flex items-center gap-1 w-full">
              <input
                type="text"
                value={invoice.number}
                onChange={(e) => handleInvoiceNumberChange(invoiceIndex, e.target.value)}
                className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm text-center"
                placeholder="송장번호"
              />
              <label className="cursor-pointer p-1 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded border border-purple-300 transition-colors" title="사진 추가 (최대 10장)">
                <Upload className="w-4 h-4" />
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleImageUpload(invoiceIndex, e)}
                  className="hidden"
                />
              </label>
              <button
                type="button"
                onClick={() => handleInvoiceDelete(invoiceIndex)}
                className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                title="송장 삭제"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* 썸네일 이미지들 (최대 10장) */}
            {invoice.images && invoice.images.length > 0 && (
              <div className="grid grid-cols-5 gap-1 w-full">
                {invoice.images.map((imageInfo, imageIndex) => {
                  const fullImageUrl = getFullImageUrl(imageInfo.url);
                  return (
                    <div
                      key={imageIndex}
                      className="relative w-12 h-12 cursor-pointer group"
                      onClick={() => onImageClick?.(fullImageUrl)}
                      onMouseEnter={(e) => {
                        setHoveredImage({
                          url: fullImageUrl,
                          mousePosition: { x: e.clientX, y: e.clientY },
                        });
                      }}
                      onMouseLeave={() => setHoveredImage(null)}
                      onMouseMove={handleMouseMove}
                    >
                      <img
                        src={fullImageUrl}
                        alt={`송장 사진 ${imageIndex + 1}`}
                        className="w-full h-full object-cover rounded border border-gray-300 group-hover:border-purple-500 group-hover:scale-110 transition-all"
                        onError={(e) => {
                          console.error('이미지 로딩 실패:', fullImageUrl);
                          // 이미지 로딩 실패 시 기본 이미지 표시
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleImageDelete(invoiceIndex, imageIndex);
                        }}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                        title="사진 삭제"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            {invoice.images && invoice.images.length >= 10 && (
              <span className="text-xs text-gray-500">최대 10장까지 업로드 가능</span>
            )}
          </div>
        ))
      ) : (
        <span className="text-gray-400 text-xs">-</span>
      )}
      <button
        type="button"
        onClick={handleAddInvoice}
        className="p-1 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded border border-purple-300 transition-colors flex items-center justify-center"
        title="송장 추가"
      >
        <Plus className="w-4 h-4" />
      </button>

      {/* 마우스 오버 시 이미지 미리보기 */}
      {hoveredImage && (
        <ProductImagePreview
          imageUrl={hoveredImage.url}
          mousePosition={hoveredImage.mousePosition}
          isVisible={true}
          size={256}
          offset={20}
        />
      )}
    </div>
  );
}
