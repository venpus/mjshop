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
import { Button, Input } from '../../common';
import { NumberInput, DateInput } from '../common';
import { colors, spacing } from '../../../constants';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'react-native';
import { getFullImageUrl } from '../../../api/purchaseOrderApi';

interface ProductInfoEditModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: ProductInfoEditData) => Promise<void>;
  
  // 초기 데이터
  initialData: {
    productName: string;
    size: string;
    weight: string;
    packaging: number;
    packagingSize?: string;
    orderDate: string;
    deliveryDate: string;
    quantity: number;
    productImage?: string | null;
  };
  
  // 이미지 업로드 핸들러
  onMainImageUpload?: (uri: string) => Promise<void>;
}

export interface ProductInfoEditData {
  productName: string;
  size: string;
  weight: string;
  packaging: number;
  packagingSize?: string;
  orderDate: string;
  deliveryDate: string;
  quantity: number;
}

export function ProductInfoEditModal({
  visible,
  onClose,
  onSave,
  initialData,
  onMainImageUpload,
}: ProductInfoEditModalProps) {
  const [formData, setFormData] = useState<ProductInfoEditData>({
    productName: initialData.productName || '',
    size: initialData.size || '',
    weight: initialData.weight || '',
    packaging: initialData.packaging || 0,
    packagingSize: initialData.packagingSize || '',
    orderDate: initialData.orderDate || '',
    deliveryDate: initialData.deliveryDate || '',
    quantity: initialData.quantity || 0,
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(
    initialData.productImage ? getFullImageUrl(initialData.productImage) : null
  );

  // 초기 데이터가 변경되면 폼 데이터 업데이트
  useEffect(() => {
    setFormData({
      productName: initialData.productName || '',
      size: initialData.size || '',
      weight: initialData.weight || '',
      packaging: initialData.packaging || 0,
      packagingSize: initialData.packagingSize || '',
      orderDate: initialData.orderDate || '',
      deliveryDate: initialData.deliveryDate || '',
      quantity: initialData.quantity || 0,
    });
    setImageUri(initialData.productImage ? getFullImageUrl(initialData.productImage) : null);
    setHasChanges(false);
  }, [initialData, visible]);

  // 변경사항 감지
  useEffect(() => {
    const changed =
      formData.productName !== (initialData.productName || '') ||
      formData.size !== (initialData.size || '') ||
      formData.weight !== (initialData.weight || '') ||
      formData.packaging !== (initialData.packaging || 0) ||
      formData.packagingSize !== (initialData.packagingSize || '') ||
      formData.orderDate !== (initialData.orderDate || '') ||
      formData.deliveryDate !== (initialData.deliveryDate || '') ||
      formData.quantity !== (initialData.quantity || 0);
    setHasChanges(changed);
  }, [formData, initialData]);

  const handleImagePick = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('권한 필요', '이미지 접근 권한이 필요합니다.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0] && onMainImageUpload) {
        const uri = result.assets[0].uri;
        setImageUri(uri);
        await onMainImageUpload(uri);
      }
    } catch (error) {
      console.error('이미지 선택 오류:', error);
      Alert.alert('오류', '이미지 선택 중 오류가 발생했습니다.');
    }
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
                productName: initialData.productName || '',
                size: initialData.size || '',
                weight: initialData.weight || '',
                packaging: initialData.packaging || 0,
                packagingSize: initialData.packagingSize || '',
                orderDate: initialData.orderDate || '',
                deliveryDate: initialData.deliveryDate || '',
                quantity: initialData.quantity || 0,
              });
              setImageUri(initialData.productImage ? getFullImageUrl(initialData.productImage) : null);
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
      title="상품 정보 편집"
      height={0.85}
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
          {/* 이미지 업로드 */}
          {onMainImageUpload && (
            <View style={styles.imageSection}>
              <Text style={styles.sectionLabel}>상품 이미지</Text>
              <View style={styles.imageContainer}>
                {imageUri ? (
                  <Image source={{ uri: imageUri }} style={styles.image} />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Text style={styles.imagePlaceholderText}>이미지 없음</Text>
                  </View>
                )}
                <Button
                  title="이미지 선택"
                  onPress={handleImagePick}
                  variant="outline"
                  style={styles.imageButton}
                />
              </View>
            </View>
          )}

          {/* 상품명 */}
          <View style={styles.section}>
            <Input
              label="상품명"
              value={formData.productName}
              onChangeText={(value) => setFormData({ ...formData, productName: value })}
              placeholder="상품명을 입력하세요"
            />
          </View>

          {/* 사이즈, 무게, 소포장 */}
          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <Input
                label="사이즈"
                value={formData.size}
                onChangeText={(value) => setFormData({ ...formData, size: value })}
                placeholder="30x20x15"
              />
            </View>
            <View style={styles.halfWidth}>
              <Input
                label="무게 (g)"
                value={formData.weight}
                onChangeText={(value) => setFormData({ ...formData, weight: value })}
                placeholder="500"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <NumberInput
                label="소포장"
                value={formData.packaging}
                onChange={(value) => setFormData({ ...formData, packaging: value })}
                min={0}
                allowDecimals={false}
              />
            </View>
            <View style={styles.halfWidth}>
              <Input
                label="포장박스"
                value={formData.packagingSize || ''}
                onChangeText={(value) => setFormData({ ...formData, packagingSize: value })}
                placeholder="30x20x15cm"
              />
            </View>
          </View>

          {/* 날짜 정보 */}
          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <DateInput
                label="발주일"
                value={formData.orderDate}
                onChange={(value) => setFormData({ ...formData, orderDate: value })}
                displayFormat="korean"
              />
            </View>
            <View style={styles.halfWidth}>
              <DateInput
                label="납기일"
                value={formData.deliveryDate}
                onChange={(value) => setFormData({ ...formData, deliveryDate: value })}
              />
            </View>
          </View>

          {/* 수량 */}
          <View style={styles.section}>
            <NumberInput
              label="수량"
              value={formData.quantity}
              onChange={(value) => setFormData({ ...formData, quantity: value })}
              min={0}
              allowDecimals={false}
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
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  imageSection: {
    marginBottom: spacing.md,
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  image: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  imagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 8,
    backgroundColor: colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  imagePlaceholderText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  imageButton: {
    width: 120,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
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

