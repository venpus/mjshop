import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { PackageSearch, Plus, Edit, Download, Trash2, Save } from 'lucide-react';
import { PackingListCreateModal, type PackingListFormData } from './PackingListCreateModal';
import { useAuth } from '../contexts/AuthContext';
import { GalleryImageModal } from './GalleryImageModal';
import { PackingListTable } from './packing-list/PackingListTable';
import { usePackingListSelection } from '../hooks/usePackingListSelection';
import { convertItemToFormData, getGroupId } from '../utils/packingListUtils';
import type { PackingListItem } from './packing-list/types';
import {
  getAllPackingLists, 
  createPackingList, 
  updatePackingList, 
  createPackingListItem, 
  deletePackingListItem, 
  getPackingListById, 
  updatePackingListItem,
  createDomesticInvoice,
  updateDomesticInvoice,
  deleteDomesticInvoice,
  createKoreaArrival,
  updateKoreaArrival,
  deleteKoreaArrival,
  deletePackingList,
} from '../api/packingListApi';
import { transformServerToClient, transformFormDataProductsToItems, transformFormDataToServerRequest, getPackingListIdFromCode } from '../utils/packingListTransform';

export function ShippingHistory() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const isSuperAdmin = user?.level === 'A-SuperAdmin';
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [packingListItems, setPackingListItems] = useState<PackingListItem[]>([]);
  const [originalPackingListItems, setOriginalPackingListItems] = useState<PackingListItem[]>([]); // 원본 데이터 (변경 감지용)
  const [selectedInvoiceImage, setSelectedInvoiceImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false); // 변경사항이 있는지 여부
  const [isSaving, setIsSaving] = useState(false); // 저장 중인지 여부
  
  // location state에서 initialPackingListData 확인 (공장→물류창고에서 전달된 데이터)
  useEffect(() => {
    const state = location.state as { initialPackingListData?: PackingListFormData } | null;
    if (state?.initialPackingListData) {
      setIsCreateModalOpen(true);
      // state를 클리어하여 다시 로드 시 중복 실행 방지
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // 선택 상태 관리 훅
  const {
    selectedCodes,
    toggleCode,
    toggleAllCodes,
    isAllSelected,
    isCodeSelected,
    clearSelection,
  } = usePackingListSelection(packingListItems);

  // 데이터 로드
  const loadPackingLists = async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('[비율 로드] 패킹리스트 로드 시작');
      const serverData = await getAllPackingLists();
      console.log('[비율 로드] 서버에서 받은 데이터 (발송일 순서):', 
        serverData.map(pl => `ID:${pl.id} Code:${pl.code} Date:${pl.shipment_date}`).join(', ')
      );
      const transformedItems = transformServerToClient(serverData);
      console.log('[비율 로드] 변환 후 정렬 확인 (발송일 순서):', 
        transformedItems.map(item => `ID:${item.id} Code:${item.code} Date:${item.date}`).join(', ')
      );
      setPackingListItems(transformedItems);
      setOriginalPackingListItems(JSON.parse(JSON.stringify(transformedItems))); // 깊은 복사로 원본 저장
      setIsDirty(false); // 로드 후 변경사항 없음
    } catch (err: any) {
      console.error('패킹리스트 로드 오류:', err);
      setError(err.message || '패킹리스트를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPackingLists();
  }, []);

  const handleProductNameClick = (purchaseOrderId?: string) => {
    if (purchaseOrderId) {
      navigate(`/admin/purchase-orders/${purchaseOrderId}`);
    }
  };

  const handleCreatePackingList = async (data: PackingListFormData) => {
    try {
      // 서버 API 형식으로 변환
      const items = transformFormDataProductsToItems(data);
      const { packingList } = transformFormDataToServerRequest(data, items);

      // 패킹리스트 생성
      const createdPackingList = await createPackingList(packingList);

      // 각 아이템 생성 (중간에 실패하면 이미 생성된 패킹리스트가 남을 수 있음)
      // 에러 발생 시 사용자에게 알림
      const createdItems: number[] = [];
      try {
        for (const item of items) {
          const createdItem = await createPackingListItem(createdPackingList.id, item);
          createdItems.push(createdItem.id);
        }
      } catch (itemError: any) {
        // 아이템 생성 중 오류 발생 시 사용자에게 알림
        console.error('패킹리스트 아이템 생성 오류:', itemError);
        alert(`패킹리스트는 생성되었지만 일부 아이템 생성에 실패했습니다: ${itemError.message || '알 수 없는 오류'}`);
        // 데이터 다시 로드하여 부분적으로 생성된 상태를 표시
        await loadPackingLists();
        setIsCreateModalOpen(false);
        return;
      }

      // 데이터 다시 로드
      await loadPackingLists();
      setIsCreateModalOpen(false);
    } catch (err: any) {
      console.error('패킹리스트 생성 오류:', err);
      alert(err.message || '패킹리스트 생성에 실패했습니다.');
    }
  };

  const handleUpdatePackingList = async (data: PackingListFormData) => {
    if (!editingCode) return;

    try {
      const packingListId = getPackingListIdFromCode(packingListItems, editingCode);
      if (!packingListId) {
        alert('패킹리스트를 찾을 수 없습니다.');
        return;
      }

      // 서버 API 형식으로 변환
      const items = transformFormDataProductsToItems(data);
      const { packingList } = transformFormDataToServerRequest(data, items);

      // 기존 패킹리스트 정보 가져오기 (아이템 ID 확인용)
      const existingPackingList = await getPackingListById(packingListId);
      if (!existingPackingList) {
        alert('패킹리스트를 찾을 수 없습니다.');
        return;
      }

      // 패킹리스트 메인 정보 업데이트
      await updatePackingList(packingListId, packingList);

      // 기존 아이템 삭제
      // 참고: 내륙송장은 packing_list_id에 연결되어 있어 아이템 삭제와 무관하게 유지됩니다.
      // 한국도착일은 packing_list_item_id에 연결되어 있어 아이템 삭제 시 CASCADE로 삭제됩니다.
      if (existingPackingList.items) {
        for (const item of existingPackingList.items) {
          await deletePackingListItem(item.id);
        }
      }

      // 새로운 아이템 생성 (중간에 실패하면 이미 삭제된 아이템이 복구되지 않을 수 있음)
      // 에러 발생 시 사용자에게 알림
      try {
        for (const item of items) {
          await createPackingListItem(packingListId, item);
        }
      } catch (itemError: any) {
        // 아이템 생성 중 오류 발생 시 사용자에게 알림
        console.error('패킹리스트 아이템 생성 오류:', itemError);
        alert(`패킹리스트 정보는 업데이트되었지만 일부 아이템 생성에 실패했습니다: ${itemError.message || '알 수 없는 오류'}\n데이터를 다시 로드합니다.`);
        // 데이터 다시 로드
        await loadPackingLists();
        return;
      }

      // 데이터 다시 로드
      await loadPackingLists();
      setIsEditModalOpen(false);
      setEditingCode(null);
      clearSelection();
    } catch (err: any) {
      console.error('패킹리스트 수정 오류:', err);
      alert(err.message || '패킹리스트 수정에 실패했습니다.');
    }
  };

  // 최신 상태를 참조하기 위한 ref
  const itemsRef = useRef<PackingListItem[]>([]);
  useEffect(() => {
    itemsRef.current = packingListItems;
  }, [packingListItems]);

  // 변경사항 감지 (원본 데이터와 비교)
  const checkForChanges = useCallback(() => {
    const hasChanges = JSON.stringify(packingListItems) !== JSON.stringify(originalPackingListItems);
    setIsDirty(hasChanges);
  }, [packingListItems, originalPackingListItems]);

  // packingListItems 변경 시 변경사항 감지
  useEffect(() => {
    if (originalPackingListItems.length > 0) {
      checkForChanges();
    }
  }, [packingListItems, originalPackingListItems, checkForChanges]);

  // 내륙송장 변경 핸들러 (로컬 상태만 업데이트, 저장은 저장 버튼으로)
  const handleDomesticInvoiceChange = useCallback((groupId: string, invoices: import('./packing-list/types').DomesticInvoice[]) => {
    // 로컬 상태만 업데이트 (변경사항 감지는 useEffect에서 자동으로 처리)
    setPackingListItems(prev => prev.map(item => {
      if (getGroupId(item.id) === groupId) {
        return { ...item, domesticInvoice: invoices };
      }
      return item;
    }));
  }, []);

  // 패킹리스트 삭제 핸들러
  const handleDeletePackingLists = useCallback(async () => {
    if (selectedCodes.size === 0) {
      return;
    }

    const confirmMessage = selectedCodes.size === 1
      ? `선택한 패킹리스트를 삭제하시겠습니까?\n\n삭제된 패킹리스트의 데이터는 복구할 수 없으며, 발주 관리 목록의 수량이 자동으로 업데이트됩니다.`
      : `${selectedCodes.size}개의 패킹리스트를 삭제하시겠습니까?\n\n삭제된 패킹리스트의 데이터는 복구할 수 없으며, 발주 관리 목록의 수량이 자동으로 업데이트됩니다.`;

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const codesToDelete = Array.from(selectedCodes);
      const deletePromises = codesToDelete.map(async (code) => {
        const packingListId = getPackingListIdFromCode(packingListItems, code);
        if (!packingListId) {
          console.warn(`패킹리스트 ID를 찾을 수 없습니다: ${code}`);
          return;
        }
        await deletePackingList(packingListId);
      });

      await Promise.all(deletePromises);
      
      // 선택 상태 초기화
      clearSelection();
      
      // 목록 새로고침
      await loadPackingLists();
      
      alert(selectedCodes.size === 1 
        ? '패킹리스트가 삭제되었습니다.' 
        : `${selectedCodes.size}개의 패킹리스트가 삭제되었습니다.`);
    } catch (error: any) {
      console.error('패킹리스트 삭제 오류:', error);
      alert(error.message || '패킹리스트 삭제 중 오류가 발생했습니다.');
    }
  }, [selectedCodes, packingListItems, clearSelection, loadPackingLists]);

  // 한국도착일 변경 핸들러 (로컬 상태만 업데이트, 저장은 저장 버튼으로)
  const handleKoreaArrivalChange = useCallback((groupId: string, koreaArrivalDates: Array<{ id?: number; date: string; quantity: string }>) => {
    // 로컬 상태만 업데이트 (변경사항 감지는 useEffect에서 자동으로 처리)
    setPackingListItems(prev => prev.map(item => {
      if (getGroupId(item.id) === groupId) {
        return { ...item, koreaArrivalDate: koreaArrivalDates };
      }
      return item;
    }));
  }, []);

  // 아이템 업데이트 헬퍼 함수 (로컬 상태만 업데이트, 저장은 저장 버튼으로)
  const handleItemUpdate = useCallback((groupId: string, updater: (item: PackingListItem) => PackingListItem) => {
    // 로컬 상태만 업데이트 (변경사항 감지는 useEffect에서 자동으로 처리)
    setPackingListItems(prev => {
      const updated = prev.map(item => {
        const itemGroupId = getGroupId(item.id);
        if (itemGroupId === groupId) {
          return updater(item);
        }
        return item;
      });
      // ref도 업데이트 (필요시 사용)
      itemsRef.current = updated;
      return updated;
    });
  }, []);

  // 모든 변경사항 저장
  const handleSave = useCallback(async () => {
    if (!isDirty) return;

    setIsSaving(true);
    try {
      // 그룹별로 변경사항 저장
      const groupMap = new Map<string, PackingListItem[]>();
      
      packingListItems.forEach(item => {
        const groupId = getGroupId(item.id);
        if (!groupMap.has(groupId)) {
          groupMap.set(groupId, []);
        }
        groupMap.get(groupId)!.push(item);
      });

      for (const [groupId, items] of groupMap.entries()) {
        const firstItem = items.find(item => item.isFirstRow);
        if (!firstItem) continue;

        const parts = firstItem.id.split('-');
        const packingListId = parseInt(parts[0]);
        const itemId = parseInt(parts[1]);

        if (isNaN(packingListId) || isNaN(itemId)) {
          console.error('Invalid packing list ID or item ID:', firstItem.id);
          continue;
        }

        // 패킹리스트 아이템 업데이트 (unit)
        await updatePackingListItem(itemId, {
          unit: firstItem.unit,
        });

        // 패킹리스트 메인 필드 업데이트
        // weight_ratio 처리: 빈 문자열이면 null, 그 외에는 숫자로 변환
        console.log('[비율 저장] firstItem.weightRatio:', firstItem.weightRatio, 'packingListId:', packingListId);
        let weightRatioValue: number | null | undefined = undefined;
        if (firstItem.weightRatio === '') {
          weightRatioValue = null;
          console.log('[비율 저장] 빈 문자열 → null');
        } else if (firstItem.weightRatio) {
          const numericValue = parseFloat(firstItem.weightRatio.replace('%', ''));
          weightRatioValue = isNaN(numericValue) ? null : numericValue;
          console.log('[비율 저장] 변환:', firstItem.weightRatio, '→', numericValue, '→', weightRatioValue);
        }
        // weight_ratio는 항상 업데이트해야 하므로 undefined가 아닌 값을 보장
        // undefined면 null로 설정하여 명시적으로 null로 업데이트
        if (weightRatioValue === undefined) {
          weightRatioValue = null;
          console.log('[비율 저장] undefined → null로 설정');
        }
        console.log('[비율 저장] 서버에 전송할 값:', weightRatioValue);
        
        await updatePackingList(packingListId, {
          logistics_company: firstItem.logisticsCompany || undefined,
          warehouse_arrival_date: firstItem.warehouseArrivalDate || undefined,
          actual_weight: firstItem.actualWeight ? parseFloat(firstItem.actualWeight) : undefined,
          weight_ratio: weightRatioValue,
          calculated_weight: firstItem.calculatedWeight ? parseFloat(firstItem.calculatedWeight) : undefined,
          shipping_cost: firstItem.shippingCost ? parseFloat(firstItem.shippingCost) : undefined,
          payment_date: firstItem.paymentDate || undefined,
          wk_payment_date: firstItem.wkPaymentDate || undefined,
        });
        
        console.log('[비율 저장] 서버 업데이트 완료');

        // 내륙송장 업데이트
        const currentPackingList = await getPackingListById(packingListId);
        if (currentPackingList) {
          const currentInvoices = currentPackingList.items?.[0]?.domestic_invoices || [];
          
          // 새로운 내륙송장 생성 (송장번호가 없어도 사진이 있으면 생성)
          for (const invoice of firstItem.domesticInvoice) {
            if (!invoice.id && (invoice.number.trim() || (invoice.images && invoice.images.length > 0))) {
              const created = await createDomesticInvoice(packingListId, {
                invoice_number: invoice.number || '', // 송장번호가 없으면 빈 문자열
              });
              // 로컬 상태에 id 업데이트 (저장 후 다시 로드할 예정이지만, 일관성을 위해)
              setPackingListItems(prev => prev.map(item => {
                if (getGroupId(item.id) === groupId) {
                  return {
                    ...item,
                    domesticInvoice: item.domesticInvoice.map(inv => 
                      !inv.id && inv.number === invoice.number ? { ...inv, id: created.id } : inv
                    ),
                  };
                }
                return item;
              }));
            } else if (invoice.id) {
              // 기존 내륙송장 번호 수정
              const serverInvoice = currentInvoices.find(inv => inv.id === invoice.id);
              if (serverInvoice && serverInvoice.invoice_number !== invoice.number) {
                await updateDomesticInvoice(invoice.id, {
                  invoice_number: invoice.number,
                });
              }
            }
          }

          // 삭제된 내륙송장 제거
          for (const serverInvoice of currentInvoices) {
            const existsInClient = firstItem.domesticInvoice.some(inv => inv.id === serverInvoice.id);
            if (!existsInClient) {
              await deleteDomesticInvoice(serverInvoice.id);
            }
          }

          // 한국도착일 업데이트
          for (const item of items) {
            const itemId = parseInt(item.id.split('-')[1]);
            if (isNaN(itemId)) continue;

            const currentItem = currentPackingList.items?.find(i => i.id === itemId);
            const currentKoreaArrivals = currentItem?.korea_arrivals || [];
            const koreaArrivalDates = item.koreaArrivalDate || [];

            // 새로운 한국도착일 생성
            for (const arrival of koreaArrivalDates) {
              // date와 quantity가 모두 유효한지 확인
              const trimmedQuantity = arrival.quantity?.trim() || '';
              const quantityNum = parseInt(trimmedQuantity);
              const isValidQuantity = trimmedQuantity !== '' && !isNaN(quantityNum) && quantityNum > 0;
              
              if (!arrival.id && arrival.date && isValidQuantity) {
                await createKoreaArrival(itemId, {
                  arrival_date: arrival.date,
                  quantity: quantityNum,
                });
              } else if (arrival.id && arrival.date && isValidQuantity) {
                // 기존 한국도착일 업데이트
                await updateKoreaArrival(arrival.id, {
                  arrival_date: arrival.date,
                  quantity: quantityNum,
                });
              }
            }

            // 삭제된 한국도착일 제거
            for (const serverArrival of currentKoreaArrivals) {
              const existsInClient = koreaArrivalDates.some(arr => arr.id === serverArrival.id);
              if (!existsInClient) {
                await deleteKoreaArrival(serverArrival.id);
              }
            }
          }
        }
      }

      // 데이터 다시 로드하여 DB에 저장된 최신 값 반영
      await loadPackingLists();
      
      alert('변경사항이 저장되었습니다.');
    } catch (error: any) {
      console.error('패킹리스트 저장 오류:', error);
      alert(error.message || '변경사항 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  }, [isDirty, packingListItems, loadPackingLists]);

  return (
    <div className="p-8">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center shadow-md">
              <PackageSearch className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-gray-900">패킹리스트</h2>
          </div>
          <div className="flex items-center gap-2">
            {selectedCodes.size > 0 && (
              <>
                <button
                  onClick={() => {
                    const firstCode = Array.from(selectedCodes)[0];
                    const itemsToEdit = packingListItems.filter(item => item.code === firstCode);
                    
                    if (itemsToEdit.length === 0) {
                      alert('수정할 항목을 찾을 수 없습니다.');
                      return;
                    }

                    const formData = convertItemToFormData(itemsToEdit);
                    if (!formData) {
                      alert('데이터 변환에 실패했습니다.');
                      return;
                    }

                    setEditingCode(firstCode);
                    setIsEditModalOpen(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  수정하기
                </button>
                <button
                  onClick={() => {
                    // TODO: 내보내기 기능 구현
                    alert(`${selectedCodes.size}개의 항목을 내보냅니다.`);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  내보내기
                </button>
                <button
                  onClick={handleDeletePackingLists}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  삭제
                </button>
              </>
            )}
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              패킹 리스트 생성
            </button>
            <button
              onClick={handleSave}
              disabled={!isDirty || isSaving}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                isDirty && !isSaving
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Save className="w-4 h-4" />
              {isSaving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
        <p className="text-gray-600">발송된 상품의 패킹 정보를 확인할 수 있습니다</p>
      </div>

      {/* 패킹 리스트 생성 모달 */}
      <PackingListCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreatePackingList}
        initialData={(location.state as { initialPackingListData?: PackingListFormData } | null)?.initialPackingListData}
        mode="create"
      />

      {/* 패킹 리스트 수정 모달 */}
      {editingCode && (() => {
        const itemsToEdit = packingListItems.filter(item => item.code === editingCode);
        const formData = convertItemToFormData(itemsToEdit);
        return (
          <PackingListCreateModal
            isOpen={isEditModalOpen}
            onClose={() => {
              setIsEditModalOpen(false);
              setEditingCode(null);
            }}
            onSubmit={handleUpdatePackingList}
            initialData={formData || undefined}
            mode="edit"
          />
        );
      })()}

      {/* 이미지 모달 */}
      <GalleryImageModal
        imageUrl={selectedInvoiceImage}
        onClose={() => setSelectedInvoiceImage(null)}
      />

      {/* 에러 메시지 */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* 패킹 리스트 테이블 */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">로딩 중...</div>
        </div>
      ) : (
        <PackingListTable
          items={packingListItems}
          isSuperAdmin={isSuperAdmin}
          isAllSelected={isAllSelected}
          onToggleAll={toggleAllCodes}
          onToggleCode={toggleCode}
          isCodeSelected={isCodeSelected}
          onItemUpdate={handleItemUpdate}
          onDomesticInvoiceChange={handleDomesticInvoiceChange}
          onKoreaArrivalChange={handleKoreaArrivalChange}
          onProductNameClick={handleProductNameClick}
          onImageClick={setSelectedInvoiceImage}
        />
      )}
    </div>
  );
}