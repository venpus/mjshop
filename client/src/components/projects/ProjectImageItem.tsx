import { X, CheckCircle2, Circle, Edit2, Check, FileText } from "lucide-react";
import { getFullImageUrl } from "../../api/projectApi";
import { ProductImagePreview } from "../ui/product-image-preview";
import { useState } from "react";

interface ProjectImageItemProps {
  image: {
    id: number;
    image_url: string;
    display_order: number;
    description?: string | null;
    is_confirmed: boolean;
    confirmed_at: string | Date | null;
  };
  index: number;
  onDelete: () => void;
  onConfirm: () => void;
  onUnconfirm: () => void;
  onDescriptionUpdate?: (description: string | null) => void;
  onImageClick?: (imageUrl: string) => void;
  showConfirmButton?: boolean;
}

export function ProjectImageItem({
  image,
  index,
  onDelete,
  onConfirm,
  onUnconfirm,
  onDescriptionUpdate,
  onImageClick,
  showConfirmButton = true,
}: ProjectImageItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editDescription, setEditDescription] = useState(image.description || '');
  const [isSavingDescription, setIsSavingDescription] = useState(false);
  const fullUrl = getFullImageUrl(image.image_url);

  const handleSaveDescription = async () => {
    if (onDescriptionUpdate) {
      try {
        setIsSavingDescription(true);
        await onDescriptionUpdate(editDescription.trim() || null);
        setIsEditingDescription(false);
      } catch (error: any) {
        alert(error.message || '설명 저장에 실패했습니다.');
      } finally {
        setIsSavingDescription(false);
      }
    }
  };

  const handleCancelDescription = () => {
    setEditDescription(image.description || '');
    setIsEditingDescription(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePosition({ x: e.clientX, y: e.clientY });
  };

  return (
    <div
      className="relative group aspect-square bg-gray-50 rounded-lg overflow-hidden border-2 transition-colors"
      style={{
        borderColor: image.is_confirmed ? '#10b981' : '#e5e7eb',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseMove={handleMouseMove}
    >
      <img
        src={fullUrl}
        alt={`이미지 ${index + 1}`}
        className="w-full h-full object-contain cursor-pointer"
        onClick={() => onImageClick?.(fullUrl)}
        onError={(e) => {
          console.error('이미지 로드 실패:', image.image_url);
          (e.target as HTMLImageElement).src = '';
        }}
      />

      {/* 이미지 번호 */}
      <div className="absolute bottom-2 left-2 px-2 py-1 bg-black bg-opacity-60 text-white text-xs rounded">
        #{index + 1}
      </div>

      {/* 확정 표시 */}
      {image.is_confirmed && (
        <div className="absolute top-2 left-2 px-2 py-1 bg-green-500 text-white text-xs rounded flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          <span>확정</span>
        </div>
      )}

      {/* 확정 버튼 */}
      {showConfirmButton && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (image.is_confirmed) {
              onUnconfirm();
            } else {
              onConfirm();
            }
          }}
          className={`absolute top-2 right-12 p-1.5 rounded-md shadow-md transition-all z-10 ${
            image.is_confirmed
              ? 'bg-green-500 text-white'
              : 'bg-white text-gray-600 hover:bg-green-50 opacity-0 group-hover:opacity-100'
          }`}
          title={image.is_confirmed ? '확정 해제' : '확정'}
        >
          {image.is_confirmed ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <Circle className="w-4 h-4" />
          )}
        </button>
      )}

      {/* 설명 편집 버튼 */}
      {onDescriptionUpdate && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsEditingDescription(true);
          }}
          className="absolute bottom-2 right-12 p-1.5 bg-white rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-50 z-10"
          title="설명 편집"
        >
          <FileText className="w-4 h-4 text-blue-600" />
        </button>
      )}

      {/* 삭제 버튼 */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (confirm('이 이미지를 삭제하시겠습니까?')) {
            onDelete();
          }
        }}
        className="absolute top-2 right-2 p-1.5 bg-white rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 z-10"
        title="삭제"
      >
        <X className="w-4 h-4 text-red-600" />
      </button>

      {/* 설명 표시/편집 영역 */}
      {image.description && !isEditingDescription && (
        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white text-xs p-2 max-h-20 overflow-y-auto">
          <p className="line-clamp-2">{image.description}</p>
        </div>
      )}

      {/* 설명 편집 모달 */}
      {isEditingDescription && onDescriptionUpdate && (
        <div
          className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center z-20 p-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-white rounded-lg p-4 w-full max-w-md space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-900">이미지 설명</h4>
              <button
                onClick={handleCancelDescription}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              placeholder="이미지 설명을 입력하세요..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={handleCancelDescription}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSaveDescription}
                disabled={isSavingDescription}
                className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {isSavingDescription ? '저장 중...' : '저장'}
              </button>
              {editDescription.trim() && (
                <button
                  onClick={async () => {
                    if (confirm('설명을 삭제하시겠습니까?')) {
                      try {
                        setIsSavingDescription(true);
                        await onDescriptionUpdate(null);
                        setIsEditingDescription(false);
                      } catch (error: any) {
                        alert(error.message || '설명 삭제에 실패했습니다.');
                      } finally {
                        setIsSavingDescription(false);
                      }
                    }
                  }}
                  disabled={isSavingDescription}
                  className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  삭제
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 마우스 오버 미리보기 */}
      {isHovered && !isEditingDescription && (
        <ProductImagePreview
          imageUrl={fullUrl}
          mousePosition={mousePosition}
          isVisible={true}
          size={320}
        />
      )}
    </div>
  );
}

