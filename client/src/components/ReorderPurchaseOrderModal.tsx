import { X } from 'lucide-react';
import { useState, useEffect } from 'react';

interface PurchaseOrder {
  id: string;
  poNumber: string;
  product: string;
  unitPrice: number;
  quantity: number;
  orderDate?: string;
  estimatedShipmentDate?: string;
}

interface ReorderPurchaseOrderModalProps {
  purchaseOrder: PurchaseOrder;
  onConfirm: (data: { quantity: number; unit_price?: number; order_date?: string; estimated_shipment_date?: string }) => void;
  onCancel: () => void;
}

export function ReorderPurchaseOrderModal({ purchaseOrder, onConfirm, onCancel }: ReorderPurchaseOrderModalProps) {
  const [quantity, setQuantity] = useState<number>(purchaseOrder.quantity);
  const [unitPrice, setUnitPrice] = useState<number | ''>(purchaseOrder.unitPrice);
  const [orderDate, setOrderDate] = useState<string>('');
  const [estimatedShipmentDate, setEstimatedShipmentDate] = useState<string>('');

  // 오늘 날짜를 기본값으로 설정
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setOrderDate(today);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!quantity || quantity <= 0) {
      alert('수량을 입력해주세요.');
      return;
    }

    onConfirm({
      quantity,
      unit_price: unitPrice === '' ? undefined : unitPrice,
      order_date: orderDate || undefined,
      estimated_shipment_date: estimatedShipmentDate || undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-gray-900 font-semibold text-lg">재주문</h3>
          <button
            onClick={onCancel}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <p className="text-sm text-gray-600">발주번호: <span className="font-medium text-gray-900">{purchaseOrder.poNumber}</span></p>
              <p className="text-sm text-gray-600">상품명: <span className="font-medium text-gray-900">{purchaseOrder.product}</span></p>
              <p className="text-sm text-gray-600">원본 수량: <span className="font-medium text-gray-900">{purchaseOrder.quantity}</span></p>
              <p className="text-sm text-gray-600">원본 단가: <span className="font-medium text-gray-900">¥{purchaseOrder.unitPrice.toFixed(2)}</span></p>
            </div>
          </div>

          <div className="space-y-4">
            {/* 수량 (필수) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                수량 <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={quantity || ''}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                min="1"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="수량을 입력하세요"
              />
            </div>

            {/* 단가 (선택) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                단가 (¥)
              </label>
              <input
                type="number"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                min="0"
                step="0.01"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder={`기본값: ¥${purchaseOrder.unitPrice.toFixed(2)}`}
              />
              <p className="mt-1 text-xs text-gray-500">비워두면 원본 단가가 사용됩니다</p>
            </div>

            {/* 발주일 (선택) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                발주일
              </label>
              <input
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* 예상 출고일 (선택) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                예상 출고일
              </label>
              <input
                type="date"
                value={estimatedShipmentDate}
                onChange={(e) => setEstimatedShipmentDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              확인
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

