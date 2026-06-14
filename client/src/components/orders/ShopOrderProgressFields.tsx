import { useMemo, type ReactNode } from 'react';

import { DollarSign, ArrowRightLeft, Bookmark, Plus, ShoppingBag, Trash2 } from 'lucide-react';

import type { ShopBuyerListItem } from '../buyers/types';

import type { ShopOrder } from '../../api/shopOrderApi';

import { getLineAmountBreakdown, getLineTotalAmount, type ShopOrderLineForm } from '../../utils/shopOrderCalculations';

import { findMatchingAddressIndex } from '../../utils/shopBuyerDisplay';

import { ShopOrderFulfillmentPanel } from './ShopOrderFulfillmentPanel';



interface ShopOrderProgressFieldsProps {

  lines: ShopOrderLineForm[];

  quantityPerBox: number;

  buyers: ShopBuyerListItem[];

  orderId: string;

  isLineBusy: boolean;

  onAddLine: () => void;

  onAddReservation: () => void;

  onDeleteLine: (lineId: string) => void;

  onConvertLineToReservation: (lineId: string) => void;

  onConvertReservationLineToOrder: (lineId: string) => void;

  onTransferReservationLine: (lineId: string) => void;

  onLineChange: <K extends keyof ShopOrderLineForm>(

    lineId: string,

    key: K,

    value: ShopOrderLineForm[K]

  ) => void;

  onLineBatchChange: (lineId: string, updates: Partial<ShopOrderLineForm>) => void;

  onOrderUpdated: (order: ShopOrder) => void;

  onSaveIfNeeded: () => Promise<void>;

}



function ProgressField({

  label,

  className = 'min-w-[88px]',

  children,

}: {

  label: string;

  className?: string;

  children: ReactNode;

}) {

  return (

    <div className={`flex flex-col min-w-0 shrink ${className}`}>

      <label className="text-[11px] font-medium text-gray-500 mb-0.5 truncate" title={label}>

        {label}

      </label>

      {children}

    </div>

  );

}



const inputClass =

  'w-full min-w-0 px-1.5 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500';



