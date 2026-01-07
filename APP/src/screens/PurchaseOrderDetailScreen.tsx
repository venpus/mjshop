import React, { useState, useEffect, useCallback, useMemo } from 'react';
// Hook 순서 문제 해결: 모든 Hook은 early return 전에 선언됨
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  KeyboardAvoidingView,
  BackHandler,
  Alert,
} from 'react-native';
import { Container, Header, Loading, ErrorDisplay, Button } from '../components/common';
import { SaveStatusBar } from '../components/purchase-order/SaveStatusBar';
import { ProductInfoSection } from '../components/purchase-order/ProductInfoSection';
import { ProductInfoEditModal, type ProductInfoEditData } from '../components/purchase-order/modals/ProductInfoEditModal';
import { UnitPriceEditModal, type UnitPriceEditData } from '../components/purchase-order/modals/UnitPriceEditModal';
import { ShippingEditModal, type ShippingEditData } from '../components/purchase-order/modals/ShippingEditModal';
import { PaymentEditModal, type PaymentEditData } from '../components/purchase-order/modals/PaymentEditModal';
import { CostItemsEditModal, type CostItemsEditData } from '../components/purchase-order/modals/CostItemsEditModal';
import { Input, NumberInput, DateInput, Select } from '../components/purchase-order/common';
import { useMenuDrawer } from '../contexts/MenuDrawerContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts';
import { colors, spacing } from '../constants';
import { getPurchaseOrderDetail, type PurchaseOrderDetail, getFullImageUrl } from '../api/purchaseOrderApi';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AdminStackParamList } from '../navigation/types';
import {
  calculateBasicCostTotal,
  calculateShippingCostTotal,
  calculateFinalPaymentAmount,
  calculateExpectedFinalUnitPrice,
  calculateFactoryStatusFromQuantity,
  calculateWorkStatus,
  calculateCommissionAmount,
  calculateAdvancePaymentAmount,
  calculateBalancePaymentAmount,
} from '../utils/purchaseOrderCalculations';
import { usePurchaseOrderForm } from '../hooks/usePurchaseOrderForm';
import { usePurchaseOrderSave } from '../hooks/usePurchaseOrderSave';
import { CostPaymentTab, type LaborCostItem } from '../components/purchase-order/tabs/CostPaymentTab';
import { FactoryShippingTab, type FactoryShipment, type ReturnExchangeItem } from '../components/purchase-order/tabs/FactoryShippingTab';
import { calculateTotalOptionCost, calculateTotalLaborCost } from '../utils/purchaseOrderCalculations';
import { getPurchaseOrderCostItems } from '../api/purchaseOrderApi';
import * as ImagePicker from 'expo-image-picker';

type PurchaseOrderDetailScreenProps = NativeStackScreenProps<AdminStackParamList, 'PurchaseOrderDetail'>;

type TabType = 'cost' | 'factory' | 'work' | 'delivery';

