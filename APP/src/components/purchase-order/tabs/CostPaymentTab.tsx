/**
 * CostPaymentTab 컴포넌트
 * 비용/결제 탭 - 옵션 항목 및 인건비 항목 편집
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Input, NumberInput, Button } from '../../common';
import { colors, spacing } from '../../../constants';

export interface LaborCostItem {
  id: string;
  name: string;
  unit_price: number;
  quantity: number;
  cost: number; // 계산값: unit_price * quantity
  isAdminOnly?: boolean;
}

interface CostPaymentTabProps {
  // 옵션 항목
  optionItems: LaborCostItem[];
  totalOptionCost: number;
  onUpdateOptionItemName: (id: string, name: string) => void;
  onUpdateOptionItemUnitPrice: (id: string, unitPrice: number) => void;
  onUpdateOptionItemQuantity: (id: string, quantity: number) => void;
  onRemoveOptionItem: (id: string) => void;
  onAddOptionItem: (isAdminOnly?: boolean) => void;

  // 인건비 항목
  laborCostItems: LaborCostItem[];
  totalLaborCost: number;
  onUpdateLaborCostItemName: (id: string, name: string) => void;
  onUpdateLaborCostItemUnitPrice: (id: string, unitPrice: number) => void;
  onUpdateLaborCostItemQuantity: (id: string, quantity: number) => void;
  onRemoveLaborCostItem: (id: string) => void;
  onAddLaborCostItem: (isAdminOnly?: boolean) => void;

  // 권한
  isSuperAdmin?: boolean;
  canWrite?: boolean;
}

export function CostPaymentTab({
  optionItems,
  totalOptionCost,
  onUpdateOptionItemName,
  onUpdateOptionItemUnitPrice,
  onUpdateOptionItemQuantity,
  onRemoveOptionItem,
  onAddOptionItem,
  laborCostItems,
  totalLaborCost,
  onUpdateLaborCostItemName,
  onUpdateLaborCostItemUnitPrice,
  onUpdateLaborCostItemQuantity,
  onRemoveLaborCostItem,
  onAddLaborCostItem,
  isSuperAdmin = false,
  canWrite = true,
}: CostPaymentTabProps) {
  const renderCostItem = (
    item: LaborCostItem,
    type: 'option' | 'labor',
    onUpdateName: (id: string, name: string) => void,
    onUpdateUnitPrice: (id: string, unitPrice: number) => void,
    onUpdateQuantity: (id: string, quantity: number) => void,
    onRemove: (id: string) => void
  ) => {
    const cost = item.unit_price * item.quantity;

    return (
      <View key={item.id} style={styles.costItemCard}>
        <View style={styles.costItemHeader}>
          <Text style={styles.costItemTitle}>
            {item.isAdminOnly ? '🔒 ' : ''}
            {item.name || '항목명'}
          </Text>
          {canWrite ? (
            <TouchableOpacity
              onPress={() => onRemove(item.id)}
              style={styles.removeButton}
            >
              <Text style={styles.removeButtonText}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {canWrite ? (
          <>
            <Input
              label="항목명"
              value={item.name}
              onChangeText={(text) => onUpdateName(item.id, text)}
              placeholder="항목명을 입력하세요"
              containerStyle={styles.inputContainer}
            />
            <View style={styles.costItemRow}>
              <NumberInput
                label="단가"
                value={item.unit_price}
                onChange={(value) => onUpdateUnitPrice(item.id, value)}
                min={0}
                containerStyle={[styles.inputContainer, styles.halfWidth]}
              />
              <NumberInput
                label="수량"
                value={item.quantity}
                onChange={(value) => onUpdateQuantity(item.id, value)}
                min={0}
                allowDecimals={false}
                containerStyle={[styles.inputContainer, styles.halfWidth]}
              />
            </View>
          </>
        ) : (
          <View style={styles.costItemRow}>
            <View style={styles.readOnlyField}>
              <Text style={styles.readOnlyLabel}>단가</Text>
              <Text style={styles.readOnlyValue}>¥{item.unit_price.toLocaleString()}</Text>
            </View>
            <View style={styles.readOnlyField}>
              <Text style={styles.readOnlyLabel}>수량</Text>
              <Text style={styles.readOnlyValue}>{item.quantity.toLocaleString()}개</Text>
            </View>
          </View>
        )}

        <View style={styles.costItemTotal}>
          <Text style={styles.costItemTotalLabel}>소계:</Text>
          <Text style={styles.costItemTotalValue}>¥{cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* 옵션 항목 섹션 */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>포장 및 가공 부자재</Text>
          <View style={styles.sectionTotal}>
            <Text style={styles.sectionTotalLabel}>총액:</Text>
            <Text style={styles.sectionTotalValue}>
              ¥{totalOptionCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>
        </View>

        {optionItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>옵션 항목이 없습니다</Text>
          </View>
        ) : (
          optionItems.map((item) =>
            renderCostItem(
              item,
              'option',
              onUpdateOptionItemName,
              onUpdateOptionItemUnitPrice,
              onUpdateOptionItemQuantity,
              onRemoveOptionItem
            )
          )
        )}

        {canWrite ? (
          <View style={styles.addButtonContainer}>
            <Button
              title="+ 옵션 항목 추가"
              onPress={() => onAddOptionItem(false)}
              variant="outline"
              style={styles.addButton}
            />
            {isSuperAdmin ? (
              <Button
                title="+ A레벨 전용 옵션 추가"
                onPress={() => onAddOptionItem(true)}
                variant="outline"
                style={[styles.addButton, styles.adminButton]}
              />
            ) : null}
          </View>
        ) : null}
      </View>

      {/* 인건비 항목 섹션 */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>인건비</Text>
          <View style={styles.sectionTotal}>
            <Text style={styles.sectionTotalLabel}>총액:</Text>
            <Text style={styles.sectionTotalValue}>
              ¥{totalLaborCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>
        </View>

        {laborCostItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>인건비 항목이 없습니다</Text>
          </View>
        ) : (
          laborCostItems.map((item) =>
            renderCostItem(
              item,
              'labor',
              onUpdateLaborCostItemName,
              onUpdateLaborCostItemUnitPrice,
              onUpdateLaborCostItemQuantity,
              onRemoveLaborCostItem
            )
          )
        )}

        {canWrite ? (
          <View style={styles.addButtonContainer}>
            <Button
              title="+ 인건비 항목 추가"
              onPress={() => onAddLaborCostItem(false)}
              variant="outline"
              style={styles.addButton}
            />
            {isSuperAdmin ? (
              <Button
                title="+ A레벨 전용 인건비 추가"
                onPress={() => onAddLaborCostItem(true)}
                variant="outline"
                style={[styles.addButton, styles.adminButton]}
              />
            ) : null}
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.md,
  },
  section: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray900,
  },
  sectionTotal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  sectionTotalLabel: {
    fontSize: 14,
    color: colors.gray600,
  },
  sectionTotalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  emptyState: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.gray500,
  },
  costItemCard: {
    backgroundColor: colors.gray50,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  costItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  costItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray900,
    flex: 1,
  },
  removeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  inputContainer: {
    marginBottom: spacing.sm,
  },
  costItemRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  halfWidth: {
    flex: 1,
  },
  readOnlyField: {
    flex: 1,
    paddingVertical: spacing.sm,
  },
  readOnlyLabel: {
    fontSize: 12,
    color: colors.gray600,
    marginBottom: spacing.xs,
  },
  readOnlyValue: {
    fontSize: 14,
    color: colors.gray900,
    fontWeight: '500',
  },
  costItemTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
  costItemTotalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray700,
  },
  costItemTotalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  addButtonContainer: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  addButton: {
    width: '100%',
  },
  adminButton: {
    borderColor: colors.warning,
  },
});

