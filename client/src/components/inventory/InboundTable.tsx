interface InboundTableProps {
  groups: import('./InboundTab').InboundGroup[];
}

export function InboundTable({ groups }: InboundTableProps) {

  if (groups.length === 0) {
    return (
      <div className="py-12 text-center text-gray-500">
        입고 데이터가 없습니다.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">상품사진</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">상품명</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">입고날짜</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">입고물류사</th>
            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">OPP 소포장 수량</th>
            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">한 세트 수</th>
            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">박스 마대별 세트수</th>
            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">발주 수량</th>
            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">미발송수량</th>
            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">입고 수량</th>
            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">잔여 재고 수량</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {groups.map((group) => {
            const rowCount = group.arrivals.length;
            return group.arrivals.map((arrival, index) => (
              <tr key={arrival.id} className="hover:bg-gray-50">
                {/* 상품사진 - 첫 번째 행에만 표시, rowspan으로 병합 */}
                {index === 0 && (
                  <td 
                    rowSpan={rowCount} 
                    className="px-4 py-3 align-top border-r border-gray-200"
                  >
                    {group.productImage ? (
                      <img
                        src={group.productImage}
                        alt={group.productName}
                        className="w-16 h-16 object-cover rounded border border-gray-200"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-100 rounded border border-gray-200 flex items-center justify-center">
                        <span className="text-xs text-gray-400">이미지 없음</span>
                      </div>
                    )}
                  </td>
                )}
                
                {/* 상품명 - 첫 번째 행에만 표시, rowspan으로 병합 */}
                {index === 0 && (
                  <td 
                    rowSpan={rowCount} 
                    className="px-4 py-3 text-sm text-gray-900 align-top border-r border-gray-200"
                  >
                    {group.productName}
                  </td>
                )}
                
                {/* 입고날짜 */}
                <td className="px-4 py-3 text-sm text-gray-900">
                  {new Date(arrival.arrivalDate).toLocaleDateString('ko-KR')}
                </td>
                
                {/* 입고물류사 */}
                <td className="px-4 py-3 text-sm text-gray-700">
                  {arrival.logisticsCompany || '-'}
                </td>
                
                {/* OPP 소포장 수량 */}
                <td className="px-4 py-3 text-sm text-gray-700 text-center">
                  {group.smallPackCount}
                </td>
                
                {/* 한 세트 수 */}
                <td className="px-4 py-3 text-sm text-gray-700 text-center">
                  {group.setCount}
                </td>
                
                {/* 박스 마대별 세트수 */}
                <td className="px-4 py-3 text-sm text-gray-700 text-center">
                  {group.boxCount}
                </td>
                
                {/* 발주 수량 */}
                <td className="px-4 py-3 text-sm font-medium text-gray-900 text-center">
                  {group.orderedQuantity.toLocaleString()}
                </td>
                
                {/* 미발송수량 */}
                <td className="px-4 py-3 text-sm text-gray-700 text-center">
                  {arrival.unshippedQuantity.toLocaleString()}
                </td>
                
                {/* 입고 수량 */}
                <td className="px-4 py-3 text-sm font-medium text-gray-900 text-center">
                  {arrival.inboundQuantity.toLocaleString()}
                </td>
                
                {/* 잔여 재고 수량 - 첫 번째 행에만 표시, rowspan으로 병합 */}
                {index === 0 && (
                  <td 
                    rowSpan={rowCount} 
                    className="px-4 py-3 text-sm font-medium text-blue-600 text-center align-top"
                  >
                    {group.remainingStock.toLocaleString()}
                  </td>
                )}
              </tr>
            ));
          })}
        </tbody>
      </table>
    </div>
  );
}
