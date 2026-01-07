import React, { useState, useEffect } from 'react';
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
import { NumberInput, DateInput } from '../common';
import { colors, spacing } from '../../../constants';

interface PaymentEditModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: PaymentEditData) => Promise<void>;
  
  // 초기 데이터
  initialData: {
    advancePaymentRate: number;
    advancePaymentDate: string;
    balancePaymentDate: string;
  };
}

export interface PaymentEditData {
  advancePaymentRate: number;
  advancePaymentDate: string;
  balancePaymentDate: string;
}

export function PaymentEditModal({
  visible,
  onClose,
  onSave,
  initialData,
}: PaymentEditModalProps) {
  const [formData, setFormData] = useState<PaymentEditData>({
    advancePaymentRate: initialData.advancePaymentRate || 0,
    advancePaymentDate: initialData.advancePaymentDate || '',
    balancePaymentDate: initialData.balancePaymentDate || '',
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // 초기 데이터가 변경되면 폼 데이터 업데이트
  useEffect(() => {
    setFormData({
      advancePaymentRate: initialData.advancePaymentRate || 0,
      advancePaymentDate: initialData.advancePaymentDate || '',
      balancePaymentDate: initialData.balancePaymentDate || '',
    });
    setHasChanges(false);
  }, [initialData, visible]);

  // 변경사항 감지
  useEffect(() => {
    const changed =
      formData.advancePaymentRate !== (initialData.advancePaymentRate || 0) ||
      formData.advancePaymentDate !== (initialData.advancePaymentDate || '') ||
      formData.balancePaymentDate !== (initialData.balancePaymentDate || '');
    setHasChanges(changed);
  }, [formData, initialData]);

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
                advancePaymentRate: initialData.advancePaymentRate || 0,
                advancePaymentDate: initialData.advancePaymentDate || '',
                balancePaymentDate: initialData.balancePaymentDate || '',
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
      title="결제 정보 편집"
      height={0.6}
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
          {/* 결제 정보 */}
          <View style={styles.section}>
            <View style={styles.paymentRow}>
              <View style={styles.halfWidth}>
                <Text style={styles.paymentColumnTitle}>선금</Text>
                <NumberInput
                  label="선금 비율 (%)"
                  value={formData.advancePaymentRate}
                  onChange={(value) => setFormData({ ...formData, advancePaymentRate: value })}
                  min={0}
                  max={100}
                />
                <DateInput
                  label="선금일"
                  value={formData.advancePaymentDate}
                  onChange={(value) => setFormData({ ...formData, advancePaymentDate: value })}
                />
              </View>
              <View style={styles.halfWidth}>
                <Text style={styles.paymentColumnTitle}>잔금</Text>
                <DateInput
                  label="잔금일"
                  value={formData.balancePaymentDate}
                  onChange={(value) => setFormData({ ...formData, balancePaymentDate: value })}
                />
              </View>
            </View>
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
  paymentRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  paymentColumnTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  halfWidth: {
    flex: 1,
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

