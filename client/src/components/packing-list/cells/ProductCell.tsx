import type { PackingListItem } from '../types';

interface ProductCellProps {
  item: PackingListItem;
  onProductNameClick?: (purchaseOrderId?: string) => void;
  canClickProductName?: boolean; // 제품명 링크 클릭 가능 여부 (A레벨만 가능, D0 레벨은 불가)
}

export function ProductCell({ item, onProductNameClick, canClickProductName = true }: ProductCellProps) {
  return (
    <div className="flex flex-col items-center gap-2 w-full">
      {item.productImage ? (
        <img src={item.productImage} alt={item.productName} className="w-16 h-16 object-cover rounded mx-auto flex-shrink-0" />
      ) : (
        <div className="w-16 h-16 flex items-center justify-center flex-shrink-0">
          <span className="text-gray-400 text-xs">-</span>
        </div>
      )}
      {item.purchaseOrderId && onProductNameClick && canClickProductName ? (
        <button
          onClick={() => onProductNameClick(item.purchaseOrderId)}
          className="text-purple-600 hover:text-purple-800 hover:underline cursor-pointer text-sm break-words text-center max-w-full"
          style={{ 
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
            lineHeight: '1.4',
            minHeight: '2.8em' // 최소 두 줄 높이
          }}
        >
          {item.productName}
        </button>
      ) : (
        <span 
          className="text-gray-900 text-sm break-words text-center max-w-full"
          style={{ 
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
            lineHeight: '1.4',
            minHeight: '2.8em' // 최소 두 줄 높이
          }}
        >
          {item.productName}
        </span>
      )}
    </div>
  );
}
