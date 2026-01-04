import { useNavigate } from 'react-router-dom';
import { type InboundGroup } from './InboundTab';

interface InboundCardGridProps {
  groups: InboundGroup[];
}

export function InboundCardGrid({ groups }: InboundCardGridProps) {
  const navigate = useNavigate();

  const handleCardClick = (group: InboundGroup) => {
    // groupKey를 URL 인코딩하여 전달
    const encodedGroupKey = encodeURIComponent(group.groupKey);
    navigate(`/admin/inventory/${encodedGroupKey}`);
  };
  if (groups.length === 0) {
    return (
      <div className="py-12 text-center text-gray-500">
        입고 데이터가 없습니다.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-7 gap-6">
      {groups.map((group) => {
        // 입고 수량 계산 (모든 입고 기록의 합계)
        const inboundQuantity = group.arrivals.reduce((sum, arrival) => sum + arrival.inboundQuantity, 0);
        
        // 미발송 수량 = 발주 수량 - 입고 수량
        const unshippedQuantity = Math.max(0, group.orderedQuantity - inboundQuantity);

        return (
          <div
            key={group.groupKey}
            onClick={() => handleCardClick(group)}
            className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow flex flex-col cursor-pointer"
          >
            {/* 상품사진 - 더 크게 표시 */}
            <div className="w-full h-64 bg-gray-100 flex items-center justify-center overflow-hidden">
              {group.productImage ? (
                <img
                  src={group.productImage}
                  alt={group.productName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                  <span className="text-sm text-gray-400">이미지 없음</span>
                </div>
              )}
            </div>

            {/* 상품명 및 수량 정보 */}
            <div className="p-5 flex-1 flex flex-col">
              {/* 상품명 */}
              <h3 className="text-lg font-semibold text-gray-900 mb-4 line-clamp-2">
                {group.productName}
              </h3>

              {/* 수량 정보 */}
              <div className="space-y-2.5 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">발주 수량</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {group.orderedQuantity.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">미발송 수량</span>
                  <span className="text-sm font-semibold text-orange-600">
                    {unshippedQuantity.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">입고 수량</span>
                  <span className="text-sm font-semibold text-blue-600">
                    {inboundQuantity.toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-200">
                  <span className="text-base font-semibold text-gray-800">잔여 재고 수량</span>
                  <span className="text-lg font-bold text-purple-600">
                    {group.remainingStock.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

