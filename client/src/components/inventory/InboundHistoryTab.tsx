import { type InboundItem } from './InboundTab';

interface InboundHistoryTabProps {
  arrivals: InboundItem[];
}

export function InboundHistoryTab({ arrivals }: InboundHistoryTabProps) {
  if (arrivals.length === 0) {
    return (
      <div className="py-12 text-center text-gray-500">
        입고 기록이 없습니다.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                입고 날짜
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                발주 코드
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                물류 회사
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                입고 수량
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {arrivals.map((arrival) => (
              <tr key={arrival.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-900">
                  {new Date(arrival.arrivalDate).toLocaleDateString('ko-KR')}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {arrival.purchaseOrderId || '-'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {arrival.logisticsCompany || '-'}
                </td>
                <td className="px-4 py-3 text-sm font-medium text-blue-600 text-right">
                  {arrival.inboundQuantity.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

