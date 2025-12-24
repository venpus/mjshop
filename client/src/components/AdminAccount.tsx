import { useState, useEffect } from 'react';
import { Edit, Trash2, Plus, Loader2, AlertCircle } from 'lucide-react';
import { SearchBar } from './ui/search-bar';
import { AdminAccountDeleteDialog } from './AdminAccountDeleteDialog';
import { AdminAccountForm, AdminAccountFormData } from './AdminAccountForm';
import { useAuth } from '../contexts/AuthContext';

interface AdminAccount {
  id: string;
  name: string;
  phone: string;
  email: string;
  level: 'A-SuperAdmin' | 'B0: 중국Admin' | 'C0: 한국Admin';
  is_active: boolean;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export function AdminAccount() {
  const { user } = useAuth();
  const isSuperAdmin = user?.level === 'A-SuperAdmin';
  
  const [adminAccounts, setAdminAccounts] = useState<AdminAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteAccount, setDeleteAccount] = useState<AdminAccount | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingAccount, setEditingAccount] = useState<AdminAccount | null>(null);

  // 데이터 로드
  const loadAccounts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/admin-accounts`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '관리자 계정 목록을 불러오는데 실패했습니다.');
      }

      const data = await response.json();
      if (data.success && data.data) {
        setAdminAccounts(data.data);
      } else {
        throw new Error('데이터를 불러올 수 없습니다.');
      }
    } catch (err: any) {
      setError(err.message || '관리자 계정 목록을 불러오는 중 오류가 발생했습니다.');
      console.error('관리자 계정 로드 오류:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const filteredAccounts = adminAccounts.filter(
    (account) =>
      account.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.phone.includes(searchTerm)
  );

  const handleEdit = (account: AdminAccount) => {
    setEditingAccount(account);
    setFormMode('edit');
    setIsFormOpen(true);
  };

  const handleDelete = (account: AdminAccount) => {
    setDeleteAccount(account);
  };

  const handleConfirmDelete = async () => {
    if (!deleteAccount) return;

    try {
      const response = await fetch(`${API_BASE_URL}/admin-accounts/${deleteAccount.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '계정 삭제에 실패했습니다.');
      }

      // 삭제 성공 후 목록 다시 로드
      await loadAccounts();
      setDeleteAccount(null);
    } catch (err: any) {
      alert(err.message || '계정 삭제 중 오류가 발생했습니다.');
      console.error('계정 삭제 오류:', err);
    }
  };

  const handleCancelDelete = () => {
    setDeleteAccount(null);
  };

  const handleAddAccount = () => {
    setEditingAccount(null);
    setFormMode('create');
    setIsFormOpen(true);
  };

  const handleSaveAccount = async (formData: AdminAccountFormData) => {
    try {
      if (formMode === 'edit' && editingAccount) {
        // 기존 계정 수정
        const response = await fetch(`${API_BASE_URL}/admin-accounts/${editingAccount.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            name: formData.name,
            phone: formData.phone,
            email: formData.email,
            level: formData.level,
            ...(formData.password && { password: formData.password }),
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || '계정 수정에 실패했습니다.');
        }
      } else {
        // 새 계정 추가 (password 필수)
        if (!formData.password) {
          throw new Error('비밀번호를 입력해주세요.');
        }

        const response = await fetch(`${API_BASE_URL}/admin-accounts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            id: formData.id,
            name: formData.name,
            phone: formData.phone,
            email: formData.email,
            password: formData.password,
            level: formData.level,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || '계정 생성에 실패했습니다.');
        }
      }

      // 성공 후 목록 다시 로드
      await loadAccounts();
      setEditingAccount(null);
      setIsFormOpen(false);
    } catch (err: any) {
      alert(err.message || '계정 저장 중 오류가 발생했습니다.');
      console.error('계정 저장 오류:', err);
      throw err; // 폼에서 에러 처리를 위해 throw
    }
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingAccount(null);
    setFormMode('create');
  };

  const getLevelColor = (level: AdminAccount['level']) => {
    switch (level) {
      case 'A-SuperAdmin':
        return 'bg-red-100 text-red-800';
      case 'B0: 중국Admin':
        return 'bg-purple-100 text-purple-800';
      case 'C0: 한국Admin':
        return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div className="p-8 min-h-[1080px]">
      <div className="mb-6">
        <h2 className="text-gray-900 mb-2">관리자 계정 관리</h2>
        <p className="text-gray-600">
          관리자 계정을 관리하고 권한을 설정할 수 있습니다
        </p>
      </div>

      {/* Search and Add Button */}
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <SearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="ID, 이름, 이메일, 연락처로 검색..."
        />
        {/* 계정 추가 버튼 (현재 숨김 처리 - 필요시 주석 해제) */}
        {false && isSuperAdmin && (
          <button
            onClick={handleAddAccount}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors whitespace-nowrap"
          >
            <Plus className="w-5 h-5" />
            <span>계정 추가</span>
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-red-800">{error}</p>
            <button
              onClick={loadAccounts}
              className="mt-2 text-sm text-red-600 hover:text-red-700 underline"
            >
              다시 시도
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-purple-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">관리자 계정 목록을 불러오는 중...</p>
          </div>
        </div>
      ) : filteredAccounts.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-600">
            {searchTerm ? '검색 결과가 없습니다.' : '등록된 관리자 계정이 없습니다.'}
          </p>
        </div>
      ) : (
        /* Admin Accounts Table */
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-600 whitespace-nowrap">번호</th>
                  <th className="px-4 py-3 text-left text-gray-600 whitespace-nowrap">ID</th>
                  <th className="px-4 py-3 text-left text-gray-600 whitespace-nowrap">이름</th>
                  <th className="px-4 py-3 text-left text-gray-600 whitespace-nowrap">연락처</th>
                  <th className="px-4 py-3 text-left text-gray-600 whitespace-nowrap">이메일</th>
                  {isSuperAdmin && (
                    <th className="px-4 py-3 text-left text-gray-600 whitespace-nowrap">레벨</th>
                  )}
                  <th className="px-4 py-3 text-left text-gray-600 whitespace-nowrap">상태</th>
                  <th className="px-4 py-3 text-left text-gray-600 whitespace-nowrap">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredAccounts.map((account, index) => (
                  <tr key={account.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900">{index + 1}</td>
                    <td className="px-4 py-3 text-gray-900">{account.id}</td>
                    <td className="px-4 py-3 text-gray-900">{account.name}</td>
                    <td className="px-4 py-3 text-gray-600">{account.phone}</td>
                    <td className="px-4 py-3 text-gray-600">{account.email}</td>
                    {isSuperAdmin && (
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getLevelColor(
                            account.level
                          )}`}
                        >
                          {account.level}
                        </span>
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          account.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {account.is_active ? '활성' : '비활성'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEdit(account)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="편집"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {isSuperAdmin && (
                          <button
                            onClick={() => handleDelete(account)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Account Form Modal */}
      {isFormOpen && (
        <AdminAccountForm
          onClose={handleCloseForm}
          onSave={handleSaveAccount as (data: AdminAccountFormData) => Promise<void>}
          mode={formMode}
          initialData={
            editingAccount
              ? {
                  id: editingAccount.id,
                  name: editingAccount.name,
                  phone: editingAccount.phone,
                  email: editingAccount.email,
                  level: editingAccount.level,
                }
              : undefined
          }
        />
      )}

      {/* Delete Confirm Dialog */}
      {deleteAccount && (
        <AdminAccountDeleteDialog
          account={deleteAccount}
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
        />
      )}
    </div>
  );
}
