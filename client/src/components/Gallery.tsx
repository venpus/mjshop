import { useState, useEffect } from 'react';
import { Image as ImageIcon, Package, FolderOpen } from 'lucide-react';
import { ProductFolderView, ProductFolder } from './gallery/ProductFolderView';
import { ImageGridView } from './gallery/ImageGridView';
import { getAllPurchaseOrders, getAllPurchaseOrderImages, PurchaseOrderImage, getFullImageUrl } from '../api/purchaseOrderApi';
import { useAuth } from '../contexts/AuthContext';

type TabType = 'products' | 'accessories' | 'projects';

export function Gallery() {
  const { user } = useAuth();
  const isLevelC0 = user?.level === 'C0: 한국Admin';
  const [activeTab, setActiveTab] = useState<TabType>('products');
  const [folders, setFolders] = useState<ProductFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<ProductFolder | null>(null);
  const [images, setImages] = useState<PurchaseOrderImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingImages, setIsLoadingImages] = useState(false);

  // C0 레벨 관리자는 악세서리/프로젝트 탭 접근 불가
  useEffect(() => {
    if (isLevelC0 && (activeTab === 'accessories' || activeTab === 'projects')) {
      setActiveTab('products');
      setSelectedFolder(null);
      setImages([]);
    }
  }, [isLevelC0, activeTab]);

  // 발주 상품 폴더 로드
  useEffect(() => {
    if (activeTab === 'products') {
      loadProductFolders();
    }
  }, [activeTab]);

  const loadProductFolders = async () => {
    setIsLoading(true);
    try {
      const purchaseOrders = await getAllPurchaseOrders();
      
      // 각 발주별로 이미지 개수 확인
      const foldersWithCounts = await Promise.all(
        purchaseOrders.map(async (po) => {
          try {
            const images = await getAllPurchaseOrderImages(po.id);
            
            // 썸네일 우선순위: 1) 상품 메인 이미지, 2) 발주 이미지 중 첫 번째
            let thumbnailUrl: string | null = null;
            
            if (po.product_main_image) {
              // 상품 메인 이미지가 있으면 우선 사용
              thumbnailUrl = getFullImageUrl(po.product_main_image);
            } else if (images.length > 0) {
              // 발주 이미지가 있으면 첫 번째 이미지 사용
              thumbnailUrl = images[0].url;
            }

            return {
              purchaseOrderId: po.id,
              poNumber: po.po_number,
              productName: po.product_name,
              productNameChinese: po.product_name_chinese,
              thumbnailUrl,
              productMainImage: po.product_main_image ? getFullImageUrl(po.product_main_image) : null,
              imageCount: images.length,
            } as ProductFolder;
          } catch (error) {
            console.error(`발주 ${po.id} 이미지 조회 실패:`, error);
            // 에러 발생 시에도 상품 메인 이미지는 사용 가능
            const thumbnailUrl = po.product_main_image ? getFullImageUrl(po.product_main_image) : null;
            return {
              purchaseOrderId: po.id,
              poNumber: po.po_number,
              productName: po.product_name,
              productNameChinese: po.product_name_chinese,
              thumbnailUrl,
              productMainImage: po.product_main_image ? getFullImageUrl(po.product_main_image) : null,
              imageCount: 0,
            } as ProductFolder;
          }
        })
      );

      // 이미지가 있는 폴더만 표시 (또는 모든 폴더 표시)
      setFolders(foldersWithCounts);
    } catch (error) {
      console.error('발주 목록 로드 실패:', error);
      alert('발주 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFolderClick = async (folder: ProductFolder) => {
    setSelectedFolder(folder);
    setIsLoadingImages(true);
    try {
      const folderImages = await getAllPurchaseOrderImages(folder.purchaseOrderId);
      setImages(folderImages);
    } catch (error) {
      console.error('이미지 로드 실패:', error);
      alert('이미지를 불러오는데 실패했습니다.');
      setImages([]);
    } finally {
      setIsLoadingImages(false);
    }
  };

  const handleBack = () => {
    setSelectedFolder(null);
    setImages([]);
  };

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center shadow-md">
              <ImageIcon className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-gray-900">갤러리</h2>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            제품 이미지 및 관련 사진을 관리합니다.
          </p>
        </div>

        {/* 탭 네비게이션 */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex gap-1">
            <button
              onClick={() => {
                setActiveTab('products');
                setSelectedFolder(null);
                setImages([]);
              }}
              className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                activeTab === 'products'
                  ? 'text-purple-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              발주 상품
              {activeTab === 'products' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600" />
              )}
            </button>
            {/* C0 레벨 관리자는 악세서리 탭 숨김 */}
            {!isLevelC0 && (
              <button
                onClick={() => {
                  setActiveTab('accessories');
                  setSelectedFolder(null);
                  setImages([]);
                }}
                className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                  activeTab === 'accessories'
                    ? 'text-purple-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                악세서리
                {activeTab === 'accessories' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600" />
                )}
              </button>
            )}
            {/* C0 레벨 관리자는 프로젝트 관리 탭 숨김 */}
            {!isLevelC0 && (
              <button
                onClick={() => {
                  setActiveTab('projects');
                  setSelectedFolder(null);
                  setImages([]);
                }}
                className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                  activeTab === 'projects'
                    ? 'text-purple-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                프로젝트 관리
                {activeTab === 'projects' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600" />
                )}
              </button>
            )}
          </nav>
        </div>

        {/* 컨텐츠 영역 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {activeTab === 'products' && (
            <>
              {selectedFolder ? (
                isLoadingImages ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="text-center">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-4"></div>
                      <p className="text-gray-500">이미지를 불러오는 중...</p>
                    </div>
                  </div>
                ) : (
                  <ImageGridView
                    images={images}
                    productName={selectedFolder.productName}
                    poNumber={selectedFolder.poNumber}
                    productMainImage={selectedFolder.productMainImage}
                    onBack={handleBack}
                  />
                )
              ) : (
                <ProductFolderView
                  folders={folders}
                  onFolderClick={handleFolderClick}
                  isLoading={isLoading}
                />
              )}
            </>
          )}

          {/* C0 레벨 관리자는 악세서리 탭 접근 불가 */}
          {!isLevelC0 && activeTab === 'accessories' && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
              <Package className="w-16 h-16 mb-4 text-gray-400" />
              <p className="text-lg">악세서리 갤러리 준비 중입니다.</p>
              <p className="text-sm mt-2">곧 악세서리 이미지 관리 기능이 추가됩니다.</p>
            </div>
          )}

          {/* C0 레벨 관리자는 프로젝트 관리 탭 접근 불가 */}
          {!isLevelC0 && activeTab === 'projects' && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
              <FolderOpen className="w-16 h-16 mb-4 text-gray-400" />
              <p className="text-lg">프로젝트 갤러리 준비 중입니다.</p>
              <p className="text-sm mt-2">곧 프로젝트 이미지 관리 기능이 추가됩니다.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
