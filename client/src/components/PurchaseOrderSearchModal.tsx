import { useState, useEffect, useCallback } from 'react';
import { X, Search } from 'lucide-react';
import { getPurchaseOrdersWithUnshipped, getFullImageUrl, type PurchaseOrderWithUnshipped } from '../api/purchaseOrderApi';

interface PurchaseOrderSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (order: PurchaseOrderWithUnshipped) => void;
}

export function PurchaseOrderSearchModal({
  isOpen,
  onClose,
  onSelect,
}: PurchaseOrderSearchModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [orders, setOrders] = useState<PurchaseOrderWithUnshipped[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<PurchaseOrderWithUnshipped[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 발주 목록 로드
  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getPurchaseOrdersWithUnshipped();
      setOrders(data);
      setFilteredOrders(data);
    } catch (err: any) {
      console.error('발주 목록 로드 오류:', err);
      setError(err.message || '발주 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 모달이 열릴 때마다 목록 로드
  useEffect(() => {
    if (isOpen) {
      loadOrders();
    }
  }, [isOpen, loadOrders]);

  // 검색어 필터링
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredOrders(orders);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = orders.filter((order) => {
      const poNumber = order.po_number.toLowerCase();
      const productName = order.product_name.toLowerCase();
      const productNameChinese = (order.product_name_chinese || '').toLowerCase();
      
      return (
        poNumber.includes(term) ||
        productName.includes(term) ||
        productNameChinese.includes(term)
      );
    });
    setFilteredOrders(filtered);
  }, [searchTerm, orders]);

  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSelect = (order: PurchaseOrderWithUnshipped) => {
    onSelect(order);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            발주 검색
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-6 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="발주번호 또는 제품명으로 검색..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              autoFocus
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500">로딩 중...</div>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-600">
              {error}
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              {searchTerm ? '검색 결과가 없습니다.' : '미출고 발주가 없습니다.'}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredOrders.map((order) => (
                <button
                  key={order.id}
                  onClick={() => handleSelect(order)}
                  className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-purple-50 hover:border-purple-300 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    {/* 제품 이미지 */}
                    <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200">
                      {order.product_main_image ? (
                        <img
                          src={getFullImageUrl(order.product_main_image)}
                          alt={order.product_name}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            const target = e.currentTarget;
                            target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* 발주 정보 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-semibold text-gray-900 text-base">
                          {order.po_number}
                        </span>
                        <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                          미출고: {(order.unshipped_quantity || 0).toLocaleString()}개
                        </span>
                      </div>
                      {/* 제품명 - 더 눈에 띄게 */}
                      <div className="mb-2">
                        <div className="text-base font-semibold text-gray-900">
                          {order.product_name || '(제품명 없음)'}
                        </div>
                        {order.product_name_chinese && (
                          <div className="text-sm text-gray-600 mt-1">
                            {order.product_name_chinese}
                          </div>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        발주 수량: {(order.quantity || 0).toLocaleString()}개
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

