import { Loader2, MapPin, Package, Phone, Trash2, User } from 'lucide-react';
import type { ShopShipmentBatchListItem } from '../../api/shopShipmentApi';
import { formatLineOrderRef } from '../../utils/shopOrderLineListUtils';
import {
  calculateBatchLogisticsFee,
  formatKrwAmount,
  formatSettlementPaidDate,
} from '../../utils/shopSalesSettlement';
import { ShopShippingStatusBadge } from './ShopShippingStatusBadge';

function formatOptionalText(value: string | null | undefined): string {
  return value?.trim() ? value.trim() : '-';
}

interface ShopShippingBatchCardProps {
  batch: ShopShipmentBatchListItem;
  savingBatchId: string | null;
  refreshingShipmentId: string | null;
  deletingBatchId: string | null;
  onBatchFieldSave: (
    batchId: string,
    field: 'shipmentBoxCount' | 'deliveryFee' | 'boxPrice',
    rawValue: string,
    current: ShopShipmentBatchListItem
  ) => void;
  onLogisticsFeePaidChange: (batch: ShopShipmentBatchListItem, checked: boolean) => void;
  logisticsFeePaidSavingBatchId: string | null;
  onRefreshTracking: (shipmentId: string) => void;
  onDeleteBatch: (batch: ShopShipmentBatchListItem) => void;
}