function ShopOrderLineRow({

  line,

  lineLabel,

  buyers,

  orderId,

  isLineBusy,

  onDeleteLine,

  onConvertLineToReservation,

  onConvertReservationLineToOrder,

  onTransferReservationLine,

  onLineChange,

  onLineBatchChange,

  onOrderUpdated,

  onSaveIfNeeded,

}: {

  line: ShopOrderLineForm;

  lineLabel: string;

  buyers: ShopBuyerListItem[];

  orderId: string;

  isLineBusy: boolean;

  onDeleteLine: (lineId: string) => void;

  onConvertLineToReservation: (lineId: string) => void;

  onConvertReservationLineToOrder: (lineId: string) => void;

  onTransferReservationLine: (lineId: string) => void;

  onLineChange: ShopOrderProgressFieldsProps['onLineChange'];

  onLineBatchChange: ShopOrderProgressFieldsProps['onLineBatchChange'];

  onOrderUpdated: (order: ShopOrder) => void;

  onSaveIfNeeded: () => Promise<void>;

}) {

  const amountBreakdown = getLineAmountBreakdown(line);
  const totalAmount = getLineTotalAmount(line);



  const selectedBuyer = useMemo(

    () => buyers.find((buyer) => buyer.companyName === line.companyName),

    [buyers, line.companyName]

  );



  const hasUnmatchedCompanyName = Boolean(line.companyName.trim()) && !selectedBuyer;



  const selectedAddressIndex = useMemo(() => {

    if (!selectedBuyer || selectedBuyer.addresses.length === 0) return -1;

    return findMatchingAddressIndex(

      selectedBuyer.addresses,

      line.address,

      line.recipientName,

      line.phoneNumber

    );

  }, [selectedBuyer, line.address, line.recipientName, line.phoneNumber]);



  const showAddressDropdown =

    Boolean(selectedBuyer) && (selectedBuyer?.addresses.length ?? 0) > 1;



  const handleCompanyChange = (buyerId: string) => {

    if (!buyerId) {

      onLineBatchChange(line.id, {

        companyName: '',

        address: '',

        recipientName: '',

        phoneNumber: '',

      });

      return;

    }



    const buyer = buyers.find((item) => item.id === Number(buyerId));

    if (!buyer) return;



    const firstAddress = buyer.addresses[0];

    if (!firstAddress) {

      onLineBatchChange(line.id, {

        companyName: buyer.companyName,

        address: '',

        recipientName: '',

        phoneNumber: '',

      });

      return;

    }



    onLineBatchChange(line.id, {

      companyName: buyer.companyName,

      address: firstAddress.address,

      recipientName: firstAddress.recipientName,

      phoneNumber: firstAddress.phoneNumber,

    });

  };



  const handleAddressChange = (addressIndex: string) => {

    if (!selectedBuyer || addressIndex === '') return;



    const address = selectedBuyer.addresses[Number(addressIndex)];

    if (!address) return;



    onLineBatchChange(line.id, {

      address: address.address,

      recipientName: address.recipientName,

      phoneNumber: address.phoneNumber,

    });

  };



  return (

    <div
      className={`border rounded-lg p-3 min-w-0 ${
        line.isReservation
          ? 'border-amber-200 bg-amber-50/40'
          : 'border-gray-200 bg-gray-50/50'
      }`}
    >

      <div className="flex items-center justify-between mb-2 gap-2">

        <span className="text-sm font-semibold text-gray-700 select-text cursor-text">{lineLabel}</span>

        <div className="flex items-center gap-1 shrink-0">
          {!line.isReservation && (
            <button
              type="button"
              disabled={isLineBusy}
              onClick={() => onConvertLineToReservation(line.id)}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              <Bookmark className="w-3 h-3" />
              예약으로 전환
            </button>
          )}
          {line.isReservation && (
            <>
              <button
                type="button"
                disabled={isLineBusy}
                onClick={() => onTransferReservationLine(line.id)}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                <ArrowRightLeft className="w-3 h-3" />
                주문 이동하기
              </button>
              <button
                type="button"
                disabled={isLineBusy}
                onClick={() => onConvertReservationLineToOrder(line.id)}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-green-300 text-green-700 bg-green-50 hover:bg-green-100 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                <ShoppingBag className="w-3 h-3" />
                주문으로 전환
              </button>
            </>
          )}
          <button

          type="button"

          disabled={isLineBusy}

          onClick={() => onDeleteLine(line.id)}

          className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"

        >

          <Trash2 className="w-3 h-3" />

          삭제

        </button>
        </div>

      </div>



      <div className="flex flex-nowrap items-end gap-1 w-full min-w-0 overflow-hidden">

          <ProgressField label="상호명" className="flex-[1.4] min-w-[72px]">

            <select

              value={selectedBuyer?.id ?? (hasUnmatchedCompanyName ? '__unmatched__' : '')}

              onChange={(e) => {

                const value = e.target.value;

                if (value === '__unmatched__') return;

                handleCompanyChange(value);

              }}

              className={inputClass}

            >

              <option value="">상호명 선택</option>

              {hasUnmatchedCompanyName && (

                <option value="__unmatched__">{line.companyName}</option>

              )}

              {buyers.map((buyer) => (

                <option key={buyer.id} value={buyer.id}>

                  {buyer.companyName}

                </option>

              ))}

            </select>

          </ProgressField>



          <ProgressField label="박스" className="flex-[0.55] min-w-[40px]">

            <input

              type="number"

              min={0}

              value={line.orderBoxCount}

              onChange={(e) =>

                onLineChange(line.id, 'orderBoxCount', parseInt(e.target.value, 10) || 0)

              }

              className={`${inputClass} text-right`}

            />

          </ProgressField>



          <ProgressField label="입수" className="flex-[0.55] min-w-[40px]">
            <input
              type="number"
              min={0}
              value={line.quantityPerBox}
              onChange={(e) =>
                onLineChange(line.id, 'quantityPerBox', parseInt(e.target.value, 10) || 0)
              }
              className={`${inputClass} text-right`}
            />
          </ProgressField>



          <ProgressField label="단가" className="flex-[0.65] min-w-[44px]">

            <input

              type="number"

              min={0}

              value={line.saleUnitPrice ?? ''}

              onChange={(e) =>

                onLineChange(

                  line.id,

                  'saleUnitPrice',

                  e.target.value === '' ? null : parseFloat(e.target.value) || 0

                )

              }

              className={`${inputClass} text-right`}

              placeholder="₩"

            />

          </ProgressField>



          <ProgressField label="택배" className="flex-[0.55] min-w-[40px]">

            <input

              type="number"

              min={0}

              value={line.deliveryFee ?? ''}

              onChange={(e) =>

                onLineChange(

                  line.id,

                  'deliveryFee',

                  e.target.value === '' ? null : parseFloat(e.target.value) || 0

                )

              }

              className={`${inputClass} text-right`}

              placeholder="₩"

            />

          </ProgressField>



          <ProgressField label="제품금액" className="flex-[0.75] min-w-[48px]">

            <div className={`${inputClass} bg-gray-50 text-gray-900 text-right truncate`}>

              {amountBreakdown != null
                ? `₩${amountBreakdown.productSupplyAmount.toLocaleString()}`
                : '-'}

            </div>

          </ProgressField>



          <ProgressField label="총계(VAT)" className="flex-[0.8] min-w-[52px]">

            <div className={`${inputClass} bg-gray-50 text-gray-900 font-semibold text-right truncate`}>

              {totalAmount != null ? `₩${totalAmount.toLocaleString()}` : '-'}

            </div>

          </ProgressField>



          <ProgressField label="주소" className="flex-[2] min-w-[64px]">

            {showAddressDropdown ? (

              <select

                value={selectedAddressIndex >= 0 ? String(selectedAddressIndex) : ''}

                onChange={(e) => handleAddressChange(e.target.value)}

                className={`${inputClass} truncate`}

              >

                <option value="">주소 선택</option>

                {selectedBuyer?.addresses.map((addr, index) => (

                  <option key={addr.id ?? `addr-${index}`} value={String(index)}>

                    {addr.address}

                  </option>

                ))}

              </select>

            ) : (

              <input

                type="text"

                value={line.address}

                onChange={(e) => onLineChange(line.id, 'address', e.target.value)}

                className={inputClass}

                placeholder="배송 주소"

              />

            )}

          </ProgressField>



          <ProgressField label="수령인" className="flex-[0.7] min-w-[44px]">

            <input

              type="text"

              value={line.recipientName}

              onChange={(e) => onLineChange(line.id, 'recipientName', e.target.value)}

              className={inputClass}

              placeholder="수령인"

            />

          </ProgressField>



          <ProgressField label="전화" className="flex-[0.85] min-w-[52px]">

            <input

              type="tel"

              value={line.phoneNumber}

              onChange={(e) => onLineChange(line.id, 'phoneNumber', e.target.value)}

              className={inputClass}

              placeholder="010"

            />

          </ProgressField>



          <ShopOrderFulfillmentPanel

            orderId={orderId}

            lineId={line.id}

            form={line}

            hasStatement={Boolean(line.statementFilePath)}

            paymentProofImage={line.paymentProofImage}

            onChange={(key, value) => onLineChange(line.id, key, value)}

            onOrderUpdated={onOrderUpdated}

            onSaveIfNeeded={onSaveIfNeeded}

            inputClass={inputClass}

          />

      </div>

    </div>

  );

}



