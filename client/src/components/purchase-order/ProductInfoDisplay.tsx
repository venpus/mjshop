interface ProductInfoDisplayProps {
  product: {
    name: string;
    name_chinese?: string | null;
    category?: string;
    main_image?: string | null;
    size?: string | null;
    weight?: string | null;
  };
}

/**
 * 상품 정보 표시 컴포넌트 (읽기 전용)
 */
export function ProductInfoDisplay({ product }: ProductInfoDisplayProps) {
  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
      <h4 className="text-sm font-semibold text-gray-700 mb-3">상품 정보</h4>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">상품명</label>
          <div className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900">
            {product.name}
            {product.name_chinese && (
              <span className="text-gray-600 ml-2">({product.name_chinese})</span>
            )}
          </div>
        </div>
        {product.category && (
          <div>
            <label className="block text-sm text-gray-600 mb-1">카테고리</label>
            <div className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900">
              {product.category}
            </div>
          </div>
        )}
        {product.size && (
          <div>
            <label className="block text-sm text-gray-600 mb-1">크기</label>
            <div className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900">
              {product.size}
            </div>
          </div>
        )}
        {product.weight && (
          <div>
            <label className="block text-sm text-gray-600 mb-1">무게</label>
            <div className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900">
              {product.weight}
            </div>
          </div>
        )}
        {product.main_image && (
          <div className="col-span-2">
            <label className="block text-sm text-gray-600 mb-1">메인 이미지</label>
            <img
              src={product.main_image}
              alt={product.name}
              className="w-32 h-32 object-cover rounded-lg border border-gray-300"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

