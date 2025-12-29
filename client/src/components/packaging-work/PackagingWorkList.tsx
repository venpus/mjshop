import { useState, useEffect } from 'react';
import { ProductImagePreview } from '../ui/product-image-preview';
import { MaterialPhotoGalleryModal } from '../materials/MaterialPhotoGalleryModal';
import { PackagingMaterialDetailModal } from './PackagingMaterialDetailModal';
import { Trash2, X } from 'lucide-react';
import { PackagingMaterial } from './types';
import { AddToOrderSection } from './AddToOrderSection';

interface PackagingWorkListProps {
  materials: PackagingMaterial[];
  onDelete?: (material: PackagingMaterial) => void;
}

/**
 * 포장자재 목록 컴포넌트
 */
export function PackagingWorkList({ materials, onDelete }: PackagingWorkListProps) {
  const [hoveredImage, setHoveredImage] = useState<{ materialId: number; imageIndex: number; imageUrl: string } | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [photoGalleryModal, setPhotoGalleryModal] = useState<{ images: string[]; title: string } | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<PackagingMaterial | null>(null);
  const [selectedMaterialForOrder, setSelectedMaterialForOrder] = useState<PackagingMaterial | null>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePosition({ x: e.clientX, y: e.clientY });
  };

  const handleRowClick = (material: PackagingMaterial) => {
    setSelectedMaterial(material);
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden w-full">
        <div className="overflow-x-auto">
          <table className="w-full" style={{ minWidth: '100%', tableLayout: 'auto' }}>
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                  번호
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                  코드
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                  포장자재명
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                  중문명
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                  단가
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                  재고
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                  사진썸네일
                </th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                              삭제
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                              발주 추가
                            </th>
                          </tr>
                        </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {materials.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    등록된 포장자재가 없습니다.
                  </td>
                </tr>
              ) : (
                materials.map((material, index) => (
                  <tr
                    key={material.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => handleRowClick(material)}
                  >
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                      {material.code}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                      {material.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                      {material.nameChinese}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                      ¥{material.price.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                      {material.stock}개
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {material.images && material.images.length > 0 ? (
                        <div className="flex items-center gap-2">
                          {material.images.slice(0, 2).map((image, imgIndex) => (
                            <div
                              key={imgIndex}
                              className="relative"
                              onMouseEnter={() =>
                                setHoveredImage({
                                  materialId: material.id,
                                  imageIndex: imgIndex,
                                  imageUrl: image,
                                })
                              }
                              onMouseLeave={() => setHoveredImage(null)}
                              onMouseMove={handleMouseMove}
                              onClick={(e) => {
                                e.stopPropagation();
                                setPhotoGalleryModal({
                                  images: material.images,
                                  title: `${material.name} 사진`,
                                });
                              }}
                            >
                              <img
                                src={image}
                                alt={`${material.name} 썸네일 ${imgIndex + 1}`}
                                className="w-12 h-12 object-cover rounded border border-gray-300 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            </div>
                          ))}
                          {material.images.length > 2 && (
                            <span className="text-xs text-gray-500">
                              ...외 {material.images.length - 2}장
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      {onDelete && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(material);
                          }}
                          className="inline-flex items-center justify-center p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedMaterialForOrder(material);
                        }}
                        className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        title="발주에 추가"
                      >
                        발주 추가
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 이미지 호버 프리뷰 */}
      {hoveredImage && (
        <ProductImagePreview
          imageUrl={hoveredImage.imageUrl}
          mousePosition={mousePosition}
          isVisible={true}
          productName={materials.find(m => m.id === hoveredImage.materialId)?.name || '포장자재'}
        />
      )}

      {/* 이미지 클릭 시 갤러리 모달 */}
      {photoGalleryModal && (
        <MaterialPhotoGalleryModal
          images={photoGalleryModal.images}
          title={photoGalleryModal.title}
          isOpen={true}
          onClose={() => setPhotoGalleryModal(null)}
        />
      )}

      {/* 포장자재 상세 정보 모달 */}
      {selectedMaterial && (
        <PackagingMaterialDetailModal
          material={selectedMaterial}
          isOpen={!!selectedMaterial}
          onClose={() => setSelectedMaterial(null)}
        />
      )}

      {/* 발주 추가 모달 */}
      {selectedMaterialForOrder && (
        <AddOrderModalWrapper
          material={selectedMaterialForOrder}
          onClose={() => setSelectedMaterialForOrder(null)}
          onAdd={(productName) => {
            alert(`발주 "${productName}"에 포장자재 "${selectedMaterialForOrder.name}"가 추가되었습니다.`);
            setSelectedMaterialForOrder(null);
          }}
        />
      )}
    </>
  );
}

// 발주 추가 모달 래퍼 컴포넌트 (ESC 키 지원)
function AddOrderModalWrapper({
  material,
  onClose,
  onAdd,
}: {
  material: PackagingMaterial;
  onClose: () => void;
  onAdd: (productName: string) => void;
}) {
  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto">
      {/* 오버레이 */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* 모달 컨테이너 */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden flex flex-col">
          {/* 헤더 */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              발주 작업에 추가 - {material.name}
            </h3>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="닫기"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 컨텐츠 */}
          <div className="p-6">
            <AddToOrderSection
              materialId={material.id}
              materialCode={material.code}
              materialName={material.name}
              onAdd={onAdd}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