export function ShopShippingBatchCard({
  batch,
  savingBatchId,
  refreshingShipmentId,
  deletingBatchId,
  onBatchFieldSave,
  onLogisticsFeePaidChange,
  logisticsFeePaidSavingBatchId,
  onRefreshTracking,
  onDeleteBatch,
}: ShopShippingBatchCardProps) {
  const isSaving = savingBatchId === batch.batchId;
  const isDeleting = deletingBatchId === batch.batchId;
  const isLogisticsSaving = logisticsFeePaidSavingBatchId === batch.batchId;
  const logisticsFee = calculateBatchLogisticsFee(
    batch.shipmentBoxCount,
    batch.deliveryFee,
    batch.boxPrice
  );
  const paidDateLabel = batch.logisticsFeePaid
    ? formatSettlementPaidDate(batch.logisticsFeePaidAt)
    : null;

  return (
    <article className="flex flex-col h-full min-w-0 rounded-lg border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <div className="px-2 py-1 bg-purple-50 border-b border-purple-100">
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-purple-900 leading-tight">{batch.shipmentDate}</p>
            <p className="text-[9px] text-purple-700 tabular-nums truncate">
              송장 {batch.shipments.length} · 주문 {batch.lineItems.length}
            </p>
          </div>
          <button
            type="button"
            disabled={isDeleting || isSaving}
            onClick={() => onDeleteBatch(batch)}
            className="inline-flex items-center justify-center p-0.5 rounded border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 shrink-0"
            title="배송 묶음 삭제"
            aria-label="배송 묶음 삭제"
          >
            {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
          </button>
        </div>
      </div>

      <div className="px-2 py-1 space-y-0.5 border-b border-gray-100">
        <div className="flex items-center gap-1 text-[11px] text-gray-800">
          <User className="w-3 h-3 text-gray-400 shrink-0" />
          <span className="font-medium truncate">{formatOptionalText(batch.recipientName)}</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-gray-600">
          <Phone className="w-3 h-3 text-gray-400 shrink-0" />
          <span className="truncate">{formatOptionalText(batch.phoneNumber)}</span>
        </div>
        <div className="flex items-start gap-1 text-[10px] text-gray-600">
          <MapPin className="w-3 h-3 text-gray-400 shrink-0 mt-0.5" />
          <span className="line-clamp-2 leading-snug" title={batch.address ?? undefined}>
            {formatOptionalText(batch.address)}
          </span>
        </div>
      </div>

      <div className="px-2 py-1 grid grid-cols-3 gap-1 border-b border-gray-100 bg-gray-50/60">
        <label className="block min-w-0">
          <span className="block text-[9px] text-gray-500 mb-0.5">박스수</span>
          <input
            type="number"
            min={0}
            defaultValue={batch.shipmentBoxCount ?? ''}
            key={`${batch.batchId}-box-${batch.shipmentBoxCount ?? ''}`}
            disabled={isSaving || isDeleting}
            onBlur={(e) => onBatchFieldSave(batch.batchId, 'shipmentBoxCount', e.target.value, batch)}
            className="w-full min-w-0 px-1 py-0.5 text-[11px] text-right border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500 bg-white"
          />
        </label>
        <label className="block min-w-0">
          <span className="block text-[9px] text-gray-500 mb-0.5">택배비</span>
          <input
            type="number"
            min={0}
            defaultValue={batch.deliveryFee ?? ''}
            key={`${batch.batchId}-fee-${batch.deliveryFee ?? ''}`}
            disabled={isSaving || isDeleting}
            onBlur={(e) => onBatchFieldSave(batch.batchId, 'deliveryFee', e.target.value, batch)}
            className="w-full min-w-0 px-1 py-0.5 text-[11px] text-right border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500 bg-white"
          />
        </label>
        <label className="block min-w-0">
          <span className="block text-[9px] text-gray-500 mb-0.5">박스가격</span>
          <input
            type="number"
            min={0}
            defaultValue={batch.boxPrice ?? ''}
            key={`${batch.batchId}-price-${batch.boxPrice ?? ''}`}
            disabled={isSaving || isDeleting}
            onBlur={(e) => onBatchFieldSave(batch.batchId, 'boxPrice', e.target.value, batch)}
            className="w-full min-w-0 px-1 py-0.5 text-[11px] text-right border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500 bg-white"
          />
        </label>
      </div>

      <div className="px-2 py-1 border-b border-gray-100 bg-sky-50/50">
        <div className="flex items-center justify-between gap-1">
          <div className="min-w-0">
            <p className="text-[9px] font-semibold text-gray-500">물류 수수료</p>
            <p className="text-xs font-semibold text-gray-900 tabular-nums truncate">
              {formatKrwAmount(logisticsFee)}
            </p>
          </div>
          <label
            className={`inline-flex items-center gap-1 shrink-0 ${
              isLogisticsSaving || isSaving || isDeleting
                ? 'cursor-not-allowed opacity-60'
                : 'cursor-pointer'
            }`}
          >
            <input
              type="checkbox"
              checked={batch.logisticsFeePaid}
              disabled={isLogisticsSaving || isSaving || isDeleting}
              onChange={(e) => onLogisticsFeePaidChange(batch, e.target.checked)}
              className="h-3 w-3 rounded border-gray-300 text-purple-600 focus:ring-purple-500 disabled:cursor-not-allowed"
            />
            <span className="text-[9px] text-gray-600 whitespace-nowrap">지급</span>
            {isLogisticsSaving && <Loader2 className="w-3 h-3 animate-spin text-purple-500" />}
          </label>
        </div>
        {paidDateLabel && (
          <p className="text-[9px] text-gray-500 tabular-nums mt-0.5 truncate">지급일 {paidDateLabel}</p>
        )}
      </div>

      <div className="px-2 py-1 border-b border-gray-100">
        <p className="text-[9px] font-semibold text-gray-400 mb-0.5">송장번호</p>
        <ul className="space-y-0.5">
          {batch.shipments.map((shipment) => {
            const isRefreshing = refreshingShipmentId === shipment.shipmentId;

            return (
              <li
                key={shipment.shipmentId}
                className="flex flex-wrap items-center gap-x-1 gap-y-0.5 min-h-[20px]"
              >
                <span className="font-mono text-[10px] text-gray-900 truncate flex-1 min-w-0">
                  {shipment.trackingNumber}
                </span>
                <button
                  type="button"
                  disabled={isRefreshing || isSaving || isDeleting}
                  onClick={() => onRefreshTracking(shipment.shipmentId)}
                  className="shrink-0 px-1 py-0.5 text-[9px] rounded border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                >
                  {isRefreshing ? '…' : '조회'}
                </button>
                <ShopShippingStatusBadge status={shipment.deliveryStatus} compact />
              </li>
            );
          })}
        </ul>
      </div>

      <div className="px-2 py-1 flex-1 min-h-0">
        <p className="text-[9px] font-semibold text-gray-400 mb-0.5 flex items-center gap-1">
          <Package className="w-3 h-3" />
          포함 주문건
        </p>
        <ul className="space-y-0.5 max-h-24 overflow-y-auto text-[10px]">
          {batch.lineItems.map((line) => (
            <li
              key={line.lineId}
              className="flex items-baseline gap-1 text-gray-700 min-w-0"
              title={`${line.productName} · ${(line.orderBoxCount * line.quantityPerBox).toLocaleString()}개`}
            >
              <span className="font-medium text-gray-900 shrink-0">
                {formatLineOrderRef(line.lineOrderNumber, line.orderNumber, line.lineIndex)}
              </span>
              <span className="text-gray-400 shrink-0">·</span>
              <span className="truncate flex-1 text-gray-600">{line.productName}</span>
              <span className="tabular-nums shrink-0 text-gray-500">
                {(line.orderBoxCount * line.quantityPerBox).toLocaleString()}개
              </span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
