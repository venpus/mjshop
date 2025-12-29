import { useState, useEffect } from 'react';
import { X, Download } from 'lucide-react';
import { PackagingMaterial } from './types';
import { PackagingInventoryTab, PackagingInventoryRecord } from './PackagingInventoryTab';
import { MaterialPhotoGalleryModal } from '../materials/MaterialPhotoGalleryModal';
import { AddToOrderSection } from './AddToOrderSection';

interface PackagingMaterialDetailModalProps {
  material: PackagingMaterial;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * 포장자재 상세 정보 모달 컴포넌트
 */
export function PackagingMaterialDetailModal({
  material,
  isOpen,
  onClose,
}: PackagingMaterialDetailModalProps) {
  // TODO: DB 연동 시 입출고 기록 데이터를 서버에서 가져와야 함
  // 임시 더미 데이터
  const [inventoryRecords, setInventoryRecords] = useState<PackagingInventoryRecord[]>([
    { date: '2024-01-15', incoming: 50, outgoing: null, quantity: 50 },
    { date: '2024-01-20', incoming: null, outgoing: 30, quantity: 20 },
  ]);

  const [activeTab, setActiveTab] = useState<'photos' | 'inventory'>('photos');
  const [photoGalleryModal, setPhotoGalleryModal] = useState<{ images: string[]; title: string } | null>(null);

  const handleDownloadImage = async (imageUrl: string, imageName: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = imageName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('이미지 다운로드 실패:', error);
      alert('이미지 다운로드에 실패했습니다.');
    }
  };

  const getImageExtension = (url: string): string => {
    const match = url.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/i);
    return match ? match[1] : 'jpg';
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* 오버레이 */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* 모달 컨테이너 */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* 헤더 */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">포장자재 상세 정보</h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="닫기"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 컨텐츠 */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              {/* 기본 정보 테이블 - 항상 표시 */}
              <div className="border border-gray-300 rounded-lg overflow-hidden">
                <table className="w-full">
                  <tbody className="divide-y divide-gray-300">
                    <tr>
                      <th className="px-4 py-3 bg-gray-50 text-left text-sm font-semibold text-gray-700 border-r border-gray-300 whitespace-nowrap">
                        번호
                      </th>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                        {material.id}
                      </td>
                      <th className="px-4 py-3 bg-gray-50 text-left text-sm font-semibold text-gray-700 border-r border-l border-gray-300 whitespace-nowrap">
                        코드
                      </th>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                        {material.code}
                      </td>
                    </tr>
                    <tr>
                      <th className="px-4 py-3 bg-gray-50 text-left text-sm font-semibold text-gray-700 border-r border-gray-300 whitespace-nowrap">
                        포장자재명
                      </th>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                        {material.name}
                      </td>
                      <th className="px-4 py-3 bg-gray-50 text-left text-sm font-semibold text-gray-700 border-r border-l border-gray-300 whitespace-nowrap">
                        중문명
                      </th>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                        {material.nameChinese}
                      </td>
                    </tr>
                    <tr>
                      <th className="px-4 py-3 bg-gray-50 text-left text-sm font-semibold text-gray-700 border-r border-gray-300 whitespace-nowrap">
                        단가
                      </th>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                        ¥{material.price.toFixed(2)}
                      </td>
                      <th className="px-4 py-3 bg-gray-50 text-left text-sm font-semibold text-gray-700 border-r border-l border-gray-300 whitespace-nowrap">
                        재고
                      </th>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                        {material.stock}개
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 발주 작업에 추가 */}
              <AddToOrderSection
                materialId={material.id}
                materialCode={material.code}
                materialName={material.name}
                onAdd={(productName) => {
                  alert(`발주 "${productName}"에 포장자재 "${material.name}"가 추가되었습니다.`);
                }}
              />

              {/* 탭 네비게이션 */}
              <div className="border-b border-gray-200">
                <nav className="flex -mb-px">
                  <button
                    onClick={() => setActiveTab('photos')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'photos'
                        ? 'border-purple-500 text-purple-600 bg-purple-50'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    사진
                  </button>
                  <button
                    onClick={() => setActiveTab('inventory')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'inventory'
                        ? 'border-green-500 text-green-600 bg-green-50'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    입출고 기록
                  </button>
                </nav>
              </div>

              {/* 탭 컨텐츠 */}
              {activeTab === 'photos' && (
                <div>
                  {/* 사진 섹션 */}
                  {material.images && material.images.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {material.images.map((image, index) => (
                        <div
                          key={index}
                          className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-300 group cursor-pointer"
                          onClick={() => {
                            setPhotoGalleryModal({
                              images: material.images,
                              title: `${material.name} 사진`,
                            });
                          }}
                        >
                          <img
                            src={image}
                            alt={`${material.name} 사진 ${index + 1}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                          {/* 다운로드 버튼 (호버 시 표시) */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const ext = getImageExtension(image);
                              handleDownloadImage(image, `${material.name}_${index + 1}.${ext}`);
                            }}
                            className="absolute top-2 right-2 p-2 bg-white rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-50"
                            title="다운로드"
                          >
                            <Download className="w-4 h-4 text-gray-600" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">등록된 사진이 없습니다.</p>
                  )}
                </div>
              )}

              {activeTab === 'inventory' && (
                <PackagingInventoryTab
                  records={inventoryRecords}
                  onRecordsChange={setInventoryRecords}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 이미지 클릭 시 갤러리 모달 */}
      {photoGalleryModal && (
        <MaterialPhotoGalleryModal
          images={photoGalleryModal.images}
          title={photoGalleryModal.title}
          isOpen={true}
          onClose={() => setPhotoGalleryModal(null)}
        />
      )}

    </div>
  );
}

