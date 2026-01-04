import {
  ArrowLeft,
  Package,
  MapPin,
  CreditCard,
  FileText,
  Calendar,
  User,
  DollarSign,
  Ruler,
  Weight,
  Box,
  Truck,
  Factory,
  Wrench,
  Edit,
  Image,
  Plus,
  Trash2,
  Download,
  X,
  Images,
} from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ProductDetailModal } from "./ProductDetailModal";
import { FactoryShippingTab, type FactoryShipment, type ReturnExchangeItem } from "./tabs/FactoryShippingTab";
import { ProcessingPackagingTab, type WorkItem } from "./tabs/ProcessingPackagingTab";
import { CostPaymentTab, type LaborCostItem } from "./tabs/CostPaymentTab";
import { LogisticsDeliveryTab, type PackageInfo, type LogisticsInfo, type DeliverySet } from "./tabs/LogisticsDeliveryTab";
import { MemoSection, type Memo, type Reply } from "./MemoSection";
import { PhotoGalleryModal } from "./PhotoGalleryModal";
import { ProductImageModal } from "./ProductImageModal";
import { FactoryImageModal } from "./FactoryImageModal";
import { GalleryImageModal } from "./GalleryImageModal";
import { LogisticsImageModal } from "./LogisticsImageModal";
import { ImagePreviewTooltip } from "./ImagePreviewTooltip";
import { HeaderSection } from "./purchase-order/HeaderSection";
import { TabNavigation } from "./purchase-order/TabNavigation";
import type { Product } from "../types/product";
import {
  calculateTotalOptionCost,
  calculateTotalLaborCost,
  calculateTotalShippedQuantity,
  calculateTotalReturnQuantity,
  calculateTotalReceivedQuantity,
  calculateFactoryStatus,
  calculateWorkStatus,
  calculateBasicCostTotal,
  calculateCommissionAmount,
  calculateShippingCostTotal,
  calculateFinalPaymentAmount,
  calculateExpectedFinalUnitPrice,
  calculateAdvancePaymentAmount,
  calculateBalancePaymentAmount,
  calculatePackingListShippingCost,
  calculateDeliveryStatus,
} from "../utils/purchaseOrderCalculations";
import { getShippingCostByPurchaseOrder, getShippingSummaryByPurchaseOrder } from "../api/packingListApi";
import { usePurchaseOrderData } from "../hooks/usePurchaseOrderData";
import { usePurchaseOrderSave } from "../hooks/usePurchaseOrderSave";
import { useMemoManagement } from "../hooks/useMemoManagement";
import { useImageModals } from "../hooks/useImageModals";
import { useFactoryShipmentHandlers } from "../hooks/useFactoryShipmentHandlers";
import { useWorkItemHandlers } from "../hooks/useWorkItemHandlers";
import { useLogisticsHandlers } from "../hooks/useLogisticsHandlers";
import { useCostItemHandlers } from "../hooks/useCostItemHandlers";
import { useAuth } from "../contexts/AuthContext";
import { usePermission } from "../contexts/PermissionContext";
import { formatDateForInput } from "../utils/dateUtils";
import { convertFactoryShipmentsToFormData } from "../utils/packingListTransform";

interface PurchaseOrderDetailProps {
  orderId: string;
  onBack: () => void;
  initialTab?: 'cost' | 'factory' | 'work' | 'delivery';
  autoSave?: boolean; // 자동 저장 플래그
}

