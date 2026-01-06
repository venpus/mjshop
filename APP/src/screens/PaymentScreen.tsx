/**
 * 결제 관리 화면
 * 발주 결제와 패킹리스트 배송비를 통합 관리
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Container, Header, Input, Loading, ErrorDisplay } from '../components/common';
import { useMenuDrawer } from '../contexts/MenuDrawerContext';
import { useLanguage } from '../contexts/LanguageContext';
import { colors, spacing } from '../constants';
import { getPurchaseOrders, type PurchaseOrderListItem } from '../api/purchaseOrderApi';
import { getAllPackingLists, type PackingListWithItems } from '../api/packingListApi';
import {
  calculateBasicCostTotal,
  calculateShippingCostTotal,
  calculateFinalPaymentAmount,
  calculateAdvancePaymentAmount,
  calculateBalancePaymentAmount,
} from '../utils/purchaseOrderCalculations';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AdminStackParamList } from '../navigation/types';

type PaymentScreenProps = NativeStackScreenProps<AdminStackParamList, 'Payment'>;

type PaymentItemType = 'purchase_order' | 'packing_list';

interface BasePaymentItem {
  id: string;
  type: PaymentItemType;
  date: string;
  paidAmount: number;
  pendingAmount: number;
  status: 'paid' | 'pending' | 'partial';
}

interface PurchaseOrderPaymentItem extends BasePaymentItem {
  type: 'purchase_order';
  poNumber: string;
  productName: string;
  productNameChinese?: string | null;
  advancePayment: { amount: number; date?: string | null };
  balancePayment: { amount: number; date?: string | null };
  backMarginCost: number;
  finalPaymentAmount: number;
  orderStatus: string;
}

interface PackingListPaymentItem extends BasePaymentItem {
  type: 'packing_list';
  packingListCode: string;
  purchaseOrderIds: string[];
  shippingCost: { amount: number; date?: string | null };
  wkShippingCost: { amount: number; date?: string | null };
  actualWeightShippingCost: number;
  ratioAdditionalCost: number;
  logisticsCompany?: string | null;
}

type PaymentItem = PurchaseOrderPaymentItem | PackingListPaymentItem;

type FilterType = 'all' | 'purchase_order' | 'packing_list';

const PaymentScreen: React.FC<PaymentScreenProps> = ({ navigation }) => {
  const { openDrawer } = useMenuDrawer();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderListItem[]>([]);
  const [packingLists, setPackingLists] = useState<PackingListWithItems[]>([]);

  // 발주 데이터를 PaymentItem으로 변환
  const convertPurchaseOrderToPaymentItem = useCallback((po: PurchaseOrderListItem): PurchaseOrderPaymentItem => {
    const basicCostTotal = calculateBasicCostTotal(
      po.unit_price,
      po.quantity,
      po.commission_rate || 0,
      po.back_margin || 0
    );
    const shippingCostTotal = calculateShippingCostTotal(
      po.shipping_cost || 0,
      po.warehouse_shipping_cost || 0
    );
    const finalPaymentAmount = calculateFinalPaymentAmount(
      basicCostTotal,
      shippingCostTotal,
      po.option_cost || 0,
      po.labor_cost || 0
    );

    // 선금/잔금 정보는 상세 API에서 가져와야 하지만, 목록 API에는 없으므로
    // 일단 payment_status 기반으로 추정
    // 실제로는 getPurchaseOrderDetail을 호출해야 하지만, 성능상 모든 발주를 조회하기는 어려움
    // TODO: 서버 API에 결제 정보를 포함하도록 확장 필요
    const advancePaymentRate = 0; // 목록 API에 없음
    const advancePaymentAmount = advancePaymentRate > 0 
      ? calculateAdvancePaymentAmount(po.unit_price, po.quantity, advancePaymentRate, po.back_margin || 0)
      : 0;
    const balancePaymentAmount = calculateBalancePaymentAmount(finalPaymentAmount, advancePaymentAmount);
    
    const advancePaymentDate = null; // 목록 API에 없음
    const balancePaymentDate = null; // 목록 API에 없음

    const advancePaid = advancePaymentDate ? advancePaymentAmount : 0;
    const balancePaid = balancePaymentDate ? balancePaymentAmount : 0;
    const paidAmount = advancePaid + balancePaid;
    const pendingAmount = finalPaymentAmount - paidAmount;

    let status: 'paid' | 'pending' | 'partial' = 'pending';
    if (paidAmount >= finalPaymentAmount) {
      status = 'paid';
    } else if (paidAmount > 0) {
      status = 'partial';
    }

    return {
      id: `po_${po.id}`,
      type: 'purchase_order',
      date: po.order_date,
      paidAmount,
      pendingAmount,
      status,
      poNumber: po.po_number,
      productName: po.product_name,
      productNameChinese: po.product_name_chinese || null,
      advancePayment: { amount: advancePaymentAmount, date: advancePaymentDate },
      balancePayment: { amount: balancePaymentAmount, date: balancePaymentDate },
      backMarginCost: (po.back_margin || 0) * po.quantity,
      finalPaymentAmount,
      orderStatus: po.order_status,
    };
  }, []);

  // 패킹리스트 데이터를 PaymentItem으로 변환
  const convertPackingListToPaymentItem = useCallback((pl: PackingListWithItems): PackingListPaymentItem => {
    const shippingCostPaid = pl.payment_date ? pl.shipping_cost : 0;
    const wkShippingCostPaid = pl.wk_payment_date ? pl.shipping_cost : 0;
    
    // 실중량 기준 배송비와 비율 추가 배송비 계산
    let actualWeightShippingCost = pl.shipping_cost;
    let ratioAdditionalCost = 0;
    
    if (pl.weight_ratio && pl.weight_ratio > 0 && pl.actual_weight) {
      // calculated_weight = actual_weight * (1 + weight_ratio/100)
      // shipping_cost는 calculated_weight 기준이므로
      // actual_weight 기준 배송비 = shipping_cost / (1 + weight_ratio/100)
      actualWeightShippingCost = pl.shipping_cost / (1 + pl.weight_ratio / 100);
      ratioAdditionalCost = pl.shipping_cost - actualWeightShippingCost;
    }

    const paidAmount = shippingCostPaid + wkShippingCostPaid;
    const pendingAmount = pl.shipping_cost * 2 - paidAmount; // 배송비 + WK 배송비

    let status: 'paid' | 'pending' | 'partial' = 'pending';
    if (paidAmount >= pl.shipping_cost * 2) {
      status = 'paid';
    } else if (paidAmount > 0) {
      status = 'partial';
    }

    // 연결된 발주 ID 수집
    const purchaseOrderIds = Array.from(
      new Set(pl.items.map(item => item.purchase_order_id).filter(id => id !== null))
    ) as string[];

    return {
      id: `pl_${pl.id}`,
      type: 'packing_list',
      date: pl.shipment_date,
      paidAmount,
      pendingAmount,
      status,
      packingListCode: pl.code,
      purchaseOrderIds,
      shippingCost: { amount: pl.shipping_cost, date: pl.payment_date },
      wkShippingCost: { amount: pl.shipping_cost, date: pl.wk_payment_date },
      actualWeightShippingCost,
      ratioAdditionalCost,
      logisticsCompany: pl.logistics_company,
    };
  }, []);

  // 데이터 로드
  const loadData = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      const [poResult, plData] = await Promise.all([
        getPurchaseOrders(1, 1000), // 모든 발주 가져오기 (임시로 큰 수)
        getAllPackingLists(),
      ]);

      setPurchaseOrders(poResult.data);
      setPackingLists(plData);
    } catch (err: any) {
      setError(err.message || '결제 데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  // PaymentItem 배열 생성
  const paymentItems = useMemo(() => {
    const poItems: PurchaseOrderPaymentItem[] = purchaseOrders.map(convertPurchaseOrderToPaymentItem);
    const plItems: PackingListPaymentItem[] = packingLists.map(convertPackingListToPaymentItem);
    return [...poItems, ...plItems].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA; // 최신순
    });
  }, [purchaseOrders, packingLists, convertPurchaseOrderToPaymentItem, convertPackingListToPaymentItem]);

  // 필터링 및 검색
  const filteredItems = useMemo(() => {
    let filtered = paymentItems;

    // 타입 필터
    if (filterType !== 'all') {
      filtered = filtered.filter(item => item.type === filterType);
    }

    // 검색 필터
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(item => {
        if (item.type === 'purchase_order') {
          return (
            item.poNumber.toLowerCase().includes(search) ||
            item.productName.toLowerCase().includes(search) ||
            (item.productNameChinese?.toLowerCase().includes(search) ?? false)
          );
        } else {
          return (
            item.packingListCode.toLowerCase().includes(search) ||
            item.purchaseOrderIds.some(id => id.toLowerCase().includes(search))
          );
        }
      });
    }

    return filtered;
  }, [paymentItems, filterType, searchTerm]);

  // 요약 통계
  const summary = useMemo(() => {
    const totalPaid = paymentItems.reduce((sum, item) => sum + item.paidAmount, 0);
    const totalPending = paymentItems.reduce((sum, item) => sum + item.pendingAmount, 0);
    
    const poItems = paymentItems.filter(item => item.type === 'purchase_order') as PurchaseOrderPaymentItem[];
    const plItems = paymentItems.filter(item => item.type === 'packing_list') as PackingListPaymentItem[];
    
    const poTotalPaid = poItems.reduce((sum, item) => sum + item.paidAmount, 0);
    const poTotalPending = poItems.reduce((sum, item) => sum + item.pendingAmount, 0);
    
    const plTotalPaid = plItems.reduce((sum, item) => sum + item.paidAmount, 0);
    const plTotalPending = plItems.reduce((sum, item) => sum + item.pendingAmount, 0);
    
    const backMarginTotal = poItems.reduce((sum, item) => sum + item.backMarginCost, 0);
    const ratioAdditionalTotal = plItems.reduce((sum, item) => sum + item.ratioAdditionalCost, 0);

    return {
      totalPaid,
      totalPending,
      poTotalPaid,
      poTotalPending,
      plTotalPaid,
      plTotalPending,
      backMarginTotal,
      ratioAdditionalTotal,
    };
  }, [paymentItems]);

  if (loading && !refreshing) {
    return (
      <Container safeArea>
        <Header
          title={t('menu.payment') || '결제 관리'}
          showMenuButton={true}
          onMenuPress={openDrawer}
        />
        <Loading message="로딩 중..." />
      </Container>
    );
  }

  return (
    <Container safeArea padding={false}>
      <Header
        title={t('menu.payment') || '결제 관리'}
        showMenuButton={true}
        onMenuPress={openDrawer}
      />

      {/* 요약 카드 섹션 */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.summaryContainer}
        contentContainerStyle={styles.summaryContent}
      >
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>총 지급완료</Text>
          <Text style={styles.summaryValue}>¥{summary.totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>총 지급예정</Text>
          <Text style={[styles.summaryValue, styles.pendingValue]}>¥{summary.totalPending.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>발주 결제</Text>
          <Text style={styles.summarySubValue}>완료: ¥{summary.poTotalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
          <Text style={styles.summarySubValue}>예정: ¥{summary.poTotalPending.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>패킹리스트 배송비</Text>
          <Text style={styles.summarySubValue}>완료: ¥{summary.plTotalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
          <Text style={styles.summarySubValue}>예정: ¥{summary.plTotalPending.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
        </View>
      </ScrollView>

      {/* 검색 및 필터 */}
      <View style={styles.filterContainer}>
        <Input
          placeholder={t('common.search') || '검색...'}
          value={searchTerm}
          onChangeText={setSearchTerm}
          containerStyle={styles.searchInput}
        />
        <View style={styles.filterButtons}>
          <TouchableOpacity
            style={[styles.filterButton, filterType === 'all' && styles.filterButtonActive]}
            onPress={() => setFilterType('all')}
          >
            <Text style={[styles.filterButtonText, filterType === 'all' && styles.filterButtonTextActive]}>전체</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filterType === 'purchase_order' && styles.filterButtonActive]}
            onPress={() => setFilterType('purchase_order')}
          >
            <Text style={[styles.filterButtonText, filterType === 'purchase_order' && styles.filterButtonTextActive]}>발주</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filterType === 'packing_list' && styles.filterButtonActive]}
            onPress={() => setFilterType('packing_list')}
          >
            <Text style={[styles.filterButtonText, filterType === 'packing_list' && styles.filterButtonTextActive]}>패킹리스트</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 리스트 */}
      {error ? (
        <ErrorDisplay message={error} onRetry={loadData} />
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={item => item.id}
          renderItem={({ item }) => {
            if (item.type === 'purchase_order') {
              return <PurchaseOrderPaymentCard item={item} navigation={navigation} />;
            } else {
              return <PackingListPaymentCard item={item} navigation={navigation} />;
            }
          }}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>결제 내역이 없습니다.</Text>
            </View>
          }
        />
      )}
    </Container>
  );
};

