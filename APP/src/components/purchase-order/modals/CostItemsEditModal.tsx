import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { BottomSheet } from '../../common/BottomSheet';
import { Button, Input } from '../../common';
import { NumberInput } from '../common';
import { colors, spacing } from '../../../constants';
import type { LaborCostItem } from '../tabs/CostPaymentTab';

interface CostItemsEditModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: CostItemsEditData) => Promise<void>;
  
  // 초기 데이터
  initialData: {
    optionItems: LaborCostItem[];
    laborCostItems: LaborCostItem[];
  };
  
  // 권한
  isSuperAdmin?: boolean;
}

export interface CostItemsEditData {
  optionItems: LaborCostItem[];
  laborCostItems: LaborCostItem[];
}

export function CostItemsEditModal({
  visible,
  onClose,
  onSave,
  initialData,
  isSuperAdmin = false,
}: CostItemsEditModalProps) {
  const [formData, setFormData] = useState<CostItemsEditData>({
    optionItems: [...initialData.optionItems],
    laborCostItems: [...initialData.laborCostItems],
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // 초기 데이터가 변경되면 폼 데이터 업데이트
  useEffect(() => {
    setFormData({
      optionItems: [...initialData.optionItems],
      laborCostItems: [...initialData.laborCostItems],
    });
    setHasChanges(false);
  }, [initialData, visible]);

  // 변경사항 감지
  useEffect(() => {
    const changed =
      JSON.stringify(formData.optionItems) !== JSON.stringify(initialData.optionItems) ||
      JSON.stringify(formData.laborCostItems) !== JSON.stringify(initialData.laborCostItems);
    setHasChanges(changed);
  }, [formData, initialData]);

  // 옵션 항목 관리
  const handleUpdateOptionItemName = (id: string, name: string) => {
    setFormData({
      ...formData,
      optionItems: formData.optionItems.map(item =>
        item.id === id ? { ...item, name, cost: item.unit_price * item.quantity } : item
      ),
    });
  };

  const handleUpdateOptionItemUnitPrice = (id: string, unitPrice: number) => {
    setFormData({
      ...formData,
      optionItems: formData.optionItems.map(item =>
        item.id === id ? { ...item, unit_price: unitPrice, cost: unitPrice * item.quantity } : item
      ),
    });
  };

  const handleUpdateOptionItemQuantity = (id: string, quantity: number) => {
    setFormData({
      ...formData,
      optionItems: formData.optionItems.map(item =>
        item.id === id ? { ...item, quantity, cost: item.unit_price * quantity } : item
      ),
    });
  };

  const handleRemoveOptionItem = (id: string) => {
    Alert.alert(
      '항목 삭제',
      '이 항목을 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => {
            setFormData({
              ...formData,
              optionItems: formData.optionItems.filter(item => item.id !== id),
            });
          },
        },
      ]
    );
  };

  const handleAddOptionItem = (isAdminOnly: boolean = false) => {
    const newId = `temp_${Date.now()}_${Math.random()}`;
    const newItem: LaborCostItem = {
      id: newId,
      name: '',
      unit_price: 0,
      quantity: 0,
      cost: 0,
      isAdminOnly,
    };
    setFormData({
      ...formData,
      optionItems: [...formData.optionItems, newItem],
    });
  };

  // 인건비 항목 관리
  const handleUpdateLaborCostItemName = (id: string, name: string) => {
    setFormData({
      ...formData,
      laborCostItems: formData.laborCostItems.map(item =>
        item.id === id ? { ...item, name, cost: item.unit_price * item.quantity } : item
      ),
    });
  };

  const handleUpdateLaborCostItemUnitPrice = (id: string, unitPrice: number) => {
    setFormData({
      ...formData,
      laborCostItems: formData.laborCostItems.map(item =>
        item.id === id ? { ...item, unit_price: unitPrice, cost: unitPrice * item.quantity } : item
      ),
    });
  };

  const handleUpdateLaborCostItemQuantity = (id: string, quantity: number) => {
    setFormData({
      ...formData,
      laborCostItems: formData.laborCostItems.map(item =>
        item.id === id ? { ...item, quantity, cost: item.unit_price * quantity } : item
      ),
    });
  };

  const handleRemoveLaborCostItem = (id: string) => {
    Alert.alert(
      '항목 삭제',
      '이 항목을 삭제하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => {
            setFormData({
              ...formData,
              laborCostItems: formData.laborCostItems.filter(item => item.id !== id),
            });
          },
        },
      ]
    );
  };

  const handleAddLaborCostItem = (isAdminOnly: boolean = false) => {
    const newId = `temp_${Date.now()}_${Math.random()}`;
    const newItem: LaborCostItem = {
      id: newId,
      name: '',
      unit_price: 0,
      quantity: 0,
      cost: 0,
      isAdminOnly,
    };
    setFormData({
      ...formData,
      laborCostItems: [...formData.laborCostItems, newItem],
    });
  };

  const renderCostItem = (
    item: LaborCostItem,
    type: 'option' | 'labor',
    isAdminOnly: boolean = false
  ) => {
    const cost = item.unit_price * item.quantity;
    const cardStyle = isAdminOnly 
      ? [styles.costItemCard, styles.costItemCardAdmin] 
      : styles.costItemCard;

    const handlers = type === 'option' 
      ? {
          onUpdateName: handleUpdateOptionItemName,
          onUpdateUnitPrice: handleUpdateOptionItemUnitPrice,
          onUpdateQuantity: handleUpdateOptionItemQuantity,
          onRemove: handleRemoveOptionItem,
        }
      : {
          onUpdateName: handleUpdateLaborCostItemName,
          onUpdateUnitPrice: handleUpdateLaborCostItemUnitPrice,
          onUpdateQuantity: handleUpdateLaborCostItemQuantity,
          onRemove: handleRemoveLaborCostItem,
        };

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
          <TouchableOpacity
            onPress={() => handlers.onRemove(item.id)}
            style={styles.removeButton}
          >
            <Text style={styles.removeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <Input
          label="항목명"
          value={item.name}
          onChangeText={(text) => handlers.onUpdateName(item.id, text)}
          placeholder="항목명을 입력하세요"
          containerStyle={styles.inputContainer}
        />
        <View style={styles.costItemRow}>
          <NumberInput
            label="단가"
            value={item.unit_price}
            onChange={(value) => handlers.onUpdateUnitPrice(item.id, value)}
            min={0}
            containerStyle={[styles.inputContainer, styles.halfWidth]}
          />
          <NumberInput
            label="수량"
            value={item.quantity}
            onChange={(value) => handlers.onUpdateQuantity(item.id, value)}
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

  const handleSave = async () => {
    if (isSaving) return;
    
    setIsSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error: any) {
      Alert.alert('저장 오류', error.message || '저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      Alert.alert(
        '변경사항이 있습니다',
        '저장하지 않고 닫으시겠습니까?',
        [
          { text: '취소', style: 'cancel' },
          {
            text: '닫기',
            style: 'destructive',
            onPress: () => {
              setFormData({
                optionItems: [...initialData.optionItems],
                laborCostItems: [...initialData.laborCostItems],
              });
              setHasChanges(false);
              onClose();
            },
          },
        ]
      );
    } else {
      onClose();
    }
  };

  // 옵션 항목 분리
  const regularOptionItems = formData.optionItems.filter(item => !item.isAdminOnly);
  const adminOptionItems = formData.optionItems.filter(item => item.isAdminOnly);

  // 인건비 항목 분리
  const regularLaborCostItems = formData.laborCostItems.filter(item => !item.isAdminOnly);
  const adminLaborCostItems = formData.laborCostItems.filter(item => item.isAdminOnly);

  return (
    <BottomSheet
      visible={visible}
      onClose={handleCancel}
      title="비용 항목 편집"
      height={0.9}
    >
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
        >
          {/* 포장 및 가공 부자재 */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>📦 포장 및 가공 부자재</Text>
            </View>
            
            {/* 일반 항목 섹션 */}
            <View style={styles.subSection}>
              <Text style={styles.subSectionTitle}>일반 항목</Text>
              {regularOptionItems.map((item) =>
                renderCostItem(item, 'option', false)
              )}
              <TouchableOpacity
                style={[styles.addItemButton, styles.addItemButtonRegular]}
                onPress={() => handleAddOptionItem(false)}
              >
                <Text style={styles.addItemButtonText}>+ 일반 항목 추가</Text>
              </TouchableOpacity>
            </View>

            {/* A레벨 전용 항목 섹션 */}
            {isSuperAdmin && (
              <View style={[styles.subSection, styles.adminSubSection]}>
                <Text style={styles.subSectionTitle}>A레벨 관리자 전용</Text>
                {adminOptionItems.map((item) =>
                  renderCostItem(item, 'option', true)
                )}
                <TouchableOpacity
                  style={[styles.addItemButton, styles.addItemButtonAdmin]}
                  onPress={() => handleAddOptionItem(true)}
                >
                  <Text style={styles.addItemButtonText}>+ A레벨 전용 항목 추가</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* 인건비 */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>👷 인건비</Text>
            </View>
            
            {/* 일반 항목 섹션 */}
            <View style={styles.subSection}>
              <Text style={styles.subSectionTitle}>일반 항목</Text>
              {regularLaborCostItems.map((item) =>
                renderCostItem(item, 'labor', false)
              )}
              <TouchableOpacity
                style={[styles.addItemButton, styles.addItemButtonRegular]}
                onPress={() => handleAddLaborCostItem(false)}
              >
                <Text style={styles.addItemButtonText}>+ 일반 항목 추가</Text>
              </TouchableOpacity>
            </View>

            {/* A레벨 전용 항목 섹션 */}
            {isSuperAdmin && (
              <View style={[styles.subSection, styles.adminSubSection]}>
                <Text style={styles.subSectionTitle}>A레벨 관리자 전용</Text>
                {adminLaborCostItems.map((item) =>
                  renderCostItem(item, 'labor', true)
                )}
                <TouchableOpacity
                  style={[styles.addItemButton, styles.addItemButtonAdmin]}
                  onPress={() => handleAddLaborCostItem(true)}
                >
                  <Text style={styles.addItemButtonText}>+ A레벨 전용 항목 추가</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>

        {/* 하단 버튼 */}
        <View style={styles.footer}>
          <Button
            title="취소"
            onPress={handleCancel}
            variant="outline"
            style={styles.cancelButton}
            disabled={isSaving}
          />
          <Button
            title={isSaving ? '저장 중...' : '저장'}
            onPress={handleSave}
            variant="primary"
            style={styles.saveButton}
            disabled={isSaving || !hasChanges}
          />
        </View>
      </KeyboardAvoidingView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  subSection: {
    marginBottom: spacing.md,
  },
  subSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  adminSubSection: {
    backgroundColor: colors.blue50,
    borderRadius: 8,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.blue200,
    marginTop: spacing.md,
  },
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
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
    backgroundColor: colors.white,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 1,
  },
});

