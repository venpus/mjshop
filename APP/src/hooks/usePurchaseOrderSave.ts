/**
 * usePurchaseOrderSave Hook
 * 발주 상세 페이지의 저장 로직 및 변경 감지를 담당하는 Hook
 */

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Alert } from 'react-native';
import type { PurchaseOrderDetail, UpdatePurchaseOrderData } from '../api/purchaseOrderApi';
import { updatePurchaseOrder, updatePurchaseOrderCostItems } from '../api/purchaseOrderApi';
import type { PurchaseOrderFormData } from './usePurchaseOrderForm';
import type { LaborCostItem } from '../components/purchase-order/tabs/CostPaymentTab';

export interface OriginalData {
  unitPrice: number;
  backMargin: number;
  quantity: number;
  shippingCost: number;
  warehouseShippingCost: number;
  commissionRate: number;
  commissionType: string;
  advancePaymentRate: number;
  advancePaymentDate: string;
  balancePaymentDate: string;
  packaging: number;
  orderDate: string;
  deliveryDate: string;
  workStartDate: string;
  workEndDate: string;
  isOrderConfirmed: boolean;
  productName: string;
  productSize: string;
  productWeight: string;
  productPackagingSize: string;
  optionItems?: LaborCostItem[];
  laborCostItems?: LaborCostItem[];
}

export interface UsePurchaseOrderSaveProps {
  orderId: string;
  formData: PurchaseOrderFormData;
  originalOrder: PurchaseOrderDetail | null;
  optionItems?: LaborCostItem[];
  laborCostItems?: LaborCostItem[];
  userLevel?: string;
  isSuperAdmin?: boolean;
}

export interface UsePurchaseOrderSaveReturn {
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: Date | null;
  handleSave: () => Promise<void>;
  setOriginalData: (data: OriginalData) => void;
}

