import { useMemo } from 'react';
import { getGroupId } from '../../utils/packingListUtils';
import type { PackingListItem, DomesticInvoice } from './types';
import { PackingListHeader } from './PackingListHeader';
import { PackingListRow } from './PackingListRow';

interface PackingListTableProps {
  items: PackingListItem[];
  isSuperAdmin: boolean;
  isAllSelected: boolean;
  onToggleAll: (checked: boolean) => void;
  onToggleCode: (code: string) => void;
  isCodeSelected: (code: string) => boolean;
  onItemUpdate: (groupId: string, updater: (item: PackingListItem) => PackingListItem) => void;
  onDomesticInvoiceChange?: (groupId: string, invoices: DomesticInvoice[]) => void;
  onKoreaArrivalChange?: (groupId: string, koreaArrivalDates: Array<{ id?: number; date: string; quantity: string }>) => void;
  onProductNameClick?: (purchaseOrderId?: string) => void;
  onImageClick?: (imageUrl: string) => void;
}

/**
 * 열 개수 계산 (A 등급이면 비율과 중량 열 포함)
 */
function getColumnCount(isSuperAdmin: boolean): number {
  let count = 19; // 기본 열 개수 (체크박스 제외)
  if (!isSuperAdmin) {
    count -= 2; // 비율과 중량 열 제외
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
}: PackingListTableProps) {
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
    onItemUpdate(groupId, (item) => ({ ...item, logisticsCompany }));
  };

  const handleWarehouseArrivalDateChange = (groupId: string, date: string) => {
    onItemUpdate(groupId, (item) => ({ ...item, warehouseArrivalDate: date }));
  };

  const handleKoreaArrivalChange = (groupId: string, koreaArrivalDates: Array<{ id?: number; date: string; quantity: string }>) => {
    // 로컬 상태 업데이트 (UI 즉시 반영)
    onItemUpdate(groupId, (item) => ({ ...item, koreaArrivalDate: koreaArrivalDates }));
    // 서버에 저장은 저장 버튼으로 처리
    if (onKoreaArrivalChange) {
      onKoreaArrivalChange(groupId, koreaArrivalDates);
    }
  };

  const handleActualWeightChange = (groupId: string, actualWeight: string, calculatedWeight: string) => {
    onItemUpdate(groupId, (item) => ({ ...item, actualWeight, calculatedWeight }));
  };

  const handleWeightRatioChange = (groupId: string, weightRatio: '0%' | '5%' | '10%' | '15%' | '20%' | '', calculatedWeight: string) => {
    onItemUpdate(groupId, (item) => ({ ...item, weightRatio, calculatedWeight }));
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
        <table className="border-collapse" style={{ minWidth: 'max-content' }}>
          <PackingListHeader
            isSuperAdmin={isSuperAdmin}
            isAllSelected={isAllSelected}
            onToggleAll={onToggleAll}
          />
          <tbody className="bg-white divide-y divide-gray-200">
            {items.length === 0 ? (
              <tr>
                <td colSpan={getColumnCount(isSuperAdmin)} className="px-4 py-8 text-center text-gray-500">
                  패킹리스트 데이터가 없습니다.
                </td>
              </tr>
            ) : (
              renderItems.map((item) => {
                const isFirst = isFirstRowInGroup(item);
                const groupSize = getGroupSize(item);

                return (
                  <PackingListRow
                    key={item.id}
                    item={item}
                    isFirst={isFirst}
                    groupSize={groupSize}
                    isSuperAdmin={isSuperAdmin}
                    isCodeSelected={isCodeSelected(item.code)}
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
                  />
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
