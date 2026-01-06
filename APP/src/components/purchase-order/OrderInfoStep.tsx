/**
 * OrderInfoStep 컴포넌트
 * 발주 생성 Step 2: 발주 정보 입력
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Input } from '../common';
import { colors, spacing } from '../../constants';

export interface OrderInfoData {
  quantity: number;
  unit_price: number;
  order_date: string;
  estimated_shipment_date: string;
}

interface OrderInfoStepProps {
  data: OrderInfoData;
  onChange: (data: OrderInfoData) => void;
  errors?: Partial<Record<keyof OrderInfoData, string>>;
}

export function OrderInfoStep({
  data,
  onChange,
  errors = {},
}: OrderInfoStepProps) {
  // DateTimePicker가 없으면 TextInput으로 날짜 입력
  // const [showOrderDatePicker, setShowOrderDatePicker] = React.useState(false);
  // const [showShipmentDatePicker, setShowShipmentDatePicker] = React.useState(false);

  const handleChange = (field: keyof OrderInfoData, value: string | number) => {
    onChange({
      ...data,
      [field]: value,
    });
  };


  // DateTimePicker가 없으면 직접 입력
  // const handleDateChange = (
  //   field: 'order_date' | 'estimated_shipment_date',
  //   event: any,
  //   selectedDate?: Date
  // ) => {
  //   if (Platform.OS === 'android') {
  //     setShowOrderDatePicker(false);
  //     setShowShipmentDatePicker(false);
  //   }

  //   if (selectedDate) {
  //     const dateString = selectedDate.toISOString().split('T')[0];
  //     handleChange(field, dateString);
  //   }

  //   if (Platform.OS === 'ios') {
  //     setShowOrderDatePicker(false);
  //     setShowShipmentDatePicker(false);
  //   }
  // };


  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>발주 정보</Text>

        {/* 수량 */}
        <Input
          label="수량 *"
          value={data.quantity > 0 ? data.quantity.toString() : ''}
          onChangeText={(text) => {
            const num = parseInt(text) || 0;
            handleChange('quantity', num);
          }}
          placeholder="수량을 입력하세요"
          keyboardType="numeric"
          error={errors.quantity}
          containerStyle={styles.inputContainer}
        />

        {/* 단가 */}
        <Input
          label="단가 (¥) *"
          value={data.unit_price > 0 ? data.unit_price.toString() : ''}
          onChangeText={(text) => {
            const num = parseFloat(text) || 0;
            handleChange('unit_price', num);
          }}
          placeholder="단가를 입력하세요"
          keyboardType="decimal-pad"
          error={errors.unit_price}
          containerStyle={styles.inputContainer}
        />

        {/* 발주일 */}
        <Input
          label="발주일"
          value={data.order_date}
          onChangeText={(text) => handleChange('order_date', text)}
          placeholder="YYYY-MM-DD 형식으로 입력"
          error={errors.order_date}
          containerStyle={styles.inputContainer}
        />

        {/* 예상 출고일 */}
        <Input
          label="예상 출고일"
          value={data.estimated_shipment_date}
          onChangeText={(text) => handleChange('estimated_shipment_date', text)}
          placeholder="YYYY-MM-DD 형식으로 입력"
          error={errors.estimated_shipment_date}
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
  inputContainer: {
    marginBottom: spacing.md,
  },
  errorText: {
    fontSize: 12,
    color: colors.danger,
    marginTop: spacing.xs,
  },
});

