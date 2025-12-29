import { useState } from 'react';
import { X, Check, Plus } from 'lucide-react';

interface PackagingInventoryRecord {
  date: string;
  incoming: number | null; // 입고 수량 (없으면 null)
  outgoing: number | null; // 출고 수량 (없으면 null)
  quantity: number; // 총 수량
}

interface NewRecordInput {
  date: string;
  incoming: string;
  outgoing: string;
  quantity: string;
}

interface PackagingInventoryTabProps {
  records: PackagingInventoryRecord[];
  onRecordsChange: (records: PackagingInventoryRecord[]) => void;
}

/**
 * 포장자재 입출고 기록 탭 컴포넌트
 */
export function PackagingInventoryTab({
  records,
  onRecordsChange,
}: PackagingInventoryTabProps) {
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newRecord, setNewRecord] = useState<NewRecordInput>({
    date: new Date().toISOString().split('T')[0],
    incoming: '',
    outgoing: '',
    quantity: '',
  });

  const handleAddClick = () => {
    // 현재 재고 수량 계산 (가장 최근 기록의 quantity 값 사용)
    const currentQuantity = records.length > 0 
      ? records[records.length - 1].quantity 
      : 0;

    setIsAddingNew(true);
    setNewRecord({
      date: new Date().toISOString().split('T')[0],
      incoming: '',
      outgoing: '',
      quantity: currentQuantity.toString(),
    });
  };

  const handleCancelAdd = () => {
    setIsAddingNew(false);
    setNewRecord({
      date: new Date().toISOString().split('T')[0],
      incoming: '',
      outgoing: '',
      quantity: '',
    });
  };

  const handleSaveAdd = () => {
    // 입력값 검증
    if (!newRecord.date) {
      alert('날짜를 입력해주세요.');
      return;
    }

    const incoming = newRecord.incoming ? parseFloat(newRecord.incoming) : null;
    const outgoing = newRecord.outgoing ? parseFloat(newRecord.outgoing) : null;

    // 입고와 출고 중 최소 하나는 입력되어야 함
    if (incoming === null && outgoing === null) {
      alert('입고 또는 출고 수량을 입력해주세요.');
      return;
    }

    // 수량 자동 계산 (이전 수량 + 입고 - 출고)
    const baseQuantity = records.length > 0 
      ? records[records.length - 1].quantity 
      : 0;
    const incomingValue = incoming || 0;
    const outgoingValue = outgoing || 0;
    const quantity = baseQuantity + incomingValue - outgoingValue;
    
    if (quantity < 0) {
      alert('재고 수량이 음수가 될 수 없습니다.');
      return;
    }

    const newInventoryRecord: PackagingInventoryRecord = {
      date: newRecord.date,
      incoming,
      outgoing,
      quantity,
    };

    onRecordsChange([...records, newInventoryRecord]);
    setIsAddingNew(false);
    setNewRecord({
      date: new Date().toISOString().split('T')[0],
      incoming: '',
      outgoing: '',
      quantity: '',
    });
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
      <div className="border border-gray-300 rounded-lg overflow-hidden mb-4">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-3 py-2 text-xs font-semibold text-gray-700 border-r border-b border-gray-300 text-center">날짜</th>
              <th className="px-3 py-2 text-xs font-semibold text-gray-700 border-r border-b border-gray-300 text-center">입고</th>
              <th className="px-3 py-2 text-xs font-semibold text-gray-700 border-r border-b border-gray-300 text-center">출고</th>
              <th className="px-3 py-2 text-xs font-semibold text-gray-700 border-r border-b border-gray-300 text-center">수량</th>
              {isAddingNew && <th className="px-3 py-2 text-xs font-semibold text-gray-700 border-b border-gray-300 text-center">작업</th>}
            </tr>
          </thead>
          <tbody>
            {records.map((record, index) => (
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
                        // 입고 수량 변경 시 자동으로 수량 계산
                        const incoming = value ? parseFloat(value) : 0;
                        const outgoing = prev.outgoing ? parseFloat(prev.outgoing) : 0;
                        const baseQuantity = records.length > 0 
                          ? records[records.length - 1].quantity 
                          : 0;
                        const calculatedQuantity = baseQuantity + incoming - outgoing;
                        updated.quantity = calculatedQuantity >= 0 ? calculatedQuantity.toString() : '0';
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
                    value={newRecord.outgoing}
                    onChange={(e) => {
                      const value = e.target.value;
                      setNewRecord((prev) => {
                        const updated = { ...prev, outgoing: value };
                        // 출고 수량 변경 시 자동으로 수량 계산
                        const incoming = prev.incoming ? parseFloat(prev.incoming) : 0;
                        const outgoing = value ? parseFloat(value) : 0;
                        const baseQuantity = records.length > 0 
                          ? records[records.length - 1].quantity 
                          : 0;
                        const calculatedQuantity = baseQuantity + incoming - outgoing;
                        updated.quantity = calculatedQuantity >= 0 ? calculatedQuantity.toString() : '0';
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
                    placeholder="수량"
                    value={newRecord.quantity}
                    readOnly
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-gray-50 focus:outline-none cursor-not-allowed"
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
    </div>
  );
}

