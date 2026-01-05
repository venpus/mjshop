import { AlertTriangle, X } from 'lucide-react';

interface AdminAccount {
  id: string;
  name: string;
  phone: string;
  email: string;
  level: 'A-SuperAdmin' | 'S: Admin' | 'B0: 중국Admin' | 'C0: 한국Admin' | 'D0: 비전 담당자';
}

interface AdminAccountDeleteDialogProps {
  account: AdminAccount;
  onConfirm: () => void;
  onCancel: () => void;
}

export function AdminAccountDeleteDialog({
  account,
  onConfirm,
  onCancel,
}: AdminAccountDeleteDialogProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <h3 className="text-gray-900">관리자 계정 삭제 확인</h3>
          </div>
          <button
            onClick={onCancel}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-700 mb-2">다음 관리자 계정을 삭제하시겠습니까?</p>
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <p className="text-gray-900 font-medium">ID: {account.id}</p>
            <p className="text-gray-900 font-medium">이름: {account.name}</p>
            <p className="text-gray-600 text-sm">이메일: {account.email}</p>
            <p className="text-gray-600 text-sm">레벨: {account.level}</p>
          </div>
          <p className="text-red-600 text-sm mt-4">
            삭제된 계정은 복구할 수 없습니다.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            삭제하기
          </button>
        </div>
      </div>
    </div>
  );
}

