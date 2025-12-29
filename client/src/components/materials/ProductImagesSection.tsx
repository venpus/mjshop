import { Upload, Download, ImageIcon } from 'lucide-react';
import { Material } from './types';
import { getImageExtension, handleDownload } from './utils';

interface ProductImagesSectionProps {
  material: Material;
  onImageClick: (imageUrl: string) => void;
  onUploadClick: () => void;
}

export function ProductImagesSection({ material, onImageClick, onUploadClick }: ProductImagesSectionProps) {
  if (material.images && material.images.length > 0) {
    return (
      <div className="bg-orange-50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-700">제품 사진 ({material.images.length}장)</h3>
          <button
            onClick={onUploadClick}
            className="flex items-center gap-2 px-3 py-1.5 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors text-sm"
          >
            <Upload className="w-4 h-4" />
            <span>사진 업로드</span>
          </button>
        </div>
        <div className="grid grid-cols-6 gap-3">
          {material.images.map((imageUrl, index) => (
            <div
              key={index}
              className="relative aspect-square bg-white rounded-lg overflow-hidden flex items-center justify-center border-2 border-gray-200 hover:border-purple-300 transition-colors cursor-pointer group shadow-sm"
              onClick={() => onImageClick(imageUrl)}
            >
              {imageUrl ? (
                <>
                  <img
                    src={imageUrl}
                    alt={`${material.productName} 제품 사진 ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const ext = getImageExtension(imageUrl);
                      handleDownload(imageUrl, `${material.productName}_제품사진_${index + 1}.${ext}`);
                    }}
                    className="absolute top-2 right-2 p-2 bg-white rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-purple-50"
                    title="다운로드"
                  >
                    <Download className="w-4 h-4 text-purple-600" />
                  </button>
                  <div className="absolute bottom-2 left-2 px-2 py-1 bg-black bg-opacity-60 text-white text-xs rounded">
                    #{index + 1}
                  </div>
                </>
              ) : (
                <ImageIcon className="w-12 h-12 text-gray-400" />
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-orange-50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-700">제품 사진</h3>
        <button
          onClick={onUploadClick}
          className="flex items-center gap-2 px-3 py-1.5 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors text-sm"
        >
          <Upload className="w-4 h-4" />
          <span>사진 업로드</span>
        </button>
      </div>
      <div className="text-center py-8 text-gray-500 text-sm">
        업로드된 사진이 없습니다.
      </div>
    </div>
  );
}

