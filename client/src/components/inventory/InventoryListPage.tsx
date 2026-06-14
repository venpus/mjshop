import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Image } from 'lucide-react';
import { SearchBar } from '../ui/search-bar';
import { TablePagination } from '../ui/table-pagination';
import { useInventoryList } from '../../hooks/useInventoryList';
import { AddInboundButton } from './AddInboundButton';
import { InventoryCardGrid } from './InventoryCardGrid';
import type { InventoryListItem } from './types';

export function InventoryListPage() {
  const navigate = useNavigate();
  const { items, isLoading, error, reload } = useInventoryList();

  const [searchTerm, setSearchTerm] = useState('');
  const [inputSearchTerm, setInputSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items;
    const lower = searchTerm.toLowerCase();
    return items.filter(
      (item) =>
        item.productName.toLowerCase().includes(lower) ||
        (item.poNumber && item.poNumber.toLowerCase().includes(lower)) ||
        (item.purchaseOrderId && item.purchaseOrderId.toLowerCase().includes(lower))
    );
  }, [items, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredItems.length);
  const paginatedItems = filteredItems.slice(startIndex, endIndex);

  const handleSearch = () => {
    setSearchTerm(inputSearchTerm.trim());
    setCurrentPage(1);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  const handleCardClick = (item: InventoryListItem) => {
    const encodedGroupKey = encodeURIComponent(item.groupKey);
    navigate(`/admin/inventory/${encodedGroupKey}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">재고 목록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-gray-900 mb-2 text-2xl font-bold">입고 재고 목록</h2>
          <p className="text-gray-600">
            입고 제품의 수량과 재고를 확인합니다. 패킹리스트 한국도착 시 자동 반영됩니다.
          </p>
        </div>
        <AddInboundButton onAdded={reload} />
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex gap-2 mb-6">
        <SearchBar
          value={inputSearchTerm}
          onChange={setInputSearchTerm}
          onKeyDown={handleSearchKeyDown}
          placeholder="상품명, 발주번호로 검색..."
        />
        <button
          type="button"
          onClick={handleSearch}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium whitespace-nowrap"
        >
          검색
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          totalItems={filteredItems.length}
          startIndex={startIndex}
          endIndex={endIndex}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(value) => {
            setItemsPerPage(value);
            setCurrentPage(1);
          }}
          className="border-t-0 border-b border-gray-200"
        />

        <InventoryCardGrid items={paginatedItems} onCardClick={handleCardClick} />

        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          totalItems={filteredItems.length}
          startIndex={startIndex}
          endIndex={endIndex}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(value) => {
            setItemsPerPage(value);
            setCurrentPage(1);
          }}
        />
      </div>

      {!error && items.length === 0 && (
        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-500">
          <Image className="w-4 h-4" />
          <span>입고 추가 버튼으로 제품을 등록할 수 있습니다.</span>
        </div>
      )}
    </div>
  );
}
