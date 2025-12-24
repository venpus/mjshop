import { Image as ImageIcon } from 'lucide-react';

export function Gallery() {
  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
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

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
          <div className="text-center text-gray-500">
            <ImageIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-lg">갤러리 페이지 준비 중입니다.</p>
            <p className="text-sm mt-2">곧 제품 이미지 관리 기능이 추가됩니다.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
