import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Package, Plus, X } from 'lucide-react';
import { ProductForm, type ProductFormDataWithFiles } from '../ProductForm';
import { DeleteConfirmDialog } from '../DeleteConfirmDialog';
import { SearchBar } from '../ui/search-bar';
import { TablePagination } from '../ui/table-pagination';
import { ProductCard } from './ProductCard';
import { ProductKindFilterBar } from './ProductKindFilterBar';
import {
  createCatalogProduct,
  deleteCatalogProduct,
  fetchCatalogProductById,
  fetchCatalogProducts,
  mapProductToFormInitial,
  matchesProductKindFilter,
  updateCatalogProduct,
  type CatalogProduct,
  type ProductKind,
  type ProductKindFilter,
} from '../../utils/productApiHelpers';

interface ProductManagementModalProps {
  onClose: () => void;
}

export function ProductManagementModal({ onClose }: ProductManagementModalProps) {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [kindFilter, setKindFilter] = useState<ProductKindFilter>('all_active');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(16);
  const [editingProduct, setEditingProduct] = useState<CatalogProduct | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteProduct, setDeleteProduct] = useState<CatalogProduct | null>(null);

  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchCatalogProducts();
      setProducts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '상품 목록을 불러오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isFormOpen && !deleteProduct) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose, isFormOpen, deleteProduct]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, kindFilter]);

  const kindFilterCounts = useMemo(() => {
    const counts: Partial<Record<ProductKindFilter, number>> = {
      all_active: 0,
      판매가능: 0,
      재고조사: 0,
      예약판매: 0,
      판매완료: 0,
    };
    for (const product of products) {
      if (product.productKind !== '판매완료') counts.all_active!++;
      counts[product.productKind]!++;
    }
    return counts;
  }, [products]);

  const handleEditProduct = async (product: CatalogProduct) => {
    try {
      const fullProduct = await fetchCatalogProductById(product.id);
      setEditingProduct(fullProduct);
      setFormMode('edit');
      setIsFormOpen(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : '상품 정보를 불러오는 중 오류가 발생했습니다.');
    }
  };

  const handleOpenCreateForm = () => {
    setEditingProduct(null);
    setFormMode('create');
    setIsFormOpen(true);
  };

  const handleDeleteProduct = (product: CatalogProduct) => {
    setDeleteProduct(product);
  };

  const handleAdCopySaved = (productId: string, adCopy: string) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, adCopy } : p))
    );
  };

  const handleMemoSaved = (productId: string, memo: string) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, memo } : p))
    );
  };

  const handleMainImageChanged = (productId: string, mainImage: string) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, mainImage } : p))
    );
  };

  const handleConfirmDelete = async () => {
    if (!deleteProduct) return;

    try {
      await deleteCatalogProduct(deleteProduct.id);
      alert('상품이 성공적으로 삭제되었습니다.');
      setDeleteProduct(null);
      await loadProducts();
    } catch (err) {
      alert(err instanceof Error ? err.message : '상품 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleSaveProduct = async (formData: ProductFormDataWithFiles) => {
    try {
      if (formMode === 'edit' && editingProduct) {
        const payload =
          editingProduct.productKind === '판매완료'
            ? { ...formData, productKind: '판매완료' as ProductKind }
            : formData;
        await updateCatalogProduct(editingProduct.id, payload);
        alert('상품이 성공적으로 수정되었습니다.');
      } else {
        await createCatalogProduct(formData);
        alert('상품이 성공적으로 등록되었습니다.');
      }
      setIsFormOpen(false);
      setEditingProduct(null);
      setFormMode('create');
      void loadProducts();
    } catch (err) {
      alert(err instanceof Error ? err.message : '상품 저장 중 오류가 발생했습니다.');
      throw err;
    }
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingProduct(null);
    setFormMode('create');
  };

  const handleProductKindChanged = (productId: string, productKind: ProductKind) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, productKind } : p))
    );
  };

  const filteredProducts = products.filter((product) => {
    if (!product.id.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return matchesProductKindFilter(product.productKind, kindFilter);
  });

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  return (
    <>
      <div
        className="fixed inset-0 z-50 overflow-y-auto p-4 bg-black/50"
        onClick={onClose}
      >
        <div className="flex min-h-full items-center justify-center py-4">
        <div
          className="bg-white rounded-xl shadow-2xl w-full max-w-6xl flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-orange-600 bg-orange-500 text-white shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <Package className="w-5 h-5 shrink-0 stroke-[2.5]" />
              <h3 className="text-lg font-bold text-white truncate">상품 관리</h3>
              {!isLoading && (
                <span className="text-base font-semibold text-white shrink-0">
                  ({filteredProducts.length}건)
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-white hover:bg-orange-600 transition-colors shrink-0"
              aria-label="닫기"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-6 py-4 border-b border-gray-100 shrink-0 space-y-3">
            <ProductKindFilterBar
              value={kindFilter}
              onChange={setKindFilter}
              counts={kindFilterCounts}
            />
            <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 min-w-0">
              <SearchBar
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="상품 ID로 검색..."
                focusRingClass="focus:ring-purple-500"
              />
            </div>
            <button
              type="button"
              onClick={handleOpenCreateForm}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-semibold shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>상품 등록</span>
            </button>
            </div>
          </div>

          <div>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500 mb-3" />
                <p>상품 목록을 불러오는 중...</p>
              </div>
            ) : error ? (
              <div className="p-6">
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              </div>
            ) : currentProducts.length === 0 ? (
              <div className="py-20 px-6 text-center text-gray-500">
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
                      onEdit={handleEditProduct}
                      onDelete={handleDeleteProduct}
                      onAdCopySaved={handleAdCopySaved}
                      onMemoSaved={handleMemoSaved}
                      onMainImageChanged={handleMainImageChanged}
                      onProductKindChanged={handleProductKindChanged}
                      showSaleCompletedCheckbox
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {!isLoading && !error && filteredProducts.length > 0 && (
            <div className="border-t border-gray-200 shrink-0">
              <TablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                itemsPerPage={itemsPerPage}
                totalItems={filteredProducts.length}
                startIndex={startIndex}
                endIndex={endIndex}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={(value) => {
                  setItemsPerPage(value);
                  setCurrentPage(1);
                }}
                itemsPerPageOptions={[8, 16, 24, 32]}
              />
            </div>
          )}
        </div>
        </div>
      </div>

      {isFormOpen && (
        <ProductForm
          onClose={handleCloseForm}
          onSave={handleSaveProduct}
          mode={formMode}
          initialData={
            formMode === 'edit' && editingProduct
              ? mapProductToFormInitial(editingProduct)
              : undefined
          }
        />
      )}

      {deleteProduct && (
        <DeleteConfirmDialog
          product={{
            id: deleteProduct.id,
            name: deleteProduct.name || deleteProduct.id,
            category: '',
            price: deleteProduct.price,
            stock: deleteProduct.stock,
            status: deleteProduct.status,
            size: deleteProduct.size,
            weight: deleteProduct.weight,
            setCount: deleteProduct.setCount,
            smallPackCount: deleteProduct.smallPackCount,
            boxCount: deleteProduct.boxCount,
          }}
          onConfirm={() => void handleConfirmDelete()}
          onCancel={() => setDeleteProduct(null)}
        />
      )}
    </>
  );
}