// 발주 결제 카드 컴포넌트
interface PurchaseOrderPaymentCardProps {
  item: PurchaseOrderPaymentItem;
  navigation: any;
}

const PurchaseOrderPaymentCard: React.FC<PurchaseOrderPaymentCardProps> = ({ item, navigation }) => {
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
    } catch {
      return dateString;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return colors.success;
      case 'pending': return colors.warning;
      case 'partial': return colors.primary;
      default: return colors.gray500;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid': return '지급완료';
      case 'pending': return '지급예정';
      case 'partial': return '부분지급';
      default: return '';
    }
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => {
        const poId = item.id.replace('po_', '');
        navigation.navigate('PurchaseOrderDetail', { id: poId });
      }}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Text style={styles.cardType}>[발주]</Text>
          <Text style={styles.cardTitle}>{item.poNumber}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </View>

      <Text style={styles.productName}>{item.productName}</Text>
      {item.productNameChinese && (
        <Text style={styles.productNameChinese}>{item.productNameChinese}</Text>
      )}

      <View style={styles.cardContent}>
        <View style={styles.paymentRow}>
          <Text style={styles.paymentLabel}>선금:</Text>
          <Text style={styles.paymentValue}>
            ¥{item.advancePayment.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
          {item.advancePayment.date && (
            <Text style={styles.paymentDate}>({formatDate(item.advancePayment.date)})</Text>
          )}
        </View>
        <View style={styles.paymentRow}>
          <Text style={styles.paymentLabel}>잔금:</Text>
          <Text style={styles.paymentValue}>
            ¥{item.balancePayment.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
          {item.balancePayment.date && (
            <Text style={styles.paymentDate}>({formatDate(item.balancePayment.date)})</Text>
          )}
        </View>
        {item.backMarginCost > 0 && (
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>추가단가:</Text>
            <Text style={styles.paymentValue}>¥{item.backMarginCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
          </View>
        )}
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.cardDate}>{formatDate(item.date)}</Text>
        <Text style={styles.totalAmount}>
          총액: ¥{item.finalPaymentAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

// 패킹리스트 배송비 카드 컴포넌트
interface PackingListPaymentCardProps {
  item: PackingListPaymentItem;
  navigation: any;
}

const PackingListPaymentCard: React.FC<PackingListPaymentCardProps> = ({ item, navigation }) => {
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
    } catch {
      return dateString;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return colors.success;
      case 'pending': return colors.warning;
      case 'partial': return colors.primary;
      default: return colors.gray500;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid': return '지급완료';
      case 'pending': return '지급예정';
      case 'partial': return '부분지급';
      default: return '';
    }
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => {
        // 패킹리스트 상세 화면으로 이동 (나중에 구현)
        console.log('Packing list detail:', item.id);
      }}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Text style={styles.cardType}>[패킹리스트]</Text>
          <Text style={styles.cardTitle}>{item.packingListCode}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </View>

      {item.purchaseOrderIds.length > 0 && (
        <Text style={styles.poNumbers}>발주: {item.purchaseOrderIds.join(', ')}</Text>
      )}
      {item.logisticsCompany && (
        <Text style={styles.logisticsCompany}>물류회사: {item.logisticsCompany}</Text>
      )}

      <View style={styles.cardContent}>
        <View style={styles.paymentRow}>
          <Text style={styles.paymentLabel}>배송비:</Text>
          <Text style={styles.paymentValue}>
            ¥{item.shippingCost.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
          {item.shippingCost.date && (
            <Text style={styles.paymentDate}>({formatDate(item.shippingCost.date)})</Text>
          )}
        </View>
        <View style={styles.paymentRow}>
          <Text style={styles.paymentLabel}>WK 배송비:</Text>
          <Text style={styles.paymentValue}>
            ¥{item.wkShippingCost.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
          {item.wkShippingCost.date && (
            <Text style={styles.paymentDate}>({formatDate(item.wkShippingCost.date)})</Text>
          )}
        </View>
        {item.ratioAdditionalCost > 0 && (
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>실중량 기준:</Text>
            <Text style={styles.paymentValue}>¥{item.actualWeightShippingCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
          </View>
        )}
        {item.ratioAdditionalCost > 0 && (
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>비율 추가분:</Text>
            <Text style={styles.paymentValue}>¥{item.ratioAdditionalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
          </View>
        )}
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.cardDate}>{formatDate(item.date)}</Text>
        <Text style={styles.totalAmount}>
          총액: ¥{(item.shippingCost.amount + item.wkShippingCost.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  summaryContainer: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  summaryContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  summaryCard: {
    backgroundColor: colors.gray50,
    padding: spacing.md,
    borderRadius: 8,
    minWidth: 140,
    marginRight: spacing.sm,
  },
  summaryLabel: {
    fontSize: 12,
    color: colors.gray600,
    marginBottom: spacing.xs,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray900,
  },
  pendingValue: {
    color: colors.warning,
  },
  summarySubValue: {
    fontSize: 13,
    color: colors.gray700,
    marginTop: spacing.xs / 2,
  },
  filterContainer: {
    padding: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  searchInput: {
    marginBottom: spacing.sm,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  filterButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: 6,
    backgroundColor: colors.gray100,
    borderWidth: 1,
    borderColor: colors.gray300,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterButtonText: {
    fontSize: 14,
    color: colors.gray700,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: colors.white,
  },
  listContent: {
    padding: spacing.md,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardType: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    marginRight: spacing.xs,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray900,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.white,
  },
  productName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.gray900,
    marginBottom: spacing.xs / 2,
  },
  productNameChinese: {
    fontSize: 12,
    color: colors.gray600,
    marginBottom: spacing.sm,
  },
  poNumbers: {
    fontSize: 12,
    color: colors.gray600,
    marginBottom: spacing.xs / 2,
  },
  logisticsCompany: {
    fontSize: 12,
    color: colors.gray600,
    marginBottom: spacing.sm,
  },
  cardContent: {
    marginBottom: spacing.sm,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs / 2,
  },
  paymentLabel: {
    fontSize: 13,
    color: colors.gray600,
    width: 80,
  },
  paymentValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.gray900,
    flex: 1,
  },
  paymentDate: {
    fontSize: 11,
    color: colors.gray500,
    marginLeft: spacing.xs,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
  cardDate: {
    fontSize: 12,
    color: colors.gray500,
  },
  totalAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.gray900,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    fontSize: 16,
    color: colors.gray500,
  },
});

export default PaymentScreen;