export function usePurchaseOrderSave({
  orderId,
  formData,
  originalOrder,
  optionItems = [],
  laborCostItems = [],
  userLevel,
  isSuperAdmin = false,
}: UsePurchaseOrderSaveProps): UsePurchaseOrderSaveReturn {
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const originalDataRef = useRef<OriginalData | null>(null);
  const originalCostItemsRef = useRef<{ optionItems: LaborCostItem[]; laborCostItems: LaborCostItem[] } | null>(null);

  // 원본 데이터 설정 함수
  const setOriginalData = useCallback((data: OriginalData) => {
    originalDataRef.current = data;
    setIsDirty(false);
  }, []);

  // 초기 원본 데이터 설정
  useEffect(() => {
    if (originalOrder && !originalDataRef.current) {
      originalDataRef.current = {
        unitPrice: originalOrder.unit_price || 0,
        backMargin: originalOrder.back_margin || 0,
        quantity: originalOrder.quantity || 0,
        shippingCost: originalOrder.shipping_cost || 0,
        warehouseShippingCost: originalOrder.warehouse_shipping_cost || 0,
        commissionRate: originalOrder.commission_rate || 0,
        commissionType: originalOrder.commission_type || '',
        advancePaymentRate: originalOrder.advance_payment_rate || 0,
        advancePaymentDate: originalOrder.advance_payment_date || '',
        balancePaymentDate: originalOrder.balance_payment_date || '',
        packaging: originalOrder.packaging || 0,
        orderDate: originalOrder.order_date || '',
        deliveryDate: originalOrder.delivery_date || '',
        workStartDate: originalOrder.work_start_date || '',
        workEndDate: originalOrder.work_end_date || '',
        isOrderConfirmed: originalOrder.is_confirmed || false,
        productName: originalOrder.product_name || '',
        productSize: originalOrder.size || '',
        productWeight: originalOrder.weight || '',
        productPackagingSize: originalOrder.packaging?.toString() || '',
      };
      setIsDirty(false);
    }
  }, [originalOrder]);

  // 원본 cost items 설정 (항상 호출되어야 함)
  useEffect(() => {
    if (!originalCostItemsRef.current && (optionItems.length > 0 || laborCostItems.length > 0)) {
      originalCostItemsRef.current = {
        optionItems: JSON.parse(JSON.stringify(optionItems)),
        laborCostItems: JSON.parse(JSON.stringify(laborCostItems)),
      };
    }
  }, [optionItems, laborCostItems]);

  // 배열 비교 헬퍼
  const areCostItemsEqual = useCallback((a: LaborCostItem[], b: LaborCostItem[]): boolean => {
    if (a.length !== b.length) return false;
    const aSorted = [...a].sort((x, y) => x.id.localeCompare(y.id));
    const bSorted = [...b].sort((x, y) => x.id.localeCompare(y.id));
    return aSorted.every((item, index) => {
      const bItem = bSorted[index];
      return (
        item.id === bItem.id &&
        item.name === bItem.name &&
        item.unit_price === bItem.unit_price &&
        item.quantity === bItem.quantity &&
        item.isAdminOnly === bItem.isAdminOnly
      );
    });
  }, []);

  // 변경 감지
  const checkForChanges = useCallback((): boolean => {
    if (!originalDataRef.current) {
      // 원본 데이터가 없으면 변경사항 없음으로 처리
      return false;
    }

    const original = originalDataRef.current;

    // 각 필드 비교
    const hasFormChanges =
      formData.unitPrice !== original.unitPrice ||
      formData.backMargin !== original.backMargin ||
      formData.quantity !== original.quantity ||
      formData.shippingCost !== original.shippingCost ||
      formData.warehouseShippingCost !== original.warehouseShippingCost ||
      formData.commissionRate !== original.commissionRate ||
      formData.commissionType !== original.commissionType ||
      formData.advancePaymentRate !== original.advancePaymentRate ||
      formData.advancePaymentDate !== original.advancePaymentDate ||
      formData.balancePaymentDate !== original.balancePaymentDate ||
      formData.packaging !== original.packaging ||
      formData.orderDate !== original.orderDate ||
      formData.deliveryDate !== original.deliveryDate ||
      formData.workStartDate !== original.workStartDate ||
      formData.workEndDate !== original.workEndDate ||
      formData.isOrderConfirmed !== original.isOrderConfirmed ||
      formData.productName !== original.productName ||
      formData.productSize !== original.productSize ||
      formData.productWeight !== original.productWeight ||
      formData.productPackagingSize !== original.productPackagingSize;

    // cost items 변경 확인
    const originalCostItems = originalCostItemsRef.current;
    const hasCostItemsChanges =
      !originalCostItems ||
      !areCostItemsEqual(optionItems, originalCostItems.optionItems) ||
      !areCostItemsEqual(laborCostItems, originalCostItems.laborCostItems);

    return hasFormChanges || hasCostItemsChanges;
  }, [formData, optionItems, laborCostItems, areCostItemsEqual]);

  // 변경 감지 useEffect
  useEffect(() => {
    const hasChanges = checkForChanges();
    setIsDirty(hasChanges);
  }, [checkForChanges]);

  // 저장 함수
  const handleSave = useCallback(async () => {
    if (isSaving) {
      return;
    }

    if (!isDirty) {
      Alert.alert('알림', '변경된 내용이 없습니다.');
      return;
    }

    try {
      setIsSaving(true);

      const updateData: UpdatePurchaseOrderData = {
        unit_price: formData.unitPrice,
        back_margin: formData.backMargin || null,
        quantity: formData.quantity,
        shipping_cost: formData.shippingCost || 0,
        warehouse_shipping_cost: formData.warehouseShippingCost || 0,
        commission_rate: formData.commissionRate || 0,
        commission_type: formData.commissionType || null,
        advance_payment_rate: formData.advancePaymentRate || 0,
        advance_payment_date: formData.advancePaymentDate || null,
        balance_payment_date: formData.balancePaymentDate || null,
        packaging: formData.packaging || 0,
        order_date: formData.orderDate || null,
        estimated_delivery: formData.deliveryDate || null,
        work_start_date: formData.workStartDate || null,
        work_end_date: formData.workEndDate || null,
        is_confirmed: formData.isOrderConfirmed,
        product_name: formData.productName || undefined,
        product_size: formData.productSize || undefined,
        product_weight: formData.productWeight || undefined,
        product_packaging_size: formData.productPackagingSize || undefined,
      };

      const updatedOrder = await updatePurchaseOrder(orderId, updateData);

      // 비용 항목 저장
      // A 레벨 관리자가 아닌 경우 isAdminOnly === true인 항목 제외
      const filteredOptionItems = isSuperAdmin
        ? optionItems
        : optionItems.filter((item) => item.isAdminOnly !== true);
      const filteredLaborCostItems = isSuperAdmin
        ? laborCostItems
        : laborCostItems.filter((item) => item.isAdminOnly !== true);

      const costItems = [
        ...filteredOptionItems.map((item, index) => ({
          item_type: 'option' as const,
          name: item.name,
          unit_price: item.unit_price,
          quantity: item.quantity,
          is_admin_only: item.isAdminOnly === true,
          display_order: index,
        })),
        ...filteredLaborCostItems.map((item, index) => ({
          item_type: 'labor' as const,
          name: item.name,
          unit_price: item.unit_price,
          quantity: item.quantity,
          is_admin_only: item.isAdminOnly === true,
          display_order: index,
        })),
      ];

      // 전송 전 검증: A 레벨 관리자가 아닌 경우 is_admin_only가 true인 항목이 있는지 확인
      const hasAdminOnlyItems = costItems.some((item) => item.is_admin_only === true);
      if (!isSuperAdmin && hasAdminOnlyItems) {
        throw new Error('A 레벨 관리자 전용 항목이 포함되어 있어 저장할 수 없습니다. 페이지를 새로고침해주세요.');
      }

      await updatePurchaseOrderCostItems(orderId, costItems, userLevel);

      // 원본 데이터 업데이트
      if (originalDataRef.current) {
        originalDataRef.current = {
          unitPrice: updatedOrder.unit_price || 0,
          backMargin: updatedOrder.back_margin || 0,
          quantity: updatedOrder.quantity || 0,
          shippingCost: updatedOrder.shipping_cost || 0,
          warehouseShippingCost: updatedOrder.warehouse_shipping_cost || 0,
          commissionRate: updatedOrder.commission_rate || 0,
          commissionType: updatedOrder.commission_type || '',
          advancePaymentRate: updatedOrder.advance_payment_rate || 0,
          advancePaymentDate: updatedOrder.advance_payment_date || '',
          balancePaymentDate: updatedOrder.balance_payment_date || '',
          packaging: updatedOrder.packaging || 0,
          orderDate: updatedOrder.order_date || '',
          deliveryDate: updatedOrder.delivery_date || '',
          workStartDate: updatedOrder.work_start_date || '',
          workEndDate: updatedOrder.work_end_date || '',
          isOrderConfirmed: updatedOrder.is_confirmed || false,
          productName: updatedOrder.product_name || '',
          productSize: updatedOrder.size || '',
          productWeight: updatedOrder.weight || '',
          productPackagingSize: updatedOrder.packaging?.toString() || '',
        };
      }

      // 원본 cost items 업데이트
      originalCostItemsRef.current = {
        optionItems: JSON.parse(JSON.stringify(optionItems)),
        laborCostItems: JSON.parse(JSON.stringify(laborCostItems)),
      };

      setLastSavedAt(new Date());
      setIsDirty(false);

      Alert.alert('성공', '저장되었습니다.');
    } catch (error: any) {
      console.error('발주 정보 저장 오류:', error);
      Alert.alert('오류', error.message || '저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  }, [orderId, formData, isDirty, isSaving]);

  return {
    isDirty,
    isSaving,
    lastSavedAt,
    handleSave,
    setOriginalData,
  };
}

