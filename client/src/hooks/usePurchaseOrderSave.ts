import { useState, useEffect, useRef, useCallback } from "react";
import type { FactoryShipment, ReturnExchangeItem } from "../components/tabs/FactoryShippingTab";
import type { LaborCostItem } from "../components/tabs/CostPaymentTab";
import type { WorkItem } from "../components/tabs/ProcessingPackagingTab";
import { 
  calculateBasicCostTotal, 
  calculateShippingCostTotal, 
  calculateTotalOptionCost,
  calculateTotalLaborCost,
  calculateFinalPaymentAmount,
  calculateBalancePaymentAmount
} from "../utils/purchaseOrderCalculations";
import type { DeliverySet } from "../components/tabs/LogisticsDeliveryTab";
import type { PurchaseOrder } from "./usePurchaseOrderData";
import { formatDateForInput } from "../utils/dateUtils";

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface OriginalData {
  unit_price: number;
  back_margin: number;
  quantity: number;
  shipping_cost: number;
  warehouse_shipping_cost: number;
  commission_rate: number;
  commission_type: string;
  advance_payment_rate: number;
  advance_payment_date: string;
  balance_payment_date: string;
  packaging: number;
  order_date: string;
  estimated_delivery: string;
  work_start_date: string;
  work_end_date: string;
  is_confirmed: boolean;
  optionItems: LaborCostItem[];
  laborCostItems: LaborCostItem[];
  factoryShipments: FactoryShipment[];
  returnExchangeItems: ReturnExchangeItem[];
  workItems: WorkItem[];
  deliverySets: DeliverySet[];
  // 상품 정보 필드
  product_name?: string;
  product_size?: string;
  product_weight?: string;
  product_packaging_size?: string;
}

interface UsePurchaseOrderSaveProps {
  order: PurchaseOrder | null;
  isSuperAdmin?: boolean; // A 레벨 관리자 여부
  userLevel?: 'A-SuperAdmin' | 'S: Admin' | 'B0: 중국Admin' | 'C0: 한국Admin'; // 사용자 레벨
  orderId: string;
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
  optionItems: LaborCostItem[];
  laborCostItems: LaborCostItem[];
  factoryShipments: FactoryShipment[];
  returnExchangeItems: ReturnExchangeItem[];
  workItems: WorkItem[];
  deliverySets: DeliverySet[];
  setOptionItems: React.Dispatch<React.SetStateAction<LaborCostItem[]>>;
  setLaborCostItems: React.Dispatch<React.SetStateAction<LaborCostItem[]>>;
  setFactoryShipments: React.Dispatch<React.SetStateAction<FactoryShipment[]>>;
  setReturnExchangeItems: React.Dispatch<React.SetStateAction<ReturnExchangeItem[]>>;
  setWorkItems: React.Dispatch<React.SetStateAction<WorkItem[]>>;
  setDeliverySets: React.Dispatch<React.SetStateAction<DeliverySet[]>>;
  reloadCostItems: () => Promise<void>;
  reloadFactoryShipments: () => Promise<void>;
  reloadReturnExchanges: () => Promise<void>;
  reloadWorkItems: () => Promise<void>;
  reloadDeliverySets: () => Promise<void>;
  currentUserId: string;
  onUpdateOriginalData?: (data: OriginalData) => void;
  // 상품 정보 필드 (새 발주일 때 사용)
  productName?: string;
  productSize?: string;
  productWeight?: string;
  productPackagingSize?: string;
}

interface UsePurchaseOrderSaveReturn {
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: Date | null;
  handleSave: (isManual?: boolean) => Promise<string | void>; // 새 발주 저장 시 ID 반환
  setOriginalData: (data: OriginalData) => void;
}

/**
 * 배열 비교 헬퍼 함수
 */
function areArraysEqual(a: LaborCostItem[], b: LaborCostItem[]): boolean {
  if (a.length !== b.length) return false;
  const aSorted = [...a].sort((x, y) => x.id.localeCompare(y.id));
  const bSorted = [...b].sort((x, y) => x.id.localeCompare(y.id));
  return aSorted.every((item, index) => 
    item.id === bSorted[index].id &&
    item.name === bSorted[index].name &&
    item.cost === bSorted[index].cost
  );
}

/**
 * FactoryShipment 배열 비교 헬퍼 함수
 */
function areFactoryShipmentsEqual(a: FactoryShipment[], b: FactoryShipment[]): boolean {
  if (a.length !== b.length) return false;
  // 이미지 제외하고 비교 (이미지는 별도로 관리)
  const aSorted = [...a].map(s => ({ id: s.id, date: s.date, quantity: s.quantity, trackingNumber: s.trackingNumber, receiveDate: s.receiveDate }))
    .sort((x, y) => x.id.localeCompare(y.id));
  const bSorted = [...b].map(s => ({ id: s.id, date: s.date, quantity: s.quantity, trackingNumber: s.trackingNumber, receiveDate: s.receiveDate }))
    .sort((x, y) => x.id.localeCompare(y.id));
  return aSorted.every((item, index) => 
    item.id === bSorted[index].id &&
    item.date === bSorted[index].date &&
    item.quantity === bSorted[index].quantity &&
    item.trackingNumber === bSorted[index].trackingNumber &&
    item.receiveDate === bSorted[index].receiveDate
  );
}

/**
 * ReturnExchangeItem 배열 비교 헬퍼 함수
 */
function areReturnExchangeItemsEqual(a: ReturnExchangeItem[], b: ReturnExchangeItem[]): boolean {
  if (a.length !== b.length) return false;
  // 이미지 제외하고 비교 (이미지는 별도로 관리)
  const aSorted = [...a].map(item => ({ id: item.id, date: item.date, quantity: item.quantity, trackingNumber: item.trackingNumber, receiveDate: item.receiveDate }))
    .sort((x, y) => x.id.localeCompare(y.id));
  const bSorted = [...b].map(item => ({ id: item.id, date: item.date, quantity: item.quantity, trackingNumber: item.trackingNumber, receiveDate: item.receiveDate }))
    .sort((x, y) => x.id.localeCompare(y.id));
  return aSorted.every((item, index) => 
    item.id === bSorted[index].id &&
    item.date === bSorted[index].date &&
    item.quantity === bSorted[index].quantity &&
    item.trackingNumber === bSorted[index].trackingNumber &&
    item.receiveDate === bSorted[index].receiveDate
  );
}

/**
 * WorkItem 배열 비교 헬퍼 함수
 */
function areWorkItemsEqual(a: WorkItem[], b: WorkItem[]): boolean {
  if (a.length !== b.length) return false;
  // 이미지 제외하고 비교 (이미지는 별도로 관리)
  const aSorted = [...a].map(item => ({ id: item.id, descriptionKo: item.descriptionKo, descriptionZh: item.descriptionZh, isCompleted: item.isCompleted }))
    .sort((x, y) => x.id.localeCompare(y.id));
  const bSorted = [...b].map(item => ({ id: item.id, descriptionKo: item.descriptionKo, descriptionZh: item.descriptionZh, isCompleted: item.isCompleted }))
    .sort((x, y) => x.id.localeCompare(y.id));
  return aSorted.every((item, index) => 
    item.id === bSorted[index].id &&
    item.descriptionKo === bSorted[index].descriptionKo &&
    item.descriptionZh === bSorted[index].descriptionZh &&
    item.isCompleted === bSorted[index].isCompleted
  );
}

