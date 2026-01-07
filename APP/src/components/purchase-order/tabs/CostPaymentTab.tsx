/**
 * CostPaymentTab 컴포넌트
 * 비용/결제 탭 - 옵션 항목 및 인건비 항목 편집
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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
  
  // 편집 모드
  mode?: 'read' | 'edit';
  onEditClick?: () => void;
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
  mode = 'read',
  onEditClick,
}: CostPaymentTabProps) {
  const isReadMode = mode === 'read';
  const showEditButton = isReadMode && canWrite && onEditClick;
  const renderCostItem = (
    item: LaborCostItem,
    type: 'option' | 'labor',
    onUpdateName: (id: string, name: string) => void,
    onUpdateUnitPrice: (id: string, unitPrice: number) => void,
    onUpdateQuantity: (id: string, quantity: number) => void,
    onRemove: (id: string) => void,
    isAdminOnly: boolean = false
  ) => {
    const cost = item.unit_price * item.quantity;
    const cardStyle = isAdminOnly 
      ? [styles.costItemCard, styles.costItemCardAdmin] 
      : styles.costItemCard;

    // 읽기 모드일 때는 Text만 표시
    if (isReadMode) {
      return (
        <View key={item.id} style={cardStyle}>
          <View style={styles.costItemHeader}>
            <View style={styles.costItemTitleContainer}>
              {isAdminOnly ? (
                <View style={styles.adminBadge}>
                  <Text style={styles.adminBadgeText}>A</Text>
                </View>
              ) : null}
              <Text style={styles.costItemTitle}>
                {item.name || '항목명'}
              </Text>
            </View>
          </View>

          <View style={styles.costItemRow}>
            <View style={styles.readOnlyField}>
              <Text style={styles.readOnlyLabel}>단가</Text>
              <Text style={styles.readOnlyValue}>¥{item.unit_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
            </View>
            <View style={styles.readOnlyField}>
              <Text style={styles.readOnlyLabel}>수량</Text>
              <Text style={styles.readOnlyValue}>{item.quantity.toLocaleString()}개</Text>
            </View>
          </View>

          {/* 실시간 계산 표시 */}
          <View style={styles.costCalculationRow}>
            <Text style={styles.costCalculationText}>
              ¥{item.unit_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              {' × '}
              {item.quantity.toLocaleString()}개
              {' = '}
            </Text>
            <Text style={styles.costItemTotalValue}>
              ¥{cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>
        </View>
      );
    }

    // 편집 모드일 때는 Input 표시
    return (
      <View key={item.id} style={cardStyle}>
        <View style={styles.costItemHeader}>
          <View style={styles.costItemTitleContainer}>
            {isAdminOnly ? (
              <View style={styles.adminBadge}>
                <Text style={styles.adminBadgeText}>A</Text>
              </View>
            ) : null}
            <Text style={styles.costItemTitle}>
              {item.name || '항목명'}
            </Text>
          </View>
          {canWrite ? (
            <TouchableOpacity
              onPress={() => onRemove(item.id)}
              style={styles.removeButton}
            >
              <Text style={styles.removeButtonText}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>

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

        {/* 실시간 계산 표시 */}
        <View style={styles.costCalculationRow}>
          <Text style={styles.costCalculationText}>
            ¥{item.unit_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            {' × '}
            {item.quantity.toLocaleString()}개
            {' = '}
          </Text>
          <Text style={styles.costItemTotalValue}>
            ¥{cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
        </View>
      </View>
    );
  };

  // 옵션 항목 분리 (일반 / A레벨 전용)
  const regularOptionItems = optionItems.filter(item => !item.isAdminOnly);
  const adminOptionItems = optionItems.filter(item => item.isAdminOnly);

  // 인건비 항목 분리 (일반 / A레벨 전용)
  const regularLaborCostItems = laborCostItems.filter(item => !item.isAdminOnly);
  const adminLaborCostItems = laborCostItems.filter(item => item.isAdminOnly);

  // 일반 항목 총액 계산
  const regularOptionCost = regularOptionItems.reduce((sum, item) => sum + item.cost, 0);
  const regularLaborCost = regularLaborCostItems.reduce((sum, item) => sum + item.cost, 0);

  return (
    <View style={styles.container}>
      {/* 포장 및 가공 부자재 카드 */}
      <View style={[styles.section, styles.cardSection, styles.optionCard]}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>📦 포장 및 가공 부자재</Text>
          <View style={styles.cardHeaderRight}>
            <View style={styles.cardTotal}>
              <Text style={styles.cardTotalLabel}>총액:</Text>
              <Text style={styles.cardTotalValue}>
                ¥{totalOptionCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>
            {showEditButton ? (
              <TouchableOpacity
                style={styles.editButton}
                onPress={onEditClick}
                activeOpacity={0.7}
              >
                <Text style={styles.editButtonText}>✏️ 편집</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* 일반 항목 섹션 */}
        <View style={styles.subSection}>
          <Text style={styles.subSectionTitle}>일반 항목</Text>
          {regularOptionItems.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>일반 항목이 없습니다</Text>
            </View>
          ) : (
            regularOptionItems.map((item) =>
              renderCostItem(
                item,
                'option',
                onUpdateOptionItemName,
                onUpdateOptionItemUnitPrice,
                onUpdateOptionItemQuantity,
                onRemoveOptionItem,
                false
              )
            )
          )}
          {canWrite && !isReadMode && (
            <TouchableOpacity
              style={[styles.addItemButton, styles.addItemButtonRegular]}
              onPress={() => onAddOptionItem(false)}
            >
              <Text style={styles.addItemButtonText}>+ 일반 항목 추가</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* A레벨 전용 항목 섹션 */}
        {(isSuperAdmin || adminOptionItems.length > 0) && (
          <View style={[styles.subSection, styles.adminSubSection]}>
            <View style={styles.subSectionHeader}>
              <Text style={styles.subSectionTitle}>A레벨 관리자 전용</Text>
              <View style={styles.subSectionTotal}>
                <Text style={styles.subSectionTotalLabel}>소계:</Text>
                <Text style={styles.subSectionTotalValue}>
                  ¥{(totalOptionCost - regularOptionCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
            </View>
            {adminOptionItems.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>A레벨 전용 항목이 없습니다</Text>
              </View>
            ) : (
              adminOptionItems.map((item) =>
                renderCostItem(
                  item,
                  'option',
                  onUpdateOptionItemName,
                  onUpdateOptionItemUnitPrice,
                  onUpdateOptionItemQuantity,
                  onRemoveOptionItem,
                  true
                )
              )
            )}
            {canWrite && isSuperAdmin && !isReadMode && (
              <TouchableOpacity
                style={[styles.addItemButton, styles.addItemButtonAdmin]}
                onPress={() => onAddOptionItem(true)}
              >
                <Text style={styles.addItemButtonText}>+ A레벨 전용 항목 추가</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* 인건비 카드 */}
      <View style={[styles.section, styles.cardSection, styles.laborCard]}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>👷 인건비</Text>
          <View style={styles.cardHeaderRight}>
            <View style={styles.cardTotal}>
              <Text style={styles.cardTotalLabel}>총액:</Text>
              <Text style={styles.cardTotalValue}>
                ¥{totalLaborCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            </View>
            {showEditButton ? (
              <TouchableOpacity
                style={styles.editButton}
                onPress={onEditClick}
                activeOpacity={0.7}
              >
                <Text style={styles.editButtonText}>✏️ 편집</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* 일반 항목 섹션 */}
        <View style={styles.subSection}>
          <Text style={styles.subSectionTitle}>일반 항목</Text>
          {regularLaborCostItems.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>일반 항목이 없습니다</Text>
            </View>
          ) : (
            regularLaborCostItems.map((item) =>
              renderCostItem(
                item,
                'labor',
                onUpdateLaborCostItemName,
                onUpdateLaborCostItemUnitPrice,
                onUpdateLaborCostItemQuantity,
                onRemoveLaborCostItem,
                false
              )
            )
          )}
          {canWrite && !isReadMode && (
            <TouchableOpacity
              style={[styles.addItemButton, styles.addItemButtonRegular]}
              onPress={() => onAddLaborCostItem(false)}
            >
              <Text style={styles.addItemButtonText}>+ 일반 항목 추가</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* A레벨 전용 항목 섹션 */}
        {(isSuperAdmin || adminLaborCostItems.length > 0) && (
          <View style={[styles.subSection, styles.adminSubSection]}>
            <View style={styles.subSectionHeader}>
              <Text style={styles.subSectionTitle}>A레벨 관리자 전용</Text>
              <View style={styles.subSectionTotal}>
                <Text style={styles.subSectionTotalLabel}>소계:</Text>
                <Text style={styles.subSectionTotalValue}>
                  ¥{(totalLaborCost - regularLaborCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              </View>
            </View>
            {adminLaborCostItems.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>A레벨 전용 항목이 없습니다</Text>
              </View>
            ) : (
              adminLaborCostItems.map((item) =>
                renderCostItem(
                  item,
                  'labor',
                  onUpdateLaborCostItemName,
                  onUpdateLaborCostItemUnitPrice,
                  onUpdateLaborCostItemQuantity,
                  onRemoveLaborCostItem,
                  true
                )
              )
            )}
            {canWrite && isSuperAdmin && !isReadMode && (
              <TouchableOpacity
                style={[styles.addItemButton, styles.addItemButtonAdmin]}
                onPress={() => onAddLaborCostItem(true)}
              >
                <Text style={styles.addItemButtonText}>+ A레벨 전용 항목 추가</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // ScrollView 제거 - 부모 ScrollView 사용
  },
  // 카드 섹션
  section: {
    marginBottom: spacing.md,
  },
  cardSection: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  optionCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.green500,
  },
  laborCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.orange500,
  },
  cardHeader: {
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
  },
  cardHeaderRight: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
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
  cardTotalLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  cardTotalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  // 서브 섹션 (일반 / A레벨 전용)
  subSection: {
    marginBottom: spacing.md,
  },
  adminSubSection: {
    backgroundColor: colors.blue50,
    borderRadius: 8,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.blue200,
    marginTop: spacing.md,
  },
  subSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  subSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  subSectionTotal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  subSectionTotalLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  subSectionTotalValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.blue600,
  },
  emptyState: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  // 항목 카드
  costItemCard: {
    backgroundColor: colors.gray50,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  costItemCardAdmin: {
    backgroundColor: colors.blue100,
    borderColor: colors.blue300,
  },
  costItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  costItemTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.xs,
  },
  adminBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.blue600,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  costItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
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
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  readOnlyValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  // 실시간 계산 표시
  costCalculationRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
    gap: spacing.xs,
  },
  costCalculationText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  costItemTotalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  // 추가 버튼
  addItemButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  addItemButtonRegular: {
    backgroundColor: colors.gray100,
    borderWidth: 1,
    borderColor: colors.gray300,
  },
  addItemButtonAdmin: {
    backgroundColor: colors.blue100,
    borderWidth: 1,
    borderColor: colors.blue300,
  },
  addItemButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
});

