/// <reference types="vite/client" />
import { useState, useEffect } from "react";
import {
  Plus,
} from "lucide-react";
import { ProductForm, ProductFormDataWithFiles } from "./ProductForm";
import { ProductDetailModal } from "./ProductDetailModal";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { SearchBar } from "./ui/search-bar";
import { TablePagination } from "./ui/table-pagination";
import { ProductCard } from "./products/ProductCard";
import { ProductFilter, ProductFilterData } from "./ui/ProductFilter";
import { PurchaseOrderForm, PurchaseOrderFormData } from "./PurchaseOrderForm";
import { useAuth } from "../contexts/AuthContext";

interface Product {
  id: string;
  name: string;
  nameChinese?: string;
  price: number;
  logisticsCost: number;
  finalUnitCost: number | null;
  hasTag: boolean;
  stock: number;
  status: "판매중" | "품절" | "숨김";
  size: string;
  packagingSize: string;
  weight: string;
  setCount: number;
  smallPackCount: number;
  boxCount: number;
  reorderMoq: number | null;
  deliveryDays: number | null;
  tagAddonEnabled: boolean;
  tagAddonPrice: number | null;
  packagingAddonEnabled: boolean;
  packagingAddonPrice: number | null;
  laborCost: number;
  mainImage: string;
  images: string[];
  createdAt?: string | Date;
}

function appendProductFormFields(formDataToSend: FormData, formData: ProductFormDataWithFiles) {
  formDataToSend.append('price', formData.price === "" ? "0" : formData.price.toString());
  formDataToSend.append(
    'logisticsCost',
    formData.logisticsCost === "" ? "0" : formData.logisticsCost.toString()
  );
  formDataToSend.append('hasTag', formData.hasTag ? '1' : '0');
  formDataToSend.append('stock', formData.stock === "" ? "0" : formData.stock.toString());
  formDataToSend.append('packagingSize', formData.packagingSize || '');
  formDataToSend.append(
    'reorderMoq',
    formData.reorderMoq === "" ? '' : formData.reorderMoq.toString()
  );
  formDataToSend.append(
    'deliveryDays',
    formData.deliveryDays === "" ? '' : formData.deliveryDays.toString()
  );
  formDataToSend.append('tagAddonEnabled', formData.tagAddonEnabled ? '1' : '0');
  formDataToSend.append(
    'tagAddonPrice',
    formData.tagAddonEnabled && formData.tagAddonPrice !== ""
      ? formData.tagAddonPrice.toString()
      : ''
  );
  formDataToSend.append(
    'packagingAddonEnabled',
    formData.packagingAddonEnabled ? '1' : '0'
  );
  formDataToSend.append(
    'packagingAddonPrice',
    formData.packagingAddonEnabled && formData.packagingAddonPrice !== ""
      ? formData.packagingAddonPrice.toString()
      : ''
  );
  formDataToSend.append(
    'laborCost',
    formData.laborCost === "" ? "0" : formData.laborCost.toString()
  );
}

function mapApiProductToClient(p: Record<string, unknown>, getFullImageUrl: (url: string | null | undefined) => string): Product {
  const mainImageUrl = getFullImageUrl(p.main_image as string | null);
  return {
    id: String(p.id),
    name: String(p.name),
    nameChinese: p.name_chinese ? String(p.name_chinese) : undefined,
    price: Number(p.price) || 0,
    logisticsCost: Number(p.logistics_cost) || 0,
    finalUnitCost: p.final_unit_cost != null ? Number(p.final_unit_cost) : null,
    hasTag: Boolean(p.has_tag),
    stock: Number(p.stock) || 0,
    status: p.status as Product['status'],
    size: p.size ? String(p.size) : '',
    packagingSize: p.packaging_size ? String(p.packaging_size) : '',
    weight: p.weight ? String(p.weight) : '',
    setCount: Number(p.set_count) || 1,
    smallPackCount: Number(p.small_pack_count) || 1,
    boxCount: Number(p.box_count) || 1,
    reorderMoq: p.reorder_moq != null ? Number(p.reorder_moq) : null,
    deliveryDays: p.delivery_days != null ? Number(p.delivery_days) : null,
    tagAddonEnabled: Boolean(p.tag_addon_enabled),
    tagAddonPrice: p.tag_addon_price != null ? Number(p.tag_addon_price) : null,
    packagingAddonEnabled: Boolean(p.packaging_addon_enabled),
    packagingAddonPrice:
      p.packaging_addon_price != null ? Number(p.packaging_addon_price) : null,
    laborCost: Number(p.labor_cost) || 0,
    mainImage: mainImageUrl,
    images: ((p.images as string[]) || []).map((img) => getFullImageUrl(img)),
    createdAt: p.created_at as string | Date | undefined,
  };
}

function collectProductImageUrls(
  product: Product,
  getFullImageUrl: (url: string | null | undefined) => string
): string[] {
  const urls: string[] = [];
  if (product.mainImage) {
    urls.push(getFullImageUrl(product.mainImage));
  }
  for (const img of product.images) {
    const full = getFullImageUrl(img);
    if (!urls.some((existing) => existing === full || existing.endsWith(img) || full.endsWith(img))) {
      urls.push(full);
    }
  }
  return urls;
}

function mapProductToFormInitial(product: Product, getFullImageUrl: (url: string | null | undefined) => string) {
  return {
    price: product.price,
    logisticsCost: product.logisticsCost,
    hasTag: product.hasTag,
    stock: product.stock,
    size: product.size || '',
    packagingSize: product.packagingSize || '',
    setCount: product.setCount,
    weight: product.weight || '',
    reorderMoq: product.reorderMoq ?? '',
    deliveryDays: product.deliveryDays ?? '',
    tagAddonEnabled: product.tagAddonEnabled,
    tagAddonPrice: product.tagAddonPrice ?? '',
    packagingAddonEnabled: product.packagingAddonEnabled,
    packagingAddonPrice: product.packagingAddonPrice ?? '',
    laborCost: product.laborCost,
    existingImageUrls: collectProductImageUrls(product, getFullImageUrl),
  };
}

interface ProductsProps {
  onNavigateToPurchaseOrder?: (orderId: string) => void;
}

