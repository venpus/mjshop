import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
} from 'react-native';
import { colors, spacing } from '../../constants';
import { DateInput, NumberInput } from './common';
import { Input } from '../common';
import { getFullImageUrl } from '../../api/purchaseOrderApi';
import * as ImagePicker from 'expo-image-picker';

interface ProductInfoSectionProps {
  // 상품 기본 정보
  productName: string;
  productNameChinese?: string | null;
  poNumber: string;
  productImage?: string | null;
  
  // 상품 상세
  size: string;
  weight: string;
  packaging: number;
  packagingSize?: string;
  finalUnitPrice?: number;
  
  // 날짜 정보
  orderDate: string;
  deliveryDate: string;
  quantity: number;
  
  // 상태
  isOrderConfirmed: boolean;
  orderStatus?: string;
  
  // 핸들러
  onProductNameChange?: (value: string) => void;
  onSizeChange?: (value: string) => void;
  onWeightChange?: (value: string) => void;
  onPackagingChange?: (value: number) => void;
  onPackagingSizeChange?: (value: string) => void;
  onOrderDateChange?: (value: string) => void;
  onDeliveryDateChange?: (value: string) => void;
  onQuantityChange?: (value: number) => void;
  onOrderConfirmedChange?: (value: boolean) => void;
  onCancelOrder?: () => void;
  onMainImageUpload?: (uri: string) => Promise<void>;
  onPhotoGalleryClick?: () => void;
  onEditClick?: () => void; // 편집 버튼 클릭 핸들러
  
  // 편집 모드
  isEditable?: boolean;
  userLevel?: string;
  canWrite?: boolean;
  mode?: 'read' | 'edit'; // 읽기 모드 또는 편집 모드
}

