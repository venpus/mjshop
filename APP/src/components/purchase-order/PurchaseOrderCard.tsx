/**
 * 발주 카드 컴포넌트 (컴팩트 버전)
 * 재사용 가능한 발주 목록 카드 컴포넌트
 */

import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Checkbox } from '../common';
import { colors, spacing } from '../../constants';
import { getFullImageUrl } from '../../config/constants';
import type { PurchaseOrderListItem } from '../../api/purchaseOrderApi';

export interface PurchaseOrderCardProps {
  item: PurchaseOrderListItem;
  isSelected?: boolean;
  isSelectionMode?: boolean;
  onPress: (id: string) => void;
  onToggleCheckbox?: (id: string) => void;
  getStatusStyle: (status: string) => ViewStyle;
  calculateBasicCostTotal: (unitPrice: number, quantity: number, commissionRate: number, backMargin: number) => number;
  calculateShippingCostTotal: (shippingCost: number, warehouseShippingCost: number) => number;
  calculateFinalPaymentAmount: (basicCostTotal: number, shippingCostTotal: number, optionCost: number, laborCost: number) => number;
  calculateExpectedFinalUnitPrice: (finalPaymentAmount: number, packingListShippingCost: number, quantity: number) => number;
  calculateFactoryStatusFromQuantity: (factoryShippedQuantity: number, quantity: number) => string | null;
  calculateWorkStatus: (workStartDate: string | null | undefined, workEndDate: string | null | undefined) => string;
}

