import { useCallback, useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import {
  formatBuyerModalLinesForCopy,
  type BuyerModalOrderLine,
  type BuyerModalOrderLineGroups,
  type BuyerModalOrderLineTab,
} from '../../utils/shopBuyerModalOrderLines';
import { copyTextToClipboard } from '../../utils/copyToClipboard';
import { getLineProgressStatusClass } from '../../utils/shopOrderLineListUtils';

interface ShopBuyerOrderLinesPanelProps {
  groups: BuyerModalOrderLineGroups;
  onProductClick: (shopOrderId: string) => void;
}

const TAB_OPTIONS: Array<{ key: BuyerModalOrderLineTab; label: string }> = [
  { key: 'pending_shipment', label: '발송 대기' },
  { key: 'in_progress', label: '진행 중' },
  { key: 'completed', label: '완료' },
];

function OrderLinesTable({
  lines,
  onProductClick,
}: {
  lines: BuyerModalOrderLine[];
  onProductClick: (shopOrderId: string) => void;
}) {
  if (lines.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-gray-500 border border-dashed border-gray-200 rounded-lg bg-gray-50/80">
        표시할 주문 건이 없습니다.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left text-xs text-gray-500">
          <tr>
            <th className="px-3 py-2 font-medium whitespace-nowrap">주문</th>
            <th className="px-3 py-2 font-medium whitespace-nowrap">상품명</th>
            <th className="px-3 py-2 font-medium whitespace-nowrap text-right">수량</th>
            <th className="px-3 py-2 font-medium whitespace-nowrap">진행</th>
            <th className="px-3 py-2 font-medium whitespace-nowrap">입고일</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {lines.map((line) => (
            <tr key={line.rowKey} className="hover:bg-gray-50/80">
              <td className="px-3 py-2 text-gray-600 whitespace-nowrap font-mono text-xs">
                {line.orderRef}
              </td>
              <td className="px-3 py-2 text-gray-900 min-w-[120px]">
                <button
                  type="button"
                  onClick={() => onProductClick(line.shopOrderId)}
                  className="text-left text-emerald-700 hover:text-emerald-900 hover:underline font-medium"
                >
                  {line.productName}
                </button>
              </td>
              <td className="px-3 py-2 text-gray-700 whitespace-nowrap text-right tabular-nums">
                {line.quantityLabel}
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                <span
                  className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getLineProgressStatusClass(line.progressStatus)}`}
                >
                  {line.progressStatus}
                </span>
              </td>
              <td className="px-3 py-2 text-gray-700 whitespace-nowrap tabular-nums">
                {line.inboundDate ?? '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ShopBuyerOrderLinesPanel({ groups, onProductClick }: ShopBuyerOrderLinesPanelProps) {
  const [activeTab, setActiveTab] = useState<BuyerModalOrderLineTab>('pending_shipment');
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');

  const tabCounts: Record<BuyerModalOrderLineTab, number> = {
    pending_shipment: groups.pendingShipment.length,
    in_progress: groups.inProgress.length,
    completed: groups.completed.length,
  };

  const activeLines =
    activeTab === 'pending_shipment'
      ? groups.pendingShipment
      : activeTab === 'in_progress'
        ? groups.inProgress
        : groups.completed;

  const handleCopy = useCallback(async () => {
    if (activeLines.length === 0) return;

    const text = formatBuyerModalLinesForCopy(activeLines);
    try {
      await copyTextToClipboard(text);
      setCopyState('copied');
      window.setTimeout(() => setCopyState('idle'), 2000);
    } catch {
      setCopyState('error');
      window.setTimeout(() => setCopyState('idle'), 2500);
    }
  }, [activeLines]);

  useEffect(() => {
    setCopyState('idle');
  }, [activeTab]);

  return (
    <div className="pt-4 mt-4 border-t border-gray-200">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <p className="text-sm font-semibold text-gray-900">이 상호 주문 건</p>
        <button
          type="button"
          onClick={() => void handleCopy()}
          disabled={activeLines.length === 0}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="상품명 / 수량 / 출고예정일 형식으로 복사"
        >
          {copyState === 'copied' ? (
            <Check className="w-4 h-4 text-emerald-600" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
          {copyState === 'copied'
            ? '복사됨'
            : copyState === 'error'
              ? '복사 실패'
              : '복사하기'}
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {TAB_OPTIONS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                isActive
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {tab.label}
              <span
                className={`inline-flex min-w-[1.25rem] justify-center px-1 py-0.5 rounded text-xs ${
                  isActive ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {tabCounts[tab.key]}
              </span>
            </button>
          );
        })}
      </div>

      <OrderLinesTable lines={activeLines} onProductClick={onProductClick} />
    </div>
  );
}
