/**
 * ImageUploadButton 컴포넌트
 * 이미지 업로드를 위한 버튼 컴포넌트
 */

import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing } from '../../../constants';

export interface ImageFile {
  uri: string;
  type: string;
  name: string;
}

export interface ImageUploadButtonProps {
  label?: string;
  images: ImageFile[];
  onImagesChange: (images: ImageFile[]) => void;
  multiple?: boolean;
  maxImages?: number;
}

export function ImageUploadButton({
  label = '이미지 선택',
  images,
  onImagesChange,
  multiple = false,
  maxImages = 10,
}: ImageUploadButtonProps) {
  const handleImagePick = async () => {
    try {
      // 권한 요청
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('권한 필요', '이미지를 선택하려면 미디어 라이브러리 권한이 필요합니다.');
        return;
      }

      // 이미지 선택
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: multiple,
        quality: 0.8,
        allowsEditing: false,
      });

      if (result.canceled) {
        return;
      }

      // 선택된 이미지를 ImageFile 형식으로 변환
      const selectedImages: ImageFile[] = result.assets.map((asset) => ({
        uri: asset.uri,
        type: 'image/jpeg',
        name: asset.fileName || `image-${Date.now()}.jpg`,
      }));

      // 최대 개수 제한
      const newImages = multiple
        ? [...images, ...selectedImages].slice(0, maxImages)
        : selectedImages.slice(0, 1);

      onImagesChange(newImages);
    } catch (error: any) {
      Alert.alert('오류', error.message || '이미지를 선택하는데 실패했습니다.');
    }
  };

  const handleRemoveImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
  };

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      
      <TouchableOpacity
        style={styles.uploadButton}
        onPress={handleImagePick}
        activeOpacity={0.7}
      >
        <Text style={styles.uploadButtonText}>📷 {label}</Text>
      </TouchableOpacity>

      {images.length > 0 ? (
        <View style={styles.imageList}>
          {images.map((image, index) => (
            <View key={index} style={styles.imageItem}>
              <Image source={{ uri: image.uri }} style={styles.image} resizeMode="cover" />
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemoveImage(index)}
              >
                <Text style={styles.removeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.gray700,
    marginBottom: spacing.sm,
  },
  uploadButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  uploadButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  imageList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  imageItem: {
    position: 'relative',
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.gray100,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
});

