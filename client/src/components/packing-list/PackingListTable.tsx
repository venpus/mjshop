import { useMemo, Fragment } from 'react';
import { getGroupId, calculateShippingCostByLogisticsCompany } from '../../utils/packingListUtils';
import type { PackingListItem, DomesticInvoice } from './types';
import { PackingListHeader } from './PackingListHeader';
import { PackingListRow } from './PackingListRow';

interface PackingListTableProps {
  items: PackingListItem[];
  isSuperAdmin: boolean;
  isAllSelected: boolean;
  onToggleAll: (checked: boolean) => void;
  onToggleCode: (code: string, date: string) => void;
  isCodeSelected: (code: string, date: string) => boolean;
  onItemUpdate: (groupId: string, updater: (item: PackingListItem) => PackingListItem) => void;
  onDomesticInvoiceChange?: (groupId: string, invoices: DomesticInvoice[]) => void;
  onKoreaArrivalChange?: (itemId: string, koreaArrivalDates: Array<{ id?: number; date: string; quantity: string }>) => void;
  onProductNameClick?: (purchaseOrderId?: string) => void;
  onImageClick?: (imageUrl: string) => void;
  showCodeLink: boolean; // A레벨과 D0 레벨만 코드 링크 표시
  onCodeClick?: (code: string, date: string) => void; // 코드 클릭 시 상세 화면으로 이동하는 핸들러
  hideSensitiveColumns: boolean; // C0 레벨, D0 레벨일 때 실중량, 비율, 중량, 배송비, 지급일, WK결제일 숨김
  isC0Level?: boolean; // C0 레벨 여부 (물류회사 읽기 전용 표시용)
  isD0Level?: boolean; // D0 레벨 여부 (물류회사 읽기 전용 표시용)
  /** 수정한 행(그룹) 아래에 표시할 저장 바 */
  lastEditedGroupId?: string | null;
  /** 체크박스로 선택한 행(그룹) 아래에 표시할 수정/삭제 바 */
  firstSelectedGroupId?: string | null;
  saveBarContent?: React.ReactNode;
  editBarContent?: React.ReactNode;
}

/**
 * 열 개수 계산 (A 등급이면 비율과 중량 열 포함, C0 레벨/D0 레벨이면 실중량/비율/중량/배송비/지급일/WK결제일 제외)
 */
function getColumnCount(isSuperAdmin: boolean, hideSensitiveColumns: boolean): number {
  let count = 19; // 기본 열 개수 (체크박스 제외)
  if (!isSuperAdmin) {
    count -= 2; // 비율과 중량 열 제외
  }
  if (hideSensitiveColumns) {
    count -= 4; // 실중량, 배송비, 지급일, WK결제일 열 제외
  }
  return count;
}

