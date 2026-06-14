import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRightLeft, Loader2, Package, X } from 'lucide-react';
import {
  getShopOrderReservationTransferTargets,
  transferShopOrderReservationsToOrder,
  type ShopOrderReservationTransferTarget,
} from '../../api/shopOrderApi';
import { getFullImageUrl } from '../../api/purchaseOrderApi';

export interface ReservationTransferItem {
  shopOrderId: string;
  lineId: string;
}

interface ShopOrderReservationTransferModalProps {
  isOpen: boolean;
  items: ReservationTransferItem[];
  productName: string;
  excludeShopOrderIds?: string[];
  onClose: () => void;
  onTransferred: (targetOrderId: string, transferredCount: number) => void;
}

const EMPTY_EXCLUDE_IDS: string[] = [];

function buildItemsKey(items: ReservationTransferItem[]): string {
  return items.map((item) => `${item.shopOrderId}:${item.lineId}`).join('|');
}

export function ShopOrderReservationTransferModal({
  isOpen,
  items,
  productName,
  excludeShopOrderIds = EMPTY_EXCLUDE_IDS,
  onClose,
  onTransferred,
}: ShopOrderReservationTransferModalProps) {
  const [targets, setTargets] = useState<ShopOrderReservationTransferTarget[]>([]);
  const [loading, setLoading] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);

  const itemsKey = useMemo(() => buildItemsKey(items), [items]);
  const excludeKey = useMemo(() => excludeShopOrderIds.join('|'), [excludeShopOrderIds]);
  const productNameKey = productName.trim();

  const resetState = useCallback(() => {
    setTargets([]);
    setLoading(false);
    setTransferring(false);
    setError(null);
    setSelectedTargetId(null);
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [onClose, resetState]);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !transferring) handleClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, handleClose, transferring]);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setSelectedTargetId(null);
    setTargets([]);

    const sourceOrderIds = [...new Set(items.map((item) => item.shopOrderId))];
    const excludeIds = [...new Set([...excludeShopOrderIds, ...sourceOrderIds])];

    void getShopOrderReservationTransferTargets(excludeIds, productNameKey)
      .then((data) => {
        if (cancelled) return;
        setTargets(data);
        if (data.length === 0) {
          setError(
            `「${productNameKey}」과(와) 동일한 제품명의 재고 보유 주문이 없습니다.`
          );
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : '주문 목록을 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, itemsKey, excludeKey, productNameKey, items, excludeShopOrderIds]);

  const handleTransfer = async () => {
    if (!selectedTargetId || items.length === 0) return;

    setTransferring(true);
    setError(null);
    try {
      const result = await transferShopOrderReservationsToOrder(selectedTargetId, items);
      onTransferred(result.targetOrderId, result.transferredCount);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '주문 이동에 실패했습니다.');
    } finally {
      setTransferring(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="닫기"
        onClick={() => !transferring && handleClose()}
      />
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-white rounded-xl shadow-xl border border-gray-200">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-bold text-gray-900">주문 이동하기</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              「{productNameKey}」과(와) 동일한 제품 · 재고 0 이상인 주문 중{' '}
              {items.length.toLocaleString()}건의 예약을 이동할 대상을 선택하세요.
            </p>
          </div>
          <button
            type="button"
            disabled={transferring}
            onClick={handleClose}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="py-16 flex flex-col items-center text-gray-500">
              <Loader2 className="w-8 h-8 animate-spin mb-3" />
              <p>주문 목록을 불러오는 중...</p>
            </div>
          ) : targets.length === 0 ? (
            <div className="py-16 text-center text-gray-500">
              {error ?? '표시할 주문이 없습니다.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {targets.map((target) => {
                const selected = selectedTargetId === target.id;
                const imageUrl = target.productMainImage
                  ? getFullImageUrl(target.productMainImage)
                  : null;

                return (
                  <button
                    key={target.id}
                    type="button"
                    disabled={transferring}
                    onClick={() => setSelectedTargetId(target.id)}
                    className={`text-left rounded-xl border p-3 transition-colors disabled:opacity-50 ${
                      selected
                        ? 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-200'
                        : 'border-gray-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/40'
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className="w-16 h-16 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center">
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={target.productName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="w-7 h-7 text-gray-400" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-emerald-700">{target.orderNumber}</p>
                        <p className="text-sm font-medium text-gray-900 line-clamp-2 mt-0.5">
                          {target.productName}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">{target.status}</p>
                        <p className="text-xs text-gray-600 mt-1">
                          입고 {target.warehouseStockQuantity.toLocaleString()} · 잔여{' '}
                          {target.stockQuantity.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {error && targets.length > 0 && (
            <p className="mt-4 text-sm text-red-600">{error}</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-200 bg-gray-50/80">
          <button
            type="button"
            disabled={transferring}
            onClick={handleClose}
            className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-white disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            disabled={transferring || !selectedTargetId || items.length === 0}
            onClick={() => void handleTransfer()}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg border border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {transferring ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ArrowRightLeft className="w-4 h-4" />
            )}
            선택한 주문으로 이동
          </button>
        </div>
      </div>
    </div>
  );
}
