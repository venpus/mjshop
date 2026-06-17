import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, Plus, Search, X } from 'lucide-react';
import { getShopOrders, type ShopOrder } from '../../api/shopOrderApi';
import {
  deleteShopShipmentBatch,
  getShopShipmentAssignedLineIds,
  getShopShipmentBatches,
  lookupShopShipmentTracking,
  updateShopShipmentBatch,
  type ShopShipmentBatchListItem,
  type ShopShipmentBatchShipmentItem,
} from '../../api/shopShipmentApi';
import { useShopOrderListPagination } from '../../hooks/useShopOrderListPagination';
import { formatLineOrderRef } from '../../utils/shopOrderLineListUtils';
import { ShopOrderListPagination } from '../orders/ShopOrderListPagination';
import { ShopShipmentAddModal } from './ShopShipmentAddModal';
import { ShopShippingBatchCard } from './ShopShippingBatchCard';

function parseOptionalNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed.replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

export function ShopShippingManagementPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const focusLineId = searchParams.get('lineId')?.trim() || null;

  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [batches, setBatches] = useState<ShopShipmentBatchListItem[]>([]);
  const [assignedLineIds, setAssignedLineIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [savingBatchId, setSavingBatchId] = useState<string | null>(null);
  const [refreshingShipmentId, setRefreshingShipmentId] = useState<string | null>(null);
  const [deletingBatchId, setDeletingBatchId] = useState<string | null>(null);
  const [logisticsFeePaidSavingBatchId, setLogisticsFeePaidSavingBatchId] = useState<string | null>(
    null
  );

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [orderData, batchData, lineIds] = await Promise.all([
        getShopOrders(),
        getShopShipmentBatches(),
        getShopShipmentAssignedLineIds(),
      ]);
      setOrders(orderData);
      setBatches(batchData);
      setAssignedLineIds(new Set(lineIds));
    } catch (err) {
      setError(err instanceof Error ? err.message : '배송 데이터를 불러오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredBatches = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    let result = batches;

    if (focusLineId) {
      result = result.filter((batch) => batch.lineItems.some((line) => line.lineId === focusLineId));
    }

    if (!term) return result;

    return result.filter((batch) => {
      const haystack = [
        batch.shipmentDate,
        batch.recipientName ?? '',
        batch.phoneNumber ?? '',
        batch.address ?? '',
        ...batch.shipments.map((shipment) => shipment.trackingNumber),
        ...batch.lineItems.flatMap((line) => [
          line.orderNumber,
          line.productName,
          line.companyName ?? '',
          formatLineOrderRef(line.lineOrderNumber, line.orderNumber, line.lineIndex),
        ]),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [batches, searchTerm, focusLineId]);

  const clearLineFocus = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('lineId');
    setSearchParams(next, { replace: true });
  };

  const {
    paginatedItems,
    currentPage,
    setCurrentPage,
    totalPages,
    totalItems,
    startIndex,
    endIndex,
  } = useShopOrderListPagination(filteredBatches, searchTerm);

  const patchShipmentInBatches = (
    shipmentId: string,
    patch: Partial<Pick<ShopShipmentBatchShipmentItem, 'deliveryStatus' | 'lastTrackingKind' | 'lastTrackingAt'>>
  ) => {
    setBatches((prev) =>
      prev.map((batch) => ({
        ...batch,
        shipments: batch.shipments.map((shipment) =>
          shipment.shipmentId === shipmentId ? { ...shipment, ...patch } : shipment
        ),
      }))
    );
  };

  const patchBatchFields = (
    batchId: string,
    patch: Partial<
      Pick<
        ShopShipmentBatchListItem,
        'shipmentBoxCount' | 'deliveryFee' | 'boxPrice' | 'logisticsFeePaid' | 'logisticsFeePaidAt'
      >
    >
  ) => {
    setBatches((prev) =>
      prev.map((batch) => (batch.batchId === batchId ? { ...batch, ...patch } : batch))
    );
  };

  const handleBatchFieldSave = async (
    batchId: string,
    field: 'shipmentBoxCount' | 'deliveryFee' | 'boxPrice',
    rawValue: string,
    current: ShopShipmentBatchListItem
  ) => {
    const value = parseOptionalNumber(rawValue);
    if (current[field] === value) return;

    patchBatchFields(batchId, { [field]: value });
    setSavingBatchId(batchId);
    try {
      await updateShopShipmentBatch(batchId, { [field]: value });
    } catch (err) {
      await loadData();
      alert(err instanceof Error ? err.message : '배송 정보 저장에 실패했습니다.');
    } finally {
      setSavingBatchId(null);
    }
  };

  const handleLogisticsFeePaidChange = async (
    batch: ShopShipmentBatchListItem,
    checked: boolean
  ) => {
    if (checked === batch.logisticsFeePaid) return;

    const previousPaid = batch.logisticsFeePaid;
    const previousPaidAt = batch.logisticsFeePaidAt;
    const optimisticPaidAt = checked ? new Date().toISOString() : null;

    patchBatchFields(batch.batchId, {
      logisticsFeePaid: checked,
      logisticsFeePaidAt: optimisticPaidAt,
    });
    setLogisticsFeePaidSavingBatchId(batch.batchId);

    try {
      await updateShopShipmentBatch(batch.batchId, { logisticsFeePaid: checked });
      await loadData();
    } catch (err) {
      patchBatchFields(batch.batchId, {
        logisticsFeePaid: previousPaid,
        logisticsFeePaidAt: previousPaidAt,
      });
      alert(err instanceof Error ? err.message : '물류 수수료 지급 상태 저장에 실패했습니다.');
    } finally {
      setLogisticsFeePaidSavingBatchId(null);
    }
  };

  const handleRefreshTracking = async (shipmentId: string) => {
    setRefreshingShipmentId(shipmentId);
    try {
      const result = await lookupShopShipmentTracking(shipmentId);
      patchShipmentInBatches(shipmentId, {
        deliveryStatus: result.deliveryStatus,
        lastTrackingKind: result.lastTrackingKind,
        lastTrackingAt: result.lastTrackingAt,
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : '배송 조회에 실패했습니다.');
    } finally {
      setRefreshingShipmentId(null);
    }
  };

  const handleDeleteBatch = async (batch: ShopShipmentBatchListItem) => {
    const trackingLabel =
      batch.shipments.length > 0
        ? batch.shipments.map((shipment) => shipment.trackingNumber).join(', ')
        : '등록된 송장';
    const confirmed = window.confirm(
      `${batch.shipmentDate} 발송 묶음을 삭제하시겠습니까?\n\n송장: ${trackingLabel}\n주문 ${batch.lineItems.length}건이 배송 목록에서 제거됩니다.`
    );
    if (!confirmed) return;

    setDeletingBatchId(batch.batchId);
    try {
      await deleteShopShipmentBatch(batch.batchId);
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : '배송 묶음 삭제에 실패했습니다.');
    } finally {
      setDeletingBatchId(null);
    }
  };

  return (
    <div className="p-4 min-h-[1080px]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-gray-900 mb-1">배송 관리</h2>
          <p className="text-sm text-gray-600">
            발송 묶음을 카드 형태로 확인하고 관리합니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-purple-600 text-white hover:bg-purple-700"
        >
          <Plus className="w-4 h-4" />
          송장 추가
        </button>
      </div>

      {focusLineId && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-purple-200 bg-purple-50 px-3 py-2 text-sm text-purple-900">
          <span>선택한 주문건의 배송 묶음만 표시 중입니다.</span>
          <button
            type="button"
            onClick={clearLineFocus}
            className="inline-flex items-center gap-1 rounded border border-purple-200 bg-white px-2 py-1 text-xs text-purple-700 hover:bg-purple-100"
          >
            <X className="w-3 h-3" />
            전체 보기
          </button>
        </div>
      )}

      <div className="bg-white rounded-md border border-gray-200 p-3 mb-3">
        <div className="relative max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            id="shipping-search"
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="날짜, 주문번호, 수령인, 송장번호, 주소"
            className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-gray-500 text-sm">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          배송 데이터를 불러오는 중...
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700">{error}</div>
      ) : (
        <div className="space-y-3">
          <ShopOrderListPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            startIndex={startIndex}
            endIndex={endIndex}
            onPageChange={setCurrentPage}
            className="bg-white rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm"
          />

          {paginatedItems.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 px-3 py-12 text-center text-sm text-gray-500 shadow-sm">
              {focusLineId ? '해당 주문건의 배송 묶음이 없습니다.' : '등록된 송장이 없습니다.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-1.5">
              {paginatedItems.map((batch) => (
                <ShopShippingBatchCard
                  key={batch.batchId}
                  batch={batch}
                  savingBatchId={savingBatchId}
                  refreshingShipmentId={refreshingShipmentId}
                  deletingBatchId={deletingBatchId}
                  onBatchFieldSave={(batchId, field, rawValue, current) =>
                    void handleBatchFieldSave(batchId, field, rawValue, current)
                  }
                  onLogisticsFeePaidChange={(item, checked) =>
                    void handleLogisticsFeePaidChange(item, checked)
                  }
                  logisticsFeePaidSavingBatchId={logisticsFeePaidSavingBatchId}
                  onRefreshTracking={(shipmentId) => void handleRefreshTracking(shipmentId)}
                  onDeleteBatch={(item) => void handleDeleteBatch(item)}
                />
              ))}
            </div>
          )}

          <ShopOrderListPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            startIndex={startIndex}
            endIndex={endIndex}
            onPageChange={setCurrentPage}
            className="bg-white rounded-lg border border-gray-200 px-3 py-2 text-sm shadow-sm"
          />
        </div>
      )}

      <ShopShipmentAddModal
        isOpen={isModalOpen}
        orders={orders}
        assignedLineIds={assignedLineIds}
        onClose={() => setIsModalOpen(false)}
        onCreated={() => void loadData()}
      />
    </div>
  );
}
