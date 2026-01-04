interface StockDetailHeaderProps {
  productName: string;
  productImage: string;
  orderedQuantity: number;
  unshippedQuantity: number;
  inboundQuantity: number;
}

export function StockDetailHeader({
  productName,
  productImage,
  orderedQuantity,
  unshippedQuantity,
  inboundQuantity,
}: StockDetailHeaderProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex gap-6">
        {/* 상품사진 */}
        <div className="w-48 h-48 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
          {productImage ? (
            <img
              src={productImage}
              alt={productName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
              <span className="text-sm text-gray-400">이미지 없음</span>
            </div>
          )}
        </div>

        {/* 상품 정보 및 수량 정보 */}
        <div className="flex-1">
          {/* 상품명 */}
          <h2 className="text-2xl font-bold text-gray-900 mb-6">{productName}</h2>

          {/* 수량 정보 */}
          <div className="grid grid-cols-3 gap-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-2">발주 수량</div>
              <div className="text-2xl font-bold text-gray-900">
                {orderedQuantity.toLocaleString()}
              </div>
            </div>

            <div className="bg-orange-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-2">미발송 수량</div>
              <div className="text-2xl font-bold text-orange-600">
                {unshippedQuantity.toLocaleString()}
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-2">입고 수량</div>
              <div className="text-2xl font-bold text-blue-600">
                {inboundQuantity.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

