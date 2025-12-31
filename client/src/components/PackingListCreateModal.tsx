import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Search } from 'lucide-react';
import { PurchaseOrderSearchModal } from './PurchaseOrderSearchModal';
import type { PurchaseOrderWithUnshipped } from '../api/purchaseOrderApi';

interface PackingListCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PackingListFormData) => void;
  initialData?: PackingListFormData; // 수정 모드용 초기 데이터
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
  mode = 'create',
}: PackingListCreateModalProps) {
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
  }, [isOpen, initialData]);

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
      alert('최소 하나의 제품을 추가해주세요.');
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
            {mode === 'edit' ? '패킹 리스트 수정' : '패킹 리스트 생성'}
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
                날짜
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
                코드
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                maxLength={6}
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                placeholder="코드"
                required
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap w-16">
                물류회사
              </label>
              <select
                value={formData.logisticsCompany}
                onChange={(e) => setFormData({ ...formData, logisticsCompany: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-sm"
              >
                <option value="">선택하세요</option>
                <option value="위해-한사장">위해-한사장</option>
                <option value="광저우-비전">광저우-비전</option>
                <option value="위해-비전">위해-비전</option>
                <option value="정상해운">정상해운</option>
              </select>
            </div>
          </div>

          {/* 제품 그룹 목록 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                제품 정보
              </label>
              <button
                type="button"
                onClick={addProductGroup}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
              >
                <Plus className="w-4 h-4" />
                제품 추가
              </button>
            </div>

            {formData.products.length === 0 ? (
              <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-300 rounded-lg">
                <p>제품을 추가해주세요</p>
              </div>
            ) : (
              formData.products.map((product, index) => (
                <div key={product.id} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700">제품 {index + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeProductGroup(product.id)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="제품 삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>삭제</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {/* 제품명 */}
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-600 whitespace-nowrap w-16">제품명</label>
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          type="text"
                          value={product.productName || ''}
                          onChange={(e) => updateProductGroup(product.id, 'productName', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                          placeholder="제품명을 입력하세요"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => handleOpenSearchModal(index)}
                          className="flex items-center gap-1.5 px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm whitespace-nowrap"
                        >
                          <Search className="w-4 h-4" />
                          검색
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
                        수량 계산 (종 × 수량 × 세트 = 몇개)
                      </label>
                      <div className="grid grid-cols-5 gap-2">
                        <div>
                          <input
                            type="number"
                            value={product.kind || ''}
                            onChange={(e) => updateProductGroup(product.id, 'kind', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                            placeholder="종"
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
                            placeholder="수량"
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
                            placeholder="세트"
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
                            placeholder="몇개 (자동 계산)"
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
                  중량
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
                    <span className="text-sm text-gray-700">개별 중량</span>
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
                    <span className="text-sm text-gray-700">합산 중량</span>
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
                placeholder="개수"
                min="0"
                step="1"
              />
              <select
                value={formData.boxType}
                onChange={(e) => setFormData({ ...formData, boxType: e.target.value as '박스' | '마대' })}
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white text-sm"
              >
                <option value="박스">박스</option>
                <option value="마대">마대</option>
              </select>
              <input
                type="text"
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                placeholder="중량을 입력하세요 (예: 50g, 1.2kg)"
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
              취소
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              {mode === 'edit' ? '수정' : '생성'}
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

