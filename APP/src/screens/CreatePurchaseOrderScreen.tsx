/**
 * 발주 생성 화면
 * 단계별 폼으로 발주 생성
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Container, Header, Button } from '../components/common';
import { StepIndicator } from '../components/common/StepIndicator';
import { ProductInfoStep, type ProductInfoData } from '../components/purchase-order/ProductInfoStep';
import { OrderInfoStep, type OrderInfoData } from '../components/purchase-order/OrderInfoStep';
import { useAuth } from '../contexts';
import { useLanguage } from '../contexts';
import { useMenuDrawer } from '../contexts/MenuDrawerContext';
import { colors, spacing } from '../constants';
import {
  createPurchaseOrder,
  uploadPurchaseOrderMainImage,
  type CreatePurchaseOrderData,
} from '../api/purchaseOrderApi';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AdminStackParamList } from '../navigation/types';

type CreatePurchaseOrderScreenProps = NativeStackScreenProps<
  AdminStackParamList,
  'CreatePurchaseOrder'
>;

const TOTAL_STEPS = 2;
const STEP_LABELS = ['상품 정보', '발주 정보'];

export default function CreatePurchaseOrderScreen({
  navigation,
}: CreatePurchaseOrderScreenProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { openDrawer } = useMenuDrawer();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: 상품 정보
  const [productInfo, setProductInfo] = useState<ProductInfoData>({
    product_name: '',
    product_name_chinese: '',
    product_category: '봉제',
    product_size: '',
    product_weight: '',
    mainImageFile: null,
  });

  // Step 2: 발주 정보
  const [orderInfo, setOrderInfo] = useState<OrderInfoData>({
    quantity: 0,
    unit_price: 0,
    order_date: new Date().toISOString().split('T')[0],
    estimated_shipment_date: '',
  });

  // 에러 상태
  const [productInfoErrors, setProductInfoErrors] = useState<
    Partial<Record<keyof ProductInfoData, string>>
  >({});
  const [orderInfoErrors, setOrderInfoErrors] = useState<
    Partial<Record<keyof OrderInfoData, string>>
  >({});

  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      navigation.goBack();
    }
  }, [currentStep, navigation]);

  const validateProductInfo = (): boolean => {
    const errors: Partial<Record<keyof ProductInfoData, string>> = {};

    // 한국어 또는 중국어 상품명 중 하나는 필수
    if (
      !productInfo.product_name?.trim() &&
      !productInfo.product_name_chinese?.trim()
    ) {
      errors.product_name = '한국어 또는 중국어 상품명 중 하나를 입력해주세요';
    }

    if (!productInfo.product_category) {
      errors.product_category = '카테고리를 선택해주세요';
    }

    setProductInfoErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateOrderInfo = (): boolean => {
    const errors: Partial<Record<keyof OrderInfoData, string>> = {};

    if (!orderInfo.quantity || orderInfo.quantity <= 0) {
      errors.quantity = '수량을 입력해주세요 (1 이상)';
    }

    if (!orderInfo.unit_price || orderInfo.unit_price <= 0) {
      errors.unit_price = '단가를 입력해주세요 (0보다 큰 값)';
    }

    setOrderInfoErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = useCallback(() => {
    if (currentStep === 1) {
      if (validateProductInfo()) {
        setCurrentStep(2);
      }
    }
  }, [currentStep, productInfo]);

  const handleSubmit = useCallback(async () => {
    if (!validateOrderInfo()) {
      return;
    }

    if (!validateProductInfo()) {
      setCurrentStep(1);
      return;
    }

    try {
      setIsSubmitting(true);

      // 발주 생성 데이터 준비
      const finalProductName =
        productInfo.product_name || productInfo.product_name_chinese || '';
      const finalProductNameChinese =
        productInfo.product_name && productInfo.product_name_chinese
          ? productInfo.product_name_chinese
          : undefined;

      const createData: CreatePurchaseOrderData = {
        product_name: finalProductName,
        product_name_chinese: finalProductNameChinese,
        product_category: productInfo.product_category || '봉제',
        product_size: productInfo.product_size || undefined,
        product_weight: productInfo.product_weight || undefined,
        unit_price: orderInfo.unit_price,
        quantity: orderInfo.quantity,
        order_date: orderInfo.order_date || null,
        estimated_shipment_date: orderInfo.estimated_shipment_date || undefined,
        created_by: user?.id || undefined,
      };

      // 발주 생성
      const newOrder = await createPurchaseOrder(createData);

      // 메인 이미지 업로드 (있는 경우)
      if (productInfo.mainImageFile && newOrder.id) {
        try {
          await uploadPurchaseOrderMainImage(newOrder.id, productInfo.mainImageFile.uri);
        } catch (imageError: any) {
          console.error('이미지 업로드 오류:', imageError);
          // 이미지 업로드 실패해도 발주는 생성되었으므로 계속 진행
          Alert.alert(
            '알림',
            '발주는 생성되었지만 이미지 업로드에 실패했습니다.'
          );
        }
      }

      Alert.alert('성공', '발주가 성공적으로 생성되었습니다.', [
        {
          text: '확인',
          onPress: () => {
            // 발주 상세 페이지로 이동 (목록 새로고침 플래그 전달)
            navigation.replace('PurchaseOrderDetail', { 
              id: newOrder.id,
              shouldRefreshList: true,
            });
          },
        },
      ]);
    } catch (error: any) {
      console.error('발주 생성 오류:', error);
      Alert.alert('오류', error.message || '발주 생성 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  }, [productInfo, orderInfo, user, navigation]);

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <ProductInfoStep
            data={productInfo}
            onChange={setProductInfo}
            errors={productInfoErrors}
          />
        );
      case 2:
        return (
          <OrderInfoStep
            data={orderInfo}
            onChange={setOrderInfo}
            errors={orderInfoErrors}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Container safeArea padding={false}>
      <Header
        title={`발주 생성 - ${currentStep}/${TOTAL_STEPS}`}
        leftButton={{ label: '←', onPress: handleBack }}
        showMenuButton={true}
        onMenuPress={openDrawer}
      />

      {/* Step Indicator */}
      <StepIndicator
        currentStep={currentStep}
        totalSteps={TOTAL_STEPS}
        labels={STEP_LABELS}
      />

      {/* Step Content */}
      <View style={styles.content}>{renderStepContent()}</View>

      {/* Navigation Buttons */}
      <View style={styles.footer}>
        {currentStep > 1 && (
          <Button
            title="이전"
            onPress={handleBack}
            variant="outline"
            size="lg"
            style={styles.footerButton}
            disabled={isSubmitting}
          />
        )}
        {currentStep < TOTAL_STEPS ? (
          <Button
            title="다음"
            onPress={handleNext}
            variant="primary"
            size="lg"
            style={[styles.footerButton, currentStep === 1 && styles.footerButtonFull]}
            disabled={isSubmitting}
          />
        ) : (
          <Button
            title={isSubmitting ? '생성 중...' : '발주 생성'}
            onPress={handleSubmit}
            variant="primary"
            size="lg"
            style={[styles.footerButton, currentStep === 1 && styles.footerButtonFull]}
            disabled={isSubmitting}
          />
        )}
      </View>
    </Container>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    padding: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
    gap: spacing.sm,
  },
  footerButton: {
    flex: 1,
  },
  footerButtonFull: {
    flex: 1,
  },
});

