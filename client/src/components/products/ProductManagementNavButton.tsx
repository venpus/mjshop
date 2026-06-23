import { useState } from 'react';
import { Package } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ProductManagementModal } from './ProductManagementModal';

export function ProductManagementNavButton() {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const canAccessProducts =
    user?.level === 'A-SuperAdmin' || user?.level === 'S: Admin';

  if (!canAccessProducts) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 border-2 border-orange-600 shadow-sm font-bold text-base shrink-0 transition-colors"
      >
        <Package className="w-4 h-4 stroke-[2.5]" />
        <span className="text-white">상품정보 조회</span>
      </button>

      {isModalOpen && (
        <ProductManagementModal onClose={() => setIsModalOpen(false)} />
      )}
    </>
  );
}