/**
 * DeliverySet 배열 비교 헬퍼 함수
 */
function areDeliverySetsEqual(a: DeliverySet[] | undefined, b: DeliverySet[] | undefined): boolean {
  if (!a || !b) return a === b; // 둘 다 undefined면 true, 하나만 undefined면 false
  if (a.length !== b.length) return false;
  // 이미지와 pendingImages 제외하고 비교
  const aSorted = [...a].map(set => ({
    id: set.id,
    packingCode: set.packingCode,
    date: set.date,
    packageInfoList: (set.packageInfoList || []).map(pkg => ({
      id: pkg.id,
      types: pkg.types,
      pieces: pkg.pieces,
      sets: pkg.sets,
      total: pkg.total,
      method: pkg.method,
      count: pkg.count,
      weight: pkg.weight,
    })),
    logisticsInfoList: (set.logisticsInfoList || []).map(log => ({
      id: log.id,
      trackingNumber: log.trackingNumber,
      inlandCompanyId: log.inlandCompanyId,
      warehouseId: log.warehouseId,
    })),
  })).sort((x, y) => x.id.localeCompare(y.id));
  const bSorted = [...b].map(set => ({
    id: set.id,
    packingCode: set.packingCode,
    date: set.date,
    packageInfoList: (set.packageInfoList || []).map(pkg => ({
      id: pkg.id,
      types: pkg.types,
      pieces: pkg.pieces,
      sets: pkg.sets,
      total: pkg.total,
      method: pkg.method,
      count: pkg.count,
      weight: pkg.weight,
    })),
    logisticsInfoList: (set.logisticsInfoList || []).map(log => ({
      id: log.id,
      trackingNumber: log.trackingNumber,
      inlandCompanyId: log.inlandCompanyId,
      warehouseId: log.warehouseId,
    })),
  })).sort((x, y) => x.id.localeCompare(y.id));
  
  return aSorted.every((set, index) => {
    const bSet = bSorted[index];
    if (set.id !== bSet.id || set.packingCode !== bSet.packingCode || set.date !== bSet.date) return false;
    if (set.packageInfoList.length !== bSet.packageInfoList.length) return false;
    if (set.logisticsInfoList.length !== bSet.logisticsInfoList.length) return false;
    
    // packageInfoList 상세 비교
    for (let i = 0; i < set.packageInfoList.length; i++) {
      const aPkg = set.packageInfoList[i];
      const bPkg = bSet.packageInfoList[i];
      if (aPkg.id !== bPkg.id || aPkg.types !== bPkg.types || 
          aPkg.pieces !== bPkg.pieces || aPkg.sets !== bPkg.sets ||
          aPkg.total !== bPkg.total || aPkg.method !== bPkg.method ||
          aPkg.weight !== bPkg.weight) {
        return false;
      }
    }
    
    // logisticsInfoList 상세 비교
    for (let i = 0; i < set.logisticsInfoList.length; i++) {
      const aLog = set.logisticsInfoList[i];
      const bLog = bSet.logisticsInfoList[i];
      if (aLog.id !== bLog.id || aLog.trackingNumber !== bLog.trackingNumber ||
          aLog.inlandCompanyId !== bLog.inlandCompanyId || aLog.warehouseId !== bLog.warehouseId) {
        return false;
      }
    }
    
    return true;
  });
}

/**
 * Purchase Order 저장 및 변경 감지 Hook
 */
