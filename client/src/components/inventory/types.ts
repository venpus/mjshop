export interface InboundItem {
  id: string;
  arrivalDate: string;
  productImage: string;
  productName: string;
  purchaseOrderId: string | null;
  logisticsCompany: string;
  smallPackCount: number;
  setCount: number;
  boxCount: number;
  orderedQuantity: number;
  unshippedQuantity: number;
  inboundQuantity: number;
  remainingStock: number;
  productId?: string;
}

export interface InboundGroup {
  groupKey: string;
  purchaseOrderId: string | null;
  productName: string;
  productImage: string;
  smallPackCount: number;
  setCount: number;
  boxCount: number;
  orderedQuantity: number;
  remainingStock: number;
  productId?: string;
  arrivals: InboundItem[];
}

export interface InventoryProduct {
  id: string;
  name: string;
  price: number;
  stock: number;
  main_image: string | null;
  small_pack_count?: number;
  set_count?: number;
  box_count?: number;
}

export interface InventoryPurchaseOrder {
  id: string;
  po_number?: string;
  product_main_image: string | null;
  expected_final_unit_price?: number | null;
  order_unit_price?: number | null;
  unit_price?: number;
  product_id?: string | null;
}

/** 재고 관리 목록 행 */
export interface InventoryListItem {
  id: string;
  groupKey: string;
  productName: string;
  productImage: string;
  purchaseOrderId: string | null;
  poNumber?: string;
  unitPrice: number | null;
  inboundQuantity: number;
  sellingPrice: number | null;
  stockQuantity: number;
  productId?: string;
}
