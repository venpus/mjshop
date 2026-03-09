import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Search } from 'lucide-react';
import { PurchaseOrderSearchModal } from './PurchaseOrderSearchModal';
import { useLanguage } from '../contexts/LanguageContext';
import type { PurchaseOrderWithUnshipped } from '../api/purchaseOrderApi';
import { LOGISTICS_COMPANIES } from './packing-list/types';

interface PackingListCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PackingListFormData) => void;
  initialData?: PackingListFormData; // 수정 모드용 초기 데이터
  initialPurchaseOrderId?: string; // 발주 ID (발주별 패킹리스트 생성 시 사용)
  mode?: 'create' | 'edit'; // 모달 모드 (생성 또는 수정)
}

export interface ProductGroup {
  id: string;
  productName: string;
  purchaseOrderId?: string; // 발주 ID
  purchaseOrderNumber?: string; // 발주번호 (표시용)
  productImageUrl?: string; // 제품 이미지 URL
  unshippedQuantity?: number; // 미출고 수량 (표시용)
  boxCount: string; // 박스/마대 개수
  boxType: '박스' | '마대'; // 박스 또는 마대
  weight: string; // 중량
  kind: string; // 종
  quantity: string; // 수량
  set: string; // 세트
  total: number; // 몇개 (자동 계산: 종 x 수량 x 세트)
}

export interface PackingListFormData {
  date: string;
  code: string;
  logisticsCompany: string; // 물류회사
  products: ProductGroup[];
  weight: string;
  weightType: '개별 중량' | '합산 중량'; // 중량 타입
  boxCount: string; // 박스/마대 개수
  boxType: '박스' | '마대'; // 박스 또는 마대
  isFactoryToWarehouse?: boolean; // 공장→물류창고 플래그
  warehouseArrivalDate?: string; // 물류창고 도착일 (공장→물류창고일 경우 출고일과 동일)
}

