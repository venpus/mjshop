import { useState } from 'react';
import { X } from 'lucide-react';

export interface AdminAccountFormData {
  id: string;
  name: string;
  phone: string;
  email: string;
  level: 'A-SuperAdmin' | 'B0: 중국Admin' | 'C0: 한국Admin';
}

interface AdminAccountFormProps {
  onClose: () => void;
  onSave: (account: AdminAccountFormData) => void;
  initialData?: AdminAccountFormData;
  mode?: 'create' | 'edit';
}

export function AdminAccountForm({
  onClose,
  onSave,
  initialData,
  mode = 'create',
}: AdminAccountFormProps) {
  const [formData, setFormData] = useState<AdminAccountFormData>(
    initialData || {
      id: '',
      name: '',
      phone: '',
      email: '',
      level: 'C0: 한국Admin',
    }
  );

  const [errors, setErrors] = useState<Partial<Record<keyof AdminAccountFormData, string>>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 유효성 검사
    const newErrors: Partial<Record<keyof AdminAccountFormData, string>> = {};
    
    if (!formData.id.trim()) {
      newErrors.id = 'ID를 입력해주세요';
    }
    if (!formData.name.trim()) {
      newErrors.name = '이름을 입력해주세요';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = '연락처를 입력해주세요';
    } else if (!/^010-\d{4}-\d{4}$/.test(formData.phone)) {
      newErrors.phone = '올바른 전화번호 형식이 아닙니다 (예: 010-1234-5678)';
    }
    if (!formData.email.trim()) {
      newErrors.email = '이메일을 입력해주세요';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '올바른 이메일 형식이 아닙니다';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    onSave(formData);
    onClose();
  };

  const handleChange = (field: keyof AdminAccountFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // 에러 초기화
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full my-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h3 className="text-gray-900 text-lg font-semibold">
            {mode === 'edit' ? '관리자 계정 수정' : '관리자 계정 추가'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {/* ID */}
            <div>
              <label className="block text-gray-700 mb-2">
                ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.id}
                onChange={(e) => handleChange('id', e.target.value)}
                disabled={mode === 'edit'}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  errors.id ? 'border-red-500' : 'border-gray-300'
                } ${mode === 'edit' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                placeholder="관리자 ID를 입력하세요"
              />
              {errors.id && (
                <p className="text-red-500 text-sm mt-1">{errors.id}</p>
              )}
            </div>

            {/* 이름 */}
            <div>
              <label className="block text-gray-700 mb-2">
                이름 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="이름을 입력하세요"
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name}</p>
              )}
            </div>

            {/* 연락처 */}
            <div>
              <label className="block text-gray-700 mb-2">
                연락처 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  errors.phone ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="010-1234-5678"
              />
              {errors.phone && (
                <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
              )}
            </div>

            {/* 이메일 */}
            <div>
              <label className="block text-gray-700 mb-2">
                이메일 <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="email@example.com"
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email}</p>
              )}
            </div>

            {/* 레벨 */}
            <div>
              <label className="block text-gray-700 mb-2">
                레벨 <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.level}
                onChange={(e) => handleChange('level', e.target.value as AdminAccountFormData['level'])}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="A-SuperAdmin">A-SuperAdmin</option>
                <option value="B0: 중국Admin">B0: 중국Admin</option>
                <option value="C0: 한국Admin">C0: 한국Admin</option>
              </select>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              {mode === 'edit' ? '수정하기' : '추가하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

