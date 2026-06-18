import { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Search, Trash2, X } from 'lucide-react';
import type { ShopOrder } from '../../api/shopOrderApi';
import { createShopShipmentBatch } from '../../api/shopShipmentApi';
import { buildShopOrderLineListRows, type ShopOrderLineListRow } from '../../utils/shopOrderListExport';
import { formatLineOrderRef, formatLineQuantity } from '../../utils/shopOrderLineListUtils';
import {
  getDeliveryMismatchMessage,
  isSameDeliveryTarget,
} from '../../utils/shopShipmentDelivery';
import { generateUuid } from '../../utils/generateUuid';

interface TrackingDraft {
  id: string;
  trackingNumber: string;
}

interface ShopShipmentAddModalProps {
  isOpen: boolean;
  orders: ShopOrder[];
  assignedLineIds: Set<string>;
  onClose: () => void;
  onCreated: () => void;
}

function todayDateInputValue(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function createTrackingDraft(): TrackingDraft {
  return {
    id: generateUuid(),
    trackingNumber: '',
  };
}

function lineKey(row: ShopOrderLineListRow): string {
  return `${row.shopOrderId}:${row.line.id}`;
}

export function ShopShipmentAddModal({
  isOpen,
  orders,
  assignedLineIds,
  onClose,
  onCreated,
}: ShopShipmentAddModalProps) {
  const [shipmentDate, setShipmentDate] = useState(todayDateInputValue());
  const [trackingNumbers, setTrackingNumbers] = useState<TrackingDraft[]>([createTrackingDraft()]);
  const [sharedLineKeys, setSharedLineKeys] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setShipmentDate(todayDateInputValue());
    setTrackingNumbers([createTrackingDraft()]);
    setSharedLineKeys([]);
    setSearchTerm('');
  }, [isOpen]);

  const allLineRows = useMemo(
    () => buildShopOrderLineListRows(orders, 'orders'),
    [orders]
  );

  const sharedLineKeySet = useMemo(() => new Set(sharedLineKeys), [sharedLineKeys]);

  const assignedRows = useMemo(
    () =>
      sharedLineKeys
        .map((key) => allLineRows.find((row) => lineKey(row) === key))
        .filter(Boolean) as ShopOrderLineListRow[],
    [allLineRows, sharedLineKeys]
  );

  const searchableRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return allLineRows.filter((row) => {
      if (assignedLineIds.has(row.line.id)) {
        return false;
      }
      if (!term) return true;
      const haystack = [
        row.orderNumber,
        row.productName,
        row.line.companyName ?? '',
        row.line.recipientName ?? '',
        row.line.phoneNumber ?? '',
        row.line.address ?? '',
        formatLineOrderRef(row.line.lineOrderNumber, row.orderNumber, row.lineIndex),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [allLineRows, assignedLineIds, searchTerm]);

  const handleToggleSharedLine = (key: string, checked: boolean) => {
    if (checked) {
      const row = allLineRows.find((item) => lineKey(item) === key);
      if (!row) return;

      if (assignedRows.length > 0) {
        const base = assignedRows[0].line;
        if (
          !isSameDeliveryTarget(
            { recipientName: base.recipientName, address: base.address },
            { recipientName: row.line.recipientName, address: row.line.address }
          )
        ) {
          alert(
            getDeliveryMismatchMessage(
              { recipientName: base.recipientName, address: base.address },
              { recipientName: row.line.recipientName, address: row.line.address }
            )
          );
          return;
        }
      }
    }

    setSharedLineKeys((prev) => {
      if (checked) {
        return prev.includes(key) ? prev : [...prev, key];
      }
      return prev.filter((lineKeyValue) => lineKeyValue !== key);
    });
  };

  const handleRemoveSharedLine = (key: string) => {
    setSharedLineKeys((prev) => prev.filter((lineKeyValue) => lineKeyValue !== key));
  };

  const handleAddTracking = () => {
    setTrackingNumbers((prev) => [...prev, createTrackingDraft()]);
  };

  const handleRemoveTracking = (id: string) => {
    if (trackingNumbers.length <= 1) return;
    setTrackingNumbers((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSubmit = async () => {
    if (assignedRows.length === 0) {
      alert('포함할 주문건을 선택해 주세요.');
      return;
    }

    const base = assignedRows[0].line;
    for (const row of assignedRows.slice(1)) {
      if (
        !isSameDeliveryTarget(
          { recipientName: base.recipientName, address: base.address },
          { recipientName: row.line.recipientName, address: row.line.address }
        )
      ) {
        alert(
          getDeliveryMismatchMessage(
            { recipientName: base.recipientName, address: base.address },
            { recipientName: row.line.recipientName, address: row.line.address }
          )
        );
        return;
      }
    }

    setIsSaving(true);
    try {
      const lineItems = sharedLineKeys.map((key) => {
        const [shopOrderId, lineId] = key.split(':');
        return { shopOrderId, lineId };
      });
      const rows = lineItems
        .map((item) =>
          allLineRows.find((row) => row.shopOrderId === item.shopOrderId && row.line.id === item.lineId)
        )
        .filter(Boolean) as ShopOrderLineListRow[];
      const shipmentBoxCount = rows.reduce((sum, row) => sum + row.line.orderBoxCount, 0);

      const payload = {
        shipmentDate,
        shipments: trackingNumbers.map((tracking) => ({
          trackingNumber: tracking.trackingNumber,
          lineItems,
          shipmentBoxCount,
        })),
      };

      await createShopShipmentBatch(payload);
      onCreated();
      onClose();
    } catch (err) {
      alert(err instanceof Error ? err.message : '송장 등록에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">송장 추가</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              발송일과 송장번호를 입력한 뒤, 선택한 주문건을 모든 송장에 공동으로 포함합니다.
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="max-w-xs">
            <label className="block text-sm font-medium text-gray-700 mb-1">발송일</label>
            <input
              type="date"
              value={shipmentDate}
              onChange={(e) => setShipmentDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-gray-900">송장번호</h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  여러 송장번호를 입력하면 아래 선택 주문건이 모두 공동 포함됩니다.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddTracking}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border border-purple-200 text-purple-700 hover:bg-purple-50"
              >
                <Plus className="w-3.5 h-3.5" />
                송장번호 추가
              </button>
            </div>

            <div className="space-y-2">
              {trackingNumbers.map((tracking, index) => (
                <div key={tracking.id} className="flex items-center gap-2">
                  <span className="shrink-0 w-12 text-[11px] font-medium text-purple-700">
                    송장 {index + 1}
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={tracking.trackingNumber}
                    onChange={(e) =>
                      setTrackingNumbers((prev) =>
                        prev.map((item) =>
                          item.id === tracking.id
                            ? {
                                ...item,
                                trackingNumber: e.target.value.replace(/\D/g, '').slice(0, 32),
                              }
                            : item
                        )
                      )
                    }
                    placeholder="송장번호 입력"
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  {trackingNumbers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveTracking(tracking.id)}
                      className="p-2 rounded-lg text-red-600 hover:bg-red-50"
                      title="송장번호 삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 p-3 bg-gray-50/60">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">공동 포함 주문건</h4>
            {assignedRows.length === 0 ? (
              <p className="text-sm text-gray-500">아래에서 주문건을 선택해 포함해 주세요.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {assignedRows.map((row) => (
                  <span
                    key={lineKey(row)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-gray-200 text-[11px] text-gray-700"
                  >
                    {formatLineOrderRef(row.line.lineOrderNumber, row.orderNumber, row.lineIndex)}
                    <button
                      type="button"
                      onClick={() => handleRemoveSharedLine(lineKey(row))}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 pt-5 space-y-3">
            <h4 className="text-sm font-semibold text-gray-900">주문 검색</h4>
            <p className="text-xs text-gray-500">체크하면 바로 송장에 포함됩니다. 수령인·주소가 같은 주문만 묶을 수 있습니다.</p>
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="주문번호, 상품명, 상호, 수령인, 주소 검색"
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="max-h-56 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
              {searchableRows.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-gray-500">
                  포함 가능한 주문건이 없습니다.
                </p>
              ) : (
                searchableRows.map((row) => {
                  const key = lineKey(row);
                  const checked = sharedLineKeySet.has(key);
                  return (
                    <label
                      key={row.rowKey}
                      className="flex items-start gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => handleToggleSharedLine(key, e.target.checked)}
                        className="mt-1 w-4 h-4 accent-purple-600"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {formatLineOrderRef(
                            row.line.lineOrderNumber,
                            row.orderNumber,
                            row.lineIndex
                          )}{' '}
                          · {row.productName}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {row.line.companyName || '-'} · {row.line.recipientName || '-'} ·{' '}
                          {formatLineQuantity(row.line)}
                        </p>
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-200 bg-gray-50/80">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-white disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={() => void handleSubmit()}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            송장 등록
          </button>
        </div>
      </div>
    </div>
  );
}