export function PurchaseOrderDetail({
  orderId,
  onBack,
  initialTab = 'cost',
  autoSave = false,
}: PurchaseOrderDetailProps) {
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
  const SERVER_BASE_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';
  const { user } = useAuth();
  const { hasPermission } = usePermission();
  const isSuperAdmin = user?.level === 'A-SuperAdmin';
  const canWrite = hasPermission('purchase-orders', 'write');
  const canDelete = hasPermission('purchase-orders', 'delete');
  const navigate = useNavigate();
  
  // 새 발주인지 확인
  const isNewOrder = orderId === 'new';

  // 데이터 로딩 Hook 사용 (orderId가 null이 아닌 경우에만 호출)
  const {
    order: loadedOrder,
    isLoading,
    optionItems: loadedOptionItems,
    laborCostItems: loadedLaborCostItems,
    factoryShipments: loadedFactoryShipments,
    returnExchangeItems: loadedReturnExchangeItems,
    workItems: loadedWorkItems,
    setOptionItems,
    setLaborCostItems,
    setFactoryShipments,
    setReturnExchangeItems,
    setWorkItems,
    reloadCostItems,
    reloadFactoryShipments,
    reloadReturnExchanges,
    reloadWorkItems,
    deliverySets: loadedDeliverySets,
    setDeliverySets,
    reloadDeliverySets,
    reloadPurchaseOrder,
  } = usePurchaseOrderData(isNewOrder ? null : orderId);

  // 새 발주인 경우 빈 데이터 사용, 아니면 로드된 데이터 사용
  const order = isNewOrder ? null : loadedOrder;
  const optionItems = isNewOrder ? [] : loadedOptionItems;
  const laborCostItems = isNewOrder ? [] : loadedLaborCostItems;
  const factoryShipments = isNewOrder ? [] : loadedFactoryShipments;
  const returnExchangeItems = isNewOrder ? [] : loadedReturnExchangeItems;

  // Editable cost state
  const [unitPrice, setUnitPrice] = useState(0);
  const [backMargin, setBackMargin] = useState(0); // 추가 단가 (back_margin)
  const [quantity, setQuantity] = useState(0);
  const [shippingCost, setShippingCost] = useState(0);
  const [warehouseShippingCost, setWarehouseShippingCost] = useState(0);
  // 패킹리스트 배송비 (서버에서 가져온 값)
  const [packingListShippingCost, setPackingListShippingCost] = useState(0);
  // 패킹리스트 출고 수량 정보
  const [shippingQuantity, setShippingQuantity] = useState<number | undefined>(undefined);
  const [koreaArrivedQuantity, setKoreaArrivedQuantity] = useState<number | undefined>(undefined);
  const [commissionRate, setCommissionRate] = useState(0);
  const [commissionType, setCommissionType] = useState("");
  const [optionCost, setOptionCost] = useState(0);
  const [orderDate, setOrderDate] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [packaging, setPackaging] = useState(0);

  // 상품 정보 상태 (새 발주일 때 입력 가능)
  const [productName, setProductName] = useState("");
  const [productSize, setProductSize] = useState("");
  const [productWeight, setProductWeight] = useState("");
  const [productPackagingSize, setProductPackagingSize] = useState("");
  const [productImage, setProductImage] = useState<string>("");
  const [pendingMainImageFile, setPendingMainImageFile] = useState<File | null>(null);
  const [pendingMainImagePreview, setPendingMainImagePreview] = useState<string>("");

  // 발주 컨펌 상태
  const [isOrderConfirmed, setIsOrderConfirmed] = useState(false);
  const [orderStatus, setOrderStatus] = useState<'발주확인' | '발주 대기' | '취소됨'>('발주 대기');

  // 상품 상세 모달 상태
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  
  // 사진모아보기 이미지 상태
  const [productGalleryImages, setProductGalleryImages] = useState<Array<{ id?: number; url: string; type?: string }>>([]);

  // 선금/잔금 관리
  const [advancePaymentRate, setAdvancePaymentRate] = useState(0);
  const [advancePaymentDate, setAdvancePaymentDate] = useState("");
  const [balancePaymentDate, setBalancePaymentDate] = useState("");

  // 탭 상태
  const [activeTab, setActiveTab] = useState<"cost" | "factory" | "work" | "delivery">(initialTab || 'cost');

  // 가공/포장 작업 관련 상태 (workItems는 usePurchaseOrderData에서 가져옴)
  const [workStartDate, setWorkStartDate] = useState<string>("");
  const [workEndDate, setWorkEndDate] = useState<string>("");

  // 물류회사로 배송 관련 상태
  const [newPackingCode, setNewPackingCode] = useState<string>("");
  const [newPackingDate, setNewPackingDate] = useState<string>("");

  // 이미지 모달 관리 Hook 사용
  const {
    isImageModalOpen,
    setIsImageModalOpen,
    isPhotoGalleryOpen,
    setIsPhotoGalleryOpen,
    selectedGalleryImage,
    setSelectedGalleryImage,
    selectedFactoryImage,
    setSelectedFactoryImage,
    logisticsImageModalOpen,
    setLogisticsImageModalOpen,
    selectedLogisticsImage,
    setSelectedLogisticsImage,
    openLogisticsImageModal,
    hoveredImage,
    setHoveredImage,
  } = useImageModals();

  const currentUserId = "admin"; // 실제로는 로그인한 사용자 ID

  // 메모 관리 Hook 사용
  const {
    memos,
    newMemoContent,
    replyInputs,
    setNewMemoContent,
    setReplyInputs,
    addMemo,
    deleteMemo,
    addReply,
    deleteReply,
    setMemos,
  } = useMemoManagement({
    currentUserId,
    purchaseOrderId: isNewOrder ? null : orderId,
  });

  // 업체 출고 핸들러 Hook 사용
  const {
    addFactoryShipment,
    removeFactoryShipment,
    updateFactoryShipment,
    handleFactoryImageUpload,
    removeFactoryImage,
    addReturnExchangeItem,
    removeReturnExchangeItem,
    updateReturnExchangeItem,
    handleReturnExchangeImageUpload,
    removeReturnExchangeImage,
  } = useFactoryShipmentHandlers({
    orderId,
    factoryShipments,
    setFactoryShipments,
    returnExchangeItems,
    setReturnExchangeItems,
    API_BASE_URL,
    SERVER_BASE_URL,
  });

  // 물류 배송 핸들러 Hook 사용
  useLogisticsHandlers({
    orderId,
    deliverySets: loadedDeliverySets,
    setDeliverySets,
    newPackingCode,
    newPackingDate,
    setNewPackingCode,
    setNewPackingDate,
    API_BASE_URL,
    SERVER_BASE_URL,
  });

  // Cost Items 핸들러 Hook 사용
  const {
    commissionOptions,
    handleCommissionTypeChange,
    addLaborCostItem,
    removeLaborCostItem,
    updateLaborCostItemName,
    updateLaborCostItemUnitPrice,
    updateLaborCostItemQuantity,
    addOptionItem,
    removeOptionItem,
    updateOptionItemName,
    updateOptionItemUnitPrice,
    updateOptionItemQuantity,
  } = useCostItemHandlers({
    optionItems,
    setOptionItems,
    laborCostItems,
    setLaborCostItems,
    commissionType,
    setCommissionType,
    setCommissionRate,
  });

  // workItems가 undefined일 경우 빈 배열로 처리
  const safeWorkItems = loadedWorkItems || [];

  // 가공/포장 작업 핸들러 Hook 사용
  const {
    handleWorkImageUpload,
    handleWorkItemComplete,
    removeWorkItem,
    updateWorkItemDescription,
  } = useWorkItemHandlers({
    workItems: safeWorkItems,
    setWorkItems,
    workEndDate,
    setWorkEndDate,
  });

  // 원본 데이터 참조 (발주 컨펌 자동 저장 시 사용)
  const originalDataRef = useRef<{
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
    is_confirmed: boolean;
    optionItems: LaborCostItem[];
    laborCostItems: LaborCostItem[];
    factoryShipments: FactoryShipment[];
    returnExchangeItems: ReturnExchangeItem[];
    workItems: WorkItem[];
    deliverySets: DeliverySet[];
  } | null>(null);

  // 저장 및 변경 감지 Hook 사용
  const {
    isDirty: hookIsDirty,
    isSaving: hookIsSaving,
    lastSavedAt: hookLastSavedAt,
    handleSave: originalHandleSave,
    setOriginalData: hookSetOriginalData,
  } = usePurchaseOrderSave({
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
    isOrderConfirmed,
    productName,
    productSize,
    productWeight,
    productPackagingSize,
    optionItems,
    laborCostItems,
    factoryShipments,
    returnExchangeItems,
    workItems: safeWorkItems,
    deliverySets: loadedDeliverySets,
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
    isSuperAdmin,
    userLevel: user?.level,
  });

  // hook에서 반환된 값들을 사용할 수 있도록 변수 정의
  const isDirty = hookIsDirty;
  const isSaving = hookIsSaving;
  const lastSavedAt = hookLastSavedAt;
  const setOriginalData = hookSetOriginalData;

  // 배송 상태 계산을 위한 패킹리스트 정보
  const [shippingSummary, setShippingSummary] = useState<{
    shipped_quantity: number;
    shipping_quantity: number;
  } | null>(null);

  // 패킹리스트 배송 정보 로드
  useEffect(() => {
    if (!isNewOrder && orderId) {
      getShippingSummaryByPurchaseOrder(orderId)
        .then((summary) => {
          if (summary) {
            setShippingSummary({
              shipped_quantity: summary.shipped_quantity || 0,
              shipping_quantity: summary.shipping_quantity || 0,
            });
          } else {
            setShippingSummary({
              shipped_quantity: 0,
              shipping_quantity: 0,
            });
          }
        })
        .catch((error) => {
          console.error('배송 정보 로드 오류:', error);
          setShippingSummary({
            shipped_quantity: 0,
            shipping_quantity: 0,
          });
        });
    }
  }, [orderId, isNewOrder]);

  // 계산된 배송 상태
  const calculatedDeliveryStatus = order
    ? calculateDeliveryStatus(
        shippingSummary?.shipped_quantity || 0,
        shippingSummary?.shipping_quantity || 0,
        order.deliveryStatus || '대기중'
      )
    : '대기중';

  // handleSave 래핑하여 새 발주 저장 시 이미지도 함께 업로드
  const handleSave = useCallback(async (isManual?: boolean) => {
    const savedOrderId = await originalHandleSave(isManual);
    
    // 새 발주 저장 성공 시 이미지 업로드
    if (isNewOrder && savedOrderId && typeof savedOrderId === 'string' && pendingMainImageFile) {
      try {
        const formData = new FormData();
        formData.append('mainImage', pendingMainImageFile);

        const response = await fetch(`${API_BASE_URL}/purchase-orders/${savedOrderId}/main-image`, {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('이미지 업로드 실패:', errorData.error || '이미지 업로드에 실패했습니다.');
        } else {
          const result = await response.json();
          if (result.success && result.data?.imageUrl) {
            console.log('이미지 업로드 성공:', result.data.imageUrl);
          }
        }
      } catch (error: any) {
        console.error('메인 이미지 업로드 오류:', error);
      }
      
      // 임시 미리보기 정리
      if (pendingMainImagePreview) {
        URL.revokeObjectURL(pendingMainImagePreview);
      }
      setPendingMainImageFile(null);
      setPendingMainImagePreview("");
      
      // 새 발주 페이지로 이동
      window.location.href = `/admin/purchase-orders/${savedOrderId}`;
      return;
    }
    
    // 기존 발주는 그대로 진행
    if (savedOrderId && typeof savedOrderId === 'string') {
      // 이미지가 있는 경우 이미지 업로드 (기존 발주)
      if (pendingMainImageFile) {
        try {
          const formData = new FormData();
          formData.append('mainImage', pendingMainImageFile);

          const response = await fetch(`${API_BASE_URL}/purchase-orders/${savedOrderId}/main-image`, {
            method: 'POST',
            credentials: 'include',
            body: formData,
          });

          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data?.imageUrl) {
              const imageUrl = result.data.imageUrl.startsWith('http') 
                ? result.data.imageUrl 
                : `${SERVER_BASE_URL}${result.data.imageUrl}`;
              setProductImage(imageUrl);
            }
          }
        } catch (error: any) {
          console.error('메인 이미지 업로드 오류:', error);
        }
        
        // 임시 미리보기 정리
        if (pendingMainImagePreview) {
          URL.revokeObjectURL(pendingMainImagePreview);
        }
        setPendingMainImageFile(null);
        setPendingMainImagePreview("");
      }
    }
  }, [isNewOrder, pendingMainImageFile, pendingMainImagePreview, originalHandleSave, API_BASE_URL, SERVER_BASE_URL]);

  // orderId가 변경되면 상태 초기화 (새 발주인 경우 빈 상태로 초기화)
  useEffect(() => {
    if (isNewOrder) {
      // 새 발주인 경우 빈 상태로 초기화
      setUnitPrice(0);
      setBackMargin(0);
      setQuantity(0);
      setOptionCost(0);
      setOrderDate(new Date().toISOString().split('T')[0]); // 오늘 날짜
      setDeliveryDate('');
      setPackaging(0);
      setShippingCost(0);
      setWarehouseShippingCost(0);
      setCommissionRate(0);
      setCommissionType('');
      setAdvancePaymentRate(0);
      setAdvancePaymentDate('');
      setBalancePaymentDate('');
      setIsOrderConfirmed(false);
      setOrderStatus('발주 대기');
      setWorkStartDate('');
      setWorkEndDate('');
        setProductName('');
        setProductSize('');
        setProductWeight('');
        setProductPackagingSize('');
        setProductImage('');
      return;
    }

    // 기존 발주인 경우 order가 로드되면 상태 업데이트
    if (order) {
      setUnitPrice(order.unitPrice || 0);
      setBackMargin(order._rawData?.back_margin || 0);
      setQuantity(order.quantity || 0);
      setOptionCost(order.optionCost || 0);
      setOrderDate(formatDateForInput(order?.date));
      setDeliveryDate(formatDateForInput(order?.estimatedDelivery));
      setPackaging(order.packaging || 0);
      // optionItems와 laborCostItems는 DB에서 별도로 관리되므로 별도로 로드
      // _rawData에서 추가 정보 가져오기
      if (order._rawData) {
        setShippingCost(order._rawData.shipping_cost || 0);
        setWarehouseShippingCost(order._rawData.warehouse_shipping_cost || 0);
        setCommissionRate(order._rawData.commission_rate || 0);
        setCommissionType(order._rawData.commission_type || "");
        setAdvancePaymentRate(order._rawData.advance_payment_rate || 0);
        setAdvancePaymentDate(formatDateForInput(order._rawData.advance_payment_date));
        setBalancePaymentDate(formatDateForInput(order._rawData.balance_payment_date));
        setIsOrderConfirmed(order._rawData.is_confirmed || false);
        setOrderStatus(order._rawData.order_status || '발주 대기');
        
        // 작업 시작일/완료일 로드
        setWorkStartDate(formatDateForInput(order._rawData.work_start_date));
        setWorkEndDate(formatDateForInput(order._rawData.work_end_date));
        
        // 상품 정보 로드 (product_name, product_size, product_weight, product_packaging_size, product_main_image)
        if (order._rawData.product_name) {
          setProductName(order._rawData.product_name);
        }
        if (order._rawData.product_size) {
          setProductSize(order._rawData.product_size);
        }
        if (order._rawData.product_weight) {
          setProductWeight(order._rawData.product_weight);
        }
        if (order._rawData.product_packaging_size) {
          setProductPackagingSize(order._rawData.product_packaging_size);
        }
        if (order.productImage) {
          setProductImage(order.productImage);
        }
        
        // 원본 데이터는 모든 데이터가 로드된 후 별도 useEffect에서 설정됨 (아래 참조)
      }
      
      // 패킹리스트 배송비 및 출고 수량 정보 가져오기
      if (orderId && orderId !== 'new') {
        getShippingCostByPurchaseOrder(orderId)
          .then((shippingCostData) => {
            if (shippingCostData) {
              // 발주 수량 × 단위당 배송비로 총 배송비 계산
              const packingListCost = calculatePackingListShippingCost(
                shippingCostData.unit_shipping_cost,
                shippingCostData.ordered_quantity
              );
              setPackingListShippingCost(packingListCost);
    } else {
      setPackingListShippingCost(0);
      setShippingQuantity(undefined);
      setKoreaArrivedQuantity(undefined);
    }
          })
          .catch((error) => {
            console.error('패킹리스트 배송비 조회 오류:', error);
            setPackingListShippingCost(0);
          });
        
        // 패킹리스트 출고 수량 정보 가져오기
        getShippingSummaryByPurchaseOrder(orderId)
          .then((shippingSummary) => {
            if (shippingSummary) {
              setShippingQuantity(shippingSummary.shipping_quantity);
              setKoreaArrivedQuantity(shippingSummary.arrived_quantity);
            } else {
              setShippingQuantity(0);
              setKoreaArrivedQuantity(0);
            }
          })
          .catch((error) => {
            console.error('패킹리스트 출고 수량 조회 오류:', error);
            setShippingQuantity(0);
            setKoreaArrivedQuantity(0);
          });
      }
    } else {
      setPackingListShippingCost(0);
      setShippingQuantity(undefined);
      setKoreaArrivedQuantity(undefined);
    }
  }, [order, orderId, hookSetOriginalData]);

  // initialTab이 변경되면 activeTab 업데이트
  useEffect(() => {
    if (initialTab) {
      // C0 레벨일 때 factory나 work 탭은 cost로 변경
      const isLevelC = user?.level === 'C0: 한국Admin';
      if (isLevelC && (initialTab === 'factory' || initialTab === 'work')) {
        setActiveTab('cost');
      } else {
        setActiveTab(initialTab);
      }
    }
  }, [initialTab, orderId, user?.level]);

  // C0 레벨일 때 activeTab이 factory나 work면 cost로 변경
  useEffect(() => {
    const isLevelC = user?.level === 'C0: 한국Admin';
    if (isLevelC && (activeTab === 'factory' || activeTab === 'work')) {
      setActiveTab('cost');
    }
  }, [user?.level, activeTab]);

  // autoSave가 true이고 데이터 로드가 완료되면 자동으로 저장
  const autoSaveExecutedRef = useRef(false);
  useEffect(() => {
    if (autoSave && !isLoading && order && !autoSaveExecutedRef.current && !isSaving) {
      // 모든 데이터가 로드된 후 저장
      // 약간의 지연을 두어 모든 state가 완전히 초기화되도록 함
      autoSaveExecutedRef.current = true;
      const timer = setTimeout(() => {
        handleSave(true);
      }, 1000); // 1초 지연으로 모든 데이터 로드 완료 보장
      return () => clearTimeout(timer);
    }
  }, [autoSave, isLoading, order, isSaving, handleSave]);
  
  // orderId가 변경되면 autoSaveExecutedRef 리셋
  useEffect(() => {
    autoSaveExecutedRef.current = false;
  }, [orderId]);

  // 모든 데이터가 로드된 후 originalData 설정 (초기 로드 시 isDirty가 true로 설정되는 것을 방지)
  const originalDataInitializedRef = useRef<string | null>(null);
  
  // orderId가 변경되면 초기화 플래그 리셋
  useEffect(() => {
    if (originalDataInitializedRef.current !== orderId) {
      originalDataInitializedRef.current = null;
    }
  }, [orderId]);

  // 데이터 로드 완료 후 originalData 설정
  useEffect(() => {
    // orderId가 변경되면 초기화 플래그 리셋
    if (originalDataInitializedRef.current !== orderId) {
      originalDataInitializedRef.current = null;
    }

    // 로딩이 완료되고 모든 필수 데이터가 준비되었을 때만 실행
    if (!isLoading && order && order._rawData) {
      // 모든 필수 데이터가 로드되었는지 확인 (undefined가 아닌지 확인)
      if (optionItems !== undefined && laborCostItems !== undefined && 
          factoryShipments !== undefined && returnExchangeItems !== undefined && 
          loadedWorkItems !== undefined && loadedDeliverySets !== undefined) {
        
        // 이미 이 orderId에 대해 설정했으면 스킵 (한 번만 설정)
        if (originalDataInitializedRef.current === orderId) {
          console.log('[PurchaseOrderDetail] originalData already initialized for orderId:', orderId);
          return;
        }

        // originalData를 설정하는 함수
        const updateOriginalData = () => {
          // order._rawData에서 직접 값을 가져와서 originalData 설정 (state가 아직 업데이트되지 않았을 수 있으므로)
          const originalData = {
            unit_price: order._rawData.unit_price || 0,
            back_margin: order._rawData.back_margin || 0,
            work_start_date: formatDateForInput(order._rawData.work_start_date) || '',
            work_end_date: formatDateForInput(order._rawData.work_end_date) || '',
            quantity: order._rawData.quantity || 0,
            shipping_cost: order._rawData.shipping_cost || 0,
            warehouse_shipping_cost: order._rawData.warehouse_shipping_cost || 0,
            commission_rate: order._rawData.commission_rate || 0,
            commission_type: order._rawData.commission_type || "",
            advance_payment_rate: order._rawData.advance_payment_rate || 0,
            advance_payment_date: formatDateForInput(order._rawData.advance_payment_date),
            balance_payment_date: formatDateForInput(order._rawData.balance_payment_date),
            packaging: order._rawData.packaging || 0,
            order_date: formatDateForInput(order._rawData.order_date),
            estimated_delivery: formatDateForInput(order._rawData.estimated_delivery),
            is_confirmed: order._rawData.is_confirmed || false,
            product_name: order._rawData.product_name || order.product || '',
            product_size: order._rawData.product_size || order.size || '',
            product_weight: order._rawData.product_weight || order.weight || '',
            product_packaging_size: order._rawData.product_packaging_size || '',
            optionItems: JSON.parse(JSON.stringify(optionItems)),
            laborCostItems: JSON.parse(JSON.stringify(laborCostItems)),
            factoryShipments: JSON.parse(JSON.stringify(factoryShipments.map(s => ({ ...s, pendingImages: undefined })))),
            returnExchangeItems: JSON.parse(JSON.stringify(returnExchangeItems.map(r => ({ ...r, pendingImages: undefined })))),
            workItems: JSON.parse(JSON.stringify(loadedWorkItems.map(w => ({ ...w, pendingImages: undefined })))),
            deliverySets: JSON.parse(JSON.stringify(loadedDeliverySets.map(set => ({
          ...set,
              logisticsInfoList: (set.logisticsInfoList || []).map(log => ({
                ...log,
                pendingImages: undefined,
              })),
            })))),
          };
          
          console.log('[PurchaseOrderDetail] Setting originalData from order._rawData:', {
            ...originalData,
            workItemsLength: originalData.workItems.length,
            loadedWorkItemsLength: loadedWorkItems.length
          });
          setOriginalData(originalData);
          originalDataInitializedRef.current = orderId;
          console.log('[PurchaseOrderDetail] originalDataInitializedRef set to:', orderId);
        };

        // 약간의 지연을 두어 모든 데이터(특히 workItems 이미지)가 완전히 로드된 후 설정
        // 단, 이미 설정되어 있지 않은 경우에만 설정
        const timer = setTimeout(() => {
          if (originalDataInitializedRef.current !== orderId) {
            updateOriginalData();
          }
        }, 800); // 800ms 지연으로 모든 데이터(특히 workItems 이미지) 로딩 완료 대기

        return () => clearTimeout(timer);
      } else {
        console.log('[PurchaseOrderDetail] Data not ready yet:', {
          isLoading,
          hasOrder: !!order,
          hasRawData: !!order?._rawData,
          optionItems: optionItems !== undefined,
          laborCostItems: laborCostItems !== undefined,
          factoryShipments: factoryShipments !== undefined,
          returnExchangeItems: returnExchangeItems !== undefined,
          loadedWorkItems: loadedWorkItems !== undefined,
          loadedDeliverySets: loadedDeliverySets !== undefined,
        });
      }
    }
  }, [
    orderId, isLoading, order, setOriginalData, optionItems, laborCostItems,
    factoryShipments, returnExchangeItems, loadedWorkItems, loadedDeliverySets
  ]);

  // 뒤로가기 버튼 핸들러 (경고 표시)
  const handleBackWithConfirm = useCallback(() => {
    if (isDirty) {
      const shouldLeave = window.confirm(
        '저장되지 않은 변경사항이 있습니다. 정말로 나가시겠습니까? 변경사항이 저장되지 않습니다.'
      );
      
      if (shouldLeave) {
        onBack();
      }
    } else {
      onBack();
    }
  }, [isDirty, onBack]);

  // 브라우저 탭 닫기/새로고침 방지 (모든 hook은 early return 이전에 위치해야 함)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = ''; // Chrome에서 메시지 표시를 위해 필요
        return ''; // 일부 브라우저에서 필요
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty]);

  // 발주 컨펌 변경 핸들러 (자동 저장)
  const handleOrderConfirmedChange = useCallback(async (confirmed: boolean) => {
    setIsOrderConfirmed(confirmed);
    
    // 취소됨 상태가 아닐 때만 order_status 자동 동기화 (서버에서 처리)
    if (orderStatus !== '취소됨') {
      setOrderStatus(confirmed ? '발주확인' : '발주 대기');
    }
    
    // 발주 컨펌 상태만 즉시 DB에 저장 (서버에서 order_status 자동 동기화)
    try {
      const response = await fetch(`${API_BASE_URL}/purchase-orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          is_confirmed: confirmed,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '발주 컨펌 상태 저장에 실패했습니다.');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || '발주 컨펌 상태 저장에 실패했습니다.');
      }

      // 서버 응답에서 업데이트된 order_status 반영
      if (data.data && data.data.order_status) {
        setOrderStatus(data.data.order_status);
      }

      // 원본 데이터 업데이트 (변경 감지에서 제외하기 위해)
      if (originalDataRef.current) {
        const updatedOriginalData = {
          ...originalDataRef.current,
          is_confirmed: confirmed,
        };
        originalDataRef.current = updatedOriginalData;
        setOriginalData(updatedOriginalData);
      }
    } catch (error: any) {
      console.error('발주 컨펌 상태 저장 오류:', error);
      // 에러 발생 시 상태 롤백
      setIsOrderConfirmed(!confirmed);
      if (orderStatus !== '취소됨') {
        setOrderStatus(!confirmed ? '발주확인' : '발주 대기');
      }
      alert(error.message || '발주 컨펌 상태 저장 중 오류가 발생했습니다.');
    }
  }, [orderId, API_BASE_URL, setOriginalData, orderStatus]);

  // 발주 취소 핸들러
  const handleCancelOrder = useCallback(async () => {
    if (!confirm('발주를 취소하시겠습니까?')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/purchase-orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          order_status: '취소됨',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '발주 취소에 실패했습니다.');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || '발주 취소에 실패했습니다.');
      }

      // 상태 업데이트
      setOrderStatus('취소됨');
      
      alert('발주가 취소되었습니다.');
    } catch (error: any) {
      console.error('발주 취소 오류:', error);
      alert(error.message || '발주 취소 중 오류가 발생했습니다.');
    }
  }, [orderId, API_BASE_URL]);

  // 메모는 DB에서 별도로 관리되므로 초기화만 수행 (나중에 API로 로드)
  // useEffect(() => {
  //   if (order) {
  //     // 메모는 별도 API로 로드
  //   }
  // }, [order]);

  // 이미지 URL 변환 헬퍼 함수
  const getFullImageUrl = useCallback((imageUrl: string | null | undefined): string => {
    if (!imageUrl) return '';
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    return `${SERVER_BASE_URL}${imageUrl}`;
  }, [SERVER_BASE_URL]);

  // 메인 이미지 업로드 핸들러
  const handleMainImageUpload = useCallback(async (file: File) => {
    try {
      // 새 발주인 경우 임시로 파일 저장하고 미리보기 표시
      if (isNewOrder) {
        setPendingMainImageFile(file);
        const previewUrl = URL.createObjectURL(file);
        setPendingMainImagePreview(previewUrl);
        return; // 새 발주는 저장 시 자동 업로드됨
      }

      // 기존 발주는 즉시 업로드
      const formData = new FormData();
      formData.append('mainImage', file);

      const response = await fetch(`${API_BASE_URL}/purchase-orders/${orderId}/main-image`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || '이미지 업로드에 실패했습니다.');
      }

      const result = await response.json();
      if (result.success && result.data?.imageUrl) {
        const imageUrl = result.data.imageUrl.startsWith('http') 
          ? result.data.imageUrl 
          : `${SERVER_BASE_URL}${result.data.imageUrl}`;
        setProductImage(imageUrl);
        
        // 발주 데이터 재로드하여 최신 이미지 URL 반영
        if (reloadPurchaseOrder) {
          await reloadPurchaseOrder();
        }
        
        alert('이미지가 업로드되었습니다.');
      } else {
        throw new Error(result.error || '이미지 업로드에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('메인 이미지 업로드 오류:', error);
      throw error;
    }
  }, [isNewOrder, orderId, API_BASE_URL, SERVER_BASE_URL]);

  // 공장→물류창고 핸들러
  const handleFactoryToWarehouse = useCallback(() => {
    if (!order) {
      alert('발주 정보를 불러올 수 없습니다.');
      return;
    }

    try {
      // 발주 정보에서 제품명과 이미지 가져오기
      const productName = order._rawData?.product_name || order.product || '';
      const productImageUrl = order._rawData?.product_main_image || order.productImage || null;
      const orderDate = formatDateForInput(order._rawData?.order_date || order.date);

      // FactoryShipment를 PackingListFormData로 변환 (출고 항목이 없어도 가능)
      const formData = convertFactoryShipmentsToFormData(
        factoryShipments,
        orderId,
        productName,
        productImageUrl,
        orderDate
      );

      // ShippingHistory 페이지로 이동하면서 데이터 전달
      navigate('/admin/shipping-history', {
        state: { initialPackingListData: formData },
      });
    } catch (error: any) {
      console.error('공장→물류창고 변환 오류:', error);
      alert(error.message || '패킹리스트 데이터 변환에 실패했습니다.');
    }
  }, [order, factoryShipments, orderId, navigate]);

  // 상품 정보 가져오기 함수
  const handleProductClick = useCallback(async () => {
    if (!order?._rawData?.product?.id) {
      alert('상품 정보를 불러올 수 없습니다.');
      return;
    }

    const productId = order._rawData.product.id;
    
    try {
      const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('상품 정보를 불러오는데 실패했습니다.');
      }

      const data = await response.json();
      if (data.success && data.data) {
        const fullProduct = data.data;

        const convertedProduct: Product = {
          id: fullProduct.id,
          name: fullProduct.name,
          nameChinese: fullProduct.name_chinese || undefined,
          category: fullProduct.category,
          price: fullProduct.price,
          stock: fullProduct.stock,
          status: fullProduct.status,
          size: fullProduct.size || '',
          packagingSize: fullProduct.packaging_size || '',
          weight: fullProduct.weight || '',
          setCount: fullProduct.set_count,
          smallPackCount: fullProduct.small_pack_count,
          boxCount: fullProduct.box_count,
          mainImage: fullProduct.main_image ? getFullImageUrl(fullProduct.main_image) : '',
          images: Array.isArray(fullProduct.images) ? fullProduct.images.map(getFullImageUrl) : [],
          supplier: fullProduct.supplier || { name: '', url: '' },
        };

        setSelectedProduct(convertedProduct);
        setIsProductModalOpen(true);
      } else {
        throw new Error(data.error || '상품 정보를 불러오는데 실패했습니다.');
      }
    } catch (err: any) {
      console.error('상품 정보 로드 오류:', err);
      alert(err.message || '상품 정보를 불러오는 중 오류가 발생했습니다.');
    }
  }, [order, API_BASE_URL, getFullImageUrl]);

  // 사진첩 버튼 클릭 핸들러 (발주 관련 모든 이미지 가져오기)
  const handlePhotoGalleryClick = useCallback(async () => {
    if (!orderId || isNewOrder) {
      alert('발주 정보를 불러올 수 없습니다.');
      return;
    }

    try {
      const allImages: Array<{ id?: number; url: string; type?: string }> = [];
      const seenUrls = new Set<string>(); // URL 중복 체크용 Set

      // 1. 메인 이미지 추가 (메인 이미지는 ID가 없으므로 id 없이 추가)
      if (order?.productImage) {
        const mainImageUrl = order.productImage.startsWith('http') 
          ? order.productImage 
          : `${SERVER_BASE_URL}${order.productImage}`;
        if (mainImageUrl && !seenUrls.has(mainImageUrl)) {
          allImages.push({ url: mainImageUrl, type: 'main' });
          seenUrls.add(mainImageUrl);
        }
      }

      // 2. 각 타입별 이미지 가져오기
      const imageTypes = ['factory_shipment', 'return_exchange', 'work_item', 'logistics', 'other'];
      
      for (const imageType of imageTypes) {
        try {
          const response = await fetch(`${API_BASE_URL}/purchase-orders/${orderId}/images/${imageType}`, {
            credentials: 'include',
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success && Array.isArray(data.data)) {
              data.data.forEach((img: { id: number; image_url: string; display_order: number }) => {
                const imageUrl = img.image_url.startsWith('http') 
                  ? img.image_url 
                  : `${SERVER_BASE_URL}${img.image_url}`;
                if (imageUrl && !seenUrls.has(imageUrl)) {
                  allImages.push({ id: img.id, url: imageUrl, type: imageType });
                  seenUrls.add(imageUrl);
                }
              });
            }
          }
        } catch (err) {
          console.error(`${imageType} 이미지 로드 오류:`, err);
          // 하나의 타입 실패해도 계속 진행
        }
      }

      setProductGalleryImages(allImages);
      setIsPhotoGalleryOpen(true);
    } catch (err: any) {
      console.error('발주 이미지 로드 오류:', err);
      alert(err.message || '발주 이미지를 불러오는 중 오류가 발생했습니다.');
    }
  }, [orderId, order, isNewOrder, API_BASE_URL, SERVER_BASE_URL, setIsPhotoGalleryOpen]);

  // 로딩 중일 때 로딩 화면 표시 (새 발주가 아닌 경우에만)
  if (!isNewOrder && isLoading) {
    return (
      <div className="p-6 min-h-[1080px] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">발주 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 새 발주인 경우 빈 데이터로 초기화된 화면 표시 (이미 위에서 처리됨)
  // 기존 발주인데 로딩이 완료되었지만 order가 null인 경우에만 에러 메시지 표시
  if (!isNewOrder && !order && !isLoading) {
    return (
      <div className="p-6 min-h-[1080px] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">발주를 찾을 수 없습니다.</p>
          <button
            onClick={handleBackWithConfirm}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  // 계산 함수 사용 (새 발주인 경우에도 계산은 가능)
  const totalOptionCost = calculateTotalOptionCost(optionItems);
  const totalLaborCost = calculateTotalLaborCost(laborCostItems);
  const totalShippedQuantity = calculateTotalShippedQuantity(factoryShipments);
  const totalReturnQuantity = calculateTotalReturnQuantity(returnExchangeItems);
  const totalReceivedQuantity = calculateTotalReceivedQuantity(factoryShipments, returnExchangeItems);
  const currentFactoryStatus = calculateFactoryStatus(factoryShipments, returnExchangeItems, quantity);
  const workStatus = calculateWorkStatus(workStartDate, workEndDate);
  const commissionAmount = calculateCommissionAmount(unitPrice, quantity, commissionRate, backMargin);
  const basicCostTotal = calculateBasicCostTotal(unitPrice, quantity, commissionRate, backMargin);
  const shippingCostTotal = calculateShippingCostTotal(
    shippingCost,
    warehouseShippingCost
  );
  const finalPaymentAmount = calculateFinalPaymentAmount(basicCostTotal, shippingCostTotal, totalOptionCost, totalLaborCost);
  const expectedFinalUnitPrice = calculateExpectedFinalUnitPrice(finalPaymentAmount, packingListShippingCost, quantity);
  // 선금 금액 = 발주단가 * 수량 * (선금 비율 / 100)
  // 발주단가 = 기본단가 + 백마진
  const advancePaymentAmount = calculateAdvancePaymentAmount(unitPrice, quantity, advancePaymentRate, backMargin);
  // 잔금 금액 = 최종 결제 금액 - 선금
  const balancePaymentAmount = calculateBalancePaymentAmount(finalPaymentAmount, advancePaymentAmount);

  // 새 발주인 경우 빈 폼 화면 표시
  if (isNewOrder) {
    return (
      <div className="p-6 min-h-[1080px]">
        <HeaderSection
          onBack={handleBackWithConfirm}
          onSave={() => handleSave(true)}
          isDirty={isDirty}
          isSaving={isSaving}
          lastSavedAt={lastSavedAt}
          productName={productName}
          poNumber="새 발주"
          productImage={pendingMainImagePreview || productImage || ""}
          onMainImageUpload={handleMainImageUpload}
          size={productSize}
          weight={productWeight}
          packagingSize={productPackagingSize}
          packaging={packaging}
          finalUnitPrice={expectedFinalUnitPrice}
          shippingQuantity={shippingQuantity}
          koreaArrivedQuantity={koreaArrivedQuantity}
          packingListShippingCost={packingListShippingCost}
          orderDate={orderDate}
          deliveryDate={deliveryDate}
          isOrderConfirmed={isOrderConfirmed}
          orderStatus={orderStatus}
          isEditable={canWrite}
          onPackagingChange={setPackaging}
          onOrderDateChange={setOrderDate}
          onDeliveryDateChange={setDeliveryDate}
          onOrderConfirmedChange={handleOrderConfirmedChange}
          onCancelOrder={handleCancelOrder}
          onProductClick={() => {}}
          onPhotoGalleryClick={() => {}}
          onImageClick={() => {}}
          onProductNameChange={setProductName}
          onSizeChange={setProductSize}
          onWeightChange={setProductWeight}
          onPackagingSizeChange={setProductPackagingSize}
          userLevel={user?.level}
          currentFactoryStatus={currentFactoryStatus}
          totalShippedQuantity={totalShippedQuantity}
          totalReturnQuantity={totalReturnQuantity}
          totalReceivedQuantity={totalReceivedQuantity}
          hasFactoryShipments={factoryShipments.length > 0}
          hasReturnItems={returnExchangeItems.length > 0}
          workStatus={workStatus}
          workItems={safeWorkItems}
          deliveryStatus="대기중"
          paymentStatus="미결제"
        />

        <div className="grid grid-cols-[2fr_1fr] gap-6 mt-6">
        {/* Left Column - Main Info */}
        <div className="space-y-6">

          {/* Cost Breakdown - Editable */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-2 rounded-lg border border-green-200">
                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center shadow-md">
                  <DollarSign className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">
                  발주 진행 관리
                </h3>
              </div>
            </div>

            {/* 탭 네비게이션 */}
            <TabNavigation
              activeTab={activeTab}
              onTabChange={setActiveTab}
              userLevel={user?.level}
            />

            {/* 탭 콘텐츠 */}
            {activeTab === "cost" && (
              <CostPaymentTab
                unitPrice={unitPrice}
                backMargin={backMargin}
                quantity={quantity}
                commissionType={commissionType}
                commissionAmount={commissionAmount}
                basicCostTotal={basicCostTotal}
                isSuperAdmin={isSuperAdmin}
                userLevel={user?.level}
                canWrite={canWrite}
                onSetUnitPrice={setUnitPrice}
                onSetBackMargin={setBackMargin}
                onSetQuantity={setQuantity}
                onHandleCommissionTypeChange={handleCommissionTypeChange}
                commissionOptions={commissionOptions}
                shippingCost={shippingCost}
                warehouseShippingCost={warehouseShippingCost}
                shippingCostTotal={shippingCostTotal}
                packingListShippingCost={packingListShippingCost}
                onSetShippingCost={setShippingCost}
                onSetWarehouseShippingCost={setWarehouseShippingCost}
                optionItems={optionItems}
                totalOptionCost={totalOptionCost}
                onUpdateOptionItemName={updateOptionItemName}
                onUpdateOptionItemUnitPrice={updateOptionItemUnitPrice}
                onUpdateOptionItemQuantity={updateOptionItemQuantity}
                onRemoveOptionItem={removeOptionItem}
                onAddOptionItem={addOptionItem}
                laborCostItems={laborCostItems}
                totalLaborCost={totalLaborCost}
                onUpdateLaborCostItemName={updateLaborCostItemName}
                onUpdateLaborCostItemUnitPrice={updateLaborCostItemUnitPrice}
                onUpdateLaborCostItemQuantity={updateLaborCostItemQuantity}
                onRemoveLaborCostItem={removeLaborCostItem}
                onAddLaborCostItem={addLaborCostItem}
                advancePaymentRate={advancePaymentRate}
                advancePaymentAmount={advancePaymentAmount}
                advancePaymentDate={advancePaymentDate}
                balancePaymentAmount={balancePaymentAmount}
                balancePaymentDate={balancePaymentDate}
                finalPaymentAmount={finalPaymentAmount}
                onSetAdvancePaymentRate={setAdvancePaymentRate}
                onSetAdvancePaymentDate={setAdvancePaymentDate}
                onSetBalancePaymentDate={setBalancePaymentDate}
              />
            )}

            {activeTab === "factory" && (
              <FactoryShippingTab
                factoryShipments={factoryShipments}
                returnExchangeItems={returnExchangeItems}
                currentFactoryStatus={currentFactoryStatus}
                onAddFactoryShipment={addFactoryShipment}
                onRemoveFactoryShipment={removeFactoryShipment}
                onUpdateFactoryShipment={updateFactoryShipment}
                onHandleFactoryImageUpload={handleFactoryImageUpload}
                onRemoveFactoryImage={removeFactoryImage}
                onSetSelectedFactoryImage={setSelectedFactoryImage}
                onAddReturnExchangeItem={addReturnExchangeItem}
                onRemoveReturnExchangeItem={removeReturnExchangeItem}
                onUpdateReturnExchangeItem={updateReturnExchangeItem}
                onHandleReturnImageUpload={handleReturnExchangeImageUpload}
                onRemoveReturnImage={removeReturnExchangeImage}
                onFactoryToWarehouse={handleFactoryToWarehouse}
              />
            )}

            {activeTab === "work" && (
              <ProcessingPackagingTab
                workItems={safeWorkItems}
                workStatus={workStatus}
                workStartDate={workStartDate}
                workEndDate={workEndDate}
                onSetWorkStartDate={setWorkStartDate}
                onSetWorkEndDate={setWorkEndDate}
                onHandleWorkImageUpload={handleWorkImageUpload}
                onHandleWorkItemComplete={handleWorkItemComplete}
                onRemoveWorkItem={removeWorkItem}
                onUpdateWorkItemDescription={updateWorkItemDescription}
                onSetSelectedFactoryImage={setSelectedFactoryImage}
              />
            )}

            

            {/* 물류회사로 배송 탭 - 추후 수정 예정으로 주석처리 */}
            {/*
            {activeTab === "delivery" && (
              <LogisticsDeliveryTab
                newPackingCode={newPackingCode}
                newPackingDate={newPackingDate}
                deliverySets={loadedDeliverySets}
                hoveredImage={hoveredImage}
                onSetNewPackingCode={setNewPackingCode}
                onSetNewPackingDate={setNewPackingDate}
                onAddDeliverySet={addDeliverySet}
                onRemoveDeliverySet={removeDeliverySet}
                onAddPackageInfo={addPackageInfo}
                onUpdatePackageInfo={handleUpdatePackageInfo}
                onRemovePackageInfo={removePackageInfo}
                onAddLogisticsInfo={addLogisticsInfo}
                onUpdateLogisticsInfo={handleUpdateLogisticsInfo}
                onRemoveLogisticsInfo={removeLogisticsInfo}
                onHandleLogisticsImageUpload={handleLogisticsImageUpload}
                onRemoveLogisticsImage={removeLogisticsImage}
                onSetSelectedImage={openLogisticsImageModal}
                onSetHoveredImage={setHoveredImage}
              />
            )}
            */}
          </div>
        </div>

        {/* Right Column - Status & Summary */}
        <div className="space-y-6">
          {/* 메모 섹션 */}
          <MemoSection
            memos={memos}
            newMemoContent={newMemoContent}
            replyInputs={replyInputs}
            onSetNewMemoContent={setNewMemoContent}
            onSetReplyInputs={setReplyInputs}
            onAddMemo={addMemo}
            onDeleteMemo={deleteMemo}
            onAddReply={addReply}
            onDeleteReply={deleteReply}
          />
        </div>
      </div>
      </div>
    );
  }

  // 기존 발주 화면
  return (
    <div className="p-6 min-h-[1080px]">
      <HeaderSection
        onBack={handleBackWithConfirm}
        onSave={() => handleSave(true)}
        isDirty={isDirty}
        isSaving={isSaving}
        lastSavedAt={lastSavedAt}
        productName={productName || order!.product || ''}
        poNumber={order!.poNumber}
        productImage={productImage || order!.productImage || ''}
        onMainImageUpload={handleMainImageUpload}
        size={productSize || order!.size || ''}
        weight={productWeight || order!.weight || ''}
        packagingSize={productPackagingSize || ''}
        packaging={packaging}
        finalUnitPrice={expectedFinalUnitPrice}
        shippingQuantity={shippingQuantity}
        koreaArrivedQuantity={koreaArrivedQuantity}
        orderDate={orderDate}
        deliveryDate={deliveryDate}
        isOrderConfirmed={isOrderConfirmed}
        orderStatus={orderStatus}
        onPackagingChange={setPackaging}
        onOrderDateChange={setOrderDate}
        onDeliveryDateChange={setDeliveryDate}
        onOrderConfirmedChange={handleOrderConfirmedChange}
        onCancelOrder={handleCancelOrder}
        onProductClick={undefined}
        isEditable={canWrite}
        onProductNameChange={setProductName}
        onSizeChange={setProductSize}
        onWeightChange={setProductWeight}
        onPackagingSizeChange={setProductPackagingSize}
        userLevel={user?.level}
        onPhotoGalleryClick={handlePhotoGalleryClick}
        onImageClick={() => setIsImageModalOpen(true)}
        currentFactoryStatus={currentFactoryStatus}
        totalShippedQuantity={totalShippedQuantity}
        totalReturnQuantity={totalReturnQuantity}
        totalReceivedQuantity={totalReceivedQuantity}
        hasFactoryShipments={factoryShipments.length > 0}
        hasReturnItems={returnExchangeItems.length > 0}
        workStatus={workStatus}
        workItems={safeWorkItems}
        deliveryStatus={calculatedDeliveryStatus}
        paymentStatus={order!.paymentStatus}
      />

      <div className="grid grid-cols-[2fr_1fr] gap-6 mt-6">
        {/* Left Column - Main Info */}
        <div className="space-y-6">
          {/* Cost Breakdown - Editable */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-2 rounded-lg border border-green-200">
                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center shadow-md">
                  <DollarSign className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">
                  발주 진행 관리
                </h3>
              </div>
            </div>

            {/* 탭 네비게이션 */}
            <TabNavigation
              activeTab={activeTab}
              onTabChange={setActiveTab}
              userLevel={user?.level}
            />

            {/* 탭 콘텐츠 */}
            {activeTab === "cost" && (
              <CostPaymentTab
                unitPrice={unitPrice}
                backMargin={backMargin}
                quantity={quantity}
                commissionType={commissionType}
                commissionAmount={commissionAmount}
                basicCostTotal={basicCostTotal}
                isSuperAdmin={isSuperAdmin}
                userLevel={user?.level}
                canWrite={canWrite}
                onSetUnitPrice={setUnitPrice}
                onSetBackMargin={setBackMargin}
                onSetQuantity={setQuantity}
                onHandleCommissionTypeChange={handleCommissionTypeChange}
                commissionOptions={commissionOptions}
                shippingCost={shippingCost}
                warehouseShippingCost={warehouseShippingCost}
                shippingCostTotal={shippingCostTotal}
                packingListShippingCost={packingListShippingCost}
                onSetShippingCost={setShippingCost}
                onSetWarehouseShippingCost={setWarehouseShippingCost}
                optionItems={optionItems}
                totalOptionCost={totalOptionCost}
                onUpdateOptionItemName={updateOptionItemName}
                onUpdateOptionItemUnitPrice={updateOptionItemUnitPrice}
                onUpdateOptionItemQuantity={updateOptionItemQuantity}
                onRemoveOptionItem={removeOptionItem}
                onAddOptionItem={addOptionItem}
                laborCostItems={laborCostItems}
                totalLaborCost={totalLaborCost}
                onUpdateLaborCostItemName={updateLaborCostItemName}
                onUpdateLaborCostItemUnitPrice={updateLaborCostItemUnitPrice}
                onUpdateLaborCostItemQuantity={updateLaborCostItemQuantity}
                onRemoveLaborCostItem={removeLaborCostItem}
                onAddLaborCostItem={addLaborCostItem}
                advancePaymentRate={advancePaymentRate}
                advancePaymentAmount={advancePaymentAmount}
                advancePaymentDate={advancePaymentDate}
                balancePaymentAmount={balancePaymentAmount}
                balancePaymentDate={balancePaymentDate}
                finalPaymentAmount={finalPaymentAmount}
                onSetAdvancePaymentRate={setAdvancePaymentRate}
                onSetAdvancePaymentDate={setAdvancePaymentDate}
                onSetBalancePaymentDate={setBalancePaymentDate}
              />
            )}

            {activeTab === "factory" && (
              <FactoryShippingTab
                factoryShipments={factoryShipments}
                returnExchangeItems={returnExchangeItems}
                currentFactoryStatus={currentFactoryStatus}
                onAddFactoryShipment={addFactoryShipment}
                onRemoveFactoryShipment={removeFactoryShipment}
                onUpdateFactoryShipment={updateFactoryShipment}
                onHandleFactoryImageUpload={handleFactoryImageUpload}
                onRemoveFactoryImage={removeFactoryImage}
                onSetSelectedFactoryImage={setSelectedFactoryImage}
                onAddReturnExchangeItem={addReturnExchangeItem}
                onRemoveReturnExchangeItem={removeReturnExchangeItem}
                onUpdateReturnExchangeItem={updateReturnExchangeItem}
                onHandleReturnImageUpload={handleReturnExchangeImageUpload}
                onRemoveReturnImage={removeReturnExchangeImage}
                onFactoryToWarehouse={handleFactoryToWarehouse}
              />
            )}

            {activeTab === "work" && (
              <ProcessingPackagingTab
                workItems={safeWorkItems}
                workStatus={workStatus}
                workStartDate={workStartDate}
                workEndDate={workEndDate}
                onSetWorkStartDate={setWorkStartDate}
                onSetWorkEndDate={setWorkEndDate}
                onHandleWorkImageUpload={handleWorkImageUpload}
                onHandleWorkItemComplete={handleWorkItemComplete}
                onRemoveWorkItem={removeWorkItem}
                onUpdateWorkItemDescription={updateWorkItemDescription}
                onSetSelectedFactoryImage={setSelectedFactoryImage}
              />
            )}
          </div>
        </div>

        {/* Right Column - Status & Summary */}
        <div className="space-y-6">
          {/* 메모 섹션 */}
          <MemoSection
            memos={memos}
            newMemoContent={newMemoContent}
            replyInputs={replyInputs}
            onSetNewMemoContent={setNewMemoContent}
            onSetReplyInputs={setReplyInputs}
            onAddMemo={addMemo}
            onDeleteMemo={deleteMemo}
            onAddReply={addReply}
            onDeleteReply={deleteReply}
          />
        </div>
      </div>

      {/* 상품 이미지 모달 */}
      <ProductImageModal
        isOpen={isImageModalOpen}
        imageUrl={order!.productImage}
        productName={order!.product}
        poNumber={order!.poNumber}
        onClose={() => setIsImageModalOpen(false)}
        onOpenGallery={() => setIsPhotoGalleryOpen(true)}
        onMainImageUpload={handleMainImageUpload}
      />

      {/* 업체 출고 이미지 모달 */}
      <FactoryImageModal
        imageUrl={selectedFactoryImage}
        onClose={() => setSelectedFactoryImage(null)}
      />

      {/* 상품 상세 모달 */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}

      {/* 사진첩 모달 */}
      <PhotoGalleryModal
        isOpen={isPhotoGalleryOpen}
        productName={order!.product}
        poNumber={order!.poNumber}
        images={productGalleryImages}
        productId={undefined} // 발주 관련 이미지는 productId 없이 표시
        purchaseOrderId={orderId === 'new' ? undefined : orderId} // 발주 ID 전달
        onClose={() => {
          setIsPhotoGalleryOpen(false);
          setSelectedGalleryImage(null);
          setProductGalleryImages([]);
        }}
        onImageClick={(imageUrl) => setSelectedGalleryImage(imageUrl)}
        onImagesUpdated={handlePhotoGalleryClick}
      />

      {/* 갤러리 이미지 크게 보기 */}
      <GalleryImageModal
        imageUrl={selectedGalleryImage}
        onClose={() => setSelectedGalleryImage(null)}
      />

      {/* 물류 사진 크게 보기 모달 */}
      <LogisticsImageModal
        imageUrl={selectedLogisticsImage}
        isOpen={logisticsImageModalOpen}
        onClose={() => setLogisticsImageModalOpen(false)}
      />

      {/* 마우스 오버 시 이미지 미리보기 */}
      <ImagePreviewTooltip
        imageUrl={hoveredImage}
        isModalOpen={logisticsImageModalOpen}
      />

      {/* 상품 상세 정보 모달 */}
      {isProductModalOpen && selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => {
            setIsProductModalOpen(false);
            setSelectedProduct(null);
          }}
        />
      )}
    </div>
  );
}