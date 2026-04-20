import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Package, Calendar, Truck, MapPin, Weight, Plus, Trash2, Save } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getPackingListById } from '../api/packingListApi';
import {
  getSweetTrackerInvoicesByPackingListCode,
  parsePackingListCodesInput,
  patchSweetTrackerInvoicePackingListCodes,
  postSweetTrackerBulkDeliveryCompleted,
  type SweetTrackerCachedInvoiceItem,
} from '../api/sweetTrackerApi';
import type { PackingListWithItems } from '../api/packingListApi';
import { SweetTrackerCachedInvoicesTable } from './sweet-tracker/SweetTrackerCachedInvoicesTable';
import { SweetTrackerPackingListPickerModal } from './sweet-tracker/SweetTrackerPackingListPickerModal';
import { ProductImagePreview } from './ui/product-image-preview';
import { GalleryImageModal } from './GalleryImageModal';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const MAX_PACKING_LIST_CODES = 40;

function sameStringArrayOrder(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

type OverseasInvoice = {
  id?: number;
  tempId?: string;
  invoice_number: string;
  status: '출발대기' | '배송중' | '도착완료';
  inspection_quantity: number;
};

interface PackingListDetailProps {
  packingListId: number;
  onClose: () => void;
  onCloseRequest?: () => boolean; // 변경사항 확인용 (true면 닫기 허용, false면 닫기 취소)
}

export function PackingListDetail({ packingListId, onClose, onCloseRequest }: PackingListDetailProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  
  // A레벨, C0 레벨, D0 레벨만 접근 가능
  const isD0Level = user?.level === 'D0: 비전 담당자';
  const isC0Level = user?.level === 'C0: 한국Admin';
  const canAccess = user?.level === 'A-SuperAdmin' || isC0Level || isD0Level;
  
  const [packingList, setPackingList] = useState<PackingListWithItems | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [repackagingRequirements, setRepackagingRequirements] = useState('');
  const [originalRepackagingRequirements, setOriginalRepackagingRequirements] = useState('');
  const [overseasInvoices, setOverseasInvoices] = useState<OverseasInvoice[]>([]);
  const [originalOverseasInvoices, setOriginalOverseasInvoices] = useState<OverseasInvoice[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [hoveredImageUrl, setHoveredImageUrl] = useState<string | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [relatedTrackingItems, setRelatedTrackingItems] = useState<SweetTrackerCachedInvoiceItem[]>([]);
  const [relatedTrackingLoading, setRelatedTrackingLoading] = useState(false);
  const [relatedTrackingError, setRelatedTrackingError] = useState<string | null>(null);
  const [relatedBusyInvoiceNo, setRelatedBusyInvoiceNo] = useState<string | null>(null);
  const [relatedPackingDraftByInvoice, setRelatedPackingDraftByInvoice] = useState<Record<string, string>>({});
  const [relatedPickerInvoiceNo, setRelatedPickerInvoiceNo] = useState<string | null>(null);
  const [relatedPickerInitialCodes, setRelatedPickerInitialCodes] = useState<string[]>([]);

  const relatedItemsRef = useRef(relatedTrackingItems);
  relatedItemsRef.current = relatedTrackingItems;
  const relatedLatestPackingTextRef = useRef<Record<string, string>>({});
  const relatedPackingDebounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const relatedPackingSaveGenRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (!canAccess) {
      setError('접근 권한이 없습니다.');
      setIsLoading(false);
      return;
    }

    if (!packingListId) {
      setError('패킹리스트 ID가 없습니다.');
      setIsLoading(false);
      return;
    }

    const loadPackingList = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getPackingListById(packingListId);
        if (!data) {
          setError('패킹리스트를 찾을 수 없습니다.');
        } else {
          setPackingList(data);
          // 재포장 요구사항 로드
          const repackagingReq = (data as any).repackaging_requirements || '';
          setRepackagingRequirements(repackagingReq);
          setOriginalRepackagingRequirements(repackagingReq);
          
          // 해외송장 로드
          let invoices: OverseasInvoice[] = [];
          if ((data as any).overseas_invoices) {
            invoices = (data as any).overseas_invoices;
          } else {
            // 박스수만큼 기본 행 생성
            const totalBoxCount = data.items.reduce((sum, item) => sum + item.box_count, 0);
            if (totalBoxCount > 0) {
              invoices = Array.from({ length: totalBoxCount }, () => ({
                tempId: `temp-${Date.now()}-${Math.random()}`,
                invoice_number: '',
                status: '출발대기' as const,
                inspection_quantity: 0,
              }));
            }
          }
          setOverseasInvoices(invoices);
          setOriginalOverseasInvoices(JSON.parse(JSON.stringify(invoices))); // 깊은 복사
          setIsDirty(false);
        }
      } catch (err: any) {
        console.error('패킹리스트 로드 오류:', err);
        setError(err.message || '패킹리스트를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    loadPackingList();
  }, [packingListId, canAccess]);

  useEffect(() => {
    const timers = relatedPackingDebounceRef.current;
    return () => {
      for (const k of Object.keys(timers)) {
        clearTimeout(timers[k]!);
        delete timers[k];
      }
    };
  }, []);

  useEffect(() => {
    if (!canAccess || !user?.id || !packingList?.code?.trim()) {
      setRelatedTrackingItems([]);
      setRelatedTrackingError(null);
      setRelatedTrackingLoading(false);
      return;
    }

    let cancelled = false;
    const code = packingList.code.trim();

    (async () => {
      setRelatedTrackingLoading(true);
      setRelatedTrackingError(null);
      try {
        const rows = await getSweetTrackerInvoicesByPackingListCode(user.id, code);
        if (!cancelled) setRelatedTrackingItems(rows);
      } catch (err: unknown) {
        if (!cancelled) {
          setRelatedTrackingItems([]);
          setRelatedTrackingError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) setRelatedTrackingLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [canAccess, user?.id, packingList?.code]);

  const flushRelatedPackingAutosave = useCallback(
    async (invoiceNo: string) => {
      const row = relatedItemsRef.current.find((x) => x.invoiceNo === invoiceNo);
      const raw = relatedLatestPackingTextRef.current[invoiceNo] ?? '';
      const codes = parsePackingListCodesInput(raw);
      if (codes.length > MAX_PACKING_LIST_CODES) {
        setRelatedTrackingError(
          t('sweetTracker.cacheList.packingCodesTooMany').replace('{max}', String(MAX_PACKING_LIST_CODES))
        );
        return;
      }
      const prevCodes = row?.packingListCodes ?? [];
      if (sameStringArrayOrder(codes, prevCodes)) {
        setRelatedPackingDraftByInvoice((prev) => {
          if (prev[invoiceNo] === undefined) return prev;
          const next = { ...prev };
          delete next[invoiceNo];
          return next;
        });
        return;
      }

      relatedPackingSaveGenRef.current[invoiceNo] = (relatedPackingSaveGenRef.current[invoiceNo] ?? 0) + 1;
      const gen = relatedPackingSaveGenRef.current[invoiceNo];

      setRelatedTrackingError(null);
      try {
        await patchSweetTrackerInvoicePackingListCodes(user?.id, invoiceNo, codes);
        if (relatedPackingSaveGenRef.current[invoiceNo] !== gen) return;

        setRelatedTrackingItems((prev) =>
          prev.map((it) => (it.invoiceNo === invoiceNo ? { ...it, packingListCodes: codes } : it))
        );
        setRelatedPackingDraftByInvoice((prev) => {
          const draft = prev[invoiceNo];
          if (draft === undefined) return prev;
          const draftCodes = parsePackingListCodesInput(draft);
          if (sameStringArrayOrder(draftCodes, codes)) {
            const next = { ...prev };
            delete next[invoiceNo];
            return next;
          }
          return prev;
        });
      } catch (e) {
        if (relatedPackingSaveGenRef.current[invoiceNo] === gen) {
          setRelatedTrackingError(e instanceof Error ? e.message : String(e));
        }
      }
    },
    [user?.id, t]
  );

  const openRelatedPackingPicker = useCallback(
    (invoiceNo: string) => {
      const row = relatedTrackingItems.find((i) => i.invoiceNo === invoiceNo);
      const draftText = relatedPackingDraftByInvoice[invoiceNo];
      const text =
        draftText !== undefined
          ? draftText
          : row?.packingListCodes?.length
            ? row.packingListCodes.join(', ')
            : '';
      setRelatedPickerInitialCodes(parsePackingListCodesInput(text));
      setRelatedPickerInvoiceNo(invoiceNo);
    },
    [relatedTrackingItems, relatedPackingDraftByInvoice]
  );

  const closeRelatedPackingPicker = useCallback(() => setRelatedPickerInvoiceNo(null), []);

  const applyRelatedPackingPickerSelection = useCallback(
    async (codes: string[]) => {
      const inv = relatedPickerInvoiceNo;
      if (!inv) return;
      const joined = codes.join(', ');
      relatedLatestPackingTextRef.current[inv] = joined;
      setRelatedPackingDraftByInvoice((prev) => ({ ...prev, [inv]: joined }));
      const tid = relatedPackingDebounceRef.current[inv];
      if (tid) clearTimeout(tid);
      delete relatedPackingDebounceRef.current[inv];
      await flushRelatedPackingAutosave(inv);
    },
    [relatedPickerInvoiceNo, flushRelatedPackingAutosave]
  );

  const handleRelatedLookupOne = useCallback(
    async (invoiceNo: string) => {
      setRelatedBusyInvoiceNo(invoiceNo);
      setRelatedTrackingError(null);
      try {
        await postSweetTrackerBulkDeliveryCompleted(user?.id, [invoiceNo]);
        if (!user?.id || !packingList?.code?.trim()) return;
        const rows = await getSweetTrackerInvoicesByPackingListCode(user.id, packingList.code.trim());
        setRelatedTrackingItems(rows);
      } catch (e) {
        setRelatedTrackingError(e instanceof Error ? e.message : String(e));
      } finally {
        setRelatedBusyInvoiceNo(null);
      }
    },
    [user?.id, packingList?.code]
  );

  // 변경사항 감지
  useEffect(() => {
    const hasRepackagingChanges = repackagingRequirements !== originalRepackagingRequirements;
    const hasInvoiceChanges = JSON.stringify(overseasInvoices) !== JSON.stringify(originalOverseasInvoices);
    setIsDirty(hasRepackagingChanges || hasInvoiceChanges);
  }, [repackagingRequirements, originalRepackagingRequirements, overseasInvoices, originalOverseasInvoices]);

  // 안전한 닫기 함수 (변경사항이 있을 때 확인)
  const handleClose = useCallback(() => {
    if (isDirty) {
      const confirmed = window.confirm(
        '저장하지 않은 변경사항이 있습니다. 정말로 닫으시겠습니까?\n\n변경사항은 저장되지 않습니다.'
      );
      if (!confirmed) {
        return; // 닫기 취소
      }
    }
    // onCloseRequest가 있으면 확인
    if (onCloseRequest && !onCloseRequest()) {
      return; // 닫기 취소
    }
    onClose();
  }, [isDirty, onClose, onCloseRequest]);

  // 재포장 요구사항 저장
  const handleSaveRepackagingRequirements = async () => {
    if (!packingListId) return;
    try {
      const response = await fetch(`${API_BASE_URL}/packing-lists/${packingListId}/repackaging-requirements`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ repackaging_requirements: repackagingRequirements }),
      });
      if (!response.ok) {
        throw new Error('재포장 요구사항 저장에 실패했습니다.');
      }
      // 저장 성공 시 원본 데이터 업데이트
      setOriginalRepackagingRequirements(repackagingRequirements);
    } catch (err: any) {
      console.error('재포장 요구사항 저장 오류:', err);
      alert(err.message || '재포장 요구사항 저장 중 오류가 발생했습니다.');
    }
  };

  // 해외송장 추가
  const handleAddOverseasInvoice = () => {
    setOverseasInvoices([
      ...overseasInvoices,
      {
        tempId: `temp-${Date.now()}-${Math.random()}`,
        invoice_number: '',
        status: '출발대기',
        inspection_quantity: 0,
      },
    ]);
  };

  // 해외송장 업데이트
  const handleUpdateOverseasInvoice = (index: number, field: string, value: any) => {
    setOverseasInvoices(prev => prev.map((invoice, i) => 
      i === index ? { ...invoice, [field]: value } : invoice
    ));
  };

  // 해외송장 삭제
  const handleRemoveOverseasInvoice = (index: number) => {
    setOverseasInvoices(prev => prev.filter((_, i) => i !== index));
  };

  // 해외송장 저장
  const handleSaveOverseasInvoices = async () => {
    if (!packingListId) return;
    try {
      setIsSaving(true);
      const response = await fetch(`${API_BASE_URL}/packing-lists/${packingListId}/overseas-invoices`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ overseas_invoices: overseasInvoices }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '해외송장 저장에 실패했습니다.');
      }
      const result = await response.json();
      if (result.success) {
        // 저장된 데이터로 업데이트 (tempId 제거)
        const savedInvoices = result.data.map((invoice: any) => ({
          id: invoice.id,
          invoice_number: invoice.invoice_number,
          status: invoice.status,
          inspection_quantity: invoice.inspection_quantity,
        }));
        setOverseasInvoices(savedInvoices);
        setOriginalOverseasInvoices(JSON.parse(JSON.stringify(savedInvoices))); // 깊은 복사
        alert('해외송장이 저장되었습니다.');
      } else {
        throw new Error(result.error || '해외송장 저장에 실패했습니다.');
      }
    } catch (err: any) {
      console.error('해외송장 저장 오류:', err);
      alert(err.message || '해외송장 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!canAccess) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          접근 권한이 없습니다. A레벨, C0 레벨 또는 D0 레벨 관리자만 이 페이지에 접근할 수 있습니다.
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center text-gray-500">로딩 중...</div>
      </div>
    );
  }

  if (error || !packingList) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error || '패킹리스트를 찾을 수 없습니다.'}
        </div>
        <button
          onClick={handleClose}
          className="mt-4 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
        >
          닫기
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* 헤더 */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">패킹리스트 상세</h1>
            <p className="text-sm text-gray-600">코드: {packingList.code}</p>
          </div>
        </div>
        <button
          onClick={handleClose}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="닫기"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* 기본 정보와 내륙송장/재포장 요구사항을 같은 행에 배치 */}
      <div className="flex gap-6 mb-6">
        {/* 기본 정보 (좌측, 좁은 너비) */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex-shrink-0" style={{ width: '400px' }}>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">기본 정보</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div>
                <div className="text-sm text-gray-500">발송일</div>
                <div className="text-base font-medium text-gray-900">{packingList.shipment_date}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-gray-400" />
              <div>
                <div className="text-sm text-gray-500">물류회사</div>
                <div className="text-base font-medium text-gray-900">{packingList.logistics_company || '-'}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-gray-400" />
              <div>
                <div className="text-sm text-gray-500">물류창고 도착일</div>
                <div className="text-base font-medium text-gray-900">{packingList.warehouse_arrival_date || '-'}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Weight className="w-5 h-5 text-gray-400" />
              <div>
                <div className="text-sm text-gray-500">실중량</div>
                <div className="text-base font-medium text-gray-900">{packingList.actual_weight ? `${packingList.actual_weight}kg` : '-'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* 내륙송장 및 재포장 요구사항 (우측, 넓은 너비) */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex-1">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">내륙송장</h2>
          {packingList.items && packingList.items.some(item => item.domestic_invoices && item.domestic_invoices.length > 0) ? (
            <div className="space-y-4">
              {packingList.items.map((item) => (
                item.domestic_invoices && item.domestic_invoices.length > 0 && (
                  <div key={item.id} className="border-b border-gray-200 pb-4 last:border-b-0 last:pb-0">
                    <div className="text-base font-medium text-gray-900 mb-2">{item.product_name}</div>
                    <div className="space-y-2">
                      {item.domestic_invoices.map((invoice) => (
                        <div key={invoice.id} className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-gray-400" />
                          <span className="text-base text-gray-700">송장번호: {invoice.invoice_number}</span>
                          {invoice.images && invoice.images.length > 0 && (
                            <span className="text-sm text-gray-500">({invoice.images.length}장)</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-4 text-base">내륙송장이 없습니다.</div>
          )}
          
          {/* 재포장 요구사항 */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">재포장 요구사항</h3>
            <textarea
              value={repackagingRequirements}
              onChange={(e) => setRepackagingRequirements(e.target.value)}
              onBlur={handleSaveRepackagingRequirements}
              placeholder="재포장 요구사항을 입력하세요..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
              rows={4}
            />
          </div>
        </div>
      </div>

      {/* 아이템 목록 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">제품 목록</h2>
        {packingList.items && packingList.items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 uppercase">제품명</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 uppercase">입수량</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 uppercase">박스수</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 uppercase">단위</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 uppercase">총수량</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 uppercase">한국도착일</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {packingList.items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {item.product_image_url && (() => {
                          const imageUrl = item.product_image_url.startsWith('http') 
                            ? item.product_image_url 
                            : `${API_BASE_URL.replace('/api', '')}${item.product_image_url}`;
                          return (
                            <div className="relative">
                              <img
                                src={imageUrl}
                                alt={item.product_name}
                                className="w-16 h-16 object-cover rounded border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
                                onMouseEnter={(e) => {
                                  setHoveredImageUrl(imageUrl);
                                  setMousePosition({ x: e.clientX, y: e.clientY });
                                }}
                                onMouseMove={(e) => {
                                  setMousePosition({ x: e.clientX, y: e.clientY });
                                }}
                                onMouseLeave={() => {
                                  setHoveredImageUrl(null);
                                }}
                                onClick={() => {
                                  setSelectedImageUrl(imageUrl);
                                }}
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            </div>
                          );
                        })()}
                        <div>
                          <div className="text-base font-medium text-gray-900">{item.product_name}</div>
                          {item.purchase_order_id && (
                            <div className="text-sm text-gray-500">발주 ID: {item.purchase_order_id}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-base text-gray-900">{item.entry_quantity || '-'}</td>
                    <td className="px-4 py-3 text-center text-base text-gray-900">{item.box_count}</td>
                    <td className="px-4 py-3 text-center text-base text-gray-900">{item.unit}</td>
                    <td className="px-4 py-3 text-center text-base text-gray-900">{item.total_quantity.toLocaleString()}개</td>
                    <td className="px-4 py-3 text-center text-base text-gray-900">
                      {item.korea_arrivals && item.korea_arrivals.length > 0 ? (
                        <div className="space-y-1">
                          {item.korea_arrivals.map((arrival, idx) => (
                            <div key={arrival.id || idx}>
                              {arrival.arrival_date} ({arrival.quantity}개)
                            </div>
                          ))}
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center text-gray-500 py-8">제품이 없습니다.</div>
        )}
      </div>

      {/* 해외송장 영역 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">해외송장</h2>
          <button
            onClick={handleAddOverseasInvoice}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            추가
          </button>
        </div>

        {packingList.code ? (
          <div className="mb-5 rounded-lg border border-gray-200 bg-gray-50/80 p-4">
            <h3 className="text-sm font-semibold text-gray-800">
              {t('sweetTracker.cacheList.relatedInPackingTitle')}
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              {t('sweetTracker.cacheList.relatedInPackingDesc').replace('{code}', packingList.code)}
            </p>
            {relatedTrackingLoading && (
              <p className="mt-2 text-sm text-gray-600">{t('sweetTracker.cacheList.relatedInPackingLoading')}</p>
            )}
            {relatedTrackingError && !relatedTrackingLoading && (
              <p className="mt-2 text-sm text-red-600" role="alert">
                {relatedTrackingError}
              </p>
            )}
            {!relatedTrackingLoading && !relatedTrackingError && relatedTrackingItems.length === 0 && (
              <p className="mt-2 text-sm text-gray-600">{t('sweetTracker.cacheList.relatedInPackingEmpty')}</p>
            )}
            <SweetTrackerCachedInvoicesTable
              t={t}
              userId={user?.id}
              items={relatedTrackingItems}
              busyInvoiceNo={relatedBusyInvoiceNo}
              onLookupOne={handleRelatedLookupOne}
              listLoading={relatedTrackingLoading}
              packingDraftByInvoice={relatedPackingDraftByInvoice}
              onOpenPackingPicker={openRelatedPackingPicker}
              wrapperClassName="mt-3 overflow-x-auto rounded-lg border border-gray-200 bg-white"
            />
          </div>
        ) : null}
        
        {overseasInvoices.length === 0 ? (
          <div className="text-center text-gray-500 py-8 text-base">해외송장이 없습니다.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 uppercase">해외송장</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 uppercase">상태</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 uppercase">검수수량</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 uppercase">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {overseasInvoices.map((invoice, index) => (
                  <tr key={invoice.tempId || invoice.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={invoice.invoice_number}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9A-Za-z]/g, '').slice(0, 16);
                          handleUpdateOverseasInvoice(index, 'invoice_number', value);
                        }}
                        placeholder="16자리 해외송장 번호"
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                        maxLength={16}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={invoice.status}
                        onChange={(e) => handleUpdateOverseasInvoice(index, 'status', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                      >
                        <option value="출발대기">출발대기</option>
                        <option value="배송중">배송중</option>
                        <option value="도착완료">도착완료</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={invoice.inspection_quantity}
                        onChange={(e) => handleUpdateOverseasInvoice(index, 'inspection_quantity', parseInt(e.target.value) || 0)}
                        placeholder="검수수량"
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-base text-center"
                        min="0"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleRemoveOverseasInvoice(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleSaveOverseasInvoices}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 text-base"
          >
            <Save className="w-4 h-4" />
            {isSaving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>

      <SweetTrackerPackingListPickerModal
        isOpen={relatedPickerInvoiceNo !== null}
        initialCodes={relatedPickerInitialCodes}
        onClose={closeRelatedPackingPicker}
        onApply={applyRelatedPackingPickerSelection}
      />

      {/* 이미지 마우스오버 미리보기 */}
      <ProductImagePreview
        imageUrl={hoveredImageUrl || ''}
        productName=""
        mousePosition={mousePosition}
        isVisible={!!hoveredImageUrl && !selectedImageUrl}
        size={256}
      />

      {/* 이미지 클릭 모달 */}
      <GalleryImageModal
        imageUrl={selectedImageUrl}
        onClose={() => setSelectedImageUrl(null)}
      />
    </div>
  );
}