export function PackingListTable({
  items,
  isSuperAdmin,
  isAllSelected,
  onToggleAll,
  onToggleCode,
  isCodeSelected,
  onItemUpdate,
  onDomesticInvoiceChange,
  onKoreaArrivalChange,
  onProductNameClick,
  onImageClick,
  showCodeLink,
  onCodeClick,
  hideSensitiveColumns,
  isC0Level = false,
  isD0Level = false,
  lastEditedGroupId = null,
  firstSelectedGroupId = null,
  saveBarContent = null,
  editBarContent = null,
}: PackingListTableProps) {
  const colSpan = 1 + getColumnCount(isSuperAdmin, hideSensitiveColumns);
  // 그룹별로 아이템들을 나누기 (순서 유지)
  const groupedItems = useMemo(() => {
    const groups: { [key: string]: PackingListItem[] } = {};
    items.forEach(item => {
      const groupId = getGroupId(item.id);
      if (!groups[groupId]) {
        groups[groupId] = [];
      }
      groups[groupId].push(item);
    });
    return groups;
  }, [items]);

  // 원본 items의 순서를 유지하면서 렌더링할 아이템 목록 생성
  // (groupedItems는 그룹화 정보만 사용, 실제 렌더링은 원본 items 순서 유지)
  const renderItems = useMemo(() => {
    // 원본 items의 순서를 그대로 사용
    return items;
  }, [items]);

  // 아이템이 해당 그룹의 첫 번째 행인지 확인
  const isFirstRowInGroup = (item: PackingListItem): boolean => {
    if (item.isFirstRow) return true;
    const groupId = getGroupId(item.id);
    const groupItems = groupedItems[groupId] || [];
    const itemIndexInGroup = groupItems.findIndex(i => i.id === item.id);
    return itemIndexInGroup === 0;
  };

  // 아이템이 속한 그룹의 크기 반환
  const getGroupSize = (item: PackingListItem): number => {
    const groupId = getGroupId(item.id);
    const groupItems = groupedItems[groupId] || [];
    return groupItems.length;
  };

  // 핸들러 함수들
  const handleUnitChange = (groupId: string, unit: '박스' | '마대') => {
    onItemUpdate(groupId, (item) => ({ ...item, unit }));
  };

  const handleInvoiceChange = (groupId: string, invoices: DomesticInvoice[]) => {
    // 로컬 상태 업데이트 (UI 즉시 반영)
    onItemUpdate(groupId, (item) => ({ ...item, domesticInvoice: invoices }));
    // 서버에 저장은 저장 버튼으로 처리
    if (onDomesticInvoiceChange) {
      onDomesticInvoiceChange(groupId, invoices);
    }
  };

  const handleLogisticsCompanyChange = (groupId: string, logisticsCompany: string) => {
    onItemUpdate(groupId, (item) => {
      const updatedItem = { ...item, logisticsCompany };
      // 물류회사 변경 시 배송비 자동 계산
      const calculatedShippingCost = calculateShippingCostByLogisticsCompany(
        logisticsCompany,
        item.calculatedWeight,
        item.actualWeight
      );
      if (calculatedShippingCost !== '') {
        updatedItem.shippingCost = calculatedShippingCost;
      }
      return updatedItem;
    });
  };

  const handleWarehouseArrivalDateChange = (groupId: string, date: string) => {
    onItemUpdate(groupId, (item) => ({ ...item, warehouseArrivalDate: date }));
  };

  const handleKoreaArrivalChange = (itemId: string, koreaArrivalDates: Array<{ id?: number; date: string; quantity: string }>) => {
    // 로컬 상태 업데이트는 onKoreaArrivalChange에서 처리
    // 서버에 저장은 저장 버튼으로 처리
    if (onKoreaArrivalChange) {
      onKoreaArrivalChange(itemId, koreaArrivalDates);
    }
  };

  const handleActualWeightChange = (groupId: string, actualWeight: string, calculatedWeight: string) => {
    onItemUpdate(groupId, (item) => {
      const updatedItem = { ...item, actualWeight, calculatedWeight };
      // 중량 변경 시 배송비 자동 계산 (물류회사가 선택되어 있는 경우)
      if (item.logisticsCompany && item.logisticsCompany !== '') {
        const calculatedShippingCost = calculateShippingCostByLogisticsCompany(
          item.logisticsCompany,
          calculatedWeight,
          actualWeight
        );
        if (calculatedShippingCost !== '') {
          updatedItem.shippingCost = calculatedShippingCost;
        }
      }
      return updatedItem;
    });
  };

  const handleWeightRatioChange = (groupId: string, weightRatio: '0%' | '5%' | '10%' | '15%' | '20%' | '', calculatedWeight: string) => {
    onItemUpdate(groupId, (item) => {
      const updatedItem = { ...item, weightRatio, calculatedWeight };
      // 비율 변경 시 배송비 자동 계산 (물류회사가 선택되어 있는 경우)
      if (item.logisticsCompany && item.logisticsCompany !== '') {
        const calculatedShippingCost = calculateShippingCostByLogisticsCompany(
          item.logisticsCompany,
          calculatedWeight,
          item.actualWeight
        );
        if (calculatedShippingCost !== '') {
          updatedItem.shippingCost = calculatedShippingCost;
        }
      }
      return updatedItem;
    });
  };

  const handleShippingCostChange = (groupId: string, shippingCost: string) => {
    onItemUpdate(groupId, (item) => ({ ...item, shippingCost }));
  };

  const handlePaymentDateChange = (groupId: string, date: string) => {
    onItemUpdate(groupId, (item) => ({ ...item, paymentDate: date }));
  };

  const handleWkPaymentDateChange = (groupId: string, date: string) => {
    onItemUpdate(groupId, (item) => ({ ...item, wkPaymentDate: date }));
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="border-collapse w-full" style={{ tableLayout: 'auto' }}>
          <PackingListHeader
            isSuperAdmin={isSuperAdmin}
            isAllSelected={isAllSelected}
            onToggleAll={onToggleAll}
            hideSensitiveColumns={hideSensitiveColumns}
          />
          <tbody className="bg-white divide-y divide-gray-200">
            {items.length === 0 ? (
              <tr>
                <td colSpan={getColumnCount(isSuperAdmin, hideSensitiveColumns)} className="px-4 py-8 text-center text-gray-500">
                  패킹리스트 데이터가 없습니다.
                </td>
              </tr>
            ) : (
              renderItems.map((item, index) => {
                const isFirst = isFirstRowInGroup(item);
                const groupSize = getGroupSize(item);
                const groupId = getGroupId(item.id);
                const nextItem = items[index + 1];
                const isLastRowOfGroup = !nextItem || getGroupId(nextItem.id) !== groupId;

                return (
                  <Fragment key={item.id}>
                    <PackingListRow
                      item={item}
                      isFirst={isFirst}
                      groupSize={groupSize}
                      isSuperAdmin={isSuperAdmin}
                      isCodeSelected={isCodeSelected(item.code, item.date)}
                      onToggleCode={onToggleCode}
                      onUnitChange={handleUnitChange}
                      onInvoiceChange={handleInvoiceChange}
                      onLogisticsCompanyChange={handleLogisticsCompanyChange}
                      onWarehouseArrivalDateChange={handleWarehouseArrivalDateChange}
                      onKoreaArrivalChange={handleKoreaArrivalChange}
                      onActualWeightChange={handleActualWeightChange}
                      onWeightRatioChange={handleWeightRatioChange}
                      onShippingCostChange={handleShippingCostChange}
                      onPaymentDateChange={handlePaymentDateChange}
                      onWkPaymentDateChange={handleWkPaymentDateChange}
                      onProductNameClick={onProductNameClick}
                      onImageClick={onImageClick}
                      showCodeLink={showCodeLink}
                      onCodeClick={onCodeClick}
                      hideSensitiveColumns={hideSensitiveColumns}
                      isC0Level={isC0Level}
                      isD0Level={isD0Level}
                    />
                    {isLastRowOfGroup && (
                      <>
                        {lastEditedGroupId === groupId && saveBarContent && (
                          <tr className="bg-amber-50/50">
                            <td colSpan={colSpan} className="p-0 align-top">
                              {saveBarContent}
                            </td>
                          </tr>
                        )}
                        {firstSelectedGroupId === groupId && editBarContent && (
                          <tr className="bg-blue-50/50">
                            <td colSpan={colSpan} className="p-0 align-top">
                              {editBarContent}
                            </td>
                          </tr>
                        )}
                      </>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
