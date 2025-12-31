import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { getPurchaseOrdersWithUnshipped, getFullImageUrl, type PurchaseOrderWithUnshipped } from '../api/purchaseOrderApi';

interface PurchaseOrderSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (order: PurchaseOrderWithUnshipped) => void;
}

const ITEMS_PER_PAGE = 20; // 한 화면에 20개 (5개씩 4줄)

export function PurchaseOrderSearchModal({
  isOpen,
  onClose,
  onSelect,
}: PurchaseOrderSearchModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [orders, setOrders] = useState<PurchaseOrderWithUnshipped[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 발주 목록 로드
  const loadOrders = useCallback(async (page: number = 1, search: string = '') => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getPurchaseOrdersWithUnshipped(search || undefined, page, ITEMS_PER_PAGE);
      setOrders(result.data);
      setTotalPages(result.totalPages);
      setTotalItems(result.total);
    } catch (err: any) {
      console.error('발주 목록 로드 오류:', err);
      setError(err.message || '발주 목록을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 모달이 열릴 때 초기화
  useEffect(() => {
    if (isOpen) {
      setCurrentPage(1);
      setSearchTerm('');
    }
  }, [isOpen]);

  // 검색어 변경 시 첫 페이지로 리셋
  const prevSearchTermRef = useRef(searchTerm);
  useEffect(() => {
    if (isOpen && searchTerm !== prevSearchTermRef.current) {
      prevSearchTermRef.current = searchTerm;
      setCurrentPage(1);
    }
  }, [searchTerm, isOpen]);

  // 페이지, 모달 열림 상태, 검색어 변경 시 목록 로드
  useEffect(() => {
    if (isOpen) {
      loadOrders(currentPage, searchTerm);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, isOpen, searchTerm]); // loadOrders를 dependency에서 제거하여 무한 루프 방지

  // 필터링된 주문 (서버 사이드 검색이므로 그대로 사용)
  const filteredOrders = orders;

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
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-6xl mx-4 max-h-[90vh] flex flex-col">
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

        {/* Content - 카드 그리드 */}
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
            <div className="grid grid-cols-5 gap-4">
              {filteredOrders.map((order) => (
                <button
                  key={order.id}
                  onClick={() => handleSelect(order)}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:bg-purple-50 hover:border-purple-300 transition-all hover:shadow-md flex flex-col"
                >
                  {/* 제품 이미지 */}
                  <div className="w-full aspect-square bg-gray-100 rounded-lg overflow-hidden mb-3 border border-gray-200">
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
                        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* 발주 정보 */}
                  <div className="flex-1 flex flex-col">
                    <div className="text-xs font-semibold text-purple-600 mb-1">
                      {order.po_number}
                    </div>
                    <div className="text-sm font-medium text-gray-900 mb-2 line-clamp-2">
                      {order.product_name || '(제품명 없음)'}
                    </div>
                    {order.product_name_chinese && (
                      <div className="text-xs text-gray-600 mb-2 line-clamp-1">
                        {order.product_name_chinese}
                      </div>
                    )}
                    <div className="mt-auto pt-2 border-t border-gray-100">
                      <div className="text-xs text-gray-600 mb-1">
                        발주: {(order.quantity || 0).toLocaleString()}개
                      </div>
                      <div className="text-xs font-semibold text-orange-600">
                        미출고: {(order.unshipped_quantity || 0).toLocaleString()}개
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 페이징 */}
        {!isLoading && !error && filteredOrders.length > 0 && (
          <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
            <div className="text-sm text-gray-600">
              총 {totalItems.toLocaleString()}개 중 {((currentPage - 1) * ITEMS_PER_PAGE + 1).toLocaleString()}-{Math.min(currentPage * ITEMS_PER_PAGE, totalItems).toLocaleString()}개 표시
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm text-gray-700 px-3">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

