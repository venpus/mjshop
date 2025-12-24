import { ShoppingCart, Edit, Trash2 } from 'lucide-react';

export interface ProductActionsProps<T = unknown> {
  /** 주문하기 핸들러 */
  onOrder?: (product: T) => void;
  /** 편집 핸들러 */
  onEdit: (product: T) => void;
  /** 삭제 핸들러 */
  onDelete: (product: T) => void;
  /** 상품 객체 */
  product: T;
  /** 추가 클래스명 */
  className?: string;
}

/**
 * 상품 관리 액션 버튼 그룹 컴포넌트
 * 주문하기, 편집, 삭제 버튼을 제공합니다.
 */
export function ProductActions<T = unknown>({
  onOrder,
  onEdit,
  onDelete,
  product,
  className = '',
}: ProductActionsProps<T>) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {onOrder && (
        <button
          onClick={() => onOrder(product)}
          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
          title="주문하기"
        >
          <ShoppingCart className="w-5 h-5" />
        </button>
      )}
      <button
        onClick={() => onEdit(product)}
        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        title="편집"
      >
        <Edit className="w-5 h-5" />
      </button>
      <button
        onClick={() => onDelete(product)}
        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        title="삭제"
      >
        <Trash2 className="w-5 h-5" />
      </button>
    </div>
  );
}

