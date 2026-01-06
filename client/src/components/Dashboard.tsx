import { Wrench } from 'lucide-react';

export function Dashboard() {
  return (
    <div className="p-8 min-h-[1080px] max-w-[1664px]">
      <div className="flex flex-col items-center justify-center min-h-[600px]">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center max-w-md">
          <div className="flex justify-center mb-6">
            <div className="bg-purple-100 p-4 rounded-full">
              <Wrench className="w-12 h-12 text-purple-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">대시보드</h2>
          <p className="text-lg text-gray-600 mb-2">구현 중입니다</p>
          <p className="text-sm text-gray-500">
            대시보드 기능을 준비 중입니다.
            <br />
            곧 만나보실 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
}