import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { BottomSheet } from '../../common/BottomSheet';
import { Button } from '../../common';
import { NumberInput } from '../common';
import { colors, spacing } from '../../../constants';

interface ShippingEditModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: ShippingEditData) => Promise<void>;
  
  // 초기 데이터
  initialData: {
    shippingCost: number;
    warehouseShippingCost: number;
  };
}

export interface ShippingEditData {
  shippingCost: number;
  warehouseShippingCost: number;
}

export function ShippingEditModal({
  visible,
  onClose,
  onSave,
  initialData,
}: ShippingEditModalProps) {
  const [formData, setFormData] = useState<ShippingEditData>({
    shippingCost: initialData.shippingCost || 0,
    warehouseShippingCost: initialData.warehouseShippingCost || 0,
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  // 초기 데이터 스냅샷 저장 (변경사항 감지용)
  const initialDataRef = useRef<ShippingEditData>({
    shippingCost: initialData.shippingCost || 0,
    warehouseShippingCost: initialData.warehouseShippingCost || 0,
  });

  // 초기 데이터가 변경되면 폼 데이터 업데이트
  useEffect(() => {
    const normalizedInitialData: ShippingEditData = {
      shippingCost: initialData.shippingCost || 0,
      warehouseShippingCost: initialData.warehouseShippingCost || 0,
    };
    
    setFormData(normalizedInitialData);
    initialDataRef.current = normalizedInitialData;
    setHasChanges(false);
  }, [initialData, visible]);

  // 변경사항 감지
  useEffect(() => {
    const normalizeNumber = (val: number | null | undefined): number => Number(val || 0);
    
    const initial = initialDataRef.current;
    const changed =
      normalizeNumber(formData.shippingCost) !== normalizeNumber(initial.shippingCost) ||
      normalizeNumber(formData.warehouseShippingCost) !== normalizeNumber(initial.warehouseShippingCost);
    setHasChanges(changed);
  }, [formData]);

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
                shippingCost: initialData.shippingCost || 0,
                warehouseShippingCost: initialData.warehouseShippingCost || 0,
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

  return (
    <BottomSheet
      visible={visible}
      onClose={handleCancel}
      title="운송비 편집"
      height={0.5}
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
          {/* 운송비 정보 */}
          <View style={styles.section}>
            <NumberInput
              label="업체 배송비"
              value={formData.shippingCost}
              onChange={(value) => setFormData({ ...formData, shippingCost: value })}
              min={0}
            />
            <NumberInput
              label="창고 배송비"
              value={formData.warehouseShippingCost}
              onChange={(value) => setFormData({ ...formData, warehouseShippingCost: value })}
              min={0}
            />
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
    marginBottom: spacing.md,
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