export function PurchaseOrderCard({
  item,
  isSelected = false,
  isSelectionMode = false,
  onPress,
  onToggleCheckbox,
  getStatusStyle,
  calculateBasicCostTotal,
  calculateShippingCostTotal,
  calculateFinalPaymentAmount,
  calculateExpectedFinalUnitPrice,
  calculateFactoryStatusFromQuantity,
  calculateWorkStatus,
}: PurchaseOrderCardProps) {
  // 금액 계산
  const orderUnitPrice = item.order_unit_price || item.unit_price + (item.back_margin || 0);
  const basicCostTotal = calculateBasicCostTotal(
    item.unit_price,
    item.quantity,
    item.commission_rate || 0,
    item.back_margin || 0
  );
  const shippingCostTotal = calculateShippingCostTotal(
    item.shipping_cost || 0,
    item.warehouse_shipping_cost || 0
  );
  const finalPaymentAmount = calculateFinalPaymentAmount(
    basicCostTotal,
    shippingCostTotal,
    item.option_cost || 0,
    item.labor_cost || 0
  );
  const expectedFinalUnitPrice = item.expected_final_unit_price || calculateExpectedFinalUnitPrice(
    finalPaymentAmount,
    item.packing_list_shipping_cost || 0,
    item.quantity
  );

  // 상태 계산
  const factoryStatus = item.factory_shipped_quantity !== undefined
    ? calculateFactoryStatusFromQuantity(item.factory_shipped_quantity, item.quantity)
    : null;
  const workStatus = calculateWorkStatus(item.work_start_date, item.work_end_date);

  // 날짜 포맷팅
  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const day = date.getDate();
      return `${year}년 ${month}월 ${day}일`;
    } catch {
      return dateString;
    }
  };

  // 상태 배지 필터링 (중요한 것만 표시)
  const statusBadges = [];
  if (item.order_status) {
    statusBadges.push({ label: item.order_status, status: item.order_status });
  }
  if (item.payment_status && item.payment_status !== '미결제') {
    statusBadges.push({ label: item.payment_status, status: item.payment_status });
  }
  if (factoryStatus) {
    statusBadges.push({ label: factoryStatus, status: factoryStatus });
  }
  if (workStatus && workStatus !== '작업대기') {
    statusBadges.push({ label: workStatus, status: workStatus });
  }

  return (
    <View style={[styles.container, isSelected && styles.containerSelected]}>
      {/* 헤더: 체크박스 + 발주일 + PO번호 */}
      <View style={styles.header}>
        {isSelectionMode && onToggleCheckbox && (
          <Checkbox
            checked={isSelected}
            onPress={() => onToggleCheckbox(item.id)}
            size={18}
            style={styles.checkbox}
          />
        )}
        <View style={styles.headerContent}>
          {item.order_date && (
            <Text style={styles.dateText}>{formatDate(item.order_date)}</Text>
          )}
          <Text style={styles.poNumber}>{item.po_number}</Text>
        </View>
      </View>

      {/* 본문 */}
      <TouchableOpacity
        style={styles.body}
        onPress={() => onPress(item.id)}
        activeOpacity={0.7}
      >
        {/* 제품 정보: 이미지 왼쪽 + 제품명/핵심 정보 오른쪽 */}
        <View style={styles.productSection}>
          <Image
            source={{
              uri: item.product_main_image
                ? getFullImageUrl(item.product_main_image)
                : 'https://via.placeholder.com/80',
            }}
            style={styles.productImage}
            resizeMode="cover"
          />
          <View style={styles.productInfo}>
            {/* 제품명 (한 줄로 통합) */}
            <View style={styles.productNameRow}>
              <Text style={styles.productName} numberOfLines={1}>
                {item.product_name}
              </Text>
              {item.product_name_chinese && (
                <Text style={styles.productNameChinese} numberOfLines={1}>
                  ({item.product_name_chinese})
                </Text>
              )}
            </View>
            
            {/* 핵심 정보 */}
            <View style={styles.keyInfoInline}>
              <View style={styles.keyInfoRowInline}>
                <Text style={styles.keyInfoLabelInline}>수량</Text>
                <Text style={styles.keyInfoValueInline}>{item.quantity.toLocaleString()}개</Text>
              </View>
              <View style={styles.keyInfoRowInline}>
                <Text style={styles.keyInfoLabelInline}>단가</Text>
                <Text style={styles.keyInfoValueInline}>¥{orderUnitPrice.toFixed(2)}</Text>
              </View>
              <View style={[styles.keyInfoRowInline, styles.keyInfoRowHighlightInline]}>
                <Text style={styles.keyInfoLabelHighlightInline}>예상최종단가</Text>
                <Text style={styles.keyInfoValueHighlightInline}>¥{expectedFinalUnitPrice.toFixed(2)}</Text>
              </View>
              <View style={styles.keyInfoRowInline}>
                <Text style={styles.keyInfoLabelInline}>발주금액</Text>
                <Text style={styles.keyInfoValueInline}>
                  ¥{finalPaymentAmount.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* 상태 배지 */}
        {statusBadges.length > 0 && (
          <View style={styles.statusContainer}>
            {statusBadges.map((badge, index) => (
              <View
                key={index}
                style={[styles.statusBadge, getStatusStyle(badge.status)]}
              >
                <Text style={styles.statusText}>{badge.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* 상세 정보 (컴팩트) */}
        <View style={styles.detailsContainer}>
          {/* 사이즈, 무게, 포장 */}
          {(item.size || item.weight || item.packaging) && (
            <View style={styles.detailsRow}>
              {item.size && (
                <Text style={styles.detailText}>📏 {item.size}cm</Text>
              )}
              {item.weight && (
                <Text style={styles.detailText}>⚖️ {item.weight}g</Text>
              )}
              {item.packaging && (
                <Text style={styles.detailText}>📦 {item.packaging.toLocaleString()}개</Text>
              )}
            </View>
          )}

          {/* 수량 상세 */}
          <View style={styles.detailsRow}>
            <Text style={styles.detailText}>
              미입고: {item.unreceived_quantity !== undefined ? item.unreceived_quantity : 0}
            </Text>
            <Text style={styles.detailText}>
              미발송: {item.unshipped_quantity !== undefined ? item.unshipped_quantity : 0}
            </Text>
            <Text style={styles.detailText}>
              배송중: {item.shipping_quantity !== undefined ? item.shipping_quantity : 0}
            </Text>
            <Text style={styles.detailText}>
              한국도착: {item.arrived_quantity !== undefined ? item.arrived_quantity : 0}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: 12,
    marginBottom: spacing.md,
    marginHorizontal: spacing.md,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  containerSelected: {
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.primary + '08',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray50,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  checkbox: {
    marginRight: spacing.sm,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.gray700,
  },
  poNumber: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.gray500,
  },
  body: {
    padding: spacing.md,
  },
  productSection: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  productImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: colors.gray100,
    marginRight: spacing.sm,
  },
  productInfo: {
    flex: 1,
    justifyContent: 'flex-start',
    minWidth: 0, // flex 아이템이 너무 작아지는 것을 방지
  },
  productNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: spacing.xs,
  },
  productName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.gray900,
    lineHeight: 18,
    marginRight: spacing.xs / 2,
    flexShrink: 1,
  },
  productNameChinese: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.gray600,
    lineHeight: 16,
    flexShrink: 1,
  },
  keyInfoInline: {
    marginTop: spacing.xs,
  },
  keyInfoRowInline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs / 2,
  },
  keyInfoRowHighlightInline: {
    backgroundColor: colors.primary + '10',
    paddingVertical: spacing.xs / 2,
    paddingHorizontal: spacing.xs,
    borderRadius: 6,
    marginTop: spacing.xs / 2,
    marginBottom: spacing.xs / 2,
  },
  keyInfoLabelInline: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.gray600,
  },
  keyInfoLabelHighlightInline: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  keyInfoValueInline: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.gray900,
  },
  keyInfoValueHighlightInline: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  statusContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 60,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.white,
  },
  detailsContainer: {
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.xs / 2,
  },
  detailText: {
    fontSize: 10,
    color: colors.gray600,
    fontWeight: '400',
  },
});

