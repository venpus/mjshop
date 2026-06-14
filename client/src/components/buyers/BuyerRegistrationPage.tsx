import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import {
  createShopBuyer,
  deleteShopBuyer,
  deleteShopBuyerBusinessRegistrationImage,
  getShopBuyerById,
  getShopBuyers,
  updateShopBuyer,
  uploadShopBuyerBusinessRegistrationImage,
} from '../../api/shopBuyerApi';
import { BuyerFormModal } from './BuyerFormModal';
import { BuyerAddressListDisplay } from './BuyerAddressListDisplay';
import type { ShopBuyer, ShopBuyerFormData, ShopBuyerImageOptions, ShopBuyerListItem } from './types';

export function BuyerRegistrationPage() {
  const [buyers, setBuyers] = useState<ShopBuyerListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBuyer, setEditingBuyer] = useState<ShopBuyer | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadBuyers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getShopBuyers();
      setBuyers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '구매자 목록을 불러오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBuyers();
  }, [loadBuyers]);

  const filteredBuyers = useMemo(() => {
    const lower = searchTerm.trim().toLowerCase();
    if (!lower) return buyers;
    return buyers.filter(
      (b) =>
        b.companyName.toLowerCase().includes(lower) ||
        (b.kakaoId && b.kakaoId.toLowerCase().includes(lower)) ||
        (b.businessRegistrationNumber &&
          b.businessRegistrationNumber.toLowerCase().includes(lower)) ||
        b.addresses.some(
          (a) =>
            a.address.toLowerCase().includes(lower) ||
            a.recipientName.toLowerCase().includes(lower) ||
            a.phoneNumber.toLowerCase().includes(lower)
        )
    );
  }, [buyers, searchTerm]);

  const handleAdd = () => {
    setEditingBuyer(null);
    setIsModalOpen(true);
  };

  const handleEdit = async (item: ShopBuyerListItem) => {
    try {
      const buyer = await getShopBuyerById(item.id);
      setEditingBuyer(buyer);
      setIsModalOpen(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : '구매자 정보를 불러오지 못했습니다.');
    }
  };

  const handleDelete = async (item: ShopBuyerListItem) => {
    const confirmed = window.confirm(`「${item.companyName}」 구매자를 삭제하시겠습니까?`);
    if (!confirmed) return;

    try {
      await deleteShopBuyer(item.id);
      await loadBuyers();
    } catch (err) {
      alert(err instanceof Error ? err.message : '삭제 중 오류가 발생했습니다.');
    }
  };

  const handleSubmit = async (form: ShopBuyerFormData, imageOptions?: ShopBuyerImageOptions) => {
    setIsSubmitting(true);
    try {
      let buyerId: number;

      if (editingBuyer) {
        await updateShopBuyer(editingBuyer.id, form);
        buyerId = editingBuyer.id;

        if (imageOptions?.removeExisting && editingBuyer.businessRegistrationImage) {
          await deleteShopBuyerBusinessRegistrationImage(buyerId);
        }
      } else {
        const created = await createShopBuyer(form);
        buyerId = created.id;
      }

      if (imageOptions?.pendingFile) {
        await uploadShopBuyerBusinessRegistrationImage(buyerId, imageOptions.pendingFile);
      }

      setIsModalOpen(false);
      setEditingBuyer(null);
      await loadBuyers();
    } catch (err) {
      alert(err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 min-h-[1080px]">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-gray-900 mb-2">구매자 등록</h2>
          <p className="text-gray-600">쇼핑몰 구매자 정보와 택배 주소지를 관리합니다</p>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shrink-0"
        >
          <Plus className="w-5 h-5" />
          추가
        </button>
      </div>

      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="상호명, 카톡, 사업자번호, 주소, 수령인, 전화번호 검색..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-gray-500">구매자 목록을 불러오는 중...</div>
      ) : error ? (
        <div className="py-16 text-center text-red-600">{error}</div>
      ) : filteredBuyers.length === 0 ? (
        <div className="py-16 text-center text-gray-500">
          {buyers.length === 0
            ? '등록된 구매자가 없습니다. 추가 버튼으로 등록하세요.'
            : '검색 결과가 없습니다.'}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-gray-600">상호명</th>
                  <th className="px-6 py-3 text-left text-gray-600">카톡 아이디</th>
                  <th className="px-6 py-3 text-left text-gray-600">사업자등록증 번호</th>
                  <th className="px-6 py-3 text-left text-gray-600 min-w-[320px]">택배 주소지</th>
                  <th className="px-6 py-3 text-left text-gray-600">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredBuyers.map((buyer) => (
                  <tr key={buyer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-gray-900 font-medium">{buyer.companyName}</td>
                    <td className="px-6 py-4 text-gray-600">{buyer.kakaoId || '-'}</td>
                    <td className="px-6 py-4 text-gray-600">
                      {buyer.businessRegistrationNumber || '-'}
                    </td>
                    <td className="px-6 py-4 align-top">
                      <BuyerAddressListDisplay addresses={buyer.addresses} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(buyer)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="수정"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(buyer)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
      )}

      <BuyerFormModal
        isOpen={isModalOpen}
        buyer={editingBuyer}
        isSubmitting={isSubmitting}
        onClose={() => {
          if (isSubmitting) return;
          setIsModalOpen(false);
          setEditingBuyer(null);
        }}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
