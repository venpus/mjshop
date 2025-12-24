import { useState } from 'react';
import { Filter, Download, Eye, Package, Plus, Image, Edit, Trash2, CheckSquare, X, RotateCw } from 'lucide-react';
import { TablePagination } from './ui/table-pagination';
import { StatusBadge } from './ui/status-badge';
import { SearchBar } from './ui/search-bar';

interface PurchaseOrdersProps {
  onViewDetail: (orderId: string, tab?: 'cost' | 'factory' | 'work' | 'delivery') => void;
}

interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplier: string;
  product: string;
  productImage?: string;
  unitPrice: number;
  optionCost: number;
  quantity: number;
  amount: number;
  size: string;
  weight: string;
  packaging: number;
  factoryStatus: '출고대기' | '배송중' | '수령완료';
  workStatus: '작업대기' | '작업중' | '완료';
  deliveryStatus: '대기중' | '내륙운송중' | '항공운송중' | '해운운송중' | '통관및 배달' | '한국도착';
  paymentStatus: '미결제' | '선금결제' | '완료';
  date: string;
  isOrderConfirmed?: boolean;
}

const initialPurchaseOrders: PurchaseOrder[] = [
  { id: '1', poNumber: 'PO-001', supplier: '광저우 제조사', product: '테디베어 봉제인형', productImage: 'https://images.unsplash.com/photo-1602734846297-9299fc2d4703?w=400', unitPrice: 70.50, optionCost: 5.25, quantity: 500, amount: 0, size: '5x3x2cm', weight: '50g', packaging: 10, factoryStatus: '출고대기', workStatus: '작업중', deliveryStatus: '대기중', paymentStatus: '미결제', date: '2024-12-08' },
  { id: '2', poNumber: 'PO-002', supplier: '선전 공장', product: '고양이 피규어', productImage: 'https://images.unsplash.com/photo-1671490289892-502ca32a3a2a?w=400', unitPrice: 52.00, optionCost: 3.80, quantity: 1000, amount: 0, size: '8x6x4cm', weight: '120g', packaging: 12, factoryStatus: '배송중', workStatus: '완료', deliveryStatus: '항공운송중', paymentStatus: '선금결제', date: '2024-12-08' },
  { id: '3', poNumber: 'PO-003', supplier: '상하이 제조사', product: '토끼 인형 키링', productImage: 'https://images.unsplash.com/photo-1727154085760-134cc942246e?w=400', unitPrice: 9.00, optionCost: 1.50, quantity: 2000, amount: 0, size: '40x30x10mm', weight: '800g', packaging: 20, factoryStatus: '수령완료', workStatus: '완료', deliveryStatus: '한국도착', paymentStatus: '완료', date: '2024-12-07' },
  { id: '4', poNumber: 'PO-004', supplier: '베이징 공장', product: '판다 봉제인형', productImage: 'https://images.unsplash.com/photo-1517686748843-bb360cfc62b3?w=400', unitPrice: 30.00, optionCost: 0, quantity: 800, amount: 0, size: '6x4x3cm', weight: '80g', packaging: 15, factoryStatus: '출고대기', workStatus: '작업중', deliveryStatus: '내륙운송중', paymentStatus: '미결제', date: '2024-12-07' },
  { id: '5', poNumber: 'PO-005', supplier: '광저우 제조사', product: '브라운 곰돌이 인형', productImage: 'https://images.unsplash.com/photo-1567169866456-a0759b6bb0c8?w=400', unitPrice: 70.00, optionCost: 8.75, quantity: 300, amount: 0, size: '4.5x4.5x1.5cm', weight: '120g', packaging: 5, factoryStatus: '배송중', workStatus: '완료', deliveryStatus: '해운운송중', paymentStatus: '선금결제', date: '2024-12-07' },
  { id: '6', poNumber: 'PO-006', supplier: '선전 공장', product: '강아지 미니 인형', productImage: 'https://images.unsplash.com/photo-1635696860867-238c2fa072bb?w=400', unitPrice: 52.00, optionCost: 2.50, quantity: 1500, amount: 0, size: '3x2x2cm', weight: '30g', packaging: 25, factoryStatus: '출고대기', workStatus: '작업대기', deliveryStatus: '대기중', paymentStatus: '미결제', date: '2024-12-06' },
  { id: '7', poNumber: 'PO-007', supplier: '상하이 제조사', product: '토끼 인형 키링', productImage: 'https://images.unsplash.com/photo-1727154085760-134cc942246e?w=400', unitPrice: 19.00, optionCost: 1.50, quantity: 500, amount: 0, size: '40x30x10mm', weight: '800g', packaging: 20, factoryStatus: '출고대기', workStatus: '작업중', deliveryStatus: '통관및 배달', paymentStatus: '선금결제', date: '2024-12-06' },
  { id: '8', poNumber: 'PO-008', supplier: '베이징 공장', product: '펭귄 봉제인형', productImage: 'https://images.unsplash.com/photo-1602734846297-9299fc2d4703?w=400', unitPrice: 60.00, optionCost: 4.00, quantity: 200, amount: 0, size: '7x5x4cm', weight: '100g', packaging: 8, factoryStatus: '출고대기', workStatus: '작업대기', deliveryStatus: '내륙운송중', paymentStatus: '미결제', date: '2024-12-05' },
];

