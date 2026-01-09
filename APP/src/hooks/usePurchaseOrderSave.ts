/**
 * usePurchaseOrderSave Hook
 * 발주 상세 페이지의 저장 로직 및 변경 감지를 담당하는 Hook
 */

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Alert } from 'react-native';
import type { PurchaseOrderDetail, UpdatePurchaseOrderData } from '../api/purchaseOrderApi';
import { updatePurchaseOrder, updatePurchaseOrderCostItems, updateFactoryShipments, updateReturnExchanges, uploadPurchaseOrderImages } from '../api/purchaseOrderApi';
import type { PurchaseOrderFormData } from './usePurchaseOrderForm';
import type { LaborCostItem } from '../components/purchase-order/tabs/CostPaymentTab';
import type { FactoryShipment, ReturnExchangeItem } from '../components/purchase-order/tabs/FactoryShippingTab';
import { normalizePurchaseOrderFormData, areFormDataEqual, normalizeDateValue } from '../utils/dataNormalization';

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
  factoryShipments?: FactoryShipment[];
  returnExchangeItems?: ReturnExchangeItem[];
}

export interface UsePurchaseOrderSaveProps {
  orderId: string;
  formData: PurchaseOrderFormData;
  originalOrder: PurchaseOrderDetail | null;
  optionItems?: LaborCostItem[];
  laborCostItems?: LaborCostItem[];
  factoryShipments?: FactoryShipment[];
  returnExchangeItems?: ReturnExchangeItem[];
  userLevel?: string;
  isSuperAdmin?: boolean;
}

export interface UsePurchaseOrderSaveReturn {
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: Date | null;
  handleSave: (force?: boolean, overrideData?: {
    formData?: PurchaseOrderFormData;
    optionItems?: LaborCostItem[];
    laborCostItems?: LaborCostItem[];
    factoryShipments?: FactoryShipment[];
    returnExchangeItems?: ReturnExchangeItem[];
  }) => Promise<void>;
  setOriginalData: (data: OriginalData) => void;
}

