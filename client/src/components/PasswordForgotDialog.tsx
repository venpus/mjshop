import { Info, X } from 'lucide-react';
import { Button } from './ui/button';

interface PasswordForgotDialogProps {
  onClose: () => void;
}

export function PasswordForgotDialog({ onClose }: PasswordForgotDialogProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Info className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="text-gray-900 font-semibold">비밀번호 찾기</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-gray-700 text-sm leading-relaxed">
              비밀번호를 분실하셨나요?
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-gray-900 font-medium">다음 방법으로 문의해주세요:</p>
            
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">시스템 관리자에게 연락</p>
                <p className="text-sm text-gray-600">
                  비밀번호 재설정을 위해 시스템 관리자에게 문의해주세요.
                </p>
              </div>
              
              <div className="pt-2 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-700 mb-1">문의 시 제공할 정보</p>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>관리자 ID</li>
                  <li>등록된 이메일 주소</li>
                  <li>이름 및 연락처</li>
                </ul>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-4">
              <p className="text-sm text-yellow-800">
                <strong>보안 정책:</strong> 비밀번호는 관리자만 재설정할 수 있으며, 
                본인 확인 절차를 거쳐야 합니다.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <Button
            onClick={onClose}
            className="px-6 py-2 bg-purple-600 text-white hover:bg-purple-700"
          >
            확인
          </Button>
        </div>
      </div>
    </div>
  );
}

