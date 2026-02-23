import { useState, useEffect, useCallback } from 'react';
import { Package, Plus, Eye, Search, ExternalLink } from 'lucide-react';
import { SearchBar } from '../ui/search-bar';
import { PackingListCreateModal, type PackingListFormData } from '../PackingListCreateModal';
import { PackingListDetailModal } from '../PackingListDetailModal';
import { getPurchaseOrdersWithUnshipped } from '../../api/purchaseOrderApi';
import { getPackingListsByPurchaseOrder, type RelatedPackingList } from '../../api/packingListApi';
import { formatDateKST } from '../../utils/dateUtils';

interface PurchaseOrderPackingListTabProps {
  onPackingListClick?: (packingListCode: string) => void;
}

export function PurchaseOrderPackingListTab({ onPackingListClick }: PurchaseOrderPackingListTabProps) {
  const [purchaseOrders, setPurchaseOrders] = useState<Array<{
    id: string;
    po_number: string;
    product_name: string;
    product_main_image: string | null;
    quantity: number;
    unshipped_quantity: number;
  }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [inputSearchTerm, setInputSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [totalItems, setTotalItems] = useState(0);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [packingListsByOrder, setPackingListsByOrder] = useState<Map<string, RelatedPackingList[]>>(new Map());
  const [loadingPackingLists, setLoadingPackingLists] = useState<Set<string>>(new Set());
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedPurchaseOrderId, setSelectedPurchaseOrderId] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedPackingListId, setSelectedPackingListId] = useState<number | null>(null);

  const loadPurchaseOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getPurchaseOrdersWithUnshipped(
        searchTerm.trim() || undefined,
        currentPage,
        itemsPerPage
      );
      setPurchaseOrders(result.data);
      setTotalItems(result.total);
    } catch (error: any) {
      console.error('발주 목록 로드 오류:', error);
      alert(error.message || '발주 목록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, currentPage, itemsPerPage]);

  useEffect(() => {
    loadPurchaseOrders();
  }, [loadPurchaseOrders]);

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

  const toggleOrderExpansion = async (orderId: string) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
      // 패킹리스트 로드
      if (!packingListsByOrder.has(orderId) && !loadingPackingLists.has(orderId)) {
        setLoadingPackingLists(prev => new Set(prev).add(orderId));
        try {
          const lists = await getPackingListsByPurchaseOrder(orderId);
          setPackingListsByOrder(prev => new Map(prev).set(orderId, lists));
        } catch (error: any) {
          console.error('패킹리스트 로드 오류:', error);
        } finally {
          setLoadingPackingLists(prev => {
            const next = new Set(prev);
            next.delete(orderId);
            return next;
          });
        }
      }
    }
    setExpandedOrders(newExpanded);
  };

  const handleCreatePackingList = (orderId: string) => {
    setSelectedPurchaseOrderId(orderId);
    setIsCreateModalOpen(true);
  };

  const handleCreatePackingListSubmit = async (data: PackingListFormData) => {
    // 패킹리스트 생성은 모달에서 처리되므로 여기서는 닫기만
    setIsCreateModalOpen(false);
    setSelectedPurchaseOrderId(null);
    // 발주 목록 새로고침
    await loadPurchaseOrders();
    // 확장된 발주의 패킹리스트도 새로고침
    if (selectedPurchaseOrderId) {
      const lists = await getPackingListsByPurchaseOrder(selectedPurchaseOrderId);
      setPackingListsByOrder(prev => new Map(prev).set(selectedPurchaseOrderId, lists));
    }
  };

  const handleViewPackingList = (packingListId: number) => {
    setSelectedPackingListId(packingListId);
    setIsDetailModalOpen(true);
  };

  const getDeliveryStatusColor = (status: string) => {
    switch (status) {
      case '한국도착':
        return 'bg-green-100 text-green-800';
      case '배송중':
        return 'bg-blue-100 text-blue-800';
      case '내륙운송중':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);

  return (
    <div className="space-y-6">
      {/* 검색 바 */}
      <div className="flex gap-2 items-center">
        <SearchBar
          value={inputSearchTerm}
          onChange={setInputSearchTerm}
          onKeyDown={handleSearchKeyDown}
          placeholder="발주번호, 제품명으로 검색..."
        />
        <button
          onClick={handleSearch}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium whitespace-nowrap"
        >
          <Search className="w-4 h-4 inline mr-2" />
          검색
        </button>
      </div>

      {/* 발주 목록 테이블 */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">로딩 중...</div>
        </div>
      ) : purchaseOrders.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-500">
            {searchTerm.trim() ? '검색 결과가 없습니다.' : '발주가 없습니다.'}
          </p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-12"></th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">발주번호</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">제품명</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">발주 수량</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">미출고 수량</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">작업</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {purchaseOrders.map((order) => {
                    const isExpanded = expandedOrders.has(order.id);
                    const packingLists = packingListsByOrder.get(order.id) || [];
                    const isLoadingPackingLists = loadingPackingLists.has(order.id);

                    return (
                      <>
                        <tr
                          key={order.id}
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => toggleOrderExpansion(order.id)}
                        >
                          <td className="px-4 py-3">
                            <button
                              className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleOrderExpansion(order.id);
                              }}
                            >
                              <Package className="w-4 h-4 text-gray-500" />
                            </button>
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{order.po_number}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{order.product_name}</td>
                          <td className="px-4 py-3 text-sm text-center text-gray-700">{order.quantity.toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-center text-gray-700">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              order.unshipped_quantity > 0 ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'
                            }`}>
                              {order.unshipped_quantity.toLocaleString()}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCreatePackingList(order.id);
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                              패킹리스트 생성
                            </button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={6} className="px-4 py-4 bg-gray-50">
                              {isLoadingPackingLists ? (
                                <div className="text-center py-4 text-gray-500">로딩 중...</div>
                              ) : packingLists.length === 0 ? (
                                <div className="text-center py-4 text-gray-500">연결된 패킹리스트가 없습니다.</div>
                              ) : (
                                <div className="space-y-2">
                                  <h4 className="text-sm font-semibold text-gray-700 mb-3">연결된 패킹리스트</h4>
                                  <div className="overflow-x-auto">
                                    <table className="w-full border-collapse">
                                      <thead>
                                        <tr className="bg-white border-b border-gray-200">
                                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">패킹리스트 코드</th>
                                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">발송일</th>
                                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">물류회사</th>
                                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">물류창고 도착일</th>
                                          <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700">출고 수량</th>
                                          <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700">배송 상태</th>
                                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">한국도착일</th>
                                          <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700">배송비</th>
                                          <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700">작업</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {packingLists.map((pl) => (
                                          <tr key={pl.packing_list_id} className="bg-white border-b border-gray-100 hover:bg-gray-50">
                                            <td className="px-3 py-2 text-sm">
                                              {onPackingListClick ? (
                                                <button
                                                  onClick={() => onPackingListClick(pl.packing_list_code)}
                                                  className="flex items-center gap-1 text-orange-600 hover:text-orange-700 font-medium hover:underline"
                                                >
                                                  {pl.packing_list_code}
                                                  <ExternalLink className="w-3 h-3" />
                                                </button>
                                              ) : (
                                                <span className="text-gray-900">{pl.packing_list_code}</span>
                                              )}
                                            </td>
                                            <td className="px-3 py-2 text-sm text-gray-700">
                                              {pl.shipment_date ? formatDateKST(pl.shipment_date) : '-'}
                                            </td>
                                            <td className="px-3 py-2 text-sm text-gray-700">{pl.logistics_company || '-'}</td>
                                            <td className="px-3 py-2 text-sm text-gray-700">
                                              {pl.warehouse_arrival_date ? formatDateKST(pl.warehouse_arrival_date) : '-'}
                                            </td>
                                            <td className="px-3 py-2 text-sm text-center text-gray-700">{pl.shipped_quantity.toLocaleString()}</td>
                                            <td className="px-3 py-2 text-center">
                                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDeliveryStatusColor(pl.delivery_status)}`}>
                                                {pl.delivery_status}
                                              </span>
                                            </td>
                                            <td className="px-3 py-2 text-sm text-gray-700">
                                              {pl.korea_arrivals && pl.korea_arrivals.length > 0 ? (
                                                <div className="space-y-1">
                                                  {pl.korea_arrivals.map((arrival, idx) => (
                                                    <div key={idx} className="text-xs">
                                                      {formatDateKST(arrival.arrival_date)} ({arrival.quantity.toLocaleString()})
                                                    </div>
                                                  ))}
                                                </div>
                                              ) : (
                                                '-'
                                              )}
                                            </td>
                                            <td className="px-3 py-2 text-sm text-right text-gray-700">
                                              {pl.shipping_cost ? `₩${pl.shipping_cost.toLocaleString()}` : '-'}
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                              <button
                                                onClick={() => handleViewPackingList(pl.packing_list_id)}
                                                className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                                              >
                                                <Eye className="w-3 h-3" />
                                                상세
                                              </button>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 페이징 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
              <div className="flex items-center gap-2">
                <span className="text-gray-600 text-sm">페이지당 표시:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value={15}>15개</option>
                  <option value={20}>20개</option>
                  <option value={25}>25개</option>
                  <option value={30}>30개</option>
                </select>
                <span className="text-gray-600 text-sm ml-4">
                  전체 {totalItems.toLocaleString()}개 중 {startIndex + 1}-
                  {Math.min(endIndex, totalItems).toLocaleString()}개 표시
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  ←
                </button>
                <span className="text-sm text-gray-700">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  →
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* 패킹리스트 생성 모달 */}
      {selectedPurchaseOrderId && (
        <PackingListCreateModal
          isOpen={isCreateModalOpen}
          onClose={() => {
            setIsCreateModalOpen(false);
            setSelectedPurchaseOrderId(null);
          }}
          onSubmit={handleCreatePackingListSubmit}
          initialPurchaseOrderId={selectedPurchaseOrderId}
          mode="create"
        />
      )}

      {/* 패킹리스트 상세 모달 */}
      <PackingListDetailModal
        isOpen={isDetailModalOpen}
        packingListId={selectedPackingListId}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedPackingListId(null);
        }}
      />
    </div>
  );
}