export function usePurchaseOrderSave({
  orderId,
  formData,
  originalOrder,
  optionItems = [],
  laborCostItems = [],
  factoryShipments = [],
  returnExchangeItems = [],
  userLevel,
  isSuperAdmin = false,
}: UsePurchaseOrderSaveProps): UsePurchaseOrderSaveReturn {
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const originalDataRef = useRef<OriginalData | null>(null);
  const originalCostItemsRef = useRef<{ optionItems: LaborCostItem[]; laborCostItems: LaborCostItem[] } | null>(null);
  const originalFactoryShipmentsRef = useRef<FactoryShipment[] | null>(null);
  const originalReturnExchangeItemsRef = useRef<ReturnExchangeItem[] | null>(null);

  // 원본 데이터 설정 함수
  const setOriginalData = useCallback((data: OriginalData) => {
    originalDataRef.current = data;
    // 원본 데이터 설정 직후에는 변경사항이 없으므로 false로 설정
    setIsDirty(false);
  }, []);

  // 날짜 정규화는 공통 유틸 함수 사용

  // 초기 원본 데이터 설정
  useEffect(() => {
    if (originalOrder && !originalDataRef.current) {
      const normalized = normalizePurchaseOrderFormData({
        unitPrice: originalOrder.unit_price,
        backMargin: originalOrder.back_margin,
        quantity: originalOrder.quantity,
        shippingCost: originalOrder.shipping_cost,
        warehouseShippingCost: originalOrder.warehouse_shipping_cost,
        commissionRate: originalOrder.commission_rate,
        commissionType: originalOrder.commission_type,
        advancePaymentRate: originalOrder.advance_payment_rate,
        advancePaymentDate: originalOrder.advance_payment_date,
        balancePaymentDate: originalOrder.balance_payment_date,
        packaging: originalOrder.packaging,
        orderDate: originalOrder.order_date,
        deliveryDate: originalOrder.delivery_date,
        workStartDate: originalOrder.work_start_date,
        workEndDate: originalOrder.work_end_date,
        isOrderConfirmed: originalOrder.is_confirmed,
        productName: originalOrder.product_name,
        productSize: originalOrder.size,
        productWeight: originalOrder.weight,
        productPackagingSize: originalOrder.packaging?.toString(),
      });
      originalDataRef.current = normalized;
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
      // 원본 데이터 설정 후 변경사항 체크
      if (originalDataRef.current) {
        const hasChanges = checkForChanges();
        setIsDirty(hasChanges);
      }
    }
  }, [optionItems, laborCostItems, checkForChanges]);

  // 원본 factory shipments 및 return exchanges 설정
  useEffect(() => {
    if (!originalFactoryShipmentsRef.current && factoryShipments.length > 0) {
      originalFactoryShipmentsRef.current = JSON.parse(JSON.stringify(factoryShipments.map(s => ({ ...s, pendingImages: undefined }))));
    }
    if (!originalReturnExchangeItemsRef.current && returnExchangeItems.length > 0) {
      originalReturnExchangeItemsRef.current = JSON.parse(JSON.stringify(returnExchangeItems.map(r => ({ ...r, pendingImages: undefined }))));
    }
    // 원본 데이터 설정 후 변경사항 체크
    if (originalDataRef.current && (originalFactoryShipmentsRef.current || originalReturnExchangeItemsRef.current)) {
      const hasChanges = checkForChanges();
      setIsDirty(hasChanges);
    }
  }, [factoryShipments, returnExchangeItems, checkForChanges]);

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

  // FactoryShipment 배열 비교 헬퍼 (이미지 제외)
  const areFactoryShipmentsEqual = useCallback((a: FactoryShipment[], b: FactoryShipment[]): boolean => {
    if (a.length !== b.length) return false;
    const aSorted = [...a].map(s => ({ id: s.id, shipped_date: s.shipped_date, shipped_quantity: s.shipped_quantity, tracking_number: s.tracking_number, notes: s.notes }))
      .sort((x, y) => x.id.localeCompare(y.id));
    const bSorted = [...b].map(s => ({ id: s.id, shipped_date: s.shipped_date, shipped_quantity: s.shipped_quantity, tracking_number: s.tracking_number, notes: s.notes }))
      .sort((x, y) => x.id.localeCompare(y.id));
    return aSorted.every((item, index) => {
      const bItem = bSorted[index];
      return (
        item.id === bItem.id &&
        item.shipped_date === bItem.shipped_date &&
        item.shipped_quantity === bItem.shipped_quantity &&
        item.tracking_number === bItem.tracking_number &&
        item.notes === bItem.notes
      );
    });
  }, []);

  // ReturnExchangeItem 배열 비교 헬퍼 (이미지 제외)
  const areReturnExchangeItemsEqual = useCallback((a: ReturnExchangeItem[], b: ReturnExchangeItem[]): boolean => {
    if (a.length !== b.length) return false;
    const aSorted = [...a].map(item => ({ id: item.id, return_date: item.return_date, return_quantity: item.return_quantity, reason: item.reason }))
      .sort((x, y) => x.id.localeCompare(y.id));
    const bSorted = [...b].map(item => ({ id: item.id, return_date: item.return_date, return_quantity: item.return_quantity, reason: item.reason }))
      .sort((x, y) => x.id.localeCompare(y.id));
    return aSorted.every((item, index) => {
      const bItem = bSorted[index];
      return (
        item.id === bItem.id &&
        item.return_date === bItem.return_date &&
        item.return_quantity === bItem.return_quantity &&
        item.reason === bItem.reason
      );
    });
  }, []);

  // 날짜 정규화는 공통 유틸 함수 사용 (normalizeDateValue)

  // normalizeValue는 더 이상 필요하지 않음 (normalizePurchaseOrderFormData에서 처리)

  // 변경 감지
  const checkForChanges = useCallback((): boolean => {
    if (!originalDataRef.current) {
      // 원본 데이터가 없으면 변경사항 없음으로 처리
      return false;
    }

    const original = originalDataRef.current;

    // formData를 정규화하여 비교 (일관된 비교를 위해)
    const normalizedFormData = normalizePurchaseOrderFormData({
      unitPrice: formData.unitPrice,
      backMargin: formData.backMargin,
      quantity: formData.quantity,
      shippingCost: formData.shippingCost,
      warehouseShippingCost: formData.warehouseShippingCost,
      commissionRate: formData.commissionRate,
      commissionType: formData.commissionType,
      advancePaymentRate: formData.advancePaymentRate,
      advancePaymentDate: formData.advancePaymentDate,
      balancePaymentDate: formData.balancePaymentDate,
      packaging: formData.packaging,
      orderDate: formData.orderDate,
      deliveryDate: formData.deliveryDate,
      workStartDate: formData.workStartDate,
      workEndDate: formData.workEndDate,
      isOrderConfirmed: formData.isOrderConfirmed,
      productName: formData.productName,
      productSize: formData.productSize,
      productWeight: formData.productWeight,
      productPackagingSize: formData.productPackagingSize,
    });

    // 정규화된 데이터를 사용하여 비교
    const hasFormChanges = !areFormDataEqual(normalizedFormData, original);

    // cost items 변경 확인
    const originalCostItems = originalCostItemsRef.current;
    const hasCostItemsChanges =
      !originalCostItems ||
      !areCostItemsEqual(optionItems, originalCostItems.optionItems) ||
      !areCostItemsEqual(laborCostItems, originalCostItems.laborCostItems);

    // factory shipments 변경 확인
    const originalFactoryShipments = originalFactoryShipmentsRef.current || [];
    const hasFactoryShipmentsChanges = !areFactoryShipmentsEqual(factoryShipments, originalFactoryShipments);
    const hasFactoryShipmentsPendingImages = factoryShipments.some(s => s.pendingImages && s.pendingImages.length > 0);

    // return exchanges 변경 확인
    const originalReturnExchanges = originalReturnExchangeItemsRef.current || [];
    const hasReturnExchangesChanges = !areReturnExchangeItemsEqual(returnExchangeItems, originalReturnExchanges);
    const hasReturnExchangesPendingImages = returnExchangeItems.some(r => r.pendingImages && r.pendingImages.length > 0);

    return hasFormChanges || hasCostItemsChanges || hasFactoryShipmentsChanges || hasFactoryShipmentsPendingImages || hasReturnExchangesChanges || hasReturnExchangesPendingImages;
  }, [formData, optionItems, laborCostItems, factoryShipments, returnExchangeItems, areCostItemsEqual, areFactoryShipmentsEqual, areReturnExchangeItemsEqual]);

  // 변경 감지 useEffect
  useEffect(() => {
    // originalDataRef가 설정되지 않았으면 변경사항 없음으로 처리
    if (!originalDataRef.current) {
      setIsDirty(false);
      return;
    }
    
    const hasChanges = checkForChanges();
    setIsDirty(hasChanges);
  }, [formData, optionItems, laborCostItems, factoryShipments, returnExchangeItems, checkForChanges]);

  // 저장 함수
  const handleSave = useCallback(async (
    force: boolean = false,
    overrideData?: {
      formData?: PurchaseOrderFormData;
      optionItems?: LaborCostItem[];
      laborCostItems?: LaborCostItem[];
      factoryShipments?: FactoryShipment[];
      returnExchangeItems?: ReturnExchangeItem[];
    }
  ) => {
    if (isSaving) {
      return;
    }

    // force가 true가 아니고 변경사항이 없으면 저장하지 않음
    if (!force && !isDirty) {
      Alert.alert('알림', '변경된 내용이 없습니다.');
      return;
    }

    try {
      setIsSaving(true);

      // overrideData가 제공되면 사용, 아니면 현재 상태 사용
      const currentFormData = overrideData?.formData ?? formData;
      const currentOptionItems = overrideData?.optionItems ?? optionItems;
      const currentLaborCostItems = overrideData?.laborCostItems ?? laborCostItems;
      const currentFactoryShipments = overrideData?.factoryShipments ?? factoryShipments;
      const currentReturnExchangeItems = overrideData?.returnExchangeItems ?? returnExchangeItems;

      // 날짜 정규화 헬퍼 함수 (서버 전송용 - null 허용)
      const normalizeDateForServer = (date: string | null | undefined): string | null => {
        if (!date) return null;
        const normalized = normalizeDateValue(date);
        return normalized || null;
      };

      const updateData: UpdatePurchaseOrderData = {
        unit_price: currentFormData.unitPrice,
        back_margin: currentFormData.backMargin || null,
        quantity: currentFormData.quantity,
        shipping_cost: currentFormData.shippingCost || 0,
        warehouse_shipping_cost: currentFormData.warehouseShippingCost || 0,
        commission_rate: currentFormData.commissionRate || 0,
        commission_type: currentFormData.commissionType || null,
        advance_payment_rate: currentFormData.advancePaymentRate || 0,
        advance_payment_date: normalizeDateForServer(currentFormData.advancePaymentDate),
        balance_payment_date: normalizeDateForServer(currentFormData.balancePaymentDate),
        packaging: currentFormData.packaging || 0,
        order_date: normalizeDateForServer(currentFormData.orderDate),
        estimated_delivery: normalizeDateForServer(currentFormData.deliveryDate),
        work_start_date: normalizeDateForServer(currentFormData.workStartDate),
        work_end_date: normalizeDateForServer(currentFormData.workEndDate),
        is_confirmed: currentFormData.isOrderConfirmed,
        product_name: currentFormData.productName || undefined,
        product_size: currentFormData.productSize || undefined,
        product_weight: currentFormData.productWeight || undefined,
        product_packaging_size: currentFormData.productPackagingSize || undefined,
      };

      const updatedOrder = await updatePurchaseOrder(orderId, updateData);

      // 비용 항목 저장
      // A 레벨 관리자가 아닌 경우 isAdminOnly === true인 항목 제외
      const filteredOptionItems = isSuperAdmin
        ? currentOptionItems
        : currentOptionItems.filter((item) => item.isAdminOnly !== true);
      const filteredLaborCostItems = isSuperAdmin
        ? currentLaborCostItems
        : currentLaborCostItems.filter((item) => item.isAdminOnly !== true);

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

      // factory shipments 저장
      const shipments = currentFactoryShipments.map((shipment, index) => {
        // 임시 ID 판별: temp_로 시작하거나 13자리 이상 숫자
        const isTemporaryId = shipment.id.startsWith('temp_') || (shipment.id.length >= 13 && /^\d+$/.test(shipment.id));
        return {
          id: isTemporaryId ? undefined : (parseInt(shipment.id) || undefined),
          shipment_date: shipment.shipped_date || null,
          quantity: shipment.shipped_quantity || 0,
          tracking_number: shipment.tracking_number || null,
          receive_date: null, // 클라이언트와 달리 receive_date는 없음
          display_order: index,
        };
      });

      const savedShipmentIds = await updateFactoryShipments(orderId, shipments);

      // pendingImages가 있는 shipment들의 이미지 업로드
      for (let i = 0; i < currentFactoryShipments.length; i++) {
        const shipment = currentFactoryShipments[i];
        if (shipment.pendingImages && shipment.pendingImages.length > 0 && savedShipmentIds[i]) {
          try {
            await uploadPurchaseOrderImages(
              orderId,
              'factory-shipment',
              savedShipmentIds[i],
              shipment.pendingImages
            );
          } catch (imageError: any) {
            console.error(`출고 항목 ${savedShipmentIds[i]} 이미지 업로드 오류:`, imageError);
            // 이미지 업로드 실패는 치명적이지 않으므로 계속 진행
          }
        }
      }

      // return exchanges 저장
      const returnExchanges = currentReturnExchangeItems.map((item, index) => {
        // 임시 ID 판별: temp_로 시작하거나 13자리 이상 숫자
        const isTemporaryId = item.id.startsWith('temp_') || (item.id.length >= 13 && /^\d+$/.test(item.id));
        return {
          id: isTemporaryId ? undefined : (parseInt(item.id) || undefined),
          return_date: item.return_date || null,
          quantity: item.return_quantity || 0,
          tracking_number: null, // 클라이언트와 달리 tracking_number는 없음
          receive_date: null, // 클라이언트와 달리 receive_date는 없음
          reason: item.reason || null,
          display_order: index,
        };
      });

      const savedReturnExchangeIds = await updateReturnExchanges(orderId, returnExchanges);

      // pendingImages가 있는 return exchange 항목들의 이미지 업로드
      for (let i = 0; i < currentReturnExchangeItems.length; i++) {
        const item = currentReturnExchangeItems[i];
        if (item.pendingImages && item.pendingImages.length > 0 && savedReturnExchangeIds[i]) {
          try {
            await uploadPurchaseOrderImages(
              orderId,
              'return-exchange',
              savedReturnExchangeIds[i],
              item.pendingImages
            );
          } catch (imageError: any) {
            console.error(`반품/교환 항목 ${savedReturnExchangeIds[i]} 이미지 업로드 오류:`, imageError);
            // 이미지 업로드 실패는 치명적이지 않으므로 계속 진행
          }
        }
      }

      // 원본 데이터 업데이트는 loadOrderDetail에서 수행하므로 여기서는 하지 않음
      // loadOrderDetail이 호출되면 setOriginalData가 호출되어 originalDataRef.current가 업데이트되고
      // setIsDirty(false)가 호출되므로, 여기서는 setIsDirty(false)만 호출
      
      // 원본 cost items 업데이트
      originalCostItemsRef.current = {
        optionItems: JSON.parse(JSON.stringify(currentOptionItems)),
        laborCostItems: JSON.parse(JSON.stringify(currentLaborCostItems)),
      };

      // 원본 factory shipments 및 return exchanges 업데이트
      originalFactoryShipmentsRef.current = JSON.parse(JSON.stringify(currentFactoryShipments.map(s => ({ ...s, pendingImages: undefined }))));
      originalReturnExchangeItemsRef.current = JSON.parse(JSON.stringify(currentReturnExchangeItems.map(r => ({ ...r, pendingImages: undefined }))));

      setLastSavedAt(new Date());
      // setIsDirty(false)는 loadOrderDetail 후 setOriginalData에서 호출되므로 여기서는 호출하지 않음
      // 하지만 모달에서 저장 후 loadOrderDetail을 호출하지 않는 경우를 대비하여 여기서도 호출
      setIsDirty(false);

      Alert.alert('성공', '저장되었습니다.');
    } catch (error: any) {
      console.error('발주 정보 저장 오류:', error);
      Alert.alert('오류', error.message || '저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  }, [orderId, formData, optionItems, laborCostItems, factoryShipments, returnExchangeItems, isDirty, isSaving, isSuperAdmin, userLevel, normalizeDateValue]);

  return {
    isDirty,
    isSaving,
    lastSavedAt,
    handleSave,
    setOriginalData,
  };
}

