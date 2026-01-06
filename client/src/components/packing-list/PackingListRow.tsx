import { getGroupId } from '../../utils/packingListUtils';
import type { PackingListItem, DomesticInvoice } from './types';
import type { InlandCompany } from '../../hooks/useLogisticsOptions';
import { ProductCell } from './cells/ProductCell';
import { DomesticInvoiceCell } from './cells/DomesticInvoiceCell';
import { KoreaArrivalCell } from './cells/KoreaArrivalCell';
import { WeightCell } from './cells/WeightCell';
import { ShippingCostCell } from './cells/ShippingCostCell';

interface PackingListRowProps {
  item: PackingListItem;
  isFirst: boolean;
  groupSize: number;
  isSuperAdmin: boolean;
  isCodeSelected: boolean;
  onToggleCode: (code: string, date: string) => void;
  onUnitChange: (groupId: string, unit: '박스' | '마대') => void;
  onInvoiceChange: (groupId: string, invoices: DomesticInvoice[]) => void;
  onLogisticsCompanyChange: (groupId: string, logisticsCompany: string) => void;
  onWarehouseArrivalDateChange: (groupId: string, date: string) => void;
  onKoreaArrivalChange: (itemId: string, koreaArrivalDates: Array<{ id?: number; date: string; quantity: string }>) => void;
  onActualWeightChange: (groupId: string, actualWeight: string, calculatedWeight: string) => void;
  onWeightRatioChange: (groupId: string, weightRatio: '0%' | '5%' | '10%' | '15%' | '20%' | '', calculatedWeight: string) => void;
  onShippingCostChange: (groupId: string, shippingCost: string) => void;
  onPaymentDateChange: (groupId: string, date: string) => void;
  onWkPaymentDateChange: (groupId: string, date: string) => void;
  onProductNameClick?: (purchaseOrderId?: string) => void;
  onImageClick?: (imageUrl: string) => void;
  showCodeLink: boolean; // A레벨과 D0 레벨만 코드 링크 표시
  onCodeClick?: (code: string, date: string) => void; // 코드 클릭 시 상세 화면으로 이동하는 핸들러
  hideSensitiveColumns: boolean; // C0 레벨, D0 레벨일 때 실중량, 비율, 중량, 배송비, 지급일, WK결제일 숨김
  isC0Level?: boolean; // C0 레벨 여부 (물류회사 읽기 전용 표시용)
  isD0Level?: boolean; // D0 레벨 여부 (물류회사 읽기 전용 표시용)
  inlandCompanies: InlandCompany[]; // 내륙운송회사 목록
  optionsLoading: boolean; // 물류 옵션 로딩 중 여부
}

