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
import { NumberInput, Select } from '../common';
import { colors, spacing } from '../../../constants';

interface UnitPriceEditModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: UnitPriceEditData) => Promise<void>;
  
  // 초기 데이터
  initialData: {
    unitPrice: number;
    backMargin: number;
    commissionType: string;
    commissionRate: number;
  };
  
  // 권한
  isSuperAdmin?: boolean;
}

export interface UnitPriceEditData {
  unitPrice: number;
  backMargin: number;
  commissionType: string;
  commissionRate: number;
}

export function UnitPriceEditModal({
  visible,
  onClose,
  onSave,
  initialData,
  isSuperAdmin = false,
}: UnitPriceEditModalProps) {
  const [formData, setFormData] = useState<UnitPriceEditData>({
    unitPrice: initialData.unitPrice || 0,
    backMargin: initialData.backMargin || 0,
    commissionType: initialData.commissionType || '',
    commissionRate: initialData.commissionRate || 0,
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // 디버깅: visible 상태 확인
  useEffect(() => {
    if (visible) {
      console.log('UnitPriceEditModal: visible = true');
    }
  }, [visible]);

  // 초기 데이터가 변경되면 폼 데이터 업데이트
  useEffect(() => {
    setFormData({
      unitPrice: initialData.unitPrice || 0,
      backMargin: initialData.backMargin || 0,
      commissionType: initialData.commissionType || '',
      commissionRate: initialData.commissionRate || 0,
    });
    setHasChanges(false);
  }, [initialData, visible]);

  // 변경사항 감지
  useEffect(() => {
    const changed =
      formData.unitPrice !== (initialData.unitPrice || 0) ||
      formData.backMargin !== (initialData.backMargin || 0) ||
      formData.commissionType !== (initialData.commissionType || '') ||
      formData.commissionRate !== (initialData.commissionRate || 0);
    setHasChanges(changed);
  }, [formData, initialData]);

  const commissionOptions = [
    { label: '5%', value: '5' },
    { label: '10%', value: '10' },
    { label: '15%', value: '15' },
    { label: '20%', value: '20' },
    { label: '25%', value: '25' },
    { label: '30%', value: '30' },
  ];

  const handleCommissionTypeChange = (value: string) => {
    setFormData({
      ...formData,
      commissionType: value,
      commissionRate: parseFloat(value) || 0,
    });
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
                unitPrice: initialData.unitPrice || 0,
                backMargin: initialData.backMargin || 0,
                commissionType: initialData.commissionType || '',
                commissionRate: initialData.commissionRate || 0,
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
      title="단가 정보 편집"
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
          {/* 단가 정보 */}
          <View style={styles.section}>
            {isSuperAdmin && (
              <>
                <NumberInput
                  label="기본단가"
                  value={formData.unitPrice}
                  onChange={(value) => setFormData({ ...formData, unitPrice: value })}
                  min={0}
                />
                <NumberInput
                  label="추가단가 (백마진)"
                  value={formData.backMargin}
                  onChange={(value) => setFormData({ ...formData, backMargin: value })}
                  min={0}
                />
              </>
            )}
            <Select
              label="수수료율"
              value={formData.commissionType}
              options={commissionOptions}
              onValueChange={handleCommissionTypeChange}
              placeholder="수수료율을 선택하세요"
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