export function PurchaseOrders({ onViewDetail }: PurchaseOrdersProps) {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(initialPurchaseOrders);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('전체');
  const [hoveredProduct, setHoveredProduct] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    factoryStatus: [] as string[],
    workStatus: [] as string[],
    deliveryStatus: [] as string[],
    paymentStatus: [] as string[],
  });

  const filteredPurchaseOrders = purchaseOrders.filter(po => {
    const matchesSearch = 
      po.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.supplier.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.product.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFactoryStatus = filters.factoryStatus.length === 0 || filters.factoryStatus.includes(po.factoryStatus);
    const matchesWorkStatus = filters.workStatus.length === 0 || filters.workStatus.includes(po.workStatus);
    const matchesDeliveryStatus = filters.deliveryStatus.length === 0 || filters.deliveryStatus.includes(po.deliveryStatus);
    const matchesPaymentStatus = filters.paymentStatus.length === 0 || filters.paymentStatus.includes(po.paymentStatus);
    
    return matchesSearch && matchesFactoryStatus && matchesWorkStatus && matchesDeliveryStatus && matchesPaymentStatus;
  });

  const statusOptions = ['전체', '출고대기', '배송중', '수령완료', '작업대기', '작업중', '완료', '공장출고', '중국운송중', '항공운송중', '해운운송중', '통관및 배달', '한국도착'];

  // Pagination calculations
  const totalPages = Math.ceil(filteredPurchaseOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPurchaseOrders = filteredPurchaseOrders.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePosition({ x: e.clientX, y: e.clientY });
  };
  
  // 체크박스 토글
  const toggleOrderSelection = (orderId: string) => {
    const newSelected = new Set(selectedOrders);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      newSelected.add(orderId);
    }
    setSelectedOrders(newSelected);
  };
  
  // 전체 선택/해제
  const toggleAllSelection = () => {
    if (selectedOrders.size === filteredPurchaseOrders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(filteredPurchaseOrders.map(po => po.id)));
    }
  };
  
  // 발주 컨펌 처리
  const handleConfirmOrders = () => {
    setPurchaseOrders(prevOrders =>
      prevOrders.map(po =>
        selectedOrders.has(po.id)
          ? { ...po, isOrderConfirmed: true }
          : po
      )
    );
    setSelectedOrders(new Set());
  };

  // 필터 토글 함수
  const toggleFilter = (category: keyof typeof filters, value: string) => {
    setFilters(prev => {
      const current = prev[category];
      const newValues = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [category]: newValues };
    });
  };

  // 모든 필터 초기화
  const clearAllFilters = () => {
    setFilters({
      factoryStatus: [],
      workStatus: [],
      deliveryStatus: [],
      paymentStatus: [],
    });
  };

  // 활성 필터 개수
  const activeFilterCount = Object.values(filters).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <div className="p-8 min-h-[1080px]">
      <div className="mb-8">
        <h2 className="text-gray-900 mb-2">발주 관리</h2>
        <p className="text-gray-600">중국 제조사에 발주한 상품을 확인하고 제조 상태를 관리할 수 있습니다</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <SearchBar
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="발주번호, 제조사명, 상품명으로 검색..."
        />
        <div className="flex gap-2">
          <div className="relative">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
                activeFilterCount > 0
                  ? 'border-purple-600 bg-purple-50 text-purple-700'
                  : 'border-gray-300 bg-white hover:bg-gray-50'
              }`}
            >
              <Filter className="w-5 h-5" />
              <span>필터{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}</span>
            </button>

            {/* Filter Dropdown Panel */}
            {isFilterOpen && (
              <div className="absolute top-full right-0 mt-2 w-[680px] bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                <div className="p-3">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-gray-900 text-sm">필터 옵션</h3>
                    <div className="flex items-center gap-2">
                      {activeFilterCount > 0 && (
                        <button
                          onClick={clearAllFilters}
                          className="text-xs text-purple-600 hover:text-purple-700"
                        >
                          전체 초기화
                        </button>
                      )}
                      <button
                        onClick={() => setIsFilterOpen(false)}
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                      >
                        <X className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
                  </div>

                  {/* Filter Groups - Grid Layout */}
                  <div className="grid grid-cols-4 gap-3">
                    {/* 업체출고 상태 */}
                    <div className="bg-blue-50 rounded-lg p-2.5 border border-blue-200">
                      <h4 className="text-xs text-blue-900 mb-2 pb-1.5 border-b border-blue-300">업체출고 상태</h4>
                      <div className="space-y-1.5">
                        {['출고대기', '배송중', '수령완료'].map(status => (
                          <label key={status} className="flex items-center gap-1.5 cursor-pointer hover:bg-blue-100 p-1 rounded">
                            <input
                              type="checkbox"
                              checked={filters.factoryStatus.includes(status)}
                              onChange={() => toggleFilter('factoryStatus', status)}
                              className="w-3.5 h-3.5 accent-blue-600 cursor-pointer"
                            />
                            <span className="text-xs text-gray-700">{status}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* 작업 상태 */}
                    <div className="bg-green-50 rounded-lg p-2.5 border border-green-200">
                      <h4 className="text-xs text-green-900 mb-2 pb-1.5 border-b border-green-300">작업 상태</h4>
                      <div className="space-y-1.5">
                        {['작업대기', '작업중', '완료'].map(status => (
                          <label key={status} className="flex items-center gap-1.5 cursor-pointer hover:bg-green-100 p-1 rounded">
                            <input
                              type="checkbox"
                              checked={filters.workStatus.includes(status)}
                              onChange={() => toggleFilter('workStatus', status)}
                              className="w-3.5 h-3.5 accent-green-600 cursor-pointer"
                            />
                            <span className="text-xs text-gray-700">{status}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* 배송 상태 */}
                    <div className="bg-purple-50 rounded-lg p-2.5 border border-purple-200">
                      <h4 className="text-xs text-purple-900 mb-2 pb-1.5 border-b border-purple-300">배송 상태</h4>
                      <div className="space-y-1.5">
                        {['대기중', '내륙운송중', '항공운송중', '해운운송중', '통관및 배달', '한국도착'].map(status => (
                          <label key={status} className="flex items-center gap-1.5 cursor-pointer hover:bg-purple-100 p-1 rounded">
                            <input
                              type="checkbox"
                              checked={filters.deliveryStatus.includes(status)}
                              onChange={() => toggleFilter('deliveryStatus', status)}
                              className="w-3.5 h-3.5 accent-purple-600 cursor-pointer"
                            />
                            <span className="text-xs text-gray-700">{status}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* 결제 상태 */}
                    <div className="bg-amber-50 rounded-lg p-2.5 border border-amber-200">
                      <h4 className="text-xs text-amber-900 mb-2 pb-1.5 border-b border-amber-300">결제 상태</h4>
                      <div className="space-y-1.5">
                        {['미결제', '선금결제', '완료'].map(status => (
                          <label key={status} className="flex items-center gap-1.5 cursor-pointer hover:bg-amber-100 p-1 rounded">
                            <input
                              type="checkbox"
                              checked={filters.paymentStatus.includes(status)}
                              onChange={() => toggleFilter('paymentStatus', status)}
                              className="w-3.5 h-3.5 accent-amber-600 cursor-pointer"
                            />
                            <span className="text-xs text-gray-700">{status}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <button 
            onClick={handleConfirmOrders}
            disabled={selectedOrders.size === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              selectedOrders.size > 0
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <CheckSquare className="w-5 h-5" />
            <span>발주 컨펌{selectedOrders.size > 0 ? ` (${selectedOrders.size})` : ''}</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Download className="w-5 h-5" />
            <span>내보내기</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
            <Plus className="w-5 h-5" />
            <span>발주 생성</span>
          </button>
        </div>
      </div>

      {/* Purchase Orders Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-center text-gray-600 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedOrders.size === filteredPurchaseOrders.length && filteredPurchaseOrders.length > 0}
                    onChange={toggleAllSelection}
                    className="w-4 h-4 cursor-pointer accent-purple-600"
                  />
                </th>
                <th className="px-4 py-2 text-center text-gray-600 whitespace-nowrap">발주정보</th>
                <th className="px-4 py-2 text-center text-gray-600 whitespace-nowrap">상품정보</th>
                <th className="px-4 py-2 text-center text-gray-600 whitespace-nowrap">단가</th>
                <th className="px-4 py-2 text-center text-gray-600 whitespace-nowrap">수량</th>
                <th className="px-4 py-2 text-center text-gray-600 whitespace-nowrap">발주금액</th>
                <th className="px-4 py-2 text-center text-gray-600 whitespace-nowrap bg-yellow-100">예상최종단가</th>
                <th className="px-4 py-2 text-center text-gray-600 whitespace-nowrap">사이즈</th>
                <th className="px-4 py-2 text-center text-gray-600 whitespace-nowrap">무게</th>
                <th className="px-4 py-2 text-center text-gray-600 whitespace-nowrap">소포장 방식</th>
                <th className="px-4 py-2 text-center text-gray-600 whitespace-nowrap">상태</th>
                <th className="px-4 py-2 text-center text-gray-600 whitespace-nowrap">결제</th>
                <th className="px-4 py-2 text-center text-gray-600 whitespace-nowrap">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentPurchaseOrders.map((po) => {
                const finalUnitPrice = po.unitPrice + po.optionCost;
                const totalAmount = finalUnitPrice * po.quantity;
                return (
                  <tr key={po.id} className={`hover:bg-gray-50 ${po.isOrderConfirmed ? 'bg-green-50' : ''}`}>
                    <td className="px-4 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={selectedOrders.has(po.id)}
                        onChange={() => toggleOrderSelection(po.id)}
                        className="w-4 h-4 cursor-pointer accent-purple-600"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td 
                      className="px-4 py-2 text-center cursor-pointer hover:bg-purple-50 transition-colors"
                      onClick={() => onViewDetail(po.id)}
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="text-gray-900">{po.date}</span>
                        <span className="text-gray-500 text-xs">{po.poNumber}</span>
                      </div>
                    </td>
                    <td 
                      className="px-4 py-2 text-center cursor-pointer hover:bg-purple-50 transition-colors"
                      onClick={() => onViewDetail(po.id)}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden flex items-center justify-center">
                          {po.productImage ? (
                            <img
                              src={po.productImage}
                              alt={po.product}
                              className="w-full h-full object-cover"
                              onMouseMove={handleMouseMove}
                              onMouseEnter={() => setHoveredProduct(po.productImage)}
                              onMouseLeave={() => setHoveredProduct(null)}
                            />
                          ) : (
                            <Image className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                        <span className="text-gray-600 text-center font-bold">{po.product}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-gray-900">¥{po.unitPrice.toFixed(2)}</span>
                        {po.optionCost > 0 && (
                          <span className="text-gray-600 text-xs">
                            옵션비용: ¥{po.optionCost.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-center text-gray-600">{po.quantity}개</td>
                    <td className="px-4 py-2 text-center text-gray-900">¥{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="px-4 py-2 text-center text-gray-900 bg-yellow-100">¥{finalUnitPrice.toFixed(2)}</td>
                    <td className="px-4 py-2 text-center text-gray-600">{po.size}</td>
                    <td className="px-4 py-2 text-center text-gray-600">{po.weight}</td>
                    <td className="px-4 py-2 text-center text-gray-600">{po.packaging.toLocaleString()}개</td>
                    <td className="px-4 py-2 text-center">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="text-gray-600 text-xs whitespace-nowrap font-bold">업체출고:</span>
                          <StatusBadge 
                            status={po.factoryStatus} 
                            type="factory" 
                            size="xs" 
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewDetail(po.id, 'factory');
                            }}
                          />
                        </div>
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="text-gray-600 text-xs whitespace-nowrap font-bold">작업:</span>
                          <StatusBadge 
                            status={po.workStatus} 
                            type="work" 
                            size="xs" 
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewDetail(po.id, 'work');
                            }}
                          />
                        </div>
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="text-gray-600 text-xs whitespace-nowrap font-bold">배송:</span>
                          <StatusBadge 
                            status={po.deliveryStatus} 
                            type="delivery" 
                            size="xs" 
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewDetail(po.id, 'delivery');
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <StatusBadge status={po.paymentStatus} type="payment" size="sm" />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button 
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="수정"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => console.log('재주문:', po.id)}
                          className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="재주문"
                        >
                          <RotateCw className="w-4 h-4" />
                        </button>
                        <button 
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          totalItems={filteredPurchaseOrders.length}
          startIndex={startIndex}
          endIndex={endIndex}
          onPageChange={handlePageChange}
          onItemsPerPageChange={handleItemsPerPageChange}
        />
      </div>

      {/* Total */}
      <div className="mt-6 bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">총 발주 금액</span>
          <span className="text-gray-900">
            ¥{filteredPurchaseOrders.reduce((sum, po) => {
              const finalUnitPrice = po.unitPrice + po.optionCost;
              const totalAmount = finalUnitPrice * po.quantity;
              return sum + totalAmount;
            }, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Product Image Preview */}
      {hoveredProduct && (
        <div
          className="fixed w-64 h-64 bg-white border-2 border-gray-300 rounded-lg shadow-xl overflow-hidden flex items-center justify-center pointer-events-none z-50"
          style={{
            left: `${mousePosition.x + 20}px`,
            top: `${mousePosition.y + 20}px`,
          }}
        >
          <img
            src={hoveredProduct}
            alt="Product Preview"
            className="w-full h-full object-cover"
          />
        </div>
      )}
    </div>
  );
}