export function ProductInfoSection({
  productName,
  productNameChinese,
  poNumber,
  productImage,
  size,
  weight,
  packaging,
  packagingSize,
  finalUnitPrice,
  orderDate,
  deliveryDate,
  quantity,
  isOrderConfirmed,
  orderStatus,
  onProductNameChange,
  onSizeChange,
  onWeightChange,
  onPackagingChange,
  onPackagingSizeChange,
  onOrderDateChange,
  onDeliveryDateChange,
  onQuantityChange,
  onOrderConfirmedChange,
  onCancelOrder,
  onMainImageUpload,
  onPhotoGalleryClick,
  onEditClick,
  isEditable = false,
  userLevel,
  canWrite = true,
  mode = 'read', // 기본값은 읽기 모드
}: ProductInfoSectionProps) {
  const [imageModalVisible, setImageModalVisible] = React.useState(false);
  const isSuperAdmin = userLevel === 'A-SuperAdmin';
  const isC0Level = userLevel === 'C0: 한국Admin';
  
  const handleImageClick = () => {
    if (productImage) {
      setImageModalVisible(true);
    } else if (onMainImageUpload && isEditable) {
      handleImagePick();
    }
  };

  const handleImagePick = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        alert('이미지 접근 권한이 필요합니다.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0] && onMainImageUpload) {
        await onMainImageUpload(result.assets[0].uri);
      }
    } catch (error) {
      console.error('이미지 선택 오류:', error);
      alert('이미지 선택 중 오류가 발생했습니다.');
    }
  };

  const imageUrl = productImage ? getFullImageUrl(productImage) : null;

  const isReadMode = mode === 'read';
  const showEditButton = isReadMode && canWrite && onEditClick;

  return (
    <View style={styles.container}>
      {/* 헤더 - 컴팩트 버전 */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.productName} numberOfLines={1}>
            {productName || '(상품명 없음)'}
            {productNameChinese ? ` (${productNameChinese})` : ''}
          </Text>
          <Text style={styles.poNumber}>({poNumber})</Text>
          {onPhotoGalleryClick ? (
            <TouchableOpacity
              style={styles.photoGalleryButton}
              onPress={onPhotoGalleryClick}
            >
              <Text style={styles.photoGalleryButtonText}>📷</Text>
            </TouchableOpacity>
          ) : null}
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

        {/* 발주 컨펌 및 취소 버튼 - 컴팩트 버전 */}
        {!isC0Level && (
          <View style={styles.actionRow}>
            {onOrderConfirmedChange ? (
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  isOrderConfirmed ? styles.confirmButtonActive : styles.confirmButtonInactive,
                  orderStatus === '취소됨' ? styles.confirmButtonDisabled : null,
                ]}
                onPress={() => orderStatus !== '취소됨' && onOrderConfirmedChange(!isOrderConfirmed)}
                disabled={orderStatus === '취소됨'}
              >
                <Text style={[
                  styles.confirmButtonText,
                  isOrderConfirmed ? styles.confirmButtonTextActive : styles.confirmButtonTextInactive,
                ]}>
                  {isOrderConfirmed ? '✓ 컨펌' : '○ 대기'}
                </Text>
              </TouchableOpacity>
            ) : null}
            
            {onCancelOrder && orderStatus !== '취소됨' ? (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onCancelOrder}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}
      </View>

      {/* 메인 컨텐츠 - 컴팩트 버전 */}
      <View style={styles.content}>
        {/* 이미지 */}
        <TouchableOpacity
          style={styles.imageContainer}
          onPress={handleImageClick}
          activeOpacity={0.8}
        >
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.image} />
          ) : (
            <View style={styles.imagePlaceholder}>
              {isEditable && onMainImageUpload ? (
                <Text style={styles.imagePlaceholderText}>업로드</Text>
              ) : (
                <Text style={styles.imagePlaceholderText}>없음</Text>
              )}
            </View>
          )}
        </TouchableOpacity>

        {/* 정보 영역 - 3열 그리드 (읽기 모드만) */}
        <View style={styles.infoContainer}>
          {/* 첫 번째 행: 사이즈, 무게, 소포장 */}
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>사이즈</Text>
              <Text style={styles.infoValue} numberOfLines={1}>{size ? `${size} cm` : '-'}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>무게</Text>
              <Text style={styles.infoValue} numberOfLines={1}>{weight ? `${weight} g` : '-'}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>소포장</Text>
              <Text style={styles.infoValue} numberOfLines={1}>{packaging ? `${packaging}개` : '-'}</Text>
            </View>
          </View>
          
          {/* 두 번째 행: 포장박스, 발주일, 납기일 */}
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>포장박스</Text>
              <Text style={styles.infoValue} numberOfLines={1}>{packagingSize || '-'}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>발주일</Text>
              <Text style={styles.infoValue} numberOfLines={1}>{orderDate || '-'}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>납기일</Text>
              <Text style={styles.infoValue} numberOfLines={1}>{deliveryDate || '-'}</Text>
            </View>
          </View>

          {/* 세 번째 행: 수량, 최종 단가 */}
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>수량</Text>
              <Text style={styles.infoValue} numberOfLines={1}>{quantity || '-'}</Text>
            </View>
            {finalUnitPrice !== undefined && (
              <View style={[styles.infoItem, styles.finalPriceItem]}>
                <Text style={styles.infoLabel}>최종단가</Text>
                <View style={styles.finalPriceBadge}>
                  <Text style={styles.finalPriceValue}>
                    ¥{finalUnitPrice.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* 이미지 모달 */}
      <Modal
        visible={imageModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setImageModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setImageModalVisible(false)}
        >
          <View style={styles.modalContent}>
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.modalImage} resizeMode="contain" />
            ) : null}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    marginHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    marginBottom: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  productName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  productNameInput: {
    flex: 1,
    minWidth: 120,
  },
  poNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  photoGalleryButton: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    backgroundColor: colors.purple50,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.purple200,
    minWidth: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoGalleryButtonText: {
    fontSize: 16,
  },
  editButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.purple500,
    borderRadius: 6,
    marginLeft: spacing.xs,
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  confirmButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1.5,
  },
  confirmButtonActive: {
    backgroundColor: colors.green100,
    borderColor: colors.green500,
  },
  confirmButtonInactive: {
    backgroundColor: colors.orange100,
    borderColor: colors.orange500,
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  confirmButtonTextActive: {
    color: colors.green800,
  },
  confirmButtonTextInactive: {
    color: colors.orange800,
  },
  cancelButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: colors.red600,
    borderRadius: 6,
  },
  cancelButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  content: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  imageContainer: {
    width: 100,
    height: 100,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: colors.gray100,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.gray100,
  },
  imagePlaceholderText: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  infoContainer: {
    flex: 1,
    gap: spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  infoItem: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '500',
  },
  infoInput: {
    fontSize: 12,
    paddingVertical: 6,
    paddingHorizontal: 8,
    minHeight: 32,
  },
  infoInputContainer: {
    marginBottom: 0,
  },
  finalPriceItem: {
    flex: 2,
  },
  finalPriceBadge: {
    backgroundColor: colors.purple500,
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
  },
  finalPriceValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    height: '80%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
});

