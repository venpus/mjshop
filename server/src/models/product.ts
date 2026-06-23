// 상품 타입 정의

export type ProductStatus = '판매중' | '품절' | '숨김';
export type ProductCategory = '봉제' | '키링' | '피규어' | '잡화';

export interface Product {
  id: string;
  name: string;
  name_chinese: string | null;
  category: ProductCategory;
  price: number;
  logistics_cost: number;
  final_unit_cost: number | null;
  has_tag: boolean;
  stock: number;
  status: ProductStatus;
  size: string | null;
  packaging_size: string | null;
  weight: string | null;
  set_count: number;
  small_pack_count: number;
  box_count: number;
  reorder_moq: number | null;
  delivery_days: number | null;
  delivery_date: string | null;
  tag_addon_enabled: boolean;
  tag_addon_price: number | null;
  packaging_addon_enabled: boolean;
  packaging_addon_price: number | null;
  labor_cost: number;
  ad_copy: string | null;
  main_image: string | null;
  supplier_id: number | null;
  created_at: Date;
  updated_at: Date;
  created_by: string | null;
  updated_by: string | null;
}

// 클라이언트에 전달할 때 공급업체 정보 포함
export interface ProductPublic extends Product {
  supplier?: {
    id: number;
    name: string;
    url: string | null;
  };
  images?: string[]; // 추가 이미지 배열
}

export interface ProductCostFields {
  price: number;
  logistics_cost?: number;
  final_unit_cost?: number | null;
  has_tag?: boolean;
  tag_addon_enabled?: boolean;
  tag_addon_price?: number | null;
  packaging_addon_enabled?: boolean;
  packaging_addon_price?: number | null;
  labor_cost?: number;
}

// 상품 생성 시 사용하는 DTO
export interface CreateProductDTO extends ProductCostFields {
  name: string;
  name_chinese?: string;
  category: ProductCategory;
  stock?: number;
  size?: string;
  packaging_size?: string;
  weight?: string;
  set_count?: number;
  small_pack_count?: number;
  box_count?: number;
  reorder_moq?: number | null;
  delivery_days?: number | null;
  delivery_date?: string | null;
  supplier_id?: number;
  created_by?: string;
}

// 상품 수정 시 사용하는 DTO
export interface UpdateProductDTO extends Partial<ProductCostFields> {
  name?: string;
  name_chinese?: string;
  category?: ProductCategory;
  stock?: number;
  status?: ProductStatus;
  size?: string;
  packaging_size?: string;
  weight?: string;
  set_count?: number;
  small_pack_count?: number;
  box_count?: number;
  reorder_moq?: number | null;
  delivery_days?: number | null;
  delivery_date?: string | null;
  ad_copy?: string | null;
  main_image?: string;
  supplier_id?: number;
  updated_by?: string;
}
