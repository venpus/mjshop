/**
 * ProductInfoStep 컴포넌트
 * 발주 생성 Step 1: 상품 정보 입력
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
} from 'react-native';
import { Input, Button } from '../common';
import { colors, spacing } from '../../constants';
import * as ImagePicker from 'expo-image-picker';

export interface ProductInfoData {
  product_name: string;
  product_name_chinese: string;
  product_category: string;
  product_size: string;
  product_weight: string;
  mainImageFile: { uri: string; type: string; name: string } | null;
}

interface ProductInfoStepProps {
  data: ProductInfoData;
  onChange: (data: ProductInfoData) => void;
  errors?: Partial<Record<keyof ProductInfoData, string>>;
}

const CATEGORY_OPTIONS = ['봉제', '키링', '피규어', '잡화'] as const;

export function ProductInfoStep({
  data,
  onChange,
  errors = {},
}: ProductInfoStepProps) {
  const handleChange = (field: keyof ProductInfoData, value: string) => {
    onChange({
      ...data,
      [field]: value,
    });
  };

  const handleImagePick = async () => {
    try {
      // 권한 요청
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          '권한 필요',
          '이미지를 선택하려면 사진 라이브러리 접근 권한이 필요합니다.\n설정에서 권한을 허용해주세요.'
        );
        return;
      }

      // 이미지 선택
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        onChange({
          ...data,
          mainImageFile: {
            uri: asset.uri,
            type: 'image/jpeg',
            name: 'main-image.jpg',
          },
        });
      }
    } catch (error) {
      console.error('이미지 선택 오류:', error);
      Alert.alert('오류', '이미지를 선택하는 중 오류가 발생했습니다.');
    }
  };

  const handleRemoveImage = () => {
    onChange({
      ...data,
      mainImageFile: null,
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>상품 정보</Text>

        {/* 메인 이미지 업로드 */}
        <View style={styles.imageSection}>
          <Text style={styles.label}>메인 이미지</Text>
          <View style={styles.imageContainer}>
            {data.mainImageFile ? (
              <View style={styles.imageWrapper}>
                <Image
                  source={{ uri: data.mainImageFile.uri }}
                  style={styles.image}
                  resizeMode="cover"
                />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={handleRemoveImage}
                >
                  <Text style={styles.removeImageText}>✕</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.imagePlaceholder}
                onPress={handleImagePick}
              >
                <Text style={styles.imagePlaceholderText}>📷</Text>
                <Text style={styles.imagePlaceholderLabel}>이미지 업로드</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* 상품명 (한국어) */}
        <Input
          label="상품명 (한국어)"
          value={data.product_name}
          onChangeText={(text) => handleChange('product_name', text)}
          placeholder="한국어 상품명을 입력하세요"
          error={errors.product_name}
          containerStyle={styles.inputContainer}
        />

        {/* 상품명 (중국어) */}
        <Input
          label="상품명 (중국어)"
          value={data.product_name_chinese}
          onChangeText={(text) => handleChange('product_name_chinese', text)}
          placeholder="중국어 상품명을 입력하세요"
          error={errors.product_name_chinese}
          containerStyle={styles.inputContainer}
        />

        {/* 카테고리 */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>카테고리 *</Text>
          <View style={styles.categoryContainer}>
            {CATEGORY_OPTIONS.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryButton,
                  data.product_category === category && styles.categoryButtonActive,
                ]}
                onPress={() => handleChange('product_category', category)}
              >
                <Text
                  style={[
                    styles.categoryButtonText,
                    data.product_category === category && styles.categoryButtonTextActive,
                  ]}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {errors.product_category && (
            <Text style={styles.errorText}>{errors.product_category}</Text>
          )}
        </View>

        {/* 사이즈 */}
        <Input
          label="상품 크기"
          value={data.product_size}
          onChangeText={(text) => handleChange('product_size', text)}
          placeholder="예: 5x3x2"
          error={errors.product_size}
          containerStyle={styles.inputContainer}
        />

        {/* 무게 */}
        <Input
          label="상품 무게"
          value={data.product_weight}
          onChangeText={(text) => handleChange('product_weight', text)}
          placeholder="예: 50g"
          error={errors.product_weight}
          containerStyle={styles.inputContainer}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray50,
  },
  content: {
    padding: spacing.md,
  },
  section: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray900,
    marginBottom: spacing.md,
  },
  imageSection: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.gray700,
    marginBottom: spacing.sm,
  },
  imageContainer: {
    alignItems: 'center',
  },
  imageWrapper: {
    position: 'relative',
    width: 120,
    height: 120,
  },
  image: {
    width: 120,
    height: 120,
    borderRadius: 8,
    backgroundColor: colors.gray100,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  imagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 8,
    backgroundColor: colors.gray100,
    borderWidth: 2,
    borderColor: colors.gray300,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    fontSize: 32,
    marginBottom: spacing.xs,
  },
  imagePlaceholderLabel: {
    fontSize: 12,
    color: colors.gray600,
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.gray100,
    borderWidth: 1,
    borderColor: colors.gray300,
  },
  categoryButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryButtonText: {
    fontSize: 14,
    color: colors.gray700,
    fontWeight: '500',
  },
  categoryButtonTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 12,
    color: colors.danger,
    marginTop: spacing.xs,
  },
});