export default function PurchaseOrderDetailScreen({
  navigation,
  route,
}: PurchaseOrderDetailScreenProps) {
  const { id, tab: initialTab = 'cost', shouldRefreshList } = route.params;
  const { openDrawer } = useMenuDrawer();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [order, setOrder] = useState<PurchaseOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  
  // 옵션 항목 및 인건비 항목 상태
  const [optionItems, setOptionItems] = useState<LaborCostItem[]>([]);
  const [laborCostItems, setLaborCostItems] = useState<LaborCostItem[]>([]);
  
  // 업체 출고 및 반품/교환 항목 상태
  const [factoryShipments, setFactoryShipments] = useState<FactoryShipment[]>([]);
  const [returnExchangeItems, setReturnExchangeItems] = useState<ReturnExchangeItem[]>([]);

  // 편집 모달 상태
  const [editingSection, setEditingSection] = useState<'product' | 'unitPrice' | 'shipping' | 'payment' | 'costItems' | null>(null);

  // 폼 상태 관리 Hook (항상 호출되어야 함)
  const {
    formData,
    updateField,
    orderUnitPrice,
    basicCostTotal,
    shippingCostTotal,
    finalPaymentAmount,
    expectedFinalUnitPrice,
    initializeFromOrder,
  } = usePurchaseOrderForm(order);

  // 저장 Hook (항상 호출되어야 함)
  const {
    isDirty,
    isSaving,
    lastSavedAt,
    handleSave,
    setOriginalData,
  } = usePurchaseOrderSave({
    orderId: id,
    formData,
    originalOrder: order,
    optionItems,
    laborCostItems,
    factoryShipments,
    returnExchangeItems,
    userLevel: user?.level,
    isSuperAdmin: user?.level === 'A-SuperAdmin',
  });

  const loadOrderDetail = useCallback(async () => {
    try {
      setError(null);
      const data = await getPurchaseOrderDetail(id);
      setOrder(data);
      // 폼 데이터 초기화
      initializeFromOrder(data);
      
      // 비용 항목 로드
      try {
        const costItems = await getPurchaseOrderCostItems(id);
        const formatCostItem = (item: any): LaborCostItem => ({
          id: item.id.toString(),
          name: item.name,
          unit_price: item.unit_price,
          quantity: item.quantity,
          cost: item.unit_price * item.quantity,
          isAdminOnly: item.is_admin_only || false,
        });
        
        const formattedOptionItems = costItems.optionItems.map(formatCostItem);
        const formattedLaborCostItems = costItems.laborCostItems.map(formatCostItem);
        
        setOptionItems(formattedOptionItems);
        setLaborCostItems(formattedLaborCostItems);
        
        // 날짜 정규화 헬퍼 함수
        const normalizeDateValue = (date: string | null | undefined): string => {
          if (!date) return '';
          // ISO 형식 (2026-01-05T16:00:00.000Z)을 YYYY-MM-DD로 변환
          if (date.includes('T')) {
            return date.split('T')[0];
          }
          // 이미 YYYY-MM-DD 형식이면 그대로 반환
          if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return date;
          }
          return date;
        };

        // 원본 데이터에 cost items 포함
        setOriginalData({
          unitPrice: data.unit_price || 0,
          backMargin: data.back_margin || 0,
          quantity: data.quantity || 0,
          shippingCost: data.shipping_cost || 0,
          warehouseShippingCost: data.warehouse_shipping_cost || 0,
          commissionRate: data.commission_rate || 0,
          commissionType: data.commission_type || '',
          advancePaymentRate: data.advance_payment_rate || 0,
          advancePaymentDate: normalizeDateValue(data.advance_payment_date),
          balancePaymentDate: normalizeDateValue(data.balance_payment_date),
          packaging: data.packaging || 0,
          orderDate: normalizeDateValue(data.order_date),
          deliveryDate: normalizeDateValue(data.delivery_date),
          workStartDate: normalizeDateValue(data.work_start_date),
          workEndDate: normalizeDateValue(data.work_end_date),
          isOrderConfirmed: data.is_confirmed || false,
          productName: data.product_name || '',
          productSize: data.size || '',
          productWeight: data.weight || '',
          productPackagingSize: data.packaging?.toString() || '',
          optionItems: formattedOptionItems,
          laborCostItems: formattedLaborCostItems,
        });
      } catch (costErr) {
        console.error('비용 항목 로드 실패:', costErr);
        // 비용 항목 로드 실패는 치명적이지 않으므로 계속 진행
        // 날짜 정규화 헬퍼 함수
        const normalizeDateValue = (date: string | null | undefined): string => {
          if (!date) return '';
          // ISO 형식 (2026-01-05T16:00:00.000Z)을 YYYY-MM-DD로 변환
          if (date.includes('T')) {
            return date.split('T')[0];
          }
          // 이미 YYYY-MM-DD 형식이면 그대로 반환
          if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return date;
          }
          return date;
        };

        // 원본 데이터 설정 (cost items 없이)
        setOriginalData({
          unitPrice: data.unit_price || 0,
          backMargin: data.back_margin || 0,
          quantity: data.quantity || 0,
          shippingCost: data.shipping_cost || 0,
          warehouseShippingCost: data.warehouse_shipping_cost || 0,
          commissionRate: data.commission_rate || 0,
          commissionType: data.commission_type || '',
          advancePaymentRate: data.advance_payment_rate || 0,
          advancePaymentDate: normalizeDateValue(data.advance_payment_date),
          balancePaymentDate: normalizeDateValue(data.balance_payment_date),
          packaging: data.packaging || 0,
          orderDate: normalizeDateValue(data.order_date),
          deliveryDate: normalizeDateValue(data.delivery_date),
          workStartDate: normalizeDateValue(data.work_start_date),
          workEndDate: normalizeDateValue(data.work_end_date),
          isOrderConfirmed: data.is_confirmed || false,
          productName: data.product_name || '',
          productSize: data.size || '',
          productWeight: data.weight || '',
          productPackagingSize: data.packaging?.toString() || '',
        });
      }
    } catch (err: any) {
      setError(err.message || '발주 상세 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, initializeFromOrder, setOriginalData]);

  useEffect(() => {
    loadOrderDetail();
  }, [loadOrderDetail]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadOrderDetail();
  }, [loadOrderDetail]);

  const handleBack = useCallback(() => {
    if (isDirty) {
      Alert.alert(
        '변경사항이 있습니다',
        '저장하지 않고 나가시겠습니까?',
        [
          { text: '취소', style: 'cancel' },
          {
            text: '나가기',
            onPress: () => {
              if (shouldRefreshList) {
                navigation.navigate('PurchaseOrders', { shouldRefresh: true });
              } else {
    navigation.goBack();
              }
            },
          },
          {
            text: '저장',
            onPress: async () => {
              await handleSave();
              if (shouldRefreshList) {
                navigation.navigate('PurchaseOrders', { shouldRefresh: true });
              } else {
                navigation.goBack();
              }
            },
          },
        ]
      );
    } else {
      if (shouldRefreshList) {
        navigation.navigate('PurchaseOrders', { shouldRefresh: true });
      } else {
        navigation.goBack();
      }
    }
  }, [navigation, shouldRefreshList, isDirty, handleSave]);

  // 뒤로가기 버튼 처리
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isDirty) {
        Alert.alert(
          '변경사항이 있습니다',
          '저장하지 않고 나가시겠습니까?',
          [
            { text: '취소', style: 'cancel', onPress: () => {} },
            {
              text: '나가기',
              onPress: () => {
                if (shouldRefreshList) {
                  navigation.navigate('PurchaseOrders', { shouldRefresh: true });
                } else {
                  navigation.goBack();
                }
              },
            },
            {
              text: '저장',
              onPress: async () => {
                await handleSave();
                if (shouldRefreshList) {
                  navigation.navigate('PurchaseOrders', { shouldRefresh: true });
                } else {
                  navigation.goBack();
                }
              },
            },
          ]
        );
        return true; // 기본 뒤로가기 동작 방지
      }
      return false; // 기본 뒤로가기 동작 허용
    });

    return () => backHandler.remove();
  }, [isDirty, navigation, shouldRefreshList, handleSave]);

  // 권한 체크
  const canWrite = true; // TODO: 실제 권한 체크 로직 추가

  // 수수료 옵션
  const commissionOptions = useMemo(() => [
    { label: '5만위안 이상 재주문 5%', value: '5만위안 이상 재주문 5%', rate: 5 },
    { label: '5만위안 이하 재주문 7%', value: '5만위안 이하 재주문 7%', rate: 7 },
    { label: '5만위안 이상 신규주문 8%', value: '5만위안 이상 신규주문 8%', rate: 8 },
    { label: '5만위안이하 신규주문 10%', value: '5만위안이하 신규주문 10%', rate: 10 },
  ], []);

  // 수수료 타입 변경 핸들러
  const handleCommissionTypeChange = useCallback((value: string | number) => {
    const selected = commissionOptions.find((opt) => opt.value === value);
    if (selected) {
      updateField('commissionType', selected.value);
      updateField('commissionRate', selected.rate);
    }
  }, [commissionOptions, updateField]);

  // 총 비용 계산 (항상 호출되어야 함 - early return 전)
  const totalOptionCost = useMemo(() => calculateTotalOptionCost(optionItems), [optionItems]);
  const totalLaborCost = useMemo(() => calculateTotalLaborCost(laborCostItems), [laborCostItems]);

  // 수수료 금액 계산
  const commissionAmount = useMemo(() => {
    return calculateCommissionAmount(
      formData.unitPrice,
      formData.quantity,
      formData.commissionRate,
      formData.backMargin
    );
  }, [formData.unitPrice, formData.quantity, formData.commissionRate, formData.backMargin]);

  // 최종 결제 금액 계산
  const finalPaymentAmountWithCosts = useMemo(() => {
    return finalPaymentAmount + totalOptionCost + totalLaborCost;
  }, [finalPaymentAmount, totalOptionCost, totalLaborCost]);

  // 선금 금액 계산
  const advancePaymentAmount = useMemo(() => {
    return calculateAdvancePaymentAmount(
      formData.unitPrice,
      formData.quantity,
      formData.advancePaymentRate,
      formData.backMargin
    );
  }, [formData.unitPrice, formData.quantity, formData.advancePaymentRate, formData.backMargin]);

  // 잔금 금액 계산
  const balancePaymentAmount = useMemo(() => {
    return calculateBalancePaymentAmount(finalPaymentAmountWithCosts, advancePaymentAmount);
  }, [finalPaymentAmountWithCosts, advancePaymentAmount]);

  // 상태 계산 (order가 있을 때만)
  const factoryStatus = useMemo(() => {
    if (!order) return null;
    return order.factory_shipped_quantity !== undefined
    ? calculateFactoryStatusFromQuantity(order.factory_shipped_quantity, order.quantity)
    : null;
  }, [order]);

  const workStatus = useMemo(() => {
    if (!order) return null;
    return calculateWorkStatus(order.work_start_date, order.work_end_date);
  }, [order]);

  // 날짜 포맷팅
  const formatDate = useCallback((dateString: string | null | undefined): string => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const day = date.getDate();
      return `${year}년 ${month}월 ${day}일`;
    } catch {
      return dateString;
    }
  }, []);

  const renderTabButton = useCallback((tab: TabType, label: string) => (
    <TouchableOpacity
      style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
      onPress={() => setActiveTab(tab)}
    >
      <Text style={[styles.tabButtonText, activeTab === tab && styles.tabButtonTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  ), [activeTab]);

  // 옵션 항목 핸들러
  const handleUpdateOptionItemName = useCallback((id: string, name: string) => {
    setOptionItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, name, cost: item.unit_price * item.quantity } : item))
    );
  }, []);

  const handleUpdateOptionItemUnitPrice = useCallback((id: string, unitPrice: number) => {
    setOptionItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, unit_price: unitPrice, cost: unitPrice * item.quantity } : item))
    );
  }, []);

  const handleUpdateOptionItemQuantity = useCallback((id: string, quantity: number) => {
    setOptionItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity, cost: item.unit_price * quantity } : item))
    );
  }, []);

  const handleRemoveOptionItem = useCallback((id: string) => {
    setOptionItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const handleAddOptionItem = useCallback((isAdminOnly: boolean = false) => {
    const newItem: LaborCostItem = {
      id: `temp_${Date.now()}_${Math.random()}`,
      name: '',
      unit_price: 0,
      quantity: 0,
      cost: 0,
      isAdminOnly,
    };
    setOptionItems((prev) => [...prev, newItem]);
  }, []);

  // 인건비 항목 핸들러
  const handleUpdateLaborCostItemName = useCallback((id: string, name: string) => {
    setLaborCostItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, name, cost: item.unit_price * item.quantity } : item))
    );
  }, []);

  const handleUpdateLaborCostItemUnitPrice = useCallback((id: string, unitPrice: number) => {
    setLaborCostItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, unit_price: unitPrice, cost: unitPrice * item.quantity } : item))
    );
  }, []);

  const handleUpdateLaborCostItemQuantity = useCallback((id: string, quantity: number) => {
    setLaborCostItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity, cost: item.unit_price * quantity } : item))
    );
  }, []);

  const handleRemoveLaborCostItem = useCallback((id: string) => {
    setLaborCostItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const handleAddLaborCostItem = useCallback((isAdminOnly: boolean = false) => {
    const newItem: LaborCostItem = {
      id: `temp_${Date.now()}_${Math.random()}`,
      name: '',
      unit_price: 0,
      quantity: 0,
      cost: 0,
      isAdminOnly,
    };
    setLaborCostItems((prev) => [...prev, newItem]);
  }, []);

  // 메인 이미지 업로드 핸들러
  const handleMainImageUpload = useCallback(async (uri: string) => {
    try {
      const { uploadPurchaseOrderMainImage } = await import('../api/purchaseOrderApi');
      await uploadPurchaseOrderMainImage(id, uri);
      
      // 발주 데이터 재로드
      await loadOrderDetail();
      Alert.alert('성공', '이미지가 업로드되었습니다.');
    } catch (error: any) {
      console.error('메인 이미지 업로드 오류:', error);
      Alert.alert('오류', error.message || '이미지 업로드에 실패했습니다.');
    }
  }, [id, loadOrderDetail]);

  // 발주 컨펌 변경 핸들러
  const handleOrderConfirmedChange = useCallback(async (confirmed: boolean) => {
    try {
      const { updatePurchaseOrder } = await import('../api/purchaseOrderApi');
      await updatePurchaseOrder(id, { is_confirmed: confirmed });
      
      // 발주 데이터 재로드
      await loadOrderDetail();
      Alert.alert('성공', confirmed ? '발주가 컨펌되었습니다.' : '발주 컨펌이 해제되었습니다.');
    } catch (error: any) {
      console.error('발주 컨펌 변경 오류:', error);
      Alert.alert('오류', error.message || '발주 컨펌 상태 변경에 실패했습니다.');
    }
  }, [id, loadOrderDetail]);

  // 발주 취소 핸들러
  const handleCancelOrder = useCallback(async () => {
    Alert.alert(
      '발주 취소',
      '발주를 취소하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '확인',
          style: 'destructive',
          onPress: async () => {
            try {
              const { updatePurchaseOrder } = await import('../api/purchaseOrderApi');
              await updatePurchaseOrder(id, { order_status: '취소됨' });
              
              // 발주 데이터 재로드
              await loadOrderDetail();
              Alert.alert('성공', '발주가 취소되었습니다.');
            } catch (error: any) {
              console.error('발주 취소 오류:', error);
              Alert.alert('오류', error.message || '발주 취소에 실패했습니다.');
            }
          },
        },
      ]
    );
  }, [id, loadOrderDetail]);

  // 사진첩 핸들러 (나중에 구현)
  const handlePhotoGalleryClick = useCallback(() => {
    Alert.alert('알림', '사진첩 기능은 준비 중입니다.');
  }, []);

  // 업체 출고 항목 핸들러
  const handleAddFactoryShipment = useCallback(() => {
    const newShipment: FactoryShipment = {
      id: `temp_${Date.now()}_${Math.random()}`,
      shipped_date: '',
      shipped_quantity: 0,
      tracking_number: null,
      notes: null,
      images: [],
      pendingImages: [],
    };
    setFactoryShipments((prev) => [...prev, newShipment]);
  }, []);

  const handleRemoveFactoryShipment = useCallback((id: string) => {
    setFactoryShipments((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const handleUpdateFactoryShipment = useCallback((id: string, field: keyof FactoryShipment, value: any) => {
    setFactoryShipments((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  }, []);

  const handleFactoryImageUpload = useCallback(async (shipmentId: string, images: Array<{ uri: string; type: string; name: string }>) => {
    const shipment = factoryShipments.find((s) => s.id === shipmentId);
    if (!shipment) return;

    const maxImages = 5;
    const serverImageCount = (shipment.images?.filter(url => !url.startsWith('blob:')).length || 0);
    const pendingImageCount = shipment.pendingImages?.length || 0;
    const remainingSlots = maxImages - serverImageCount - pendingImageCount;

    if (remainingSlots <= 0) {
      Alert.alert('알림', '이미지는 최대 5장까지 업로드할 수 있습니다.');
      return;
    }

    const imagesToAdd = images.slice(0, remainingSlots);
    if (images.length > remainingSlots) {
      Alert.alert('알림', `이미지는 최대 5장까지 업로드할 수 있습니다. ${remainingSlots}장만 추가됩니다.`);
    }

    // 미리보기 URL 생성
    const previewUrls = imagesToAdd.map(img => img.uri);
    const serverUrls = shipment.images?.filter(url => !url.startsWith('blob:')) || [];
    const allUrls = [...serverUrls, ...previewUrls];

    handleUpdateFactoryShipment(shipmentId, 'pendingImages', [...(shipment.pendingImages || []), ...imagesToAdd]);
    handleUpdateFactoryShipment(shipmentId, 'images', allUrls);
  }, [factoryShipments, handleUpdateFactoryShipment]);

  const handleRemoveFactoryImage = useCallback(async (shipmentId: string, imageIndex: number, imageUrl: string) => {
    const shipment = factoryShipments.find((s) => s.id === shipmentId);
    if (!shipment) return;

    // blob: URL인 경우 (미리보기) - pendingImages에서 제거
    if (imageUrl.startsWith('blob:')) {
      const blobIndex = shipment.images?.findIndex(url => url === imageUrl) ?? -1;
      if (blobIndex >= 0) {
        const pendingIndex = blobIndex - (shipment.images?.filter(url => !url.startsWith('blob:')).length || 0);
        if (pendingIndex >= 0 && shipment.pendingImages) {
          const newPendingImages = shipment.pendingImages.filter((_, i) => i !== pendingIndex);
          handleUpdateFactoryShipment(shipmentId, 'pendingImages', newPendingImages);
        }
      }
    }

    // 이미지 목록에서 제거
    const newImages = shipment.images?.filter((_, i) => i !== imageIndex) || [];
    handleUpdateFactoryShipment(shipmentId, 'images', newImages);

    // 서버 이미지인 경우 API 호출은 저장 시 처리
  }, [factoryShipments, handleUpdateFactoryShipment]);

  // 반품/교환 항목 핸들러
  const handleAddReturnExchangeItem = useCallback(() => {
    const newItem: ReturnExchangeItem = {
      id: `temp_${Date.now()}_${Math.random()}`,
      return_date: '',
      return_quantity: 0,
      reason: null,
      images: [],
      pendingImages: [],
    };
    setReturnExchangeItems((prev) => [...prev, newItem]);
  }, []);

  const handleRemoveReturnExchangeItem = useCallback((id: string) => {
    setReturnExchangeItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const handleUpdateReturnExchangeItem = useCallback((id: string, field: keyof ReturnExchangeItem, value: any) => {
    setReturnExchangeItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  }, []);

  const handleReturnImageUpload = useCallback(async (itemId: string, images: Array<{ uri: string; type: string; name: string }>) => {
    const item = returnExchangeItems.find((i) => i.id === itemId);
    if (!item) return;

    const maxImages = 5;
    const serverImageCount = (item.images?.filter(url => !url.startsWith('blob:')).length || 0);
    const pendingImageCount = item.pendingImages?.length || 0;
    const remainingSlots = maxImages - serverImageCount - pendingImageCount;

    if (remainingSlots <= 0) {
      Alert.alert('알림', '이미지는 최대 5장까지 업로드할 수 있습니다.');
      return;
    }

    const imagesToAdd = images.slice(0, remainingSlots);
    if (images.length > remainingSlots) {
      Alert.alert('알림', `이미지는 최대 5장까지 업로드할 수 있습니다. ${remainingSlots}장만 추가됩니다.`);
    }

    // 미리보기 URL 생성
    const previewUrls = imagesToAdd.map(img => img.uri);
    const serverUrls = item.images?.filter(url => !url.startsWith('blob:')) || [];
    const allUrls = [...serverUrls, ...previewUrls];

    handleUpdateReturnExchangeItem(itemId, 'pendingImages', [...(item.pendingImages || []), ...imagesToAdd]);
    handleUpdateReturnExchangeItem(itemId, 'images', allUrls);
  }, [returnExchangeItems, handleUpdateReturnExchangeItem]);

  const handleRemoveReturnImage = useCallback(async (itemId: string, imageIndex: number, imageUrl: string) => {
    const item = returnExchangeItems.find((i) => i.id === itemId);
    if (!item) return;

    // blob: URL인 경우 (미리보기) - pendingImages에서 제거
    if (imageUrl.startsWith('blob:')) {
      const blobIndex = item.images?.findIndex(url => url === imageUrl) ?? -1;
      if (blobIndex >= 0) {
        const pendingIndex = blobIndex - (item.images?.filter(url => !url.startsWith('blob:')).length || 0);
        if (pendingIndex >= 0 && item.pendingImages) {
          const newPendingImages = item.pendingImages.filter((_, i) => i !== pendingIndex);
          handleUpdateReturnExchangeItem(itemId, 'pendingImages', newPendingImages);
        }
      }
    }

    // 이미지 목록에서 제거
    const newImages = item.images?.filter((_, i) => i !== imageIndex) || [];
    handleUpdateReturnExchangeItem(itemId, 'images', newImages);

    // 서버 이미지인 경우 API 호출은 저장 시 처리
  }, [returnExchangeItems, handleUpdateReturnExchangeItem]);

  // Render 함수들 (항상 호출되어야 함 - early return 전)
  const renderCostTab = useCallback(() => {
    if (!order) return <View />;
    
    const isSuperAdmin = user?.level === 'A-SuperAdmin';
    
    return (
    <View style={styles.tabContent}>

        {/* 단가 정보 카드 */}
        <View style={[styles.section, styles.cardSection]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>💰 단가 정보</Text>
            <View style={styles.cardHeaderRight}>
              <View style={styles.cardTotal}>
                <Text style={styles.cardTotalLabel}>기본비용:</Text>
                <Text style={styles.cardTotalValue}>
                  ¥{basicCostTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
        </View>
              {canWrite && (
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => setEditingSection('unitPrice')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.editButtonText}>✏️ 편집</Text>
                </TouchableOpacity>
              )}
        </View>
      </View>

          {/* 읽기 모드 - Text만 표시 */}
          {isSuperAdmin && (
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>기본단가:</Text>
              <Text style={styles.infoValue}>
                ¥{(formData.unitPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
        </View>
          )}
          {isSuperAdmin && (
          <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>추가단가 (백마진):</Text>
              <Text style={styles.infoValue}>
                ¥{(formData.backMargin || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
          </View>
          )}
          
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>발주단가:</Text>
            <Text style={[styles.infoValue, styles.highlightValue]}>
              ¥{orderUnitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
        </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>수수료율:</Text>
            <Text style={styles.infoValue}>
              {formData.commissionType ? `${formData.commissionType}%` : '-'}
            </Text>
      </View>

        <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>수수료 금액:</Text>
            <Text style={styles.infoValue}>
              ¥{commissionAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
        </View>
          </View>

        {/* 운송비 카드 */}
        <View style={[styles.section, styles.cardSection]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>🚚 운송비</Text>
            <View style={styles.cardHeaderRight}>
              <View style={styles.cardTotal}>
                <Text style={styles.cardTotalLabel}>총 운송비:</Text>
                <Text style={styles.cardTotalValue}>
                  ¥{shippingCostTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
        </View>
              {canWrite && (
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => setEditingSection('shipping')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.editButtonText}>✏️ 편집</Text>
                </TouchableOpacity>
              )}
        </View>
      </View>

          {/* 읽기 모드 - Text만 표시 */}
        <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>업체 배송비:</Text>
            <Text style={styles.infoValue}>
              ¥{(formData.shippingCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
        </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>창고 배송비:</Text>
            <Text style={styles.infoValue}>
              ¥{(formData.warehouseShippingCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>
        </View>

        {/* 결제 정보 카드 */}
        <View style={[styles.section, styles.cardSection]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>💳 결제 정보</Text>
            <View style={styles.cardHeaderRight}>
              {order.payment_status ? (
                <View style={[styles.statusBadge, getStatusStyle(order.payment_status)]}>
                  <Text style={styles.statusBadgeText}>{order.payment_status}</Text>
        </View>
      ) : null}
              {canWrite && (
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => setEditingSection('payment')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.editButtonText}>✏️ 편집</Text>
                </TouchableOpacity>
              )}
    </View>
          </View>

          {/* 읽기 모드 - Text만 표시 */}
          <View style={styles.paymentGrid}>
            {/* 선금 */}
            <View style={styles.paymentColumn}>
              <Text style={styles.paymentColumnTitle}>선금</Text>
        <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>선금 비율:</Text>
                <Text style={styles.infoValue}>
                  {(formData.advancePaymentRate || 0)}%
                </Text>
        </View>
              <View style={styles.paymentAmountRow}>
                <Text style={styles.paymentAmountLabel}>금액:</Text>
                <Text style={[styles.paymentAmountValue, styles.highlightValue]}>
                  ¥{advancePaymentAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
        </View>
        <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>선금일:</Text>
                <Text style={styles.infoValue}>
                  {formData.advancePaymentDate || '-'}
                </Text>
        </View>
      </View>

            {/* 잔금 */}
            <View style={styles.paymentColumn}>
              <Text style={styles.paymentColumnTitle}>잔금</Text>
              <View style={styles.paymentAmountRow}>
                <Text style={styles.paymentAmountLabel}>금액:</Text>
                <Text style={[styles.paymentAmountValue, styles.highlightValue]}>
                  ¥{balancePaymentAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>잔금일:</Text>
                <Text style={styles.infoValue}>
                  {formData.balancePaymentDate || '-'}
                </Text>
              </View>
                </View>
                </View>
            </View>

        {/* 최종 결제 금액 카드 (강조) */}
        <View style={[styles.section, styles.finalPaymentCard]}>
          <Text style={styles.finalPaymentLabel}>최종 결제 금액</Text>
          <Text style={styles.finalPaymentValue}>
            ¥{finalPaymentAmountWithCosts.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
        </View>

        {/* CostPaymentTab 컴포넌트 */}
        <CostPaymentTab
          optionItems={optionItems}
          totalOptionCost={totalOptionCost}
          onUpdateOptionItemName={handleUpdateOptionItemName}
          onUpdateOptionItemUnitPrice={handleUpdateOptionItemUnitPrice}
          onUpdateOptionItemQuantity={handleUpdateOptionItemQuantity}
          onRemoveOptionItem={handleRemoveOptionItem}
          onAddOptionItem={handleAddOptionItem}
          laborCostItems={laborCostItems}
          totalLaborCost={totalLaborCost}
          onUpdateLaborCostItemName={handleUpdateLaborCostItemName}
          onUpdateLaborCostItemUnitPrice={handleUpdateLaborCostItemUnitPrice}
          onUpdateLaborCostItemQuantity={handleUpdateLaborCostItemQuantity}
          onRemoveLaborCostItem={handleRemoveLaborCostItem}
          onAddLaborCostItem={handleAddLaborCostItem}
          isSuperAdmin={user?.level === 'A-SuperAdmin'}
          canWrite={true}
          mode="read"
          onEditClick={() => setEditingSection('costItems')}
        />
    </View>
  );
  }, [order, user, formData, updateField, orderUnitPrice, basicCostTotal, shippingCostTotal, finalPaymentAmount, expectedFinalUnitPrice, totalOptionCost, totalLaborCost, optionItems, laborCostItems, handleUpdateOptionItemName, handleUpdateOptionItemUnitPrice, handleUpdateOptionItemQuantity, handleRemoveOptionItem, handleAddOptionItem, handleUpdateLaborCostItemName, handleUpdateLaborCostItemUnitPrice, handleUpdateLaborCostItemQuantity, handleRemoveLaborCostItem, handleAddLaborCostItem]);

  const renderFactoryTab = useCallback(() => {
    if (!order) return <View />;
    
    return (
      <FactoryShippingTab
        factoryShipments={factoryShipments}
        returnExchangeItems={returnExchangeItems}
        currentFactoryStatus={factoryStatus ?? '-'}
        onAddFactoryShipment={handleAddFactoryShipment}
        onRemoveFactoryShipment={handleRemoveFactoryShipment}
        onUpdateFactoryShipment={handleUpdateFactoryShipment}
        onHandleFactoryImageUpload={handleFactoryImageUpload}
        onRemoveFactoryImage={handleRemoveFactoryImage}
        onAddReturnExchangeItem={handleAddReturnExchangeItem}
        onRemoveReturnExchangeItem={handleRemoveReturnExchangeItem}
        onUpdateReturnExchangeItem={handleUpdateReturnExchangeItem}
        onHandleReturnImageUpload={handleReturnImageUpload}
        onRemoveReturnImage={handleRemoveReturnImage}
        canWrite={true}
      />
    );
  }, [order, factoryStatus, factoryShipments, returnExchangeItems, handleAddFactoryShipment, handleRemoveFactoryShipment, handleUpdateFactoryShipment, handleFactoryImageUpload, handleRemoveFactoryImage, handleAddReturnExchangeItem, handleRemoveReturnExchangeItem, handleUpdateReturnExchangeItem, handleReturnImageUpload, handleRemoveReturnImage]);

  const renderWorkTab = useCallback(() => {
    if (!order) return <View />;
    
    return (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>작업 현황</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>작업상태:</Text>
            <Text style={styles.infoValue}>{workStatus ?? '-'}</Text>
        </View>
        {order.work_start_date ? (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>작업시작일:</Text>
            <Text style={styles.infoValue}>{formatDate(order.work_start_date)}</Text>
          </View>
        ) : null}
        {order.work_end_date ? (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>작업종료일:</Text>
            <Text style={styles.infoValue}>{formatDate(order.work_end_date)}</Text>
          </View>
        ) : null}
      </View>

      {order.workItems && order.workItems.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>작업 항목</Text>
          {order.workItems.map((item, index) => (
            <View key={index} style={styles.workItemCard}>
              <View style={styles.workItemHeader}>
                <Text style={styles.workItemName}>{item.description}</Text>
                <View style={[styles.statusBadge, item.completed ? styles.statusCompleted : styles.statusPending]}>
                  <Text style={styles.statusBadgeText}>
                    {item.completed ? '완료' : '진행중'}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
  }, [order, workStatus, formatDate]);

  const renderDeliveryTab = useCallback(() => {
    if (!order) return <View />;
    
    return (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>배송 현황</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>배송중:</Text>
          <Text style={styles.infoValue}>{(order.shipping_quantity ?? 0)}개</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>한국도착:</Text>
          <Text style={styles.infoValue}>{(order.arrived_quantity ?? 0)}개</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>발송수량:</Text>
          <Text style={styles.infoValue}>{(order.shipped_quantity ?? 0)}개</Text>
        </View>
      </View>
    </View>
  );
  }, [order]);

  const renderTabContent = useCallback(() => {
    if (!order) {
      return <View />;
    }
    
    switch (activeTab) {
      case 'cost':
        return renderCostTab();
      case 'factory':
        return renderFactoryTab();
      case 'work':
        return renderWorkTab();
      case 'delivery':
        return renderDeliveryTab();
      default:
        return renderCostTab();
    }
  }, [activeTab, order, renderCostTab, renderFactoryTab, renderWorkTab, renderDeliveryTab]);

  if (loading && !refreshing) {
  return (
      <Container safeArea>
      <Header
          title={t('menu.purchaseOrders') || '발주 관리'}
        leftButton={{ label: '←', onPress: handleBack }}
        showMenuButton={true}
        onMenuPress={openDrawer}
      />
        <Loading message="로딩 중..." />
      </Container>
    );
  }

  if (error || !order) {
    return (
      <Container safeArea>
        <Header
          title={t('menu.purchaseOrders') || '발주 관리'}
          leftButton={{ label: '←', onPress: handleBack }}
          showMenuButton={true}
          onMenuPress={openDrawer}
        />
        <ErrorDisplay
          message={error || '발주 정보를 찾을 수 없습니다.'}
          onRetry={loadOrderDetail}
        />
      </Container>
    );
  }

  return (
    <Container safeArea padding={false}>
      <View style={styles.mainContainer}>
        <Header
          title={order.po_number ? String(order.po_number) : '발주 상세'}
          leftButton={{ label: '←', onPress: handleBack }}
          rightButton={{
            icon: isDirty ? '💾' : '✓',
            label: isSaving ? '저장 중...' : isDirty ? '저장' : null,
            onPress: handleSave,
          }}
          showMenuButton={false}
          saveStatus={{
            isDirty,
            isSaving,
            lastSavedAt,
          }}
        />

        {/* 상품 기본 정보 섹션 */}
        <ProductInfoSection
          productName={formData.productName || order.product_name || ''}
          productNameChinese={order.product_name_chinese || null}
          poNumber={order.po_number || ''}
          productImage={order.product_main_image || null}
          size={formData.productSize || order.size || ''}
          weight={formData.productWeight || order.weight || ''}
          packaging={formData.packaging || order.packaging || 0}
          packagingSize={formData.productPackagingSize || order.packaging?.toString() || ''}
          finalUnitPrice={expectedFinalUnitPrice}
          orderDate={formData.orderDate || order.order_date || ''}
          deliveryDate={formData.deliveryDate || order.delivery_date || ''}
          quantity={formData.quantity || order.quantity || 0}
          isOrderConfirmed={formData.isOrderConfirmed || order.is_confirmed || false}
          orderStatus={order.order_status || ''}
          onOrderConfirmedChange={handleOrderConfirmedChange}
          onCancelOrder={handleCancelOrder}
          onMainImageUpload={handleMainImageUpload}
          onPhotoGalleryClick={handlePhotoGalleryClick}
          onEditClick={() => setEditingSection('product')}
          isEditable={canWrite}
          userLevel={user?.level}
          canWrite={canWrite}
          mode="read"
        />

      {/* 탭 네비게이션 */}
      <View style={styles.tabContainer}>
        {renderTabButton('cost', '비용/결제')}
        {renderTabButton('factory', '업체출고')}
        {renderTabButton('work', '작업')}
        {renderTabButton('delivery', '배송')}
      </View>

      {/* 탭 내용 */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {renderTabContent()}
      </ScrollView>
        </KeyboardAvoidingView>

        {/* 하단 저장 버튼 (변경사항 있을 때만 표시) */}
        {isDirty ? (
          <View style={styles.bottomSaveButton}>
            <Button
              title={isSaving ? '저장 중...' : '저장'}
              onPress={handleSave}
              variant="primary"
              disabled={isSaving}
            />
          </View>
        ) : null}

        {/* 상품 정보 편집 모달 */}
        {order && (
          <ProductInfoEditModal
            visible={editingSection === 'product'}
            onClose={() => setEditingSection(null)}
            onSave={async (data: ProductInfoEditData) => {
              // 폼 데이터 업데이트
              updateField('productName', data.productName);
              updateField('productSize', data.size);
              updateField('productWeight', data.weight);
              updateField('packaging', data.packaging);
              updateField('productPackagingSize', data.packagingSize || '');
              updateField('orderDate', data.orderDate);
              updateField('deliveryDate', data.deliveryDate);
              updateField('quantity', data.quantity);
              
              // 저장 실행
              await handleSave();
            }}
            initialData={{
              productName: formData.productName || order.product_name || '',
              size: formData.productSize || order.size || '',
              weight: formData.productWeight || order.weight || '',
              packaging: formData.packaging || order.packaging || 0,
              packagingSize: formData.productPackagingSize || order.packaging?.toString() || '',
              orderDate: formData.orderDate || order.order_date || '',
              deliveryDate: formData.deliveryDate || order.delivery_date || '',
              quantity: formData.quantity || order.quantity || 0,
              productImage: order.product_main_image || null,
            }}
            onMainImageUpload={handleMainImageUpload}
          />
        )}

        {/* 단가 정보 편집 모달 */}
        {order && (
          <UnitPriceEditModal
            visible={editingSection === 'unitPrice'}
            onClose={() => setEditingSection(null)}
            onSave={async (data: UnitPriceEditData) => {
              updateField('unitPrice', data.unitPrice);
              updateField('backMargin', data.backMargin);
              updateField('commissionType', data.commissionType);
              updateField('commissionRate', data.commissionRate);
              await handleSave();
            }}
            initialData={{
              unitPrice: formData.unitPrice || order.unit_price || 0,
              backMargin: formData.backMargin || order.back_margin || 0,
              commissionType: formData.commissionType || order.commission_type || '',
              commissionRate: formData.commissionRate || order.commission_rate || 0,
            }}
            isSuperAdmin={user?.level === 'A-SuperAdmin'}
          />
        )}

        {/* 운송비 편집 모달 */}
        {order && (
          <ShippingEditModal
            visible={editingSection === 'shipping'}
            onClose={() => setEditingSection(null)}
            onSave={async (data: ShippingEditData) => {
              updateField('shippingCost', data.shippingCost);
              updateField('warehouseShippingCost', data.warehouseShippingCost);
              await handleSave();
            }}
            initialData={{
              shippingCost: formData.shippingCost || order.shipping_cost || 0,
              warehouseShippingCost: formData.warehouseShippingCost || order.warehouse_shipping_cost || 0,
            }}
          />
        )}

        {/* 결제 정보 편집 모달 */}
        {order && (
          <PaymentEditModal
            visible={editingSection === 'payment'}
            onClose={() => setEditingSection(null)}
            onSave={async (data: PaymentEditData) => {
              updateField('advancePaymentRate', data.advancePaymentRate);
              updateField('advancePaymentDate', data.advancePaymentDate);
              updateField('balancePaymentDate', data.balancePaymentDate);
              await handleSave();
            }}
            initialData={{
              advancePaymentRate: formData.advancePaymentRate || order.advance_payment_rate || 0,
              advancePaymentDate: formData.advancePaymentDate || order.advance_payment_date || '',
              balancePaymentDate: formData.balancePaymentDate || order.balance_payment_date || '',
            }}
          />
        )}

        {/* 비용 항목 편집 모달 */}
        {order && (
          <CostItemsEditModal
            visible={editingSection === 'costItems'}
            onClose={() => setEditingSection(null)}
            onSave={async (data: CostItemsEditData) => {
              setOptionItems(data.optionItems);
              setLaborCostItems(data.laborCostItems);
              await handleSave();
            }}
            initialData={{
              optionItems: optionItems,
              laborCostItems: laborCostItems,
            }}
            isSuperAdmin={user?.level === 'A-SuperAdmin'}
          />
        )}
      </View>
    </Container>
  );
}

const getStatusStyle = (status: string): any => {
  const statusMap: Record<string, any> = {
    발주확인: { backgroundColor: colors.success },
    발주대기: { backgroundColor: colors.warning },
    취소됨: { backgroundColor: colors.danger },
    미결제: { backgroundColor: colors.gray500 },
    선금결제: { backgroundColor: colors.primary },
    완료: { backgroundColor: colors.success },
  };
  return statusMap[status] || { backgroundColor: colors.gray500 };
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerSection: {
    flexDirection: 'row',
    padding: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: colors.gray100,
    marginRight: spacing.md,
  },
  productInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray900,
    marginBottom: spacing.xs,
  },
  productNameChinese: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.gray700,
    marginBottom: spacing.xs,
  },
  statusRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.white,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  tabButton: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: colors.primary,
  },
  tabButtonText: {
    fontSize: 14,
    color: colors.gray600,
    fontWeight: '500',
  },
  tabButtonTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 3, // 하단 저장 버튼을 위한 여유 공간
  },
  bottomSaveButton: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  tabContent: {
    // flex: 1 제거 - 스크롤을 위해 필요 없음
  },
  section: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray900,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  highlightRow: {
    backgroundColor: '#FEF3C7',
    padding: spacing.sm,
    borderRadius: 4,
    marginTop: spacing.xs,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.gray600,
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: colors.gray900,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  highlightValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.gray900,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  itemName: {
    fontSize: 14,
    color: colors.gray700,
    flex: 1,
  },
  itemValue: {
    fontSize: 14,
    color: colors.gray900,
    fontWeight: '500',
    textAlign: 'right',
  },
  shipmentCard: {
    backgroundColor: colors.gray50,
    borderRadius: 6,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  workItemCard: {
    backgroundColor: colors.gray50,
    borderRadius: 6,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  workItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  workItemName: {
    fontSize: 14,
    color: colors.gray900,
    flex: 1,
  },
  statusCompleted: {
    backgroundColor: colors.success,
  },
  statusPending: {
    backgroundColor: colors.warning,
  },
  // 카드 스타일
  cardSection: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cardHeaderRight: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  cardTotal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  editButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.purple500,
    borderRadius: 6,
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  cardTotalLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  cardTotalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  // 결제 정보 그리드
  paymentGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  paymentColumn: {
    flex: 1,
    gap: spacing.sm,
  },
  paymentColumnTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  paymentInput: {
    marginBottom: spacing.xs,
  },
  paymentAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.gray50,
    borderRadius: 8,
    marginBottom: spacing.xs,
  },
  paymentAmountLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  paymentAmountValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  // 최종 결제 금액 카드
  finalPaymentCard: {
    backgroundColor: colors.purple500,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  finalPaymentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: spacing.sm,
    opacity: 0.9,
  },
  finalPaymentValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
  },
});