export function Products({ onNavigateToPurchaseOrder }: ProductsProps = {}) {
  const { user } = useAuth();
  const canAccessProducts =
    user?.level === 'A-SuperAdmin' || user?.level === 'S: Admin';

  if (!canAccessProducts) {
    return null;
  }

  const [products, setProducts] =
    useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<ProductFilterData>({});
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(16);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">(
    "create",
  );
  const [editingProduct, setEditingProduct] =
    useState<Product | null>(null);
  const [detailProduct, setDetailProduct] =
    useState<Product | null>(null);
  const [deleteProduct, setDeleteProduct] =
    useState<Product | null>(null);
  const [isPurchaseOrderFormOpen, setIsPurchaseOrderFormOpen] = useState(false);
  const [selectedProductForOrder, setSelectedProductForOrder] =
    useState<Product | null>(null);

  const filteredProducts = products.filter(
    (product) => {
      // 검색어 필터
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = product.id.toLowerCase().includes(searchLower);

      if (!matchesSearch) return false;

      // 가격 필터
      if (filter.priceMin !== undefined && product.price < filter.priceMin) return false;
      if (filter.priceMax !== undefined && product.price > filter.priceMax) return false;

      // 크기 필터 (size는 문자열이므로 숫자로 파싱 필요)
      if (filter.sizeMin !== undefined || filter.sizeMax !== undefined) {
        // size는 "30x20x15cm" 같은 형식이므로 첫 번째 숫자만 추출하거나,
        // 전체 문자열에서 숫자들을 추출해서 평균을 낼 수도 있습니다.
        // 여기서는 첫 번째 숫자를 크기로 간주합니다.
        const sizeMatch = product.size.match(/(\d+(?:\.\d+)?)/);
        const sizeValue = sizeMatch ? parseFloat(sizeMatch[1]) : null;
        if (sizeValue !== null) {
          if (filter.sizeMin !== undefined && sizeValue < filter.sizeMin) return false;
          if (filter.sizeMax !== undefined && sizeValue > filter.sizeMax) return false;
        } else {
          // 크기 정보가 없는데 필터가 설정된 경우 제외
          if (filter.sizeMin !== undefined || filter.sizeMax !== undefined) return false;
        }
      }

      // 무게 필터
      if (filter.weightMin !== undefined || filter.weightMax !== undefined) {
        const weightValue = product.weight ? parseFloat(product.weight) : null;
        if (weightValue !== null) {
          if (filter.weightMin !== undefined && weightValue < filter.weightMin) return false;
          if (filter.weightMax !== undefined && weightValue > filter.weightMax) return false;
        } else {
          // 무게 정보가 없는데 필터가 설정된 경우 제외
          if (filter.weightMin !== undefined || filter.weightMax !== undefined) return false;
        }
      }

      // 세트 모델수 필터
      if (filter.setCount !== undefined && product.setCount !== filter.setCount) return false;

      return true;
    }
  );

  // Pagination calculations
  const totalPages = Math.ceil(
    filteredProducts.length / itemsPerPage,
  );
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProducts = filteredProducts.slice(
    startIndex,
    endIndex,
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // 필터 또는 검색어 변경 시 첫 페이지로 리셋
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchTerm]);

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
  const SERVER_BASE_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

  // 이미지 URL을 전체 URL로 변환하는 헬퍼 함수 (캐시 버스팅 포함)
  const getFullImageUrl = (imageUrl: string | null | undefined): string => {
    if (!imageUrl) return '';
    
    let fullUrl: string;
    // 이미 전체 URL인 경우 그대로 반환
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      fullUrl = imageUrl;
    } else {
      // 상대 경로인 경우 서버 베이스 URL 추가
      fullUrl = `${SERVER_BASE_URL}${imageUrl}`;
    }
    
    // 캐시 버스팅: 이미 쿼리 파라미터가 있으면 추가하지 않음
    if (!fullUrl.includes('?')) {
      const cacheBuster = Math.floor(Date.now() / (1000 * 60 * 60 * 24)); // 일 단위
      return `${fullUrl}?v=${cacheBuster}`;
    }
    
    return fullUrl;
  };

  const handleSaveProduct = async (formData: ProductFormDataWithFiles) => {
    try {
      if (formMode === "edit" && editingProduct) {
        // 상품 수정 - FormData로 전송 (이미지 포함)
        const formDataToSend = new FormData();
        appendProductFormFields(formDataToSend, formData);
        formDataToSend.append('size', formData.size || '');
        formDataToSend.append('setCount', formData.setCount.toString());
        if (formData.weight) formDataToSend.append('weight', formData.weight);

        if (formData.existingImageUrls && formData.existingImageUrls.length > 0) {
          formDataToSend.append('existingImageUrls', JSON.stringify(formData.existingImageUrls));
        }

        if (formData.images && formData.images.length > 0) {
          formData.images.forEach((file) => {
            formDataToSend.append('images', file);
          });
        }

        const response = await fetch(`${API_BASE_URL}/products/${editingProduct.id}`, {
          method: 'PUT',
          body: formDataToSend,
          credentials: 'include',
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || '상품 수정에 실패했습니다.');
        }

        const data = await response.json();
        if (data.success) {
          alert("상품이 성공적으로 수정되었습니다.");
          await loadProducts();
          setEditingProduct(null);
          setIsFormOpen(false);
        } else {
          throw new Error('상품 수정에 실패했습니다.');
        }
      } else {
        // Create new product
        const formDataToSend = new FormData();

        appendProductFormFields(formDataToSend, formData);
        formDataToSend.append('size', formData.size || '');
        formDataToSend.append('setCount', formData.setCount.toString());
        if (formData.weight) {
          formDataToSend.append('weight', formData.weight);
        }

        if (formData.images && formData.images.length > 0) {
          formData.images.forEach((file) => {
            formDataToSend.append('images', file);
          });
        }

        const response = await fetch(`${API_BASE_URL}/products`, {
          method: 'POST',
          credentials: 'include',
          body: formDataToSend,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || '상품 생성에 실패했습니다.');
        }

        const data = await response.json();
        if (data.success) {
          // 성공 후 목록 다시 로드
          await loadProducts();
          setIsFormOpen(false);
        } else {
          throw new Error('상품 생성에 실패했습니다.');
        }
      }
    } catch (err: any) {
      alert(err.message || '상품 저장 중 오류가 발생했습니다.');
      console.error('상품 저장 오류:', err);
    }
  };

  const loadProducts = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/products`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '상품 목록을 불러오는데 실패했습니다.');
      }

      const data = await response.json();
      if (data.success && data.data) {
        // 서버 응답을 클라이언트 Product 인터페이스로 변환
        const convertedProducts: Product[] = data.data.map((p: Record<string, unknown>) =>
          mapApiProductToClient(p, getFullImageUrl)
        );
        setProducts(convertedProducts);
      }
    } catch (err: any) {
      console.error('상품 로드 오류:', err);
      alert(err.message || '상품 목록을 불러오는 중 오류가 발생했습니다.');
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleEditProduct = async (product: Product) => {
    try {
      // 상품 상세 정보 가져오기 (이미지 포함)
      const response = await fetch(`${API_BASE_URL}/products/${product.id}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('상품 정보를 불러오는데 실패했습니다.');
      }
      
      const data = await response.json();
      if (data.success && data.data) {
        const fullProduct = mapApiProductToClient(data.data, getFullImageUrl);
        setEditingProduct(fullProduct);
        setFormMode("edit");
        setIsFormOpen(true);
      } else {
        throw new Error('상품 정보를 불러오는데 실패했습니다.');
      }
    } catch (err: any) {
      alert(err.message || '상품 정보를 불러오는 중 오류가 발생했습니다.');
      console.error('상품 정보 로드 오류:', err);
    }
  };

  const handleDeleteProduct = (product: Product) => {
    setDeleteProduct(product);
  };

  const handleConfirmDelete = async () => {
    if (!deleteProduct) return;

    try {
      const response = await fetch(`${API_BASE_URL}/products/${deleteProduct.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '상품 삭제에 실패했습니다.');
      }

      await response.json();
      
      // 성공 메시지 표시
      alert('상품이 성공적으로 삭제되었습니다.');
      
      // 목록 새로고침
      await loadProducts();
      
      // 다이얼로그 닫기
      setDeleteProduct(null);
    } catch (err: any) {
      alert(err.message || '상품 삭제 중 오류가 발생했습니다.');
      console.error('상품 삭제 오류:', err);
    }
  };

  const handleOpenCreateForm = () => {
    setEditingProduct(null);
    setFormMode("create");
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingProduct(null);
    setFormMode("create");
  };

  const handleCreatePurchaseOrder = (product: Product) => {
    setSelectedProductForOrder(product);
    setIsPurchaseOrderFormOpen(true);
  };

  const handleClosePurchaseOrderForm = () => {
    setIsPurchaseOrderFormOpen(false);
    setSelectedProductForOrder(null);
  };

  const handleSavePurchaseOrder = async (formData: PurchaseOrderFormData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/purchase-orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          ...formData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "발주 생성에 실패했습니다.");
      }

      const data = await response.json();
      if (data.success && data.data) {
        alert("발주가 성공적으로 생성되었습니다.");
        setIsPurchaseOrderFormOpen(false);
        setSelectedProductForOrder(null);
        // 발주 상세 페이지로 이동
        if (onNavigateToPurchaseOrder && data.data.id) {
          onNavigateToPurchaseOrder(data.data.id);
        }
      }
    } catch (err: any) {
      alert(err.message || "발주 생성 중 오류가 발생했습니다.");
      console.error("발주 생성 오류:", err);
    }
  };

  return (
    <div className="p-8 min-h-[1080px]">
      <div className="mb-6">
        <h2 className="text-gray-900 mb-2">상품 관리</h2>
        <p className="text-gray-600">
          등록된 상품을 관리하고 수정할 수 있습니다
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="flex gap-2 flex-1">
          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="상품 ID로 검색..."
          />
          <ProductFilter
            filter={filter}
            onChange={setFilter}
            onReset={() => setFilter({})}
            isOpen={isFilterOpen}
            onToggle={() => setIsFilterOpen(!isFilterOpen)}
          />
        </div>
        <button
          onClick={handleOpenCreateForm}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>상품 등록</span>
        </button>
      </div>

      {/* Products Card Grid */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {currentProducts.length === 0 ? (
          <div className="py-16 px-6 text-center text-gray-500">
            {filteredProducts.length === 0 && products.length > 0
              ? '검색·필터 조건에 맞는 상품이 없습니다.'
              : '등록된 상품이 없습니다. 상품 등록 버튼으로 추가해 주세요.'}
          </div>
        ) : (
          <div className="p-4 sm:p-5">
            <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3 sm:gap-4">
              {currentProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onViewDetail={setDetailProduct}
                  onOrder={handleCreatePurchaseOrder}
                  onEdit={handleEditProduct}
                  onDelete={handleDeleteProduct}
                />
              ))}
            </div>
          </div>
        )}

        {/* Pagination */}
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          totalItems={filteredProducts.length}
          startIndex={startIndex}
          endIndex={endIndex}
          onPageChange={handlePageChange}
          onItemsPerPageChange={handleItemsPerPageChange}
        />
      </div>

      {/* Product Form Modal */}
      {isFormOpen && (
        <ProductForm
          onClose={handleCloseForm}
          onSave={handleSaveProduct}
          mode={formMode}
          initialData={
            editingProduct
              ? mapProductToFormInitial(editingProduct, getFullImageUrl)
              : undefined
          }
        />
      )}

      {/* Product Detail Modal */}
      {detailProduct && (
        <ProductDetailModal
          product={detailProduct}
          onClose={() => setDetailProduct(null)}
        />
      )}

          {/* Delete Confirm Dialog */}
          {deleteProduct && (
            <DeleteConfirmDialog
              product={deleteProduct}
              onCancel={() => setDeleteProduct(null)}
              onConfirm={handleConfirmDelete}
            />
          )}

          {/* Purchase Order Form Modal */}
          {isPurchaseOrderFormOpen && (
            <PurchaseOrderForm
              onClose={handleClosePurchaseOrderForm}
              onSave={handleSavePurchaseOrder}
            />
          )}
        </div>
      );
    }
