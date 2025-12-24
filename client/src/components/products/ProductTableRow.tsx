import { ProductActions } from './ProductActions';
import { ProductImageCell } from './ProductImageCell';

export interface Product {
  id: string;
  name: string;
  nameChinese?: string;
  category: string;
  price: number;
  stock: number;
  status: "판매중" | "품절" | "숨김";
  size: string;
  packagingSize: string;
  weight: string;
  setCount: number;
  smallPackCount: number;
  boxCount: number;
  mainImage: string;
  images: string[];
  supplier: {
    name: string;
    url: string;
  };
}

export interface ProductTableRowProps {
  /** 상품 데이터 */
  product: Product;
  /** 이미지 호버 시작 핸들러 */
  onImageHoverEnter: (productId: string) => void;
  /** 이미지 호버 종료 핸들러 */
  onImageHoverLeave: () => void;
  /** 마우스 이동 핸들러 */
  onMouseMove: (e: React.MouseEvent) => void;
  /** 상세보기 핸들러 */
  onViewDetail: (product: Product) => void;
  /** 주문하기 핸들러 */
  onOrder?: (product: Product) => void;
  /** 편집 핸들러 */
  onEdit: (product: Product) => void;
  /** 삭제 핸들러 */
  onDelete: (product: Product) => void;
}

/**
 * 상품 테이블 행 컴포넌트
 */
export function ProductTableRow({
  product,
  onImageHoverEnter,
  onImageHoverLeave,
  onMouseMove,
  onViewDetail,
  onOrder,
  onEdit,
  onDelete,
}: ProductTableRowProps) {
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-2 text-gray-900">
        {product.id}
      </td>
      <td className="px-4 py-2">
        <ProductImageCell
          imageUrl={product.mainImage}
          productName={product.name}
          onMouseEnter={() => onImageHoverEnter(product.id)}
          onMouseLeave={onImageHoverLeave}
          onMouseMove={onMouseMove}
        />
      </td>
      <td className="px-4 py-2">
        <button
          onClick={() => onViewDetail(product)}
          className="text-gray-900 text-left cursor-pointer"
        >
          {product.name}
          {product.nameChinese && (
            <span className="text-gray-600"> ({product.nameChinese})</span>
          )}
        </button>
      </td>
      <td className="px-4 py-2 text-gray-600">
        {product.category}
      </td>
      <td className="px-4 py-2 text-gray-900">
        ¥{product.price.toLocaleString()}
      </td>
      <td className="px-4 py-2 text-gray-600">
        {product.size}
        {product.size ? "cm" : ""}
      </td>
      <td className="px-4 py-2 text-gray-600">
        {product.setCount}개
      </td>
      <td className="px-4 py-2 text-gray-600">
        {product.supplier.name}
      </td>
      <td className="px-4 py-2">
        <ProductActions
          product={product}
          onOrder={onOrder}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </td>
    </tr>
  );
}