export function usePurchaseOrderSave({
  order,
  orderId,
  unitPrice,
  backMargin,
  quantity,
  shippingCost,
  warehouseShippingCost,
  commissionRate,
  commissionType,
  advancePaymentRate,
  advancePaymentDate,
  balancePaymentDate,
  packaging,
  orderDate,
  deliveryDate,
  workStartDate,
  workEndDate,
  isOrderConfirmed,
  productName,
  productSize,
  productWeight,
  productPackagingSize,
  optionItems,
  laborCostItems,
  factoryShipments,
  returnExchangeItems,
  workItems,
  deliverySets,
  setOptionItems,
  setLaborCostItems,
  setFactoryShipments,
  setReturnExchangeItems,
  setWorkItems,
  setDeliverySets,
  reloadCostItems,
  reloadFactoryShipments,
  reloadReturnExchanges,
  reloadWorkItems,
  reloadDeliverySets,
  currentUserId,
  isSuperAdmin = false,
  userLevel,
  onUpdateOriginalData,
}: UsePurchaseOrderSaveProps): UsePurchaseOrderSaveReturn {
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const originalDataRef = useRef<OriginalData | null>(null);
  const justReloadedRef = useRef(false); // 재로드 완료 플래그
  const initialLoadCompletedRef = useRef(false); // 초기 로드 완료 플래그 (originalData 설정 후 한 번만 true로 설정)

  // 원본 데이터 설정 함수 (외부에서 호출 가능)
  const setOriginalData = useCallback((data: OriginalData) => {
    console.log('[usePurchaseOrderSave] setOriginalData called:', {
      ...data,
      workItemsLength: data.workItems.length
    });
    originalDataRef.current = data;
    initialLoadCompletedRef.current = false; // originalData가 설정되면 초기 로드 완료 플래그 리셋
    
    // originalData가 설정되면 즉시 isDirty를 false로 초기화 (초기 로드 시 잘못된 변경 감지 방지)
    // 다음 useEffect에서 checkForChanges가 실행되면 정확한 상태를 반영함
    setIsDirty(false);
  }, []);

  // 변경 감지 로직
  const checkForChanges = useCallback(() => {
    if (!originalDataRef.current) {
      // 새 발주인 경우 모든 입력 필드를 체크하여 dirty 여부 판단
      const hasProductInfo = productName?.trim() !== '' || productSize?.trim() !== '' || productWeight?.trim() !== '' || productPackagingSize?.trim() !== '';
      const hasBasicInfo = unitPrice > 0 || quantity > 0 || shippingCost > 0 || warehouseShippingCost > 0;
      const hasDateInfo = orderDate !== '' || deliveryDate !== '';
      const hasOtherInfo = packaging > 0 || commissionRate > 0 || advancePaymentRate > 0;
      const hasItems = optionItems.length > 0 || laborCostItems.length > 0 || factoryShipments.length > 0;
      
      const isNewOrderDirty = hasProductInfo || hasBasicInfo || hasDateInfo || hasOtherInfo || hasItems;
      // setIsDirty는 useEffect에서 호출하므로 여기서는 반환값만 사용
      return isNewOrderDirty;
    }
    
    const original = originalDataRef.current;
    
    // 기본 필드 변경 확인 (개별 필드별로 로그)
    const fieldChanges: string[] = [];
    if (unitPrice !== original.unit_price) fieldChanges.push(`unitPrice: ${original.unit_price} -> ${unitPrice}`);
    if (backMargin !== original.back_margin) fieldChanges.push(`backMargin: ${original.back_margin} -> ${backMargin}`);
    if (quantity !== original.quantity) fieldChanges.push(`quantity: ${original.quantity} -> ${quantity}`);
    if (shippingCost !== original.shipping_cost) fieldChanges.push(`shippingCost: ${original.shipping_cost} -> ${shippingCost}`);
    if (warehouseShippingCost !== original.warehouse_shipping_cost) fieldChanges.push(`warehouseShippingCost: ${original.warehouse_shipping_cost} -> ${warehouseShippingCost}`);
    if (commissionRate !== original.commission_rate) fieldChanges.push(`commissionRate: ${original.commission_rate} -> ${commissionRate}`);
    if (commissionType !== original.commission_type) fieldChanges.push(`commissionType: ${original.commission_type} -> ${commissionType}`);
    if (advancePaymentRate !== original.advance_payment_rate) fieldChanges.push(`advancePaymentRate: ${original.advance_payment_rate} -> ${advancePaymentRate}`);
    if (advancePaymentDate !== original.advance_payment_date) fieldChanges.push(`advancePaymentDate: ${original.advance_payment_date} -> ${advancePaymentDate}`);
    if (balancePaymentDate !== original.balance_payment_date) fieldChanges.push(`balancePaymentDate: ${original.balance_payment_date} -> ${balancePaymentDate}`);
    if (packaging !== original.packaging) fieldChanges.push(`packaging: ${original.packaging} -> ${packaging}`);
    if (orderDate !== original.order_date) fieldChanges.push(`orderDate: ${original.order_date} -> ${orderDate}`);
    if (deliveryDate !== original.estimated_delivery) fieldChanges.push(`deliveryDate: ${original.estimated_delivery} -> ${deliveryDate}`);
    if (workStartDate !== original.work_start_date) fieldChanges.push(`workStartDate: ${original.work_start_date} -> ${workStartDate}`);
    if (workEndDate !== original.work_end_date) fieldChanges.push(`workEndDate: ${original.work_end_date} -> ${workEndDate}`);
    if (isOrderConfirmed !== original.is_confirmed) fieldChanges.push(`isOrderConfirmed: ${original.is_confirmed} -> ${isOrderConfirmed}`);
    if (productName !== original.product_name) fieldChanges.push(`productName: ${original.product_name} -> ${productName}`);
    if (productSize !== original.product_size) fieldChanges.push(`productSize: ${original.product_size} -> ${productSize}`);
    if (productWeight !== original.product_weight) fieldChanges.push(`productWeight: ${original.product_weight} -> ${productWeight}`);
    if (productPackagingSize !== original.product_packaging_size) fieldChanges.push(`productPackagingSize: ${original.product_packaging_size} -> ${productPackagingSize}`);
    
    const basicFieldsChanged = fieldChanges.length > 0;
    if (basicFieldsChanged) {
      console.log('[usePurchaseOrderSave] checkForChanges - Basic fields changed:', fieldChanges);
    }

    // cost items 변경 확인
    const originalOptions = original.optionItems || [];
    const originalLabors = original.laborCostItems || [];
    const optionItemsChanged = !areArraysEqual(optionItems, originalOptions);
    const laborCostItemsChanged = !areArraysEqual(laborCostItems, originalLabors);
    const costItemsChanged = optionItemsChanged || laborCostItemsChanged;
    
    if (optionItemsChanged) {
      console.log('[usePurchaseOrderSave] checkForChanges - optionItems changed:', {
        currentLength: optionItems.length,
        originalLength: originalOptions.length,
        current: optionItems,
        original: originalOptions
      });
    }
    if (laborCostItemsChanged) {
      console.log('[usePurchaseOrderSave] checkForChanges - laborCostItems changed:', {
        currentLength: laborCostItems.length,
        originalLength: originalLabors.length,
        current: laborCostItems,
        original: originalLabors
      });
    }

    // factory shipments 변경 확인
    const originalShipments = original.factoryShipments || [];
    const factoryShipmentsChanged = !areFactoryShipmentsEqual(factoryShipments, originalShipments);
    const hasFactoryShipmentsPendingImages = factoryShipments.some(s => s.pendingImages && s.pendingImages.length > 0);
    
    if (factoryShipmentsChanged) {
      console.log('[usePurchaseOrderSave] checkForChanges - factoryShipments changed:', {
        currentLength: factoryShipments.length,
        originalLength: originalShipments.length
      });
    }
    if (hasFactoryShipmentsPendingImages) {
      console.log('[usePurchaseOrderSave] checkForChanges - factoryShipments has pending images');
    }

    // return exchanges 변경 확인
    const originalReturnExchanges = original.returnExchangeItems || [];
    const returnExchangesChanged = !areReturnExchangeItemsEqual(returnExchangeItems, originalReturnExchanges);
    const hasReturnExchangesPendingImages = returnExchangeItems.some(r => r.pendingImages && r.pendingImages.length > 0);
    
    if (returnExchangesChanged) {
      console.log('[usePurchaseOrderSave] checkForChanges - returnExchangeItems changed:', {
        currentLength: returnExchangeItems.length,
        originalLength: originalReturnExchanges.length
      });
    }
    if (hasReturnExchangesPendingImages) {
      console.log('[usePurchaseOrderSave] checkForChanges - returnExchangeItems has pending images');
    }

    // work items 변경 확인
    const originalWorkItems = original.workItems || [];
    const workItemsChanged = !areWorkItemsEqual(workItems, originalWorkItems);
    const hasWorkItemsPendingImages = workItems.some(w => w.pendingImages && w.pendingImages.length > 0);
    
    // 초기 로딩 중인 경우 (originalData가 빈 배열로 설정된 후 실제 데이터가 로드되는 경우) 무시
    let workItemsChangedIgnoringInitialLoad = workItemsChanged;
    if (workItemsChanged && !initialLoadCompletedRef.current && originalWorkItems.length === 0 && workItems.length > 0) {
      console.log('[usePurchaseOrderSave] checkForChanges - workItems initial load detected, ignoring change:', {
        currentLength: workItems.length,
        originalLength: originalWorkItems.length
      });
      workItemsChangedIgnoringInitialLoad = false;
      initialLoadCompletedRef.current = true; // 초기 로드 완료로 표시
    }
    
    if (workItemsChangedIgnoringInitialLoad) {
      console.log('[usePurchaseOrderSave] checkForChanges - workItems changed:', {
        currentLength: workItems.length,
        originalLength: originalWorkItems.length
      });
    }
    if (hasWorkItemsPendingImages) {
      console.log('[usePurchaseOrderSave] checkForChanges - workItems has pending images');
    }

    // delivery sets 변경 확인
    const originalDeliverySets = original.deliverySets;
    const deliverySetsChanged = !areDeliverySetsEqual(deliverySets, originalDeliverySets);
    
    // delivery sets의 pendingImages 확인 (이미지 업로드 감지)
    const hasDeliverySetsPendingImages = (deliverySets || []).some(set => 
      (set.logisticsInfoList || []).some(log => log.pendingImages && log.pendingImages.length > 0)
    );
    
    if (deliverySetsChanged) {
      console.log('[usePurchaseOrderSave] checkForChanges - deliverySets changed:', {
        currentLength: (deliverySets || []).length,
        originalLength: (originalDeliverySets || []).length
      });
    }
    if (hasDeliverySetsPendingImages) {
      console.log('[usePurchaseOrderSave] checkForChanges - deliverySets has pending images');
    }

    const hasChanges = basicFieldsChanged || costItemsChanged || 
           factoryShipmentsChanged || hasFactoryShipmentsPendingImages ||
           returnExchangesChanged || hasReturnExchangesPendingImages ||
           workItemsChangedIgnoringInitialLoad || hasWorkItemsPendingImages ||
           deliverySetsChanged || hasDeliverySetsPendingImages;
    
    if (hasChanges) {
      console.log('[usePurchaseOrderSave] checkForChanges - RESULT: HAS CHANGES', {
        basicFieldsChanged,
        costItemsChanged,
        factoryShipmentsChanged,
        hasFactoryShipmentsPendingImages,
        returnExchangesChanged,
        hasReturnExchangesPendingImages,
        workItemsChanged,
        hasWorkItemsPendingImages,
        deliverySetsChanged,
        hasDeliverySetsPendingImages
      });
    } else {
      console.log('[usePurchaseOrderSave] checkForChanges - RESULT: NO CHANGES');
    }

    return hasChanges;
  }, [
    productName, productSize, productWeight, productPackagingSize,
    unitPrice, backMargin, quantity, shippingCost, warehouseShippingCost,
    commissionRate, commissionType, advancePaymentRate, advancePaymentDate,
    balancePaymentDate, packaging, orderDate, deliveryDate, workStartDate, workEndDate,
    isOrderConfirmed,
    optionItems, laborCostItems, factoryShipments, returnExchangeItems, workItems, deliverySets
  ]);

  // 저장 함수
  const handleSave = useCallback(async (isManual: boolean = true) => {
    console.log('[usePurchaseOrderSave] handleSave 호출, isManual:', isManual);
    console.log('[usePurchaseOrderSave] handleSave - order:', order);
    console.log('[usePurchaseOrderSave] handleSave - orderId:', orderId);
    console.log('[usePurchaseOrderSave] handleSave - isSaving:', isSaving);
    console.log('[usePurchaseOrderSave] handleSave - deliverySets:', deliverySets);
    console.log('[usePurchaseOrderSave] handleSave - deliverySets 길이:', (deliverySets || []).length);
    
    if (isSaving) {
      console.log('[usePurchaseOrderSave] handleSave - 저장 중이어서 종료');
      return;
    }

    const isNewOrder = orderId === 'new';

    try {
      setIsSaving(true);
      console.log('[usePurchaseOrderSave] handleSave - 저장 시작, isNewOrder:', isNewOrder);
      
      // 최종 결제 금액 계산
      const basicCostTotal = calculateBasicCostTotal(
        unitPrice,
        quantity,
        commissionRate,
        backMargin
      );
      const shippingCostTotal = calculateShippingCostTotal(
        shippingCost,
        warehouseShippingCost
      );
      const totalOptionCost = calculateTotalOptionCost(optionItems);
      const totalLaborCost = calculateTotalLaborCost(laborCostItems);
      const finalPaymentAmount = calculateFinalPaymentAmount(
        basicCostTotal,
        shippingCostTotal,
        totalOptionCost,
        totalLaborCost
      );
      
      // 선금 금액 = 기본비용 합의 50%
      const advancePaymentAmount = basicCostTotal * 0.5;
      
      // 잔금 금액 = 최종 결제 금액 - 선금 금액
      const balancePaymentAmount = calculateBalancePaymentAmount(
        finalPaymentAmount,
        advancePaymentAmount
      );
      
      let savedOrderId = orderId;
      
      if (isNewOrder) {
        // 새 발주 생성
        const createData: any = {
          product_name: productName || '',
          product_size: productSize || undefined,
          product_weight: productWeight || undefined,
          product_packaging_size: productPackagingSize || undefined,
          unit_price: unitPrice,
          quantity: quantity,
          shipping_cost: shippingCost || 0,
          warehouse_shipping_cost: warehouseShippingCost || 0,
          commission_rate: commissionRate || 0,
          commission_type: commissionType || null,
          advance_payment_rate: advancePaymentRate || 0,
          advance_payment_amount: advancePaymentAmount || null,
          advance_payment_date: advancePaymentDate || null,
          balance_payment_amount: balancePaymentAmount || null,
          balance_payment_date: balancePaymentDate || null,
          packaging: packaging || 0,
          order_date: orderDate || null,
          estimated_shipment_date: deliveryDate || null,
          work_start_date: workStartDate || null,
          work_end_date: workEndDate || null,
          is_confirmed: isOrderConfirmed,
          created_by: currentUserId,
        };

        console.log('[usePurchaseOrderSave] 새 발주 생성 요청:', createData);
        const createResponse = await fetch(`${API_BASE_URL}/purchase-orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(createData),
        });

        if (!createResponse.ok) {
          const errorData = await createResponse.json().catch(() => ({}));
          throw new Error(errorData.error || '발주 생성에 실패했습니다.');
        }

        const createResult = await createResponse.json();
        savedOrderId = createResult.data.id;
        console.log('[usePurchaseOrderSave] 새 발주 생성 성공, ID:', savedOrderId);
        
        // 새 발주 생성 후 ID 반환 (페이지 이동은 호출하는 쪽에서 처리)
        // 나머지 저장 로직은 스킵하고 ID만 반환
        setIsSaving(false);
        return savedOrderId;
      }

      // 기존 발주 수정
      const updateData: any = {
        unit_price: unitPrice,
        back_margin: backMargin || null,
        quantity: quantity,
        shipping_cost: shippingCost || 0,
        warehouse_shipping_cost: warehouseShippingCost || 0,
        commission_rate: commissionRate || 0,
        commission_type: commissionType || null,
        advance_payment_rate: advancePaymentRate || 0,
        advance_payment_amount: advancePaymentAmount || null,
        advance_payment_date: advancePaymentDate || null,
        balance_payment_amount: balancePaymentAmount || null,
        balance_payment_date: balancePaymentDate || null,
        packaging: packaging || 0,
        order_date: orderDate || null,
        estimated_delivery: deliveryDate || null,
        work_start_date: workStartDate || null,
        work_end_date: workEndDate || null,
        is_confirmed: isOrderConfirmed,
        product_name: productName || undefined,
        product_size: productSize || undefined,
        product_weight: productWeight || undefined,
        product_packaging_size: productPackagingSize || undefined,
        updated_by: currentUserId,
      };

      const response = await fetch(`${API_BASE_URL}/purchase-orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '발주 정보 저장에 실패했습니다.');
      }

      const result = await response.json();
      
      // cost items 저장
      // A 레벨 관리자가 아닌 경우 isAdminOnly === true인 항목 제외
      const filteredOptionItems = isSuperAdmin 
        ? optionItems 
        : optionItems.filter(item => item.isAdminOnly !== true);
      const filteredLaborCostItems = isSuperAdmin 
        ? laborCostItems 
        : laborCostItems.filter(item => item.isAdminOnly !== true);
      
      console.log('[usePurchaseOrderSave] 필터링 전 optionItems:', optionItems.map(item => ({ name: item.name, isAdminOnly: item.isAdminOnly })));
      console.log('[usePurchaseOrderSave] 필터링 전 laborCostItems:', laborCostItems.map(item => ({ name: item.name, isAdminOnly: item.isAdminOnly })));
      console.log('[usePurchaseOrderSave] isSuperAdmin:', isSuperAdmin);
      console.log('[usePurchaseOrderSave] 필터링 후 filteredOptionItems:', filteredOptionItems.map(item => ({ name: item.name, isAdminOnly: item.isAdminOnly })));
      console.log('[usePurchaseOrderSave] 필터링 후 filteredLaborCostItems:', filteredLaborCostItems.map(item => ({ name: item.name, isAdminOnly: item.isAdminOnly })));
      
      const costItems = [
        ...filteredOptionItems.map((item, index) => ({
          item_type: 'option' as const,
          name: item.name,
          unit_price: item.unit_price,
          quantity: item.quantity,
          is_admin_only: item.isAdminOnly === true, // 명시적으로 boolean으로 변환
          display_order: index,
        })),
        ...filteredLaborCostItems.map((item, index) => ({
          item_type: 'labor' as const,
          name: item.name,
          unit_price: item.unit_price,
          quantity: item.quantity,
          is_admin_only: item.isAdminOnly === true, // 명시적으로 boolean으로 변환
          display_order: index,
        })),
      ];
      
      // 전송 전 검증: A 레벨 관리자가 아닌 경우 is_admin_only가 true인 항목이 있는지 확인
      const hasAdminOnlyItems = costItems.some(item => item.is_admin_only === true);
      console.log('[usePurchaseOrderSave] 최종 전송할 costItems:', JSON.stringify(costItems.map(item => ({ name: item.name, is_admin_only: item.is_admin_only, item_type: item.item_type })), null, 2));
      console.log('[usePurchaseOrderSave] 검증 정보:', { isSuperAdmin, hasAdminOnlyItems });
      
      if (!isSuperAdmin && hasAdminOnlyItems) {
        console.error('[usePurchaseOrderSave] 에러: A 레벨 관리자가 아닌데 is_admin_only=true인 항목이 포함됨:', costItems.filter(item => item.is_admin_only === true));
        throw new Error('A 레벨 관리자 전용 항목이 포함되어 있어 저장할 수 없습니다. 페이지를 새로고침해주세요.');
      }
      
      const costItemsResponse = await fetch(`${API_BASE_URL}/purchase-orders/${orderId}/cost-items`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ items: costItems, userLevel }),
      });

      if (!costItemsResponse.ok) {
        const errorData = await costItemsResponse.json().catch(() => ({}));
        throw new Error(errorData.error || '비용 항목 저장에 실패했습니다.');
      }

      // factory shipments 저장 (DB ID만 포함, 임시 ID는 제외)
      const shipments = factoryShipments.map((shipment, index) => {
        // 임시 ID 판별: Date.now()로 생성된 ID는 13자리 이상
        const isTemporaryId = shipment.id.length >= 13 && /^\d+$/.test(shipment.id);
        return {
          id: isTemporaryId ? undefined : (parseInt(shipment.id) || undefined),
          shipment_date: shipment.date || null,
          quantity: shipment.quantity,
          tracking_number: shipment.trackingNumber || null,
          receive_date: shipment.receiveDate || null,
          display_order: index,
        };
      });

      const factoryShipmentsResponse = await fetch(`${API_BASE_URL}/purchase-orders/${orderId}/factory-shipments`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ shipments }),
      });

      if (!factoryShipmentsResponse.ok) {
        const errorData = await factoryShipmentsResponse.json().catch(() => ({}));
        throw new Error(errorData.error || '업체 출고 항목 저장에 실패했습니다.');
      }

      // factory shipments 저장 후 실제 ID를 받아옴
      const factoryShipmentsResult = await factoryShipmentsResponse.json();
      const savedShipmentIds: number[] = factoryShipmentsResult.data || [];
      console.log('저장된 출고 항목 IDs:', savedShipmentIds);
      console.log('출고 항목 목록:', factoryShipments.map(s => ({ id: s.id, pendingImages: s.pendingImages?.length || 0 })));

      // pendingImages가 있는 shipment들의 이미지 업로드
      for (let i = 0; i < factoryShipments.length; i++) {
        const shipment = factoryShipments[i];
        console.log(`출고 항목 ${i} 처리 중: id=${shipment.id}, pendingImages=${shipment.pendingImages?.length || 0}, savedId=${savedShipmentIds[i]}`);
        
        if (shipment.pendingImages && shipment.pendingImages.length > 0) {
          if (!savedShipmentIds[i]) {
            console.error(`출고 항목 ${i}에 대한 저장된 ID가 없습니다. shipment.id=${shipment.id}`);
            continue;
          }

          try {
            console.log(`출고 항목 ${savedShipmentIds[i]} 이미지 업로드 시작 (${shipment.pendingImages.length}개 파일)`);
            const formData = new FormData();
            shipment.pendingImages.forEach((file, index) => {
              formData.append('images', file);
              console.log(`  파일 ${index + 1}: ${file.name} (${file.size} bytes)`);
            });

            const uploadUrl = `${API_BASE_URL}/purchase-orders/${orderId}/images/factory_shipment/${savedShipmentIds[i]}`;
            console.log(`이미지 업로드 URL: ${uploadUrl}`);

            const imageUploadResponse = await fetch(uploadUrl, {
              method: 'POST',
              credentials: 'include',
              body: formData,
            });

            console.log(`이미지 업로드 응답 상태: ${imageUploadResponse.status} ${imageUploadResponse.statusText}`);

            if (imageUploadResponse.ok) {
              const uploadResult = await imageUploadResponse.json();
              console.log(`출고 항목 ${savedShipmentIds[i]} 이미지 업로드 성공:`, uploadResult);
            } else {
              const errorText = await imageUploadResponse.text().catch(() => '');
              console.error(`출고 항목 ${savedShipmentIds[i]} 이미지 업로드 실패:`, imageUploadResponse.status, errorText);
              try {
                const errorJson = JSON.parse(errorText);
                console.error('에러 상세:', errorJson);
              } catch (e) {
                console.error('에러 텍스트:', errorText);
              }
            }
          } catch (imageError: any) {
            console.error(`출고 항목 ${savedShipmentIds[i]} 이미지 업로드 오류:`, imageError);
            console.error('에러 스택:', imageError.stack);
          }
        }
      }

      // return exchanges 저장 (DB ID만 포함, 임시 ID는 제외)
      const returnExchanges = returnExchangeItems.map((item, index) => {
        // 임시 ID 판별: Date.now()로 생성된 ID는 13자리 이상
        const isTemporaryId = item.id.length >= 13 && /^\d+$/.test(item.id);
        return {
          id: isTemporaryId ? undefined : (parseInt(item.id) || undefined),
          return_date: item.date || null,
          quantity: item.quantity,
          tracking_number: item.trackingNumber || null,
          receive_date: item.receiveDate || null,
          reason: null, // reason은 현재 클라이언트 인터페이스에 없음
          display_order: index,
        };
      });

      const returnExchangesResponse = await fetch(`${API_BASE_URL}/purchase-orders/${orderId}/return-exchanges`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ items: returnExchanges }),
      });

      if (!returnExchangesResponse.ok) {
        const errorData = await returnExchangesResponse.json().catch(() => ({}));
        throw new Error(errorData.error || '반품/교환 항목 저장에 실패했습니다.');
      }

      // return exchanges 저장 후 실제 ID를 받아옴
      const returnExchangesResult = await returnExchangesResponse.json();
      const savedReturnExchangeIds: number[] = returnExchangesResult.data || [];

      // pendingImages가 있는 return exchange 항목들의 이미지 업로드
      for (let i = 0; i < returnExchangeItems.length; i++) {
        const item = returnExchangeItems[i];
        if (item.pendingImages && item.pendingImages.length > 0 && savedReturnExchangeIds[i]) {
          try {
            const formData = new FormData();
            item.pendingImages.forEach((file) => {
              formData.append('images', file);
            });

            const imageUploadResponse = await fetch(
              `${API_BASE_URL}/purchase-orders/${orderId}/images/return_exchange/${savedReturnExchangeIds[i]}`,
              {
                method: 'POST',
                credentials: 'include',
                body: formData,
              }
            );

            if (imageUploadResponse.ok) {
              const uploadResult = await imageUploadResponse.json();
              console.log(`반품/교환 항목 ${savedReturnExchangeIds[i]} 이미지 업로드 성공:`, uploadResult);
            } else {
              const errorText = await imageUploadResponse.text().catch(() => '');
              let errorMessage = `반품/교환 항목 ${savedReturnExchangeIds[i]} 이미지 업로드 실패 (${imageUploadResponse.status})`;
              try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.error || errorMessage;
              } catch (e) {
                if (errorText) {
                  errorMessage += `: ${errorText}`;
                }
              }
              console.error(errorMessage);
            }
          } catch (imageError: any) {
            console.error(`반품/교환 항목 ${savedReturnExchangeIds[i]} 이미지 업로드 오류:`, imageError);
            if (imageError.message) {
              console.error('에러 메시지:', imageError.message);
            }
            if (imageError.stack) {
              console.error('에러 스택:', imageError.stack);
            }
          }
        }
      }

      // work items 저장 (DB ID만 포함, 임시 ID는 제외)
      const items = workItems.map((item, index) => {
        // 임시 ID 판별: Date.now()로 생성된 ID는 13자리 이상
        const isTemporaryId = item.id.length >= 13 && /^\d+$/.test(item.id);
        return {
          id: isTemporaryId ? undefined : (parseInt(item.id) || undefined),
          description_ko: item.descriptionKo || null,
          description_zh: item.descriptionZh || null,
          is_completed: item.isCompleted || false,
          display_order: index,
        };
      });

      const workItemsResponse = await fetch(`${API_BASE_URL}/purchase-orders/${orderId}/work-items`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ items }),
      });

      if (!workItemsResponse.ok) {
        const errorData = await workItemsResponse.json().catch(() => ({}));
        throw new Error(errorData.error || '작업 항목 저장에 실패했습니다.');
      }

      // work items 저장 후 실제 ID를 받아옴
      const workItemsResult = await workItemsResponse.json();
      const savedWorkItemIds: number[] = workItemsResult.data || [];
      console.log('저장된 작업 항목 IDs:', savedWorkItemIds);

      // pendingImages가 있는 work item들의 이미지 업로드
      for (let i = 0; i < workItems.length; i++) {
        const item = workItems[i];
        if (item.pendingImages && item.pendingImages.length > 0 && savedWorkItemIds[i]) {
          try {
            const formData = new FormData();
            item.pendingImages.forEach((file) => {
              formData.append('images', file);
            });

            const imageUploadResponse = await fetch(
              `${API_BASE_URL}/purchase-orders/${orderId}/images/work_item/${savedWorkItemIds[i]}`,
              {
                method: 'POST',
                credentials: 'include',
                body: formData,
              }
            );

            if (imageUploadResponse.ok) {
              const uploadResult = await imageUploadResponse.json();
              console.log(`작업 항목 ${savedWorkItemIds[i]} 이미지 업로드 성공:`, uploadResult);
            } else {
              const errorText = await imageUploadResponse.text().catch(() => '');
              let errorMessage = `작업 항목 ${savedWorkItemIds[i]} 이미지 업로드 실패 (${imageUploadResponse.status})`;
              try {
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.error || errorMessage;
              } catch (e) {
                if (errorText) {
                  errorMessage += `: ${errorText}`;
                }
              }
              console.error(errorMessage);
            }
          } catch (imageError: any) {
            console.error(`작업 항목 ${savedWorkItemIds[i]} 이미지 업로드 오류:`, imageError);
            if (imageError.message) {
              console.error('에러 메시지:', imageError.message);
            }
            if (imageError.stack) {
              console.error('에러 스택:', imageError.stack);
            }
          }
        }
      }

      // delivery sets 저장 (DB ID만 포함, 임시 ID는 제외)
      console.log('[usePurchaseOrderSave] delivery sets 저장 시작');
      console.log('[usePurchaseOrderSave] deliverySets 상태:', deliverySets);
      console.log('[usePurchaseOrderSave] deliverySets 길이:', (deliverySets || []).length);
      
      const sets = (deliverySets || []).map((set, setIndex) => {
        // 임시 ID 판별: Date.now()로 생성된 ID는 13자리 이상
        const isTemporaryId = set.id.length >= 13 && /^\d+$/.test(set.id);
        const mappedSet = {
          id: isTemporaryId ? undefined : (parseInt(set.id) || undefined),
          packing_code: set.packingCode || "",
          packing_date: set.date || null,
          display_order: setIndex,
          package_info: (set.packageInfoList || []).map((pkg, pkgIndex) => {
            const isPkgTemporaryId = pkg.id.length >= 13 && /^\d+$/.test(pkg.id);
            return {
              id: isPkgTemporaryId ? undefined : (parseInt(pkg.id) || undefined),
              types: pkg.types || null,
              pieces: pkg.pieces || null,
              sets: pkg.sets || null,
              total: pkg.total || null,
              method: pkg.method || '박스',
              count: pkg.count || null,
              weight: pkg.weight || null,
              display_order: pkgIndex,
            };
          }),
          logistics_info: (set.logisticsInfoList || []).map((log, logIndex) => {
            const isLogTemporaryId = log.id.length >= 13 && /^\d+$/.test(log.id);
            return {
              id: isLogTemporaryId ? undefined : (parseInt(log.id) || undefined),
              tracking_number: log.trackingNumber || null,
              inland_company_id: log.inlandCompanyId || null,
              warehouse_id: log.warehouseId || null,
              display_order: logIndex,
            };
          }),
        };
        console.log(`[usePurchaseOrderSave] set ${setIndex} 매핑 결과:`, mappedSet);
        return mappedSet;
      });

      console.log('[usePurchaseOrderSave] 서버로 전송할 sets:', sets);
      console.log('[usePurchaseOrderSave] 서버로 전송할 sets JSON:', JSON.stringify({ sets }, null, 2));

      let deliverySetsResponse: Response;
      try {
        deliverySetsResponse = await fetch(`${API_BASE_URL}/purchase-orders/${orderId}/delivery-sets`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ sets }),
        });
      } catch (fetchError: any) {
        console.error('[usePurchaseOrderSave] delivery sets 저장 요청 실패:', fetchError);
        throw new Error(`배송 세트 저장 요청 실패: ${fetchError.message || '네트워크 오류'}`);
      }

      console.log('[usePurchaseOrderSave] delivery sets 저장 응답 상태:', deliverySetsResponse.status, deliverySetsResponse.statusText);

      if (!deliverySetsResponse.ok) {
        const errorText = await deliverySetsResponse.text().catch(() => '');
        console.error('[usePurchaseOrderSave] delivery sets 저장 실패 - 응답 본문:', errorText);
        const errorData = await deliverySetsResponse.json().catch(() => ({}));
        throw new Error(errorData.error || '배송 세트 저장에 실패했습니다.');
      }

      const deliverySetsResult = await deliverySetsResponse.json();
      console.log('[usePurchaseOrderSave] delivery sets 저장 성공 - 응답:', deliverySetsResult);

      // delivery sets 저장 후 실제 ID를 받아옴
      const savedDeliverySets: Array<{
        delivery_set_id: number;
        logistics_info_ids: number[];
      }> = deliverySetsResult.data || [];
      console.log('[usePurchaseOrderSave] savedDeliverySets:', savedDeliverySets);
      console.log('[usePurchaseOrderSave] savedDeliverySets 길이:', savedDeliverySets.length);

      // pendingImages가 있는 logistics_info들의 이미지 업로드
      // deliverySets와 savedDeliverySets를 순서로 매핑하여 pendingImages 업로드
      let hasDeliverySetsPendingImages = false;
      for (let setIndex = 0; setIndex < deliverySets.length; setIndex++) {
        const set = deliverySets[setIndex];
        const savedSet = savedDeliverySets[setIndex];
        
        if (!savedSet || !set.logisticsInfoList) continue;

        // 각 logistics_info에 대해 pendingImages 업로드
        for (let logIndex = 0; logIndex < set.logisticsInfoList.length; logIndex++) {
          const log = set.logisticsInfoList[logIndex];
          const savedLogisticsId = savedSet.logistics_info_ids[logIndex];
          
          if (log.pendingImages && log.pendingImages.length > 0 && savedLogisticsId) {
            hasDeliverySetsPendingImages = true;
            try {
              const formData = new FormData();
              log.pendingImages.forEach((file) => {
                formData.append('images', file);
              });

              const imageUploadResponse = await fetch(
                `${API_BASE_URL}/purchase-orders/${orderId}/images/logistics_info/${savedLogisticsId}`,
                {
                  method: 'POST',
                  credentials: 'include',
                  body: formData,
                }
              );

              if (imageUploadResponse.ok) {
                const uploadResult = await imageUploadResponse.json();
                console.log(`물류 정보 ${savedLogisticsId} 이미지 업로드 성공:`, uploadResult);
              } else {
                const errorText = await imageUploadResponse.text().catch(() => '');
                let errorMessage = `물류 정보 ${savedLogisticsId} 이미지 업로드 실패 (${imageUploadResponse.status})`;
                try {
                  const errorJson = JSON.parse(errorText);
                  errorMessage = errorJson.error || errorMessage;
                } catch (e) {
                  if (errorText) {
                    errorMessage += `: ${errorText}`;
                  }
                }
                console.error(errorMessage);
                // 이미지 업로드 실패는 치명적이지 않으므로 경고만 표시하고 계속 진행
                // 사용자에게는 저장 성공 후 개별 이미지 업로드 실패를 알릴 수 있도록 플래그 설정
              }
            } catch (imageError: any) {
              console.error(`물류 정보 ${savedLogisticsId} 이미지 업로드 오류:`, imageError);
              if (imageError.message) {
                console.error('에러 메시지:', imageError.message);
              }
              if (imageError.stack) {
                console.error('에러 스택:', imageError.stack);
              }
              // 네트워크 에러 등으로 인한 실패는 치명적이지 않으므로 경고만 표시
            }
          }
        }
      }

      // delivery sets는 나중에 hasPendingImages 체크 후에 reloadDeliverySets()로 일괄 재로드됨
      
      if (result.success && result.data) {
        // 원본 데이터 업데이트
        const updated = result.data;
        const newOriginalData: OriginalData = {
          unit_price: updated.unit_price,
          back_margin: updated.back_margin || 0,
          quantity: updated.quantity,
          shipping_cost: updated.shipping_cost || 0,
          warehouse_shipping_cost: updated.warehouse_shipping_cost || 0,
          commission_rate: updated.commission_rate || 0,
          commission_type: updated.commission_type || "",
          advance_payment_rate: updated.advance_payment_rate || 0,
          advance_payment_date: formatDateForInput(updated.advance_payment_date),
          balance_payment_date: formatDateForInput(updated.balance_payment_date),
          packaging: updated.packaging || 0,
          order_date: formatDateForInput(updated.order_date),
          estimated_delivery: formatDateForInput(updated.estimated_delivery),
          work_start_date: workStartDate || '',
          work_end_date: workEndDate || '',
          is_confirmed: updated.is_confirmed || false,
          product_name: updated.product_name || undefined,
          product_size: updated.product_size || undefined,
          product_weight: updated.product_weight || undefined,
          product_packaging_size: updated.product_packaging_size || undefined,
          optionItems: JSON.parse(JSON.stringify(optionItems)),
          laborCostItems: JSON.parse(JSON.stringify(laborCostItems)),
          factoryShipments: JSON.parse(JSON.stringify(factoryShipments.map(s => ({ ...s, pendingImages: undefined })))),
          returnExchangeItems: JSON.parse(JSON.stringify(returnExchangeItems.map(r => ({ ...r, pendingImages: undefined })))),
          workItems: JSON.parse(JSON.stringify(workItems.map(w => ({ ...w, pendingImages: undefined })))),
          deliverySets: JSON.parse(JSON.stringify(deliverySets.map(set => ({
            ...set,
            logisticsInfoList: (set.logisticsInfoList || []).map(log => ({
              ...log,
              pendingImages: undefined,
            })),
          })))),
        };
        
        setLastSavedAt(new Date());
        originalDataRef.current = newOriginalData;
        if (onUpdateOriginalData) {
          onUpdateOriginalData(newOriginalData);
        }
        
        // 이미지가 업로드되었으면 관련 데이터 다시 로드
        // delivery sets의 pendingImages는 이미 업로드되었으므로 hasDeliverySetsPendingImages 플래그 사용
        // (이미지 업로드 후에는 pendingImages가 제거되므로 state를 체크하면 안 됨)
        const hasPendingImages = factoryShipments.some(s => s.pendingImages && s.pendingImages.length > 0) ||
                                returnExchangeItems.some(r => r.pendingImages && r.pendingImages.length > 0) ||
                                workItems.some(w => w.pendingImages && w.pendingImages.length > 0) ||
                                hasDeliverySetsPendingImages;
        
        if (hasPendingImages) {
          // pendingImages 제거 후 재로드
          setFactoryShipments(prev => prev.map(s => ({ ...s, pendingImages: undefined })));
          setReturnExchangeItems(prev => prev.map(r => ({ ...r, pendingImages: undefined })));
          setWorkItems(prev => prev.map(w => ({ ...w, pendingImages: undefined })));
          setDeliverySets(prev => prev.map(set => ({
            ...set,
            logisticsInfoList: (set.logisticsInfoList || []).map(log => ({
              ...log,
              pendingImages: undefined,
            })),
          })));
          
          await Promise.all([
            reloadFactoryShipments(),
            reloadReturnExchanges(),
            reloadWorkItems(),
            reloadDeliverySets(),
          ]);
          
          // 재로드 완료 플래그 설정 (다음 useEffect에서 originalDataRef 업데이트용)
          justReloadedRef.current = true;
        }
        
        setIsDirty(false);
        
        if (isManual) {
          alert('저장되었습니다.');
        }
      }
    } catch (err: any) {
      console.error('발주 정보 저장 오류:', err);
      
      // 에러 타입별 처리
      let errorMessage = '저장 중 오류가 발생했습니다.';
      
      if (err instanceof TypeError && err.message.includes('fetch')) {
        errorMessage = '네트워크 연결 오류가 발생했습니다. 인터넷 연결을 확인해주세요.';
      } else if (err instanceof Error) {
        errorMessage = err.message || errorMessage;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      
      // 상세 에러 정보 로깅
      if (err.stack) {
        console.error('에러 스택:', err.stack);
      }
      if (err.response) {
        console.error('서버 응답:', err.response);
      }
      
      alert(errorMessage);
      
      // 저장 실패 시 상태 복구는 하지 않음 (사용자가 수정한 내용을 유지)
      // 필요시 롤백 로직 추가 가능
    } finally {
      setIsSaving(false);
    }
  }, [
    order, orderId, unitPrice, backMargin, quantity, shippingCost, warehouseShippingCost,
    commissionRate, commissionType, advancePaymentRate, advancePaymentDate,
    balancePaymentDate, packaging, orderDate, deliveryDate, isOrderConfirmed,
    productName, productSize, productWeight, productPackagingSize,
    optionItems, laborCostItems, factoryShipments, returnExchangeItems, workItems, deliverySets, isSaving, currentUserId,
    setFactoryShipments, setReturnExchangeItems, setWorkItems, setDeliverySets, reloadFactoryShipments, reloadReturnExchanges, reloadWorkItems, reloadDeliverySets,
    onUpdateOriginalData,
  ]);

  // 재로드 후 originalDataRef 동기화 (재로드 완료 시 한 번만 실행)
  useEffect(() => {
    if (justReloadedRef.current && originalDataRef.current) {
      justReloadedRef.current = false; // 플래그 리셋
      
      // 재로드된 state로 originalDataRef 업데이트
      const currentData: OriginalData = {
        unit_price: unitPrice,
        back_margin: backMargin,
        quantity: quantity,
        shipping_cost: shippingCost,
        warehouse_shipping_cost: warehouseShippingCost,
        commission_rate: commissionRate,
        commission_type: commissionType,
        advance_payment_rate: advancePaymentRate,
        advance_payment_date: advancePaymentDate,
        balance_payment_date: balancePaymentDate,
        packaging: packaging,
        order_date: orderDate,
        estimated_delivery: deliveryDate,
        is_confirmed: isOrderConfirmed,
        product_name: productName || undefined,
        product_size: productSize || undefined,
        product_weight: productWeight || undefined,
        product_packaging_size: productPackagingSize || undefined,
        optionItems: JSON.parse(JSON.stringify(optionItems)),
        laborCostItems: JSON.parse(JSON.stringify(laborCostItems)),
        factoryShipments: JSON.parse(JSON.stringify(factoryShipments.map(s => ({ ...s, pendingImages: undefined })))),
        returnExchangeItems: JSON.parse(JSON.stringify(returnExchangeItems.map(r => ({ ...r, pendingImages: undefined })))),
        workItems: JSON.parse(JSON.stringify(workItems.map(w => ({ ...w, pendingImages: undefined })))),
        deliverySets: JSON.parse(JSON.stringify(deliverySets.map(set => ({
          ...set,
          logisticsInfoList: (set.logisticsInfoList || []).map(log => ({
            ...log,
            pendingImages: undefined,
          })),
        })))),
      };
      
      originalDataRef.current = currentData;
      if (onUpdateOriginalData) {
        onUpdateOriginalData(currentData);
      }
    }
  }, [
    unitPrice, backMargin, quantity, shippingCost, warehouseShippingCost,
    commissionRate, commissionType, advancePaymentRate, advancePaymentDate,
    balancePaymentDate, packaging, orderDate, deliveryDate, isOrderConfirmed,
    productName, productSize, productWeight, productPackagingSize,
    optionItems, laborCostItems, factoryShipments, returnExchangeItems, workItems, deliverySets,
    onUpdateOriginalData,
  ]);

  // 변경 감지 (자동 저장 제거 - 수동 저장만 사용)
  useEffect(() => {
    // checkForChanges 함수 내에서 originalDataRef가 null인 경우(새 발주)도 처리하므로 항상 호출
    console.log('[usePurchaseOrderSave] useEffect - checkForChanges called');
    const hasChanges = checkForChanges();
    console.log('[usePurchaseOrderSave] useEffect - setting isDirty to:', hasChanges);
    // checkForChanges 내에서 setIsDirty를 호출하지만, 반환값도 사용하여 확실하게 설정
    setIsDirty(hasChanges);
  }, [
    checkForChanges,
    productName, productSize, productWeight,
    unitPrice, backMargin, quantity, shippingCost, warehouseShippingCost,
    commissionRate, commissionType, advancePaymentRate, advancePaymentDate,
    balancePaymentDate, packaging, orderDate, deliveryDate, isOrderConfirmed,
    optionItems, laborCostItems, factoryShipments, returnExchangeItems, workItems, deliverySets,
  ]);

  return {
    isDirty,
    isSaving,
    lastSavedAt,
    handleSave,
    setOriginalData,
  };
}