export function PackingListRow({
  item,
  isFirst,
  groupSize,
  isSuperAdmin,
  isCodeSelected,
  onToggleCode,
  onUnitChange,
  onInvoiceChange,
  onLogisticsCompanyChange,
  onWarehouseArrivalDateChange,
  onKoreaArrivalChange,
  onActualWeightChange,
  onWeightRatioChange,
  onShippingCostChange,
  onPaymentDateChange,
  onWkPaymentDateChange,
  onProductNameClick,
  onImageClick,
  showCodeLink,
  onCodeClick,
  hideSensitiveColumns,
  isC0Level = false,
  isD0Level = false,
  inlandCompanies,
  optionsLoading,
}: PackingListRowProps) {
  const isMultipleProducts = groupSize > 1;
  const groupId = getGroupId(item.id);

  if (!isFirst) {
    // 두 번째 행 이후: rowspan으로 병합된 열들은 생략하고 제품, 입수량, 총수량, 한국도착일만 표시
    return (
      <tr className="hover:bg-gray-50">
        <td className="px-4 py-3 text-sm text-center border-r border-gray-200">
          <ProductCell item={item} onProductNameClick={onProductNameClick} />
        </td>
        <td className="px-4 py-3 text-sm text-center text-gray-900 border-r border-gray-200 whitespace-nowrap">
          {item.entryQuantity || '-'}
        </td>
        <td className="px-4 py-3 text-sm text-center text-gray-900 border-r border-gray-200 align-middle whitespace-nowrap">
          {item.totalQuantity.toLocaleString()}개
        </td>
        {/* 한국도착일 (제품별로 표시) */}
        <td className="px-4 py-3 text-sm text-center text-gray-900 border-r border-gray-200 align-middle">
          <KoreaArrivalCell
            item={item}
            onKoreaArrivalChange={onKoreaArrivalChange}
          />
        </td>
        {/* 담당자 확인 열 (두 번째 행 이후에는 표시하지 않음) */}
      </tr>
    );
  }

  // 첫 번째 행: 모든 열 표시
  return (
    <tr className="hover:bg-gray-50">
      {/* 체크박스 */}
      <td rowSpan={isMultipleProducts ? groupSize : undefined} className="px-4 py-3 text-center border-r border-gray-200 align-middle">
        <input
          type="checkbox"
          checked={isCodeSelected}
          onChange={() => onToggleCode(item.code, item.date)}
          className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 cursor-pointer"
        />
      </td>
      {/* 발송일 */}
      <td rowSpan={isMultipleProducts ? groupSize : undefined} className="px-4 py-3 text-sm text-center text-gray-900 border-r border-gray-200 align-middle whitespace-nowrap">
        {item.date}
      </td>
      {/* 코드 */}
      <td rowSpan={isMultipleProducts ? groupSize : undefined} className="px-4 py-3 text-sm text-center text-gray-900 border-r border-gray-200 align-middle whitespace-nowrap">
        {showCodeLink && onCodeClick ? (
          <button
            onClick={() => onCodeClick(item.code, item.date)}
            className="text-blue-600 hover:text-blue-800 hover:underline font-medium transition-colors"
          >
            {item.code}
          </button>
        ) : (
          item.code
        )}
      </td>
      {/* 제품 */}
      <td className="px-4 py-3 text-sm text-center border-r border-gray-200">
        <ProductCell 
          item={item} 
          onProductNameClick={onProductNameClick}
          canClickProductName={!hideSensitiveColumns} // A레벨만 클릭 가능, C0 레벨, D0 레벨은 불가
        />
      </td>
      {/* 입수량 */}
      <td className="px-4 py-3 text-sm text-center text-gray-900 border-r border-gray-200 whitespace-nowrap">
        {item.entryQuantity || '-'}
      </td>
      {/* 박스수 */}
      <td rowSpan={isMultipleProducts ? groupSize : undefined} className="px-4 py-3 text-sm text-center text-gray-900 border-r border-gray-200 align-middle whitespace-nowrap">
        {item.boxCount || '-'}
      </td>
      {/* 단위 */}
      <td rowSpan={isMultipleProducts ? groupSize : undefined} className="px-4 py-3 text-sm text-center text-gray-900 border-r border-gray-200 align-middle whitespace-nowrap">
        <select
          value={item.unit || '박스'}
          onChange={(e) => onUnitChange(groupId, e.target.value as '박스' | '마대')}
          className="w-auto min-w-[60px] px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm text-center"
        >
          <option value="박스">박스</option>
          <option value="마대">마대</option>
        </select>
      </td>
      {/* 총수량 */}
      <td className="px-4 py-3 text-sm text-center text-gray-900 border-r border-gray-200 align-middle whitespace-nowrap">
        {item.totalQuantity.toLocaleString()}개
      </td>
      {/* 내륙송장 */}
      <td rowSpan={isMultipleProducts ? groupSize : undefined} className="px-4 py-3 text-sm text-center text-gray-900 border-r border-gray-200 align-middle">
        <DomesticInvoiceCell
          item={item}
          groupId={groupId}
          onInvoiceChange={onInvoiceChange}
          onImageClick={onImageClick}
        />
      </td>
      {/* 물류회사 */}
      <td rowSpan={isMultipleProducts ? groupSize : undefined} className="px-4 py-3 text-sm text-center text-gray-900 border-r border-gray-200 align-middle whitespace-nowrap">
        {isC0Level || isD0Level ? (
          // C0 레벨, D0 레벨: 읽기 전용으로 표시
          // C0 레벨: DB에 저장된 모든 물류회사 표시
          // D0 레벨: "광저우-비전"과 "위해-비전"만 표시
          <div className="text-gray-900">
            {isD0Level ? (
              // D0 레벨: "광저우-비전"과 "위해-비전"만 표시
              item.logisticsCompany === '광저우-비전' || item.logisticsCompany === '위해-비전' 
                ? item.logisticsCompany 
                : '-'
            ) : (
              // C0 레벨: DB에 저장된 값 그대로 표시
              item.logisticsCompany || '-'
            )}
          </div>
        ) : (
          <select
            value={item.logisticsCompany || ''}
            onChange={(e) => onLogisticsCompanyChange(groupId, e.target.value)}
            className="w-auto min-w-[120px] px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm text-center"
            disabled={optionsLoading}
          >
            <option value="">선택</option>
            {inlandCompanies.map((company) => (
              <option key={company.id} value={company.name}>{company.name}</option>
            ))}
          </select>
        )}
      </td>
      {/* 물류창고 도착일 */}
      <td rowSpan={isMultipleProducts ? groupSize : undefined} className="px-4 py-3 text-sm text-center text-gray-900 border-r border-gray-200 align-middle whitespace-nowrap">
        <input
          type="date"
          value={item.warehouseArrivalDate}
          onChange={(e) => onWarehouseArrivalDateChange(groupId, e.target.value)}
          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm text-center"
        />
      </td>
      {/* 한국도착일 */}
      <td className="px-4 py-3 text-sm text-center text-gray-900 border-r border-gray-200 align-middle">
        <KoreaArrivalCell
          item={item}
          onKoreaArrivalChange={onKoreaArrivalChange}
        />
      </td>
      {/* 실중량, 비율, 중량 - C0 레벨, D0 레벨일 때 숨김 */}
      {!hideSensitiveColumns && (
        <WeightCell
          item={item}
          groupId={groupId}
          isSuperAdmin={isSuperAdmin}
          rowSpan={isMultipleProducts ? groupSize : undefined}
          onActualWeightChange={onActualWeightChange}
          onWeightRatioChange={onWeightRatioChange}
        />
      )}
      {/* 배송비 - C0 레벨, D0 레벨일 때 숨김 */}
      {!hideSensitiveColumns && (
        <td rowSpan={isMultipleProducts ? groupSize : undefined} className="px-4 py-3 text-sm text-center text-gray-900 border-r border-gray-200 align-middle whitespace-nowrap">
          <ShippingCostCell
            item={item}
            groupId={groupId}
            onShippingCostChange={onShippingCostChange}
          />
        </td>
      )}
      {/* 지급일 - C0 레벨, D0 레벨일 때 숨김 */}
      {!hideSensitiveColumns && (
        <td rowSpan={isMultipleProducts ? groupSize : undefined} className="px-4 py-3 text-sm text-center text-gray-900 border-r border-gray-200 align-middle whitespace-nowrap">
          <input
            type="date"
            value={item.paymentDate}
            onChange={(e) => onPaymentDateChange(groupId, e.target.value)}
            className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm text-center"
          />
        </td>
      )}
      {/* WK결제일 - C0 레벨, D0 레벨일 때 숨김 */}
      {!hideSensitiveColumns && (
        <td rowSpan={isMultipleProducts ? groupSize : undefined} className="px-4 py-3 text-sm text-center text-gray-900 align-middle whitespace-nowrap">
          <input
            type="date"
            value={item.wkPaymentDate}
            onChange={(e) => onWkPaymentDateChange(groupId, e.target.value)}
            className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500 text-sm text-center"
          />
        </td>
      )}
    </tr>
  );
}
