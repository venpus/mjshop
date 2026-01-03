import React from 'react';
import { PaymentHistoryItem } from '../../api/paymentHistoryApi';
import {
  calculateBasicCostTotal,
  calculateCommissionAmount,
  calculateShippingCostTotal,
  calculateFinalPaymentAmount,
} from '../../utils/purchaseOrderCalculations';
import { formatDateKST } from '../../utils/dateUtils';

interface PaymentHistoryDetailProps {
  item: PaymentHistoryItem;
}

/**
 * 결제내역 상세 정보 컴포넌트
 */
export function PaymentHistoryDetail({ item }: PaymentHistoryDetailProps) {
  if (item.source_type === 'purchase_order') {
    return (
      <div className="space-y-3">
        <div className="text-sm font-medium text-gray-700 mb-3">발주관리 상세 내역</div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">발주번호:</span>
            <span className="ml-2 font-medium">{item.po_number}</span>
          </div>
          <div>
            <span className="text-gray-600">상품명:</span>
            <span className="ml-2 font-medium">{item.product_name || '-'}</span>
          </div>
        </div>

        {/* 기본 비용 정보 */}
        {item.unit_price !== undefined && (
          <div className="border-t border-gray-200 pt-3 mt-3">
            <div className="text-sm font-medium text-gray-700 mb-2">기본 비용</div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">기본단가:</span>
                <span>¥{item.unit_price.toLocaleString()}</span>
              </div>
              {item.back_margin && item.back_margin > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">추가단가 (A레벨):</span>
                  <span className="font-medium text-purple-600">¥{item.back_margin.toLocaleString()}</span>
                </div>
              )}
              {item.quantity && (
                <div className="flex justify-between">
                  <span className="text-gray-600">수량:</span>
                  <span>{item.quantity}개</span>
                </div>
              )}
              {item.commission_rate !== undefined && (
                <div className="flex justify-between">
                  <span className="text-gray-600">수수료율:</span>
                  <span>{item.commission_rate}%</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 배송비 정보 */}
        {(item.shipping_cost !== undefined || item.warehouse_shipping_cost !== undefined) && (
          <div className="border-t border-gray-200 pt-3 mt-3">
            <div className="text-sm font-medium text-gray-700 mb-2">배송비</div>
            <div className="space-y-1 text-sm">
              {item.shipping_cost !== undefined && (
                <div className="flex justify-between">
                  <span className="text-gray-600">업체 배송비:</span>
                  <span>¥{item.shipping_cost.toLocaleString()}</span>
                </div>
              )}
              {item.warehouse_shipping_cost !== undefined && (
                <div className="flex justify-between">
                  <span className="text-gray-600">창고 배송비:</span>
                  <span>¥{item.warehouse_shipping_cost.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* A레벨 관리자 입력 항목 */}
        {item.admin_cost_items && item.admin_cost_items.length > 0 && (
          <div className="border-t border-gray-200 pt-3 mt-3">
            <div className="text-sm font-medium text-gray-700 mb-2">A레벨 관리자 입력 항목</div>
            <div className="space-y-2">
              {item.admin_cost_items
                .filter((item) => item.item_type === 'option')
                .length > 0 && (
                <div>
                  <div className="text-xs font-medium text-gray-600 mb-1">포장 및 가공 부자재</div>
                  <div className="space-y-1">
                    {item.admin_cost_items
                      .filter((item) => item.item_type === 'option')
                      .map((costItem) => (
                        <div key={costItem.id} className="flex justify-between text-sm">
                          <span className="text-gray-600">{costItem.name}:</span>
                          <span>
                            ¥{costItem.unit_price.toLocaleString()} × {costItem.quantity} = ¥
                            {costItem.cost.toLocaleString()}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
              {item.admin_cost_items
                .filter((item) => item.item_type === 'labor')
                .length > 0 && (
                <div>
                  <div className="text-xs font-medium text-gray-600 mb-1">인건비</div>
                  <div className="space-y-1">
                    {item.admin_cost_items
                      .filter((item) => item.item_type === 'labor')
                      .map((costItem) => (
                        <div key={costItem.id} className="flex justify-between text-sm">
                          <span className="text-gray-600">{costItem.name}:</span>
                          <span>
                            ¥{costItem.unit_price.toLocaleString()} × {costItem.quantity} = ¥
                            {costItem.cost.toLocaleString()}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 선금/잔금 정보 */}
        {item.payment_type === 'advance' && (
          <div className="border-t border-gray-200 pt-3 mt-3">
            <div className="text-sm font-medium text-gray-700 mb-2">선금 정보</div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">선금 금액:</span>
                <span className="font-medium">¥{item.advance_payment_amount?.toLocaleString() || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">선금 지급일:</span>
                <span>{item.advance_payment_date ? formatDateKST(item.advance_payment_date) : '미지급'}</span>
              </div>
            </div>
          </div>
        )}

        {item.payment_type === 'balance' && (
          <div className="border-t border-gray-200 pt-3 mt-3">
            <div className="text-sm font-medium text-gray-700 mb-2">잔금 정보</div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">잔금 금액:</span>
                <span className="font-medium">¥{item.balance_payment_amount?.toLocaleString() || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">잔금 지급일:</span>
                <span>{item.balance_payment_date ? formatDateKST(item.balance_payment_date) : '미지급'}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (item.source_type === 'packing_list') {
    return (
      <div className="space-y-3">
        <div className="text-sm font-medium text-gray-700 mb-3">패킹리스트 상세 내역</div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">패킹코드:</span>
            <span className="ml-2 font-medium">{item.packing_code}</span>
          </div>
          <div>
            <span className="text-gray-600">배송비:</span>
            <span className="ml-2 font-medium">¥{item.pl_shipping_cost?.toLocaleString() || 0}</span>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-3 mt-3">
          <div className="text-sm font-medium text-gray-700 mb-2">배송비 계산</div>
          <div className="space-y-1 text-sm">
            {item.weight_ratio && (
              <div className="flex justify-between">
                <span className="text-gray-600">비율:</span>
                <span>{item.weight_ratio}%</span>
              </div>
            )}
            {item.calculated_weight && (
              <div className="flex justify-between">
                <span className="text-gray-600">비율 중량:</span>
                <span>{item.calculated_weight.toFixed(2)}kg</span>
              </div>
            )}
            {item.actual_weight && (
              <div className="flex justify-between">
                <span className="text-gray-600">실중량:</span>
                <span>{item.actual_weight.toFixed(2)}kg</span>
              </div>
            )}
            {item.shipping_cost_difference !== undefined && (
              <div className="flex justify-between">
                <span className="text-gray-600">차액:</span>
                <span className={item.shipping_cost_difference >= 0 ? 'text-red-600' : 'text-blue-600'}>
                  ¥{item.shipping_cost_difference.toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-gray-200">
              <span className="text-gray-600">WK 결제일:</span>
              <span>{item.wk_payment_date ? formatDateKST(item.wk_payment_date) : '미지급'}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

