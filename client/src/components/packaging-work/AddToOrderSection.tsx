import { useState, useEffect } from 'react';
import { Search, Check } from 'lucide-react';
import { X } from 'lucide-react';

interface OrderOption {
  orderNumber: string;
  productName: string;
  orderDate: string;
  image: string;
}

interface AddToOrderSectionProps {
  onAdd?: (productName: string) => void;
  materialId?: number;
  materialCode?: string;
  materialName?: string;
}

/**
 * 발주 작업에 추가 섹션 컴포넌트
 */
export function AddToOrderSection({
  onAdd,
  materialId,
  materialCode,
  materialName,
}: AddToOrderSectionProps) {
  const [orderInput, setOrderInput] = useState('');
  const [showOrderSearchModal, setShowOrderSearchModal] = useState(false);
  const [orderSearchKeyword, setOrderSearchKeyword] = useState('');

  // TODO: DB 연동 시 발주 목록을 서버에서 가져와야 함
  // 임시 발주 목록 더미 데이터 (발주번호, 상품명, 발주날짜, 사진)
  const orderOptions: OrderOption[] = [
    { orderNumber: 'PO-2024-001', productName: '펜던트 세트 A', orderDate: '2024-01-15', image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=300&h=300&fit=crop' },
    { orderNumber: 'PO-2024-002', productName: '목걸이 세트 B', orderDate: '2024-01-18', image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=300&h=300&fit=crop' },
    { orderNumber: 'PO-2024-003', productName: '열쇠고리 세트 C', orderDate: '2024-01-20', image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=300&h=300&fit=crop' },
    { orderNumber: 'PO-2024-004', productName: '패치 세트 D', orderDate: '2024-01-22', image: 'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=300&h=300&fit=crop' },
    { orderNumber: 'SO-2024-010', productName: '택 세트 E', orderDate: '2024-02-01', image: 'https://images.unsplash.com/photo-1611522135889-7a5f0821337b?w=300&h=300&fit=crop' },
    { orderNumber: 'SO-2024-015', productName: '파우치 세트 F', orderDate: '2024-02-05', image: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=300&h=300&fit=crop' },
    { orderNumber: 'SO-2024-020', productName: '박스 세트 G', orderDate: '2024-02-10', image: 'https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=300&h=300&fit=crop' },
  ];

  const filteredOrders = orderSearchKeyword.trim()
    ? orderOptions.filter((order) =>
        order.orderNumber.toLowerCase().includes(orderSearchKeyword.toLowerCase()) ||
        order.productName.toLowerCase().includes(orderSearchKeyword.toLowerCase()) ||
        order.orderDate.includes(orderSearchKeyword)
      )
    : orderOptions;

  const handleOpenOrderSearchModal = () => {
    setOrderSearchKeyword('');
    setShowOrderSearchModal(true);
  };

  const handleSelectOrder = (order: OrderOption) => {
    setOrderInput(order.productName);
    setShowOrderSearchModal(false);
    setOrderSearchKeyword('');
  };

  const handleAddToOrder = () => {
    if (!orderInput.trim()) {
      alert('발주 상품명을 입력해주세요.');
      return;
    }

    // TODO: DB 연동 시 서버에 발주 추가 요청
    // POST /api/packaging-materials/{materialId}/orders
    // {
    //   productName: orderInput.trim(),
    //   materialId: materialId,
    //   materialCode: materialCode,
    //   materialName: materialName,
    // }

    if (onAdd) {
      onAdd(orderInput.trim());
    } else {
      alert(`발주 "${orderInput.trim()}"에 포장자재가 추가되었습니다.`);
    }
    setOrderInput('');
  };

  return (
    <>
      <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">발주 작업에 추가</h3>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <div className="flex items-center gap-1 border border-gray-300 rounded-md bg-white">
              <input
                type="text"
                placeholder="발주 상품명 입력"
                value={orderInput}
                onChange={(e) => setOrderInput(e.target.value)}
                className="flex-1 px-3 py-2 text-sm border-0 focus:outline-none focus:ring-0"
              />
              <button
                onClick={handleOpenOrderSearchModal}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                title="발주 검색"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
          </div>
          <button
            onClick={handleAddToOrder}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>발주에 추가</span>
          </button>
        </div>
      </div>

      {/* 발주 검색 모달 */}
      {showOrderSearchModal && (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
          {/* 오버레이 */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={() => {
              setShowOrderSearchModal(false);
              setOrderSearchKeyword('');
            }}
          />

          {/* 모달 컨테이너 */}
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[80vh] overflow-hidden flex flex-col">
              {/* 헤더 */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">발주 검색</h3>
                <button
                  onClick={() => {
                    setShowOrderSearchModal(false);
                    setOrderSearchKeyword('');
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="닫기"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 검색 입력 */}
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center gap-2 border border-gray-300 rounded-md bg-white">
                  <Search className="w-4 h-4 text-gray-400 ml-3" />
                  <input
                    type="text"
                    placeholder="발주 번호 또는 상품명 검색"
                    value={orderSearchKeyword}
                    onChange={(e) => setOrderSearchKeyword(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm border-0 focus:outline-none focus:ring-0"
                    autoFocus
                  />
                </div>
              </div>

              {/* 발주 목록 */}
              <div className="flex-1 overflow-y-auto p-6">
                {filteredOrders.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredOrders.map((order) => (
                      <button
                        key={order.orderNumber}
                        onClick={() => handleSelectOrder(order)}
                        className="text-left border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all bg-white"
                      >
                        {/* 사진 */}
                        <div className="w-full aspect-square bg-gray-100 rounded-t-lg overflow-hidden">
                          <img
                            src={order.image}
                            alt={order.productName}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                        {/* 정보 */}
                        <div className="p-4">
                          <div className="text-xs text-gray-500 mb-1">
                            {order.orderDate}
                          </div>
                          <div className="text-sm font-semibold text-gray-900 mb-2">
                            {order.productName}
                          </div>
                          <div className="text-xs font-medium text-blue-600">
                            {order.orderNumber}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    검색 결과가 없습니다.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

