import { PurchaseOrderCard } from './PurchaseOrderCard';
import type { PurchaseOrderCardRowData, PurchaseOrderCardItem } from './PurchaseOrderCard';

export interface PurchaseOrderCardListProps {
  rowDataList: PurchaseOrderCardRowData[];
  getProductDisplayName: (po: PurchaseOrderCardItem) => string;
  getFullImageUrl: (url: string | null | undefined) => string;
  onNavigateToDetail: (orderId: string) => void;
  selectedOrderIds: Set<string>;
  onToggleSelect: (orderId: string) => (e: React.MouseEvent) => void;
}

/**
 * 발주 목록 모바일용 카드 리스트.
 * 카드 클릭 시 상세 URL로 이동, 선택 시 콜백 호출.
 */
export function PurchaseOrderCardList({
  rowDataList,
  getProductDisplayName,
  getFullImageUrl,
  onNavigateToDetail,
  selectedOrderIds,
  onToggleSelect,
}: PurchaseOrderCardListProps) {
  return (
    <div className="space-y-3">
      {rowDataList.map((rowData) => (
        <PurchaseOrderCard
          key={rowData.po.id}
          rowData={rowData}
          productDisplayName={getProductDisplayName(rowData.po)}
          getFullImageUrl={getFullImageUrl}
          onNavigateToDetail={() => onNavigateToDetail(rowData.po.id)}
          isSelected={selectedOrderIds.has(rowData.po.id)}
          onToggleSelect={onToggleSelect(rowData.po.id)}
        />
      ))}
    </div>
  );
}