export function ShopOrderProgressFields(props: ShopOrderProgressFieldsProps) {

  const { lines, isLineBusy, onDeleteLine } = props;

  const orderLines = lines.filter((line) => !line.isReservation);
  const reservationLines = lines.filter((line) => line.isReservation);

  const renderLineRows = (
    sectionLines: ShopOrderLineForm[],
    labelPrefix: '주문' | '예약'
  ) =>
    sectionLines.map((line, index) => (
      <ShopOrderLineRow
        key={line.id}
        line={line}
        lineLabel={
          line.lineOrderNumber ??
          `${labelPrefix} ${index + 1}`
        }
        buyers={props.buyers}
        orderId={props.orderId}
        isLineBusy={isLineBusy}
        onDeleteLine={onDeleteLine}
        onConvertLineToReservation={props.onConvertLineToReservation}
        onConvertReservationLineToOrder={props.onConvertReservationLineToOrder}
        onTransferReservationLine={props.onTransferReservationLine}
        onLineChange={props.onLineChange}
        onLineBatchChange={props.onLineBatchChange}
        onOrderUpdated={props.onOrderUpdated}
        onSaveIfNeeded={props.onSaveIfNeeded}
      />
    ));

  return (
    <div className="space-y-6">
      <section>
        <div className="flex items-center gap-2 mb-3">
          <h4 className="text-sm font-bold text-gray-900">주문</h4>
          <span className="text-xs text-gray-500">({orderLines.length}건)</span>
        </div>
        {orderLines.length === 0 ? (
          <p className="text-sm text-gray-500 py-2 border border-dashed border-gray-200 rounded-lg px-3">
            등록된 주문이 없습니다. 「주문 추가」로 등록하세요.
          </p>
        ) : (
          <div className="space-y-3">{renderLineRows(orderLines, '주문')}</div>
        )}
      </section>

      <section>
        <div className="flex items-center gap-2 mb-3">
          <h4 className="text-sm font-bold text-amber-900">예약</h4>
          <span className="text-xs text-gray-500">({reservationLines.length}건)</span>
        </div>
        {reservationLines.length === 0 ? (
          <p className="text-sm text-gray-500 py-2 border border-dashed border-amber-200 rounded-lg px-3 bg-amber-50/40">
            등록된 예약이 없습니다. 「예약 추가」로 등록하세요.
          </p>
        ) : (
          <div className="space-y-3">{renderLineRows(reservationLines, '예약')}</div>
        )}
      </section>
    </div>
  );

}



export function ShopOrderProgressPanel(props: ShopOrderProgressFieldsProps) {

  const orderCount = props.lines.filter((line) => !line.isReservation).length;
  const reservationCount = props.lines.filter((line) => line.isReservation).length;

  return (

    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6 min-w-0 overflow-hidden">

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">

        <div className="flex items-center gap-2 bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-2 rounded-lg border border-green-200">

          <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center shadow-md">

            <DollarSign className="w-4 h-4 text-white" />

          </div>

          <h3 className="text-lg font-bold text-gray-900">주문 진행 관리</h3>

          <span className="text-sm text-gray-500">
            (주문 {orderCount} · 예약 {reservationCount})
          </span>

        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={props.isLineBusy}
            onClick={props.onAddLine}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-md border border-green-300 text-green-700 bg-green-50 hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            주문 추가
          </button>
          <button
            type="button"
            disabled={props.isLineBusy}
            onClick={props.onAddReservation}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-md border border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            예약 추가
          </button>
        </div>

      </div>

      <ShopOrderProgressFields {...props} />

    </div>

  );

}


