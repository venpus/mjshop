import { useState, useEffect } from 'react';
import { X, Check, Search } from 'lucide-react';

interface InventoryTabProps {
  onAddClick: () => void;
  inventoryRecords?: InventoryRecord[];
  isLoading?: boolean;
  onSave?: (transactionData: any) => Promise<void>;
  currentStock?: number;
}

export interface InventoryRecord {
  date: string;
  incoming: number | null; // 입고 수량 (없으면 null)
  outgoing: number | null; // 출고 수량 (없으면 null)
  quantity: number; // 총 수량
  relatedOrder: string | null; // 관련 발주 (없으면 null)
}

interface NewRecordInput {
  date: string;
  incoming: string;
  outgoing: string;
  quantity: string;
  relatedOrder: string;
}

export function InventoryTab({ 
  onAddClick, 
  inventoryRecords: propInventoryRecords = [], 
  isLoading = false,
  onSave,
  currentStock = 0,
}: InventoryTabProps) {
  const [inventoryRecords, setInventoryRecords] = useState<InventoryRecord[]>(propInventoryRecords);
  
  // prop이 변경되면 상태 업데이트
  useEffect(() => {
    setInventoryRecords(propInventoryRecords);
  }, [propInventoryRecords]);

  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newRecord, setNewRecord] = useState<NewRecordInput>({
    date: new Date().toISOString().split('T')[0], // 오늘 날짜 기본값
    incoming: '',
    outgoing: '',
    quantity: '',
    relatedOrder: '',
  });
  const [showOrderSearch, setShowOrderSearch] = useState(false);
  const [orderOptions, setOrderOptions] = useState<string[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<string[]>([]);
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

  // 발주 목록 로드
  useEffect(() => {
    const loadPurchaseOrders = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/purchase-orders`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            const poNumbers = data.data.map((po: any) => po.poNumber || po.id).filter(Boolean);
            setOrderOptions(poNumbers);
            setFilteredOrders(poNumbers);
          }
        }
      } catch (error) {
        console.error('발주 목록 로드 오류:', error);
      }
    };

    loadPurchaseOrders();
  }, [API_BASE_URL]);

  const handleAddClick = () => {
    setIsAddingNew(true);
    setNewRecord({
      date: new Date().toISOString().split('T')[0],
      incoming: '',
      outgoing: '',
      quantity: currentStock.toString(),
      relatedOrder: '',
    });
    setShowOrderSearch(false);
  };

  const handleCancelAdd = () => {
    setIsAddingNew(false);
    setNewRecord({
      date: new Date().toISOString().split('T')[0],
      incoming: '',
      outgoing: '',
      quantity: '',
      relatedOrder: '',
    });
    setShowOrderSearch(false);
  };

  const handleSaveAdd = async () => {
    // 입력값 검증
    if (!newRecord.date) {
      alert('날짜를 입력해주세요.');
      return;
    }

    const incoming = newRecord.incoming ? parseFloat(newRecord.incoming) : null;
    const outgoing = newRecord.outgoing ? parseFloat(newRecord.outgoing) : null;
    const relatedOrder = newRecord.relatedOrder.trim() || null;

    // 입고와 출고 중 최소 하나는 입력되어야 함
    if (incoming === null && outgoing === null) {
      alert('입고 또는 출고 수량을 입력해주세요.');
      return;
    }

    if (!onSave) {
      alert('저장 기능이 연결되지 않았습니다.');
      return;
    }

    try {
      await onSave({
        date: newRecord.date,
        incoming,
        outgoing,
        relatedOrder,
      });

      // 성공 시 폼 초기화
      setIsAddingNew(false);
      setNewRecord({
        date: new Date().toISOString().split('T')[0],
        incoming: '',
        outgoing: '',
        quantity: '',
        relatedOrder: '',
      });
      setShowOrderSearch(false);
    } catch (error) {
      // 에러는 onSave에서 alert로 표시되므로 여기서는 처리하지 않음
    }
  };

  const handleOrderSearch = (value: string) => {
    setNewRecord((prev) => ({ ...prev, relatedOrder: value }));
    if (value.trim()) {
      const filtered = orderOptions.filter((order) =>
        order.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredOrders(filtered);
      setShowOrderSearch(true);
    } else {
      setFilteredOrders(orderOptions);
      setShowOrderSearch(false);
    }
  };

  const handleSelectOrder = (order: string) => {
    setNewRecord((prev) => ({ ...prev, relatedOrder: order }));
    setShowOrderSearch(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">입출고 기록</h3>
        {!isAddingNew && (
          <button
            onClick={handleAddClick}
            className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-1"
          >
            <span>+</span>
            <span>추가</span>
          </button>
        )}
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">입출고 기록을 불러오는 중...</span>
        </div>
      ) : (
        <div className="border border-gray-300 rounded-lg overflow-hidden mb-4">
          <table className="w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-3 py-2 text-xs font-semibold text-gray-700 border-r border-b border-gray-300 text-center">날짜</th>
              <th className="px-3 py-2 text-xs font-semibold text-gray-700 border-r border-b border-gray-300 text-center">입고</th>
              <th className="px-3 py-2 text-xs font-semibold text-gray-700 border-r border-b border-gray-300 text-center">출고</th>
              <th className="px-3 py-2 text-xs font-semibold text-gray-700 border-r border-b border-gray-300 text-center">수량</th>
              <th className="px-3 py-2 text-xs font-semibold text-gray-700 border-r border-b border-gray-300 text-center">관련 발주</th>
              {isAddingNew && <th className="px-3 py-2 text-xs font-semibold text-gray-700 border-b border-gray-300 text-center">작업</th>}
            </tr>
          </thead>
          <tbody>
            {inventoryRecords.map((record, index) => (
              <tr key={index}>
                <td className="px-3 py-2 text-sm text-gray-900 text-center border-r border-gray-300">{record.date}</td>
                <td className="px-3 py-2 text-sm text-gray-900 text-center border-r border-gray-300">
                  {record.incoming !== null ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      +{record.incoming}개
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-3 py-2 text-sm text-gray-900 text-center border-r border-gray-300">
                  {record.outgoing !== null ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                      -{record.outgoing}개
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-3 py-2 text-sm text-gray-900 text-center border-r border-gray-300">{record.quantity}개</td>
                <td className="px-3 py-2 text-sm text-gray-900 text-center">
                  {record.relatedOrder ? (
                    <span className="text-blue-600 hover:text-blue-800 underline cursor-pointer">
                      {record.relatedOrder}
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
              </tr>
            ))}
            
            {/* 새 행 추가 입력 필드 */}
            {isAddingNew && (
              <tr className="bg-blue-50">
                <td className="px-3 py-2 border-r border-gray-300">
                  <input
                    type="date"
                    value={newRecord.date}
                    onChange={(e) => setNewRecord((prev) => ({ ...prev, date: e.target.value }))}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </td>
                <td className="px-3 py-2 border-r border-gray-300">
                  <input
                    type="number"
                    placeholder="입고 수량"
                    value={newRecord.incoming}
                    onChange={(e) => {
                      const value = e.target.value;
                      setNewRecord((prev) => {
                        const updated = { ...prev, incoming: value };
                        // 입고 수량 변경 시 자동으로 수량 계산 (출고는 없음)
                        const incoming = value ? parseFloat(value) : 0;
                        const calculatedQuantity = currentStock + incoming;
                        updated.quantity = calculatedQuantity >= 0 ? calculatedQuantity.toString() : currentStock.toString();
                        return updated;
                      });
                    }}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                  />
                </td>
                <td className="px-3 py-2 border-r border-gray-300">
                  <input
                    type="number"
                    placeholder="출고 수량"
                    value=""
                    disabled
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-gray-100 text-gray-400 cursor-not-allowed"
                  />
                </td>
                <td className="px-3 py-2 border-r border-gray-300">
                  <input
                    type="number"
                    placeholder="수량"
                    value={newRecord.quantity}
                    readOnly
                    disabled
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-gray-100 text-gray-400 cursor-not-allowed"
                  />
                </td>
                <td className="px-3 py-2 relative">
                  <input
                    type="text"
                    placeholder="관련 발주 (비활성화)"
                    value=""
                    disabled
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-gray-100 text-gray-400 cursor-not-allowed"
                  />
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={handleSaveAdd}
                      className="p-1.5 text-green-600 hover:bg-green-100 rounded transition-colors"
                      title="저장"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleCancelAdd}
                      className="p-1.5 text-red-600 hover:bg-red-100 rounded transition-colors"
                      title="취소"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      )}
      
      {/* 발주 검색 드롭다운이 열려있을 때 외부 클릭 시 닫기 */}
      {showOrderSearch && (
        <div
          className="fixed inset-0 z-5"
          onClick={() => setShowOrderSearch(false)}
        />
      )}
    </div>
  );
}

