import { useState } from 'react';
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { handleNumberInput } from '../../utils/numberInputUtils';
import type { StockOutboundRecord, CreateStockOutboundRecordData, UpdateStockOutboundRecordData } from '../../api/stockOutboundApi';

interface OutboundSalesTabProps {
  groupKey: string;
  inboundQuantity: number; // 입고 수량
  outboundRecords: StockOutboundRecord[];
  onAdd: (data: CreateStockOutboundRecordData) => Promise<void>;
  onUpdate: (id: number, data: UpdateStockOutboundRecordData) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

export function OutboundSalesTab({
  groupKey,
  inboundQuantity,
  outboundRecords,
  onAdd,
  onUpdate,
  onDelete,
}: OutboundSalesTabProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingData, setEditingData] = useState<{
    outboundDate: string;
    customerName: string;
    quantity: string;
  } | null>(null);
  const [newRecord, setNewRecord] = useState<{
    outboundDate: string;
    customerName: string;
    quantity: string;
  }>({
    outboundDate: new Date().toISOString().split('T')[0],
    customerName: '',
    quantity: '',
  });
  const [isAdding, setIsAdding] = useState(false);

  // 출고 수량 합계 계산
  const totalOutboundQuantity = (outboundRecords || []).reduce((sum, record) => sum + record.quantity, 0);
  const remainingStock = Math.max(0, inboundQuantity - totalOutboundQuantity);

  // 편집 시작
  const handleStartEdit = (record: StockOutboundRecord) => {
    setEditingId(record.id);
    setEditingData({
      outboundDate: record.outboundDate,
      customerName: record.customerName,
      quantity: record.quantity.toString(),
    });
  };

  // 편집 취소
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingData(null);
  };

  // 편집 저장
  const handleSaveEdit = async () => {
    if (!editingId || !editingData) return;

    const quantity = parseInt(editingData.quantity, 10);
    if (isNaN(quantity) || quantity <= 0) {
      alert('출고 수량은 0보다 커야 합니다.');
      return;
    }

    // 잔여 재고 확인 (현재 편집 중인 항목의 원래 수량을 제외한 합계 + 새 수량)
    const otherRecordsTotal = outboundRecords
      .filter((r) => r.id !== editingId)
      .reduce((sum, r) => sum + r.quantity, 0);
    const newTotal = otherRecordsTotal + quantity;

    if (newTotal > inboundQuantity) {
      alert(`출고 수량 합계(${newTotal})가 입고 수량(${inboundQuantity})을 초과할 수 없습니다.`);
      return;
    }

    try {
      await onUpdate(editingId, {
        outboundDate: editingData.outboundDate,
        customerName: editingData.customerName,
        quantity,
      });
      setEditingId(null);
      setEditingData(null);
    } catch (error: any) {
      alert(error.message || '출고 기록 수정에 실패했습니다.');
    }
  };

  // 추가
  const handleAdd = async () => {
    if (!newRecord.customerName.trim() || !newRecord.quantity.trim()) {
      alert('고객 이름과 출고 수량을 입력해주세요.');
      return;
    }

    const quantity = parseInt(newRecord.quantity, 10);
    if (isNaN(quantity) || quantity <= 0) {
      alert('출고 수량은 0보다 커야 합니다.');
      return;
    }

    // 잔여 재고 확인
    if (totalOutboundQuantity + quantity > inboundQuantity) {
      alert(`출고 수량 합계(${totalOutboundQuantity + quantity})가 입고 수량(${inboundQuantity})을 초과할 수 없습니다.`);
      return;
    }

    try {
      setIsAdding(true);
      await onAdd({
        groupKey,
        outboundDate: newRecord.outboundDate,
        customerName: newRecord.customerName.trim(),
        quantity,
      });
      setNewRecord({
        outboundDate: new Date().toISOString().split('T')[0],
        customerName: '',
        quantity: '',
      });
    } catch (error: any) {
      alert(error.message || '출고 기록 추가에 실패했습니다.');
    } finally {
      setIsAdding(false);
    }
  };

  // 삭제
  const handleDelete = async (id: number) => {
    if (!confirm('정말로 이 출고 기록을 삭제하시겠습니까?')) {
      return;
    }

    try {
      await onDelete(id);
    } catch (error: any) {
      alert(error.message || '출고 기록 삭제에 실패했습니다.');
    }
  };

  return (
    <div className="space-y-4">
      {/* 요약 정보 */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-sm text-gray-600 mb-1">입고 수량</div>
            <div className="text-xl font-bold text-blue-600">{inboundQuantity.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">출고 수량 합계</div>
            <div className="text-xl font-bold text-orange-600">{totalOutboundQuantity.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">잔여 재고</div>
            <div className="text-xl font-bold text-purple-600">{remainingStock.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* 추가 폼 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="text-sm text-gray-700 mb-1.5 block">출고 날짜</label>
            <input
              type="date"
              value={newRecord.outboundDate}
              onChange={(e) => setNewRecord({ ...newRecord, outboundDate: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div className="flex-1">
            <label className="text-sm text-gray-700 mb-1.5 block">고객 이름</label>
            <input
              type="text"
              value={newRecord.customerName}
              onChange={(e) => setNewRecord({ ...newRecord, customerName: e.target.value })}
              placeholder="고객 이름을 입력하세요"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div className="w-32">
            <label className="text-sm text-gray-700 mb-1.5 block">출고 수량</label>
            <input
              type="number"
              value={newRecord.quantity}
              onChange={(e) => {
                const processedValue = handleNumberInput(e.target.value);
                if (processedValue !== e.target.value) {
                  e.target.value = processedValue;
                }
                setNewRecord({ ...newRecord, quantity: processedValue });
              }}
              placeholder="0"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={isAdding}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            <span>추가</span>
          </button>
        </div>
      </div>

      {/* 출고 기록 테이블 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  출고 날짜
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  고객 이름
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  출고 수량
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider w-32">
                  관리
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {outboundRecords.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                    출고 기록이 없습니다.
                  </td>
                </tr>
              ) : (
                (outboundRecords || []).map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    {editingId === record.id && editingData ? (
                      <>
                        <td className="px-4 py-3">
                          <input
                            type="date"
                            value={editingData.outboundDate}
                            onChange={(e) => setEditingData({ ...editingData, outboundDate: e.target.value })}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={editingData.customerName}
                            onChange={(e) => setEditingData({ ...editingData, customerName: e.target.value })}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={editingData.quantity}
                            onChange={(e) => {
                              const processedValue = handleNumberInput(e.target.value);
                              if (processedValue !== e.target.value) {
                                e.target.value = processedValue;
                              }
                              setEditingData({ ...editingData, quantity: processedValue });
                            }}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-right focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={handleSaveEdit}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="저장"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="p-1.5 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                              title="취소"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {new Date(record.outboundDate).toLocaleDateString('ko-KR')}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{record.customerName}</td>
                        <td className="px-4 py-3 text-sm font-medium text-orange-600 text-right">
                          {record.quantity.toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleStartEdit(record)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="수정"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(record.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="삭제"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
