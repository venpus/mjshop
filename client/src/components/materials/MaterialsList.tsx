import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProductImagePreview } from '../ui/product-image-preview';
import { GalleryImageModal } from '../GalleryImageModal';
import { MaterialImageGalleryModal } from './MaterialImageGalleryModal';
import { MaterialPhotoGalleryModal } from './MaterialPhotoGalleryModal';
import { Edit, Trash2 } from 'lucide-react';

export interface Material {
  id: number; // 번호
  date: string; // 날짜
  code: string; // 코드
  productName: string; // 상품명
  productNameChinese: string; // 중문상품명
  category: string; // 카테고리
  typeCount: number; // 종류 수
  link: string; // 링크
  purchaseComplete: boolean; // 구매완료
  images: string[]; // 사진목록
  testImages: string[]; // 테스트 사진목록
  price: number; // 단가
  currentStock: number; // 현재 재고
}

interface MaterialsListProps {
  materials: Material[];
  onEdit?: (material: Material) => void;
  onDelete?: (material: Material) => void;
}

/**
 * 날짜 포맷팅 함수
 */
const formatDate = (date: string): string => {
  try {
    const dateObj = new Date(date);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (error) {
    return date;
  }
};

/**
 * 부자재 목록 컴포넌트
 */
export function MaterialsList({ materials, onEdit, onDelete }: MaterialsListProps) {
  const navigate = useNavigate();
  const [hoveredImage, setHoveredImage] = useState<{ materialId: number; imageIndex: number; imageUrl: string; isTestImage: boolean } | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [clickedImage, setClickedImage] = useState<string | null>(null);
  const [photoGalleryModal, setPhotoGalleryModal] = useState<{ images: string[]; title: string } | null>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePosition({ x: e.clientX, y: e.clientY });
  };

  const handleRowClick = (material: Material) => {
    navigate(`/admin/materials/${material.id}`);
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden w-full">
        <div className="overflow-x-auto">
          <table className="w-full" style={{ minWidth: '100%', tableLayout: 'auto' }}>
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  번호
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  날짜
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  코드
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                  상품명
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                  중문상품명
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  카테고리
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  종류 수
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                  단가
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                  현재 재고
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                  링크
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                  구매완료
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                  제품 사진
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                  테스트 사진목록
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                  관리
                </th>
              </tr>
            </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {materials.map((material) => (
              <tr
                key={material.id}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => handleRowClick(material)}
              >
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                  {material.id}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                  {formatDate(material.date)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                  {material.code}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                  {material.productName}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                  {material.productNameChinese}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                  {material.category}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {material.typeCount}개
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {material.price && typeof material.price === 'number' ? `¥${material.price.toFixed(2)}` : '-'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {material.currentStock !== undefined ? `${material.currentStock}개` : '-'}
                </td>
                <td className="px-4 py-3 text-sm whitespace-nowrap">
                  <a
                    href={material.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                    title={material.link}
                  >
                    {material.link}
                  </a>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm">
                  {material.purchaseComplete ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      완료
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      미완료
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {material.images.length > 0 ? (
                      <>
                        {material.images.slice(0, 2).map((image, index) => (
                          <div
                            key={index}
                            className="w-12 h-12 bg-gray-100 rounded overflow-hidden flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                            onMouseEnter={() => {
                              setHoveredImage({ materialId: material.id, imageIndex: index, imageUrl: image, isTestImage: false });
                            }}
                            onMouseLeave={() => {
                              setHoveredImage(null);
                            }}
                            onMouseMove={handleMouseMove}
                            onClick={() => {
                              setPhotoGalleryModal({
                                images: material.images,
                                title: `${material.productName} 제품 사진`,
                              });
                            }}
                          >
                            <img
                              src={image}
                              alt={`${material.productName} ${index + 1}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          </div>
                        ))}
                        {material.images.length > 2 && (
                          <span className="text-sm text-gray-600">
                            ...외 {material.images.length - 2}장
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-gray-400 text-xs">사진 없음</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {material.testImages.length > 0 ? (
                      <>
                        {material.testImages.slice(0, 2).map((image, index) => (
                          <div
                            key={index}
                            className="w-12 h-12 bg-gray-100 rounded overflow-hidden flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                            onMouseEnter={() => {
                              setHoveredImage({ materialId: material.id, imageIndex: index, imageUrl: image, isTestImage: true });
                            }}
                            onMouseLeave={() => {
                              setHoveredImage(null);
                            }}
                            onMouseMove={handleMouseMove}
                            onClick={() => {
                              setPhotoGalleryModal({
                                images: material.testImages,
                                title: `${material.productName} 테스트 사진`,
                              });
                            }}
                          >
                            <img
                              src={image}
                              alt={`${material.productName} 테스트 ${index + 1}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          </div>
                        ))}
                        {material.testImages.length > 2 && (
                          <span className="text-sm text-gray-600">
                            ...외 {material.testImages.length - 2}장
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-gray-400 text-xs">사진 없음</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm">
                  <div className="flex items-center gap-2">
                    {onEdit && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(material);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="수정"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(material);
                        }}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    {/* 마우스 오버 시 이미지 미리보기 */}
    {hoveredImage && (
      <ProductImagePreview
        imageUrl={hoveredImage.imageUrl}
        productName={hoveredImage.isTestImage ? '테스트 사진' : '제품 사진'}
        mousePosition={mousePosition}
        isVisible={true}
        size={256}
        offset={20}
      />
    )}

    {/* 사진 모아보기 모달 (모든 이미지를 한번에 보여줌) */}
    {photoGalleryModal && (
      <MaterialPhotoGalleryModal
        images={photoGalleryModal.images}
        title={photoGalleryModal.title}
        isOpen={true}
        onClose={() => setPhotoGalleryModal(null)}
        onImageClick={(imageUrl) => {
          setPhotoGalleryModal(null);
          setClickedImage(imageUrl);
        }}
      />
    )}

    {/* 클릭 시 단일 이미지 모달 */}
    {clickedImage && (
      <GalleryImageModal
        imageUrl={clickedImage}
        onClose={() => setClickedImage(null)}
      />
    )}
    </>
  );
}

