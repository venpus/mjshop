import { FileSpreadsheet } from 'lucide-react';

export function Invoice() {
  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center shadow-md">
              <FileSpreadsheet className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-gray-900">정산 인보이스</h2>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            거래 내역과 정산 인보이스를 관리합니다.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
          <div className="text-center text-gray-500">
            <FileSpreadsheet className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-lg">정산 인보이스 페이지 준비 중입니다.</p>
            <p className="text-sm mt-2">곧 정산 관리 기능이 추가됩니다.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