// 오늘 날짜를 YYYY-MM-DD 형식으로 반환
const getTodayDate = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function PackingListCreateModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  initialPurchaseOrderId,
  mode = 'create',
}: PackingListCreateModalProps) {
  const { t } = useLanguage();
  const [formData, setFormData] = useState<PackingListFormData>({
    date: getTodayDate(),
    code: '',
    logisticsCompany: '',
    products: [],
    weight: '',
    weightType: '개별 중량',
    boxCount: '',
    boxType: '박스',
  });
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchingProductIndex, setSearchingProductIndex] = useState<number | null>(null);

  // 모달이 열릴 때 초기 데이터 설정
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        // 초기 데이터가 있으면 사용 (수정 모드 또는 공장→물류창고에서 전달된 데이터)
        setFormData(initialData);
      } else if (initialPurchaseOrderId) {
        // 발주 ID가 있으면 발주 정보를 가져와서 자동으로 채우기
        const loadPurchaseOrder = async () => {
          try {
            const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
            const response = await fetch(`${API_BASE_URL}/purchase-orders/${initialPurchaseOrderId}`, {
              credentials: 'include',
            });
            
            if (!response.ok) {
              throw new Error(t('packing.loadOrderFailed'));
            }
            
            const result = await response.json();
            if (!result.success || !result.data) {
              throw new Error(t('packing.orderNotFound'));
            }
            
            const order = result.data;
            const unshippedQuantity = order.unshipped_quantity || order.quantity || 0;
            
            // 발주 정보로 제품 그룹 자동 생성
            const productGroup: ProductGroup = {
              id: Date.now().toString(),
              productName: order.product_name || '',
              purchaseOrderId: order.id,
              purchaseOrderNumber: order.po_number || '',
              productImageUrl: order.product_main_image || order.product?.main_image || undefined,
              unshippedQuantity: unshippedQuantity,
              boxCount: '',
              boxType: '박스',
              weight: '',
              kind: '',
              quantity: '',
              set: '',
              total: 0,
            };
            
            setFormData({
              date: getTodayDate(),
              code: '',
              logisticsCompany: '',
              products: [productGroup],
              weight: '',
              weightType: '개별 중량',
              boxCount: '',
              boxType: '박스',
            });
          } catch (error: any) {
            console.error('발주 정보 로드 오류:', error);
            alert(error.message || t('packing.loadOrderError'));
            // 오류 발생 시 기본값 사용
            setFormData({
              date: getTodayDate(),
              code: '',
              logisticsCompany: '',
              products: [],
              weight: '',
              weightType: '개별 중량',
              boxCount: '',
              boxType: '박스',
            });
          }
        };
        
        loadPurchaseOrder();
      } else {
        // 생성 모드: 기본값 사용
        setFormData({
          date: getTodayDate(),
          code: '',
          logisticsCompany: '',
          products: [],
          weight: '',
          weightType: '개별 중량',
          boxCount: '',
          boxType: '박스',
        });
      }
    }
  }, [isOpen, initialData, initialPurchaseOrderId]);

  // 종 x 수량 x 세트 = 몇개 자동 계산
  const calculateTotal = (kind: string, quantity: string, set: string): number => {
    const kindNum = parseFloat(kind) || 0;
    const quantityNum = parseFloat(quantity) || 0;
    const setNum = parseFloat(set) || 0;
    return kindNum * quantityNum * setNum;
  };

  // 제품 그룹 추가
  const addProductGroup = () => {
    const newProduct: ProductGroup = {
      id: Date.now().toString(),
      productName: '',
      boxCount: '',
      boxType: '박스',
      weight: '',
      kind: '',
      quantity: '',
      set: '',
      total: 0,
    };
    setFormData(prev => ({
      ...prev,
      products: [...prev.products, newProduct],
    }));
  };

  // 발주 검색 모달 열기
  const handleOpenSearchModal = (productIndex: number) => {
    setSearchingProductIndex(productIndex);
    setIsSearchModalOpen(true);
  };

  // 발주 선택 시 제품 정보 자동 채우기
  const handleSelectPurchaseOrder = (order: PurchaseOrderWithUnshipped) => {
    if (searchingProductIndex === null) return;

    setFormData(prev => ({
      ...prev,
      products: prev.products.map((product, index) => {
        if (index === searchingProductIndex) {
          return {
            ...product,
            productName: order.product_name,
            purchaseOrderId: order.id,
            purchaseOrderNumber: order.po_number,
            productImageUrl: order.product_main_image || undefined,
            unshippedQuantity: order.unshipped_quantity,
          };
        }
        return product;
      }),
    }));
  };

  // 제품 그룹 삭제
  const removeProductGroup = (id: string) => {
    setFormData(prev => ({
      ...prev,
      products: prev.products.filter(p => p.id !== id),
    }));
  };

  // 제품 그룹 업데이트
  const updateProductGroup = (id: string, field: keyof ProductGroup, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      products: prev.products.map(product => {
        if (product.id === id) {
          const updated = { ...product, [field]: value };
          // kind, quantity, set 중 하나가 변경되면 total 자동 계산
          if (field === 'kind' || field === 'quantity' || field === 'set') {
            updated.total = calculateTotal(
              field === 'kind' ? value as string : updated.kind,
              field === 'quantity' ? value as string : updated.quantity,
              field === 'set' ? value as string : updated.set
            );
          }
          return updated;
        }
        return product;
      }),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // 최소 하나의 제품이 있어야 함
    if (formData.products.length === 0) {
      alert(t('packing.addOneProduct'));
      return;
    }
    onSubmit(formData);
    // 폼 초기화 (날짜는 오늘 날짜로 설정)
    setFormData({
      date: getTodayDate(),
      code: '',
      logisticsCompany: '',
      products: [],
      weight: '',
      weightType: '개별 중량',
      boxCount: '',
      boxType: '박스',
    });
    onClose();
  };

  const handleClose = () => {
    // 폼 초기화 (날짜는 오늘 날짜로 설정)
    setFormData({
      date: getTodayDate(),
      code: '',
      logisticsCompany: '',
      products: [],
      weight: '',
      weightType: '개별 중량',
      boxCount: '',
      boxType: '박스',
    });
    onClose();
  };

  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {mode === 'edit' ? t('packing.editPackingList') : t('packing.createPackingList')}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* 날짜, 코드, 물류회사 */}
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap w-12">
                {t('packing.date')}
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                required
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap w-12">
                {t('packing.code')}
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                maxLength={6}
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                placeholder={t('packing.code')}
                required
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap w-16">
                {t('packing.logisticsCompany')}
              </label>
              <select
                value={formData.logisticsCompany}
                onChange={(e) => setFormData({ ...formData, logisticsCompany: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-sm"
              >
                <option value="">{t('packing.select')}</option>
                {LOGISTICS_COMPANIES.map((company) => (
                  <option key={company} value={company}>{company}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 제품 그룹 목록 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                {t('packing.productInfo')}
              </label>
              <button
                type="button"
                onClick={addProductGroup}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
              >
                <Plus className="w-4 h-4" />
                {t('packing.addProductBtn')}
              </button>
            </div>

            {formData.products.length === 0 ? (
              <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-300 rounded-lg">
                <p>{t('packing.addProduct')}</p>
              </div>
            ) : (
              formData.products.map((product, index) => (
                <div key={product.id} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700">{t('packing.productN').replace('{n}', String(index + 1))}</span>
                    <button
                      type="button"
                      onClick={() => removeProductGroup(product.id)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
                      title={t('packing.deleteProduct')}
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>{t('common.delete')}</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {/* 제품명 */}
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-600 whitespace-nowrap w-16">{t('packing.productName')}</label>
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          type="text"
                          value={product.productName || ''}
                          onChange={(e) => updateProductGroup(product.id, 'productName', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                          placeholder={t('packing.productNamePlaceholder')}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => handleOpenSearchModal(index)}
                          className="flex items-center gap-1.5 px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm whitespace-nowrap"
                        >
                          <Search className="w-4 h-4" />
                          {t('common.search')}
                        </button>
                      </div>
                      {product.purchaseOrderNumber && (
                        <span className="text-xs text-gray-500">
                          ({product.purchaseOrderNumber})
                        </span>
                      )}
                    </div>

                    {/* 종 x 수량 x 세트 = 몇개 */}
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        {t('packing.quantityCalc')}
                      </label>
                      <div className="grid grid-cols-5 gap-2">
                        <div>
                          <input
                            type="number"
                            value={product.kind || ''}
                            onChange={(e) => updateProductGroup(product.id, 'kind', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                            placeholder={t('packing.kind')}
                            min="0"
                            step="1"
                            required
                          />
                        </div>
                        <div>
                          <input
                            type="number"
                            value={product.quantity || ''}
                            onChange={(e) => updateProductGroup(product.id, 'quantity', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                            placeholder={t('packing.quantity')}
                            min="0"
                            step="1"
                            required
                          />
                        </div>
                        <div>
                          <input
                            type="number"
                            value={product.set || ''}
                            onChange={(e) => updateProductGroup(product.id, 'set', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                            placeholder={t('packing.set')}
                            min="0"
                            step="1"
                            required
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            value={product.total || 0}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed text-sm"
                            readOnly
                            disabled
                            placeholder={t('packing.countAuto')}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 중량 */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-20"></div>
              <div className="w-24"></div>
              <div className="flex items-center gap-3 flex-1">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                  {t('packing.weightLabel')}
                </label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="weightType"
                      value="개별 중량"
                      checked={formData.weightType === '개별 중량'}
                      onChange={(e) => setFormData({ ...formData, weightType: e.target.value as '개별 중량' | '합산 중량' })}
                      className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm text-gray-700">{t('packing.weightIndividual')}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="weightType"
                      value="합산 중량"
                      checked={formData.weightType === '합산 중량'}
                      onChange={(e) => setFormData({ ...formData, weightType: e.target.value as '개별 중량' | '합산 중량' })}
                      className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm text-gray-700">{t('packing.weightTotal')}</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={formData.boxCount}
                onChange={(e) => setFormData({ ...formData, boxCount: e.target.value })}
                className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                placeholder={t('packing.count')}
                min="0"
                step="1"
              />
              <select
                value={formData.boxType}
                onChange={(e) => setFormData({ ...formData, boxType: e.target.value as '박스' | '마대' })}
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-sm"
              >
                <option value="박스">{t('packing.box')}</option>
                <option value="마대">{t('packing.bag')}</option>
              </select>
              <input
                type="text"
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                placeholder={t('packing.weightPlaceholder')}
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              {mode === 'edit' ? t('common.edit') : t('packing.create')}
            </button>
          </div>
        </form>

        {/* 발주 검색 모달 */}
        <PurchaseOrderSearchModal
          isOpen={isSearchModalOpen}
          onClose={() => {
            setIsSearchModalOpen(false);
            setSearchingProductIndex(null);
          }}
          onSelect={handleSelectPurchaseOrder}
        />
      </div>
    </div>
  );
}

