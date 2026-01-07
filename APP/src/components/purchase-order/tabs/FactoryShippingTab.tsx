/**
 * FactoryShippingTab 컴포넌트
 * 업체 출고 및 반품/교환 항목 편집
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Alert } from 'react-native';
import { Button } from '../../common';
import { DateInput, NumberInput } from '../common';
import { Input } from '../../common';
import { ImageUploadButton } from '../common/ImageUploadButton';
import { colors, spacing } from '../../../constants';
import { getFullImageUrl } from '../../../config/constants';

export interface FactoryShipment {
  id: string;
  shipped_date: string;
  shipped_quantity: number;
  tracking_number?: string | null;
  notes?: string | null;
  images?: string[];
  pendingImages?: Array<{ uri: string; type: string; name: string }>;
}

export interface ReturnExchangeItem {
  id: string;
  return_date: string;
  return_quantity: number;
  reason?: string | null;
  images?: string[];
  pendingImages?: Array<{ uri: string; type: string; name: string }>;
}

interface FactoryShippingTabProps {
  factoryShipments: FactoryShipment[];
  returnExchangeItems: ReturnExchangeItem[];
  currentFactoryStatus: string;
  onAddFactoryShipment: () => void;
  onRemoveFactoryShipment: (id: string) => void;
  onUpdateFactoryShipment: (id: string, field: keyof FactoryShipment, value: any) => void;
  onHandleFactoryImageUpload: (shipmentId: string, images: Array<{ uri: string; type: string; name: string }>) => void;
  onRemoveFactoryImage: (shipmentId: string, imageIndex: number, imageUrl: string) => void;
  onAddReturnExchangeItem: () => void;
  onRemoveReturnExchangeItem: (id: string) => void;
  onUpdateReturnExchangeItem: (id: string, field: keyof ReturnExchangeItem, value: any) => void;
  onHandleReturnImageUpload: (itemId: string, images: Array<{ uri: string; type: string; name: string }>) => void;
  onRemoveReturnImage: (itemId: string, imageIndex: number, imageUrl: string) => void;
  canWrite?: boolean;
}

export function FactoryShippingTab({
  factoryShipments,
  returnExchangeItems,
  currentFactoryStatus,
  onAddFactoryShipment,
  onRemoveFactoryShipment,
  onUpdateFactoryShipment,
  onHandleFactoryImageUpload,
  onRemoveFactoryImage,
  onAddReturnExchangeItem,
  onRemoveReturnExchangeItem,
  onUpdateReturnExchangeItem,
  onHandleReturnImageUpload,
  onRemoveReturnImage,
  canWrite = true,
}: FactoryShippingTabProps) {
  // 총 입고 수량 계산
  const totalShippedQuantity = factoryShipments.reduce((sum, shipment) => sum + (shipment.shipped_quantity || 0), 0);
  const totalReturnQuantity = returnExchangeItems.reduce((sum, item) => sum + (item.return_quantity || 0), 0);
  const totalReceivedQuantity = totalShippedQuantity - totalReturnQuantity;

  // 출고 항목 렌더링
  const renderFactoryShipment = (shipment: FactoryShipment, index: number) => {
    const handleImagePick = (images: Array<{ uri: string; type: string; name: string }>) => {
      const maxImages = 5;
      const serverImageCount = (shipment.images?.filter(url => !url.startsWith('blob:')).length || 0);
      const pendingImageCount = shipment.pendingImages?.length || 0;
      const remainingSlots = maxImages - serverImageCount - pendingImageCount;

      if (remainingSlots <= 0) {
        Alert.alert('알림', '이미지는 최대 5장까지 업로드할 수 있습니다.');
        return;
      }

      const imagesToAdd = images.slice(0, remainingSlots);
      if (images.length > remainingSlots) {
        Alert.alert('알림', `이미지는 최대 5장까지 업로드할 수 있습니다. ${remainingSlots}장만 추가됩니다.`);
      }

      onHandleFactoryImageUpload(shipment.id, imagesToAdd);
    };

    const handleRemoveImage = (imageIndex: number, imageUrl: string) => {
      Alert.alert(
        '이미지 삭제',
        '이 이미지를 삭제하시겠습니까?',
        [
          { text: '취소', style: 'cancel' },
          {
            text: '삭제',
            style: 'destructive',
            onPress: () => onRemoveFactoryImage(shipment.id, imageIndex, imageUrl),
          },
        ]
      );
    };

    return (
      <View key={shipment.id} style={styles.shipmentCard}>
        <View style={styles.shipmentHeader}>
          <Text style={styles.shipmentTitle}>출고 항목 #{index + 1}</Text>
          {canWrite ? (
            <TouchableOpacity
              onPress={() => {
                Alert.alert(
                  '출고 항목 삭제',
                  '이 출고 항목을 삭제하시겠습니까?',
                  [
                    { text: '취소', style: 'cancel' },
                    {
                      text: '삭제',
                      style: 'destructive',
                      onPress: () => onRemoveFactoryShipment(shipment.id),
                    },
                  ]
                );
              }}
              style={styles.removeButton}
            >
              <Text style={styles.removeButtonText}>✕ 삭제</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.shipmentContent}>
          <DateInput
            label="출고일"
            value={shipment.shipped_date}
            onChange={(value) => onUpdateFactoryShipment(shipment.id, 'shipped_date', value)}
            editable={canWrite}
          />
          <NumberInput
            label="출고수량"
            value={shipment.shipped_quantity}
            onChange={(value) => onUpdateFactoryShipment(shipment.id, 'shipped_quantity', value)}
            min={0}
            allowDecimals={false}
            editable={canWrite}
          />
          <Input
            label="운송장번호"
            value={shipment.tracking_number || ''}
            onChangeText={(text) => onUpdateFactoryShipment(shipment.id, 'tracking_number', text)}
            placeholder="운송장번호 입력"
            editable={canWrite}
          />
          <Input
            label="비고"
            value={shipment.notes || ''}
            onChangeText={(text) => onUpdateFactoryShipment(shipment.id, 'notes', text)}
            placeholder="비고 입력"
            multiline
            editable={canWrite}
          />

          {/* 이미지 업로드 */}
          {canWrite ? (
            <ImageUploadButton
              label="사진"
              images={shipment.images || []}
              onImagePick={handleImagePick}
              onRemoveImage={handleRemoveImage}
              maxImages={5}
            />
          ) : null}

          {/* 이미지 썸네일 */}
          {shipment.images && shipment.images.length > 0 ? (
            <View style={styles.imageContainer}>
              {shipment.images.map((imageUrl, imgIndex) => (
                <View key={imgIndex} style={styles.imageThumbnail}>
                  <Image
                    source={{ uri: getFullImageUrl(imageUrl) }}
                    style={styles.thumbnailImage}
                    resizeMode="cover"
                  />
                  {canWrite ? (
                    <TouchableOpacity
                      style={styles.imageRemoveButton}
                      onPress={() => handleRemoveImage(imgIndex, imageUrl)}
                    >
                      <Text style={styles.imageRemoveButtonText}>✕</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  // 반품/교환 항목 렌더링
  const renderReturnExchangeItem = (item: ReturnExchangeItem, index: number) => {
    const handleImagePick = (images: Array<{ uri: string; type: string; name: string }>) => {
      const maxImages = 5;
      const serverImageCount = (item.images?.filter(url => !url.startsWith('blob:')).length || 0);
      const pendingImageCount = item.pendingImages?.length || 0;
      const remainingSlots = maxImages - serverImageCount - pendingImageCount;

      if (remainingSlots <= 0) {
        Alert.alert('알림', '이미지는 최대 5장까지 업로드할 수 있습니다.');
        return;
      }

      const imagesToAdd = images.slice(0, remainingSlots);
      if (images.length > remainingSlots) {
        Alert.alert('알림', `이미지는 최대 5장까지 업로드할 수 있습니다. ${remainingSlots}장만 추가됩니다.`);
      }

      onHandleReturnImageUpload(item.id, imagesToAdd);
    };

    const handleRemoveImage = (imageIndex: number, imageUrl: string) => {
      Alert.alert(
        '이미지 삭제',
        '이 이미지를 삭제하시겠습니까?',
        [
          { text: '취소', style: 'cancel' },
          {
            text: '삭제',
            style: 'destructive',
            onPress: () => onRemoveReturnImage(item.id, imageIndex, imageUrl),
          },
        ]
      );
    };

    return (
      <View key={item.id} style={styles.returnCard}>
        <View style={styles.shipmentHeader}>
          <Text style={styles.returnTitle}>반품/교환 항목 #{index + 1}</Text>
          {canWrite ? (
            <TouchableOpacity
              onPress={() => {
                Alert.alert(
                  '반품/교환 항목 삭제',
                  '이 반품/교환 항목을 삭제하시겠습니까?',
                  [
                    { text: '취소', style: 'cancel' },
                    {
                      text: '삭제',
                      style: 'destructive',
                      onPress: () => onRemoveReturnExchangeItem(item.id),
                    },
                  ]
                );
              }}
              style={styles.removeButton}
            >
              <Text style={styles.removeButtonText}>✕ 삭제</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.shipmentContent}>
          <DateInput
            label="반품/교환 날짜"
            value={item.return_date}
            onChange={(value) => onUpdateReturnExchangeItem(item.id, 'return_date', value)}
            editable={canWrite}
          />
          <NumberInput
            label="반품/교환 수량"
            value={item.return_quantity}
            onChange={(value) => onUpdateReturnExchangeItem(item.id, 'return_quantity', value)}
            min={0}
            allowDecimals={false}
            editable={canWrite}
          />
          <Input
            label="사유"
            value={item.reason || ''}
            onChangeText={(text) => onUpdateReturnExchangeItem(item.id, 'reason', text)}
            placeholder="사유 입력"
            multiline
            editable={canWrite}
          />

          {/* 이미지 업로드 */}
          {canWrite ? (
            <ImageUploadButton
              label="사진"
              images={item.images || []}
              onImagePick={handleImagePick}
              onRemoveImage={handleRemoveImage}
              maxImages={5}
            />
          ) : null}

          {/* 이미지 썸네일 */}
          {item.images && item.images.length > 0 ? (
            <View style={styles.imageContainer}>
              {item.images.map((imageUrl, imgIndex) => (
                <View key={imgIndex} style={styles.imageThumbnail}>
                  <Image
                    source={{ uri: getFullImageUrl(imageUrl) }}
                    style={styles.thumbnailImage}
                    resizeMode="cover"
                  />
                  {canWrite ? (
                    <TouchableOpacity
                      style={styles.imageRemoveButton}
                      onPress={() => handleRemoveImage(imgIndex, imageUrl)}
                    >
                      <Text style={styles.imageRemoveButtonText}>✕</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* 업체 출고 상태 */}
      <View style={styles.statusSection}>
        <View style={styles.statusHeader}>
          <Text style={styles.statusTitle}>업체 출고 상태</Text>
          {(factoryShipments.length > 0 || returnExchangeItems.length > 0) ? (
            <Text style={styles.statusSubtitle}>
              (총 입고수량: <Text style={styles.statusValue}>{totalReceivedQuantity.toLocaleString()}</Text>개)
            </Text>
          ) : null}
        </View>
        <View style={[styles.statusBadge, getStatusBadgeStyle(currentFactoryStatus)]}>
          <Text style={styles.statusBadgeText}>{currentFactoryStatus}</Text>
        </View>
      </View>

      {/* 출고 항목 섹션 */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>출고 항목</Text>
          {canWrite ? (
            <Button
              title="+ 출고 항목 추가"
              onPress={onAddFactoryShipment}
              variant="outline"
              style={styles.addButton}
            />
          ) : null}
        </View>

        {factoryShipments.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>출고 항목이 없습니다.</Text>
            {canWrite ? (
              <Text style={styles.emptyStateSubtext}>위의 "출고 항목 추가" 버튼을 눌러 추가해주세요.</Text>
            ) : null}
          </View>
        ) : (
          <View style={styles.itemsContainer}>
            {factoryShipments.map((shipment, index) => renderFactoryShipment(shipment, index))}
          </View>
        )}
      </View>

      {/* 반품/교환 항목 섹션 */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>반품/교환 항목</Text>
          {returnExchangeItems.length > 0 ? (
            <Text style={styles.sectionSubtitle}>
              (총 반품/교환 수량: <Text style={styles.sectionValue}>{totalReturnQuantity.toLocaleString()}</Text>개)
            </Text>
          ) : null}
        </View>

        {canWrite ? (
          <Button
            title="+ 반품/교환 추가"
            onPress={onAddReturnExchangeItem}
            variant="outline"
            style={[styles.addButton, styles.returnAddButton]}
          />
        ) : null}

        {returnExchangeItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>반품/교환 항목이 없습니다.</Text>
            {canWrite ? (
              <Text style={styles.emptyStateSubtext}>위의 "반품/교환 추가" 버튼을 눌러 추가해주세요.</Text>
            ) : null}
          </View>
        ) : (
          <View style={styles.itemsContainer}>
            {returnExchangeItems.map((item, index) => renderReturnExchangeItem(item, index))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function getStatusBadgeStyle(status: string) {
  if (status === '수령완료') {
    return { backgroundColor: colors.success };
  } else if (status === '배송중') {
    return { backgroundColor: colors.primary };
  }
  return { backgroundColor: colors.gray500 };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  contentContainer: {
    padding: spacing.md,
  },
  statusSection: {
    marginBottom: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.gray50,
    borderRadius: 8,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray900,
  },
  statusSubtitle: {
    fontSize: 14,
    color: colors.gray600,
  },
  statusValue: {
    fontWeight: '600',
    color: colors.primary,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 16,
  },
  statusBadgeText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gray900,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.gray600,
  },
  sectionValue: {
    fontWeight: '600',
    color: colors.warning,
  },
  addButton: {
    alignSelf: 'flex-start',
  },
  returnAddButton: {
    marginBottom: spacing.md,
  },
  emptyState: {
    padding: spacing.xl,
    backgroundColor: colors.gray50,
    borderRadius: 8,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.gray600,
    marginBottom: spacing.xs,
  },
  emptyStateSubtext: {
    fontSize: 12,
    color: colors.gray500,
  },
  itemsContainer: {
    gap: spacing.md,
  },
  shipmentCard: {
    backgroundColor: colors.blue50,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  returnCard: {
    backgroundColor: colors.orange50,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  shipmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  shipmentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  returnTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.warning,
  },
  removeButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.danger,
    borderRadius: 6,
  },
  removeButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  shipmentContent: {
    gap: spacing.md,
  },
  imageContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  imageThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 6,
    overflow: 'hidden',
    position: 'relative',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  imageRemoveButton: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageRemoveButtonText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
});

