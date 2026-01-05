import { Folder, Image as ImageIcon } from 'lucide-react';

export interface ProductFolder {
  purchaseOrderId: string;
  poNumber: string;
  productName: string;
  productNameChinese?: string | null;
  thumbnailUrl: string | null;
  productMainImage: string | null; // 상품 메인 이미지
  imageCount: number;
}

interface ProductFolderViewProps {
  folders: ProductFolder[];
  onFolderClick: (folder: ProductFolder) => void;
  isLoading?: boolean;
}

export function ProductFolderView({ folders, onFolderClick, isLoading }: ProductFolderViewProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="bg-gray-100 rounded-lg aspect-square animate-pulse" />
        ))}
      </div>
    );
  }

  if (folders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-500">
        <Folder className="w-16 h-16 mb-4 text-gray-400" />
        <p className="text-lg">발주 상품이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {folders.map((folder) => (
        <button
          key={folder.purchaseOrderId}
          onClick={() => onFolderClick(folder)}
          className="group relative bg-white rounded-lg border border-gray-200 hover:border-purple-300 hover:shadow-lg transition-all duration-200 overflow-hidden flex flex-col"
        >
          {/* 메인 이미지 */}
          <div className="relative w-full aspect-square bg-gray-100">
            {folder.thumbnailUrl ? (
              <img
                src={folder.thumbnailUrl}
                alt={folder.productName}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                loading="lazy"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent && !parent.querySelector('.fallback-icon')) {
                    const fallback = document.createElement('div');
                    fallback.className = 'fallback-icon w-full h-full flex items-center justify-center bg-gray-100';
                    fallback.innerHTML = '<svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>';
                    parent.appendChild(fallback);
                  }
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100">
                <ImageIcon className="w-12 h-12 text-gray-400" />
              </div>
            )}
            
            {/* 이미지 개수 배지 */}
            {folder.imageCount > 0 && (
              <div className="absolute top-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                <ImageIcon className="w-3 h-3" />
                <span>{folder.imageCount}</span>
              </div>
            )}
          </div>

          {/* 상품 정보 */}
          <div className="p-3 flex-1 flex flex-col justify-between">
            <div className="text-left">
              <p className="text-sm font-medium text-gray-900 truncate" title={folder.productName}>
                {folder.productName}
              </p>
              {folder.productNameChinese && (
                <p className="text-xs text-gray-500 truncate mt-1" title={folder.productNameChinese}>
                  {folder.productNameChinese}
                </p>
              )}
              <p className="text-xs text-gray-400 mt-1">{folder.poNumber}</p>
            </div>
          </div>

        </button>
      ))}
    </div>
  );
}

