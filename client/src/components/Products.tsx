/// <reference types="vite/client" />
import { useState, useEffect } from "react";
import {
  Plus,
} from "lucide-react";
import { ProductForm, ProductFormDataWithFiles } from "./ProductForm";
import { ProductDetailModal } from "./ProductDetailModal";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { ProductImagePreview } from "./ui/product-image-preview";
import { SearchBar } from "./ui/search-bar";
import { TablePagination } from "./ui/table-pagination";
import { ProductTableRow } from "./products/ProductTableRow";
import { ProductFilter, ProductFilterData } from "./ui/ProductFilter";
import { PurchaseOrderForm, PurchaseOrderFormData } from "./PurchaseOrderForm";
import { useAuth } from "../contexts/AuthContext";

interface Product {
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
  createdAt?: string | Date;
}

interface ProductsProps {
  onNavigateToPurchaseOrder?: (orderId: string) => void;
}

export function Products({ onNavigateToPurchaseOrder }: ProductsProps = {}) {
  const { user } = useAuth();
  const isSuperAdmin = user?.level === 'A-SuperAdmin';
  
  // 레벨 A가 아니면 아무것도 렌더링하지 않음
  if (!isSuperAdmin) {
    return null;
  }

  const [products, setProducts] =
    useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<ProductFilterData>({});
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [hoveredProduct, setHoveredProduct] = useState<
    string | null
  >(null);
  const [mousePosition, setMousePosition] = useState({
    x: 0,
    y: 0,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
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
      const matchesSearch = 
        product.id.toLowerCase().includes(searchLower) ||
        product.name.toLowerCase().includes(searchLower) ||
        (product.nameChinese && product.nameChinese.toLowerCase().includes(searchLower)) ||
        product.category.toLowerCase().includes(searchLower);

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

      // 카테고리 필터
      if (filter.category && product.category !== filter.category) return false;

      return true;
    }
  );

  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePosition({ x: e.clientX, y: e.clientY });
  };

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

  // 이미지 URL을 전체 URL로 변환하는 헬퍼 함수
  const getFullImageUrl = (imageUrl: string | null | undefined): string => {
    if (!imageUrl) return '';
    // 이미 전체 URL인 경우 그대로 반환
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    // 상대 경로인 경우 서버 베이스 URL 추가
    return `${SERVER_BASE_URL}${imageUrl}`;
  };

  const handleSaveProduct = async (formData: ProductFormDataWithFiles) => {
    try {
      if (formMode === "edit" && editingProduct) {
        // 상품 수정 - FormData로 전송 (이미지 포함)
        const formDataToSend = new FormData();
        formDataToSend.append('name', formData.name);
        if (formData.nameChinese) formDataToSend.append('nameChinese', formData.nameChinese);
        formDataToSend.append('category', formData.category);
        formDataToSend.append('price', formData.price === "" ? "0" : formData.price.toString());
        formDataToSend.append('size', formData.size || '');
        formDataToSend.append('setCount', formData.setCount.toString());
        if (formData.weight) formDataToSend.append('weight', formData.weight);

        // 공급상 정보 추가
        if (formData.supplier?.name) {
          formDataToSend.append('supplierName', formData.supplier.name);
        }
        if (formData.supplier?.url) {
          formDataToSend.append('supplierUrl', formData.supplier.url);
        }

        // 기존 이미지 정보 (삭제되지 않은 이미지들)
        // FormData에서 배열은 배열로 파싱되지 않으므로 JSON 문자열로 변환
        if (formData.existingMainImageUrl) {
          formDataToSend.append('existingMainImageUrl', formData.existingMainImageUrl);
        }
        if (formData.existingInfoImageUrls && formData.existingInfoImageUrls.length > 0) {
          formDataToSend.append('existingInfoImageUrls', JSON.stringify(formData.existingInfoImageUrls));
        }
        
        // 새로 업로드한 이미지 파일 추가
        if (formData.mainImage) {
          formDataToSend.append('mainImage', formData.mainImage);
        }
        if (formData.infoImages && formData.infoImages.length > 0) {
          formData.infoImages.forEach((file) => {
            formDataToSend.append('infoImages', file);
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
        
        // 기본 데이터 추가
        formDataToSend.append('name', formData.name);
        if (formData.nameChinese) {
          formDataToSend.append('nameChinese', formData.nameChinese);
        }
        formDataToSend.append('category', formData.category);
        formDataToSend.append('price', formData.price === "" ? "0" : formData.price.toString());
        formDataToSend.append('size', formData.size || '');
        formDataToSend.append('setCount', formData.setCount.toString());
        if (formData.weight) {
          formDataToSend.append('weight', formData.weight);
        }
        
        // 공급상 정보 추가
        if (formData.supplier?.name) {
          formDataToSend.append('supplierName', formData.supplier.name);
        }
        if (formData.supplier?.url) {
          formDataToSend.append('supplierUrl', formData.supplier.url);
        }
        
        // 이미지 파일 추가
        if (formData.mainImage) {
          formDataToSend.append('mainImage', formData.mainImage);
        }
        if (formData.infoImages && formData.infoImages.length > 0) {
          formData.infoImages.forEach((file) => {
            formDataToSend.append('infoImages', file);
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
        const convertedProducts: Product[] = data.data.map((p: any) => {
          const mainImageUrl = getFullImageUrl(p.main_image);
          console.log('상품:', p.id, '원본 main_image:', p.main_image, '변환된 URL:', mainImageUrl);
          return {
            id: p.id,
            name: p.name,
            nameChinese: p.name_chinese || undefined,
            category: p.category,
            price: p.price,
            stock: p.stock,
            status: p.status,
            size: p.size || '',
            packagingSize: p.packaging_size || '',
            weight: p.weight || '',
            setCount: p.set_count,
            smallPackCount: p.small_pack_count,
            boxCount: p.box_count,
            mainImage: mainImageUrl,
            images: (p.images || []).map((img: string) => getFullImageUrl(img)),
            supplier: p.supplier || { name: '', url: '' },
            createdAt: p.created_at,
          };
        });
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
        const fullProduct = data.data;
        setEditingProduct({
          id: fullProduct.id,
          name: fullProduct.name,
          nameChinese: fullProduct.name_chinese || '',
          category: fullProduct.category,
          price: fullProduct.price,
          stock: fullProduct.stock,
          status: fullProduct.status,
          size: fullProduct.size || '',
          packagingSize: fullProduct.packaging_size || '',
          weight: fullProduct.weight || '',
          setCount: fullProduct.set_count,
          smallPackCount: fullProduct.small_pack_count,
          boxCount: fullProduct.box_count,
          mainImage: fullProduct.main_image ? getFullImageUrl(fullProduct.main_image) : '',
          images: Array.isArray(fullProduct.images) ? fullProduct.images.map(getFullImageUrl) : [],
          supplier: fullProduct.supplier || { name: '', url: '' },
          createdAt: fullProduct.created_at,
        });
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
            placeholder="상품 ID, 상품명, 카테고리로 검색..."
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

      {/* Products Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-base font-semibold text-gray-700 whitespace-nowrap">
                  등록일
                </th>
                <th className="px-4 py-3 text-left text-base font-semibold text-gray-700 whitespace-nowrap">
                  상품 ID
                </th>
                <th className="px-4 py-3 text-left text-base font-semibold text-gray-700 whitespace-nowrap">
                  사진
                </th>
                <th className="px-4 py-3 text-left text-base font-semibold text-gray-700 whitespace-nowrap">
                  상품명
                </th>
                <th className="px-4 py-3 text-left text-base font-semibold text-gray-700 whitespace-nowrap">
                  카테고리
                </th>
                <th className="px-4 py-3 text-left text-base font-semibold text-gray-700 whitespace-nowrap">
                  단가
                </th>
                <th className="px-4 py-3 text-left text-base font-semibold text-gray-700 whitespace-nowrap">
                  사이즈
                </th>
                <th className="px-4 py-3 text-left text-base font-semibold text-gray-700 whitespace-nowrap">
                  세트 모델수
                </th>
                <th className="px-4 py-3 text-left text-base font-semibold text-gray-700 whitespace-nowrap">
                  공급상
                </th>
                <th className="px-4 py-3 text-left text-base font-semibold text-gray-700 whitespace-nowrap">
                  관리
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentProducts.map((product) => (
                <ProductTableRow
                  key={product.id}
                  product={product}
                  onImageHoverEnter={(id) => setHoveredProduct(id)}
                  onImageHoverLeave={() => setHoveredProduct(null)}
                  onMouseMove={handleMouseMove}
                  onViewDetail={setDetailProduct}
                  onOrder={handleCreatePurchaseOrder}
                  onEdit={handleEditProduct}
                  onDelete={handleDeleteProduct}
                />
              ))}
            </tbody>
          </table>
        </div>

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

      {/* Image Preview Overlay */}
      {hoveredProduct && (() => {
        const product = products.find((p) => p.id === hoveredProduct);
        return (
          <ProductImagePreview
            imageUrl={product?.mainImage}
            productName={product?.name}
            mousePosition={mousePosition}
            isVisible={!!hoveredProduct}
          />
        );
      })()}

      {/* Product Form Modal */}
      {isFormOpen && (
        <ProductForm
          onClose={handleCloseForm}
          onSave={handleSaveProduct}
          mode={formMode}
          initialData={
            editingProduct
              ? {
                  name: editingProduct.name,
                  nameChinese: (editingProduct as any).name_chinese || editingProduct.nameChinese,
                  category: editingProduct.category,
                  price: editingProduct.price,
                  size: editingProduct.size || "",
                  setCount: (editingProduct as any).set_count || editingProduct.setCount,
                  weight: editingProduct.weight || "",
                  supplier: editingProduct.supplier,
                  existingMainImageUrl: (editingProduct as any).main_image ? getFullImageUrl((editingProduct as any).main_image) : (editingProduct.mainImage ? getFullImageUrl(editingProduct.mainImage) : undefined),
                  existingInfoImageUrls: editingProduct.images 
                    ? editingProduct.images
                        .filter((img: string) => img !== ((editingProduct as any).main_image || editingProduct.mainImage))
                        .map((img: string) => getFullImageUrl(img))
                    : [],
                }
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
