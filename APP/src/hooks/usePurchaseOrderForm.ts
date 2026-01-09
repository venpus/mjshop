/**
 * usePurchaseOrderForm Hook
 * 발주 상세 페이지의 폼 상태를 관리하는 Hook
 */

import { useState, useMemo, useCallback } from 'react';
import type { PurchaseOrderDetail } from '../api/purchaseOrderApi';
import {
  calculateBasicCostTotal,
  calculateShippingCostTotal,
  calculateFinalPaymentAmount,
  calculateExpectedFinalUnitPrice,
} from '../utils/purchaseOrderCalculations';
import { normalizePurchaseOrderFormData } from '../utils/dataNormalization';

export interface PurchaseOrderFormData {
  // 기본 정보
  unitPrice: number;
  backMargin: number;
  quantity: number;
  shippingCost: number;
  warehouseShippingCost: number;
  commissionRate: number;
  commissionType: string;
  packaging: number;
  orderDate: string;
  deliveryDate: string;
  workStartDate: string;
  workEndDate: string;
  isOrderConfirmed: boolean;
  
  // 결제 정보
  advancePaymentRate: number;
  advancePaymentDate: string;
  balancePaymentDate: string;
  
  // 상품 정보
  productName: string;
  productSize: string;
  productWeight: string;
  productPackagingSize: string;
}

export interface UsePurchaseOrderFormReturn {
  formData: PurchaseOrderFormData;
  setFormData: React.Dispatch<React.SetStateAction<PurchaseOrderFormData>>;
  updateField: <K extends keyof PurchaseOrderFormData>(field: K, value: PurchaseOrderFormData[K]) => void;
  
  // 계산된 값들
  orderUnitPrice: number;
  basicCostTotal: number;
  shippingCostTotal: number;
  finalPaymentAmount: number;
  expectedFinalUnitPrice: number;
  
  // 초기화
  initializeFromOrder: (order: PurchaseOrderDetail) => void;
}

const initialFormData: PurchaseOrderFormData = {
  unitPrice: 0,
  backMargin: 0,
  quantity: 0,
  shippingCost: 0,
  warehouseShippingCost: 0,
  commissionRate: 0,
  commissionType: '',
  packaging: 0,
  orderDate: '',
  deliveryDate: '',
  workStartDate: '',
  workEndDate: '',
  isOrderConfirmed: false,
  advancePaymentRate: 0,
  advancePaymentDate: '',
  balancePaymentDate: '',
  productName: '',
  productSize: '',
  productWeight: '',
  productPackagingSize: '',
};

export function usePurchaseOrderForm(
  initialOrder: PurchaseOrderDetail | null
): UsePurchaseOrderFormReturn {
  const [formData, setFormData] = useState<PurchaseOrderFormData>(() => {
    if (!initialOrder) return initialFormData;
    
    return normalizePurchaseOrderFormData({
      unitPrice: initialOrder.unit_price,
      backMargin: initialOrder.back_margin,
      quantity: initialOrder.quantity,
      shippingCost: initialOrder.shipping_cost,
      warehouseShippingCost: initialOrder.warehouse_shipping_cost,
      commissionRate: initialOrder.commission_rate,
      commissionType: initialOrder.commission_type,
      packaging: initialOrder.packaging,
      orderDate: initialOrder.order_date,
      deliveryDate: initialOrder.delivery_date,
      workStartDate: initialOrder.work_start_date,
      workEndDate: initialOrder.work_end_date,
      isOrderConfirmed: initialOrder.is_confirmed,
      advancePaymentRate: initialOrder.advance_payment_rate,
      advancePaymentDate: initialOrder.advance_payment_date,
      balancePaymentDate: initialOrder.balance_payment_date,
      productName: initialOrder.product_name,
      productSize: initialOrder.size,
      productWeight: initialOrder.weight,
      productPackagingSize: initialOrder.packaging?.toString(),
    });
  });

  // 필드 업데이트 헬퍼
  const updateField = useCallback(<K extends keyof PurchaseOrderFormData>(
    field: K,
    value: PurchaseOrderFormData[K]
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  // 초기화 함수
  const initializeFromOrder = useCallback((order: PurchaseOrderDetail) => {
    setFormData(normalizePurchaseOrderFormData({
      unitPrice: order.unit_price,
      backMargin: order.back_margin,
      quantity: order.quantity,
      shippingCost: order.shipping_cost,
      warehouseShippingCost: order.warehouse_shipping_cost,
      commissionRate: order.commission_rate,
      commissionType: order.commission_type,
      packaging: order.packaging,
      orderDate: order.order_date,
      deliveryDate: order.delivery_date,
      workStartDate: order.work_start_date,
      workEndDate: order.work_end_date,
      isOrderConfirmed: order.is_confirmed,
      advancePaymentRate: order.advance_payment_rate,
      advancePaymentDate: order.advance_payment_date,
      balancePaymentDate: order.balance_payment_date,
      productName: order.product_name,
      productSize: order.size,
      productWeight: order.weight,
      productPackagingSize: order.packaging?.toString(),
    }));
  }, []);

  // 계산된 값들
  const orderUnitPrice = useMemo(() => {
    return formData.unitPrice + formData.backMargin;
  }, [formData.unitPrice, formData.backMargin]);

  const basicCostTotal = useMemo(() => {
    return calculateBasicCostTotal(
      formData.unitPrice,
      formData.quantity,
      formData.commissionRate,
      formData.backMargin
    );
  }, [formData.unitPrice, formData.quantity, formData.commissionRate, formData.backMargin]);

  const shippingCostTotal = useMemo(() => {
    return calculateShippingCostTotal(
      formData.shippingCost,
      formData.warehouseShippingCost
    );
  }, [formData.shippingCost, formData.warehouseShippingCost]);

  const finalPaymentAmount = useMemo(() => {
    // option_cost와 labor_cost는 별도로 관리되므로 여기서는 0으로 설정
    // 실제 값은 상위 컴포넌트에서 전달받아야 함
    return calculateFinalPaymentAmount(
      basicCostTotal,
      shippingCostTotal,
      0, // option_cost
      0  // labor_cost
    );
  }, [basicCostTotal, shippingCostTotal]);

  const expectedFinalUnitPrice = useMemo(() => {
    // packing_list_shipping_cost는 별도로 관리되므로 여기서는 0으로 설정
    return calculateExpectedFinalUnitPrice(
      finalPaymentAmount,
      0, // packing_list_shipping_cost
      formData.quantity
    );
  }, [finalPaymentAmount, formData.quantity]);

  return {
    formData,
    setFormData,
    updateField,
    orderUnitPrice,
    basicCostTotal,
    shippingCostTotal,
    finalPaymentAmount,
    expectedFinalUnitPrice,
    initializeFromOrder,
  };
}

