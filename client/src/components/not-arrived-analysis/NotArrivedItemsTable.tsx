import { getFullImageUrl, type NotArrivedItem } from '../../api/purchaseOrderApi';
import { PaymentAmountCell, PaymentStatusCell } from './PaymentAmountStatusCell';

export interface NotArrivedItemsTableProps {
  items: NotArrivedItem[];
  selectedIds: Set<string>;
  onToggleRow: (id: string) => void;
  onToggleAll: () => void;
  allSelected: boolean;
  formatCurrency: (amount: number) => string;
  formatNumber: (num: number) => string;
}

export function NotArrivedItemsTable({
  items,
  selectedIds,
  onToggleRow,
  onToggleAll,
  allSelected,
  formatCurrency,
  formatNumber,
}: NotArrivedItemsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-3 w-12">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onToggleAll}
                disabled={items.length === 0}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                aria-label="전체 선택"
              />
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              발주 날짜
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              발주번호
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">사진</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상품명</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">납기일</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              발주 수량
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              미출고 수량
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              한국 배송 중
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              한국 도착
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">단가</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              선금 금액
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              선금 상태
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              잔금 금액
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              잔금 상태
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">총 금액</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {items.length === 0 ? (
            <tr>
              <td colSpan={16} className="px-6 py-8 text-center text-gray-500">
                미도착 물품이 없습니다.
              </td>
            </tr>
          ) : (
            items.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-3 py-4">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(item.id)}
                    onChange={() => onToggleRow(item.id)}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    aria-label={`${item.po_number} 선택`}
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{item.order_date || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.po_number}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {item.product_main_image ? (
                    <img
                      src={getFullImageUrl(item.product_main_image)}
                      alt={item.product_name}
                      className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"%3E%3Crect width="64" height="64" fill="%23f3f4f6"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-size="12"%3E이미지 없음%3C/text%3E%3C/svg%3E';
                      }}
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                      <span className="text-xs text-gray-400">이미지 없음</span>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">{item.product_name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{item.estimated_delivery || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                  {formatNumber(item.quantity)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-orange-600">
                  {formatNumber(item.unreceived_quantity)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-blue-600">
                  {formatNumber(item.shipping_quantity)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-green-600">
                  {formatNumber(item.arrived_quantity)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                  {item.expected_final_unit_price != null
                    ? formatCurrency(item.expected_final_unit_price)
                    : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <PaymentAmountCell amount={item.advance_payment_amount} formatCurrency={formatCurrency} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <PaymentStatusCell paidDate={item.advance_payment_date} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <PaymentAmountCell amount={item.balance_payment_amount} formatCurrency={formatCurrency} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <PaymentStatusCell paidDate={item.balance_payment_date} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                  {formatCurrency(item.total_amount)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
