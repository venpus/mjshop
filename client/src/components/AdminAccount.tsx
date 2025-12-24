import { useState } from 'react';
import { Edit, Trash2, Plus } from 'lucide-react';
import { SearchBar } from './ui/search-bar';
import { AdminAccountDeleteDialog } from './AdminAccountDeleteDialog';
import { AdminAccountForm, AdminAccountFormData } from './AdminAccountForm';

interface AdminAccount {
  id: string;
  name: string;
  phone: string;
  email: string;
  level: 'A-SuperAdmin' | 'B0: 중국Admin' | 'C0: 한국Admin';
}

const initialAdminAccounts: AdminAccount[] = [
  {
    id: 'admin001',
    name: '홍길동',
    phone: '010-1234-5678',
    email: 'admin001@example.com',
    level: 'A-SuperAdmin',
  },
  {
    id: 'admin002',
    name: '김철수',
    phone: '010-2345-6789',
    email: 'admin002@example.com',
    level: 'B0: 중국Admin',
  },
  {
    id: 'admin003',
    name: '이영희',
    phone: '010-3456-7890',
    email: 'admin003@example.com',
    level: 'B0: 중국Admin',
  },
  {
    id: 'admin004',
    name: '박민수',
    phone: '010-4567-8901',
    email: 'admin004@example.com',
    level: 'C0: 한국Admin',
  },
  {
    id: 'admin005',
    name: '최지영',
    phone: '010-5678-9012',
    email: 'admin005@example.com',
    level: 'C0: 한국Admin',
  },
];

export function AdminAccount() {
  const [adminAccounts, setAdminAccounts] = useState<AdminAccount[]>(initialAdminAccounts);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteAccount, setDeleteAccount] = useState<AdminAccount | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingAccount, setEditingAccount] = useState<AdminAccount | null>(null);

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

  const handleConfirmDelete = () => {
    if (deleteAccount) {
      setAdminAccounts(
        adminAccounts.filter(
          (account) => account.id !== deleteAccount.id
        )
      );
      setDeleteAccount(null);
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

  const handleSaveAccount = (formData: AdminAccountFormData) => {
    if (formMode === 'edit' && editingAccount) {
      // 기존 계정 수정
      setAdminAccounts(
        adminAccounts.map((account) =>
          account.id === editingAccount.id
            ? {
                ...account,
                name: formData.name,
                phone: formData.phone,
                email: formData.email,
                level: formData.level,
              }
            : account
        )
      );
      setEditingAccount(null);
    } else {
      // 새 계정 추가
      const newAccount: AdminAccount = {
        id: formData.id,
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        level: formData.level,
      };
      setAdminAccounts([newAccount, ...adminAccounts]);
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
        <button
          onClick={handleAddAccount}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors whitespace-nowrap"
        >
          <Plus className="w-5 h-5" />
          <span>계정 추가</span>
        </button>
      </div>

      {/* Admin Accounts Table */}
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
                <th className="px-4 py-3 text-left text-gray-600 whitespace-nowrap">레벨</th>
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
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getLevelColor(
                        account.level
                      )}`}
                    >
                      {account.level}
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
                      <button
                        onClick={() => handleDelete(account)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Account Form Modal */}
      {isFormOpen && (
        <AdminAccountForm
          onClose={handleCloseForm}
          onSave={handleSaveAccount}
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
