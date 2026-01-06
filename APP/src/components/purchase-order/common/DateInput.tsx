/**
 * DateInput 컴포넌트
 * 날짜 입력을 위한 컴포넌트 (React Native DateTimePicker 사용)
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Input } from '../../common';
import { colors, spacing } from '../../../constants';

export interface DateInputProps {
  label?: string;
  value: string; // YYYY-MM-DD 형식
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  editable?: boolean;
  minimumDate?: Date;
  maximumDate?: Date;
}

export function DateInput({
  label,
  value,
  onChange,
  placeholder = 'YYYY-MM-DD',
  error,
  editable = true,
  minimumDate,
  maximumDate,
}: DateInputProps) {
  const [showPicker, setShowPicker] = useState(false);

  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const parseDate = (dateString: string): Date => {
    if (!dateString) return new Date();
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    
    if (selectedDate) {
      onChange(formatDate(selectedDate));
    }
    
    if (Platform.OS === 'ios') {
      // iOS는 모달이므로 계속 표시
    }
  };

  const displayValue = value || '';

  if (!editable) {
    return (
      <Input
        label={label}
        value={displayValue}
        placeholder={placeholder}
        editable={false}
        error={error}
      />
    );
  }

  return (
    <View>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TouchableOpacity
        onPress={() => setShowPicker(true)}
        activeOpacity={0.7}
      >
        <Input
          value={displayValue}
          placeholder={placeholder}
          editable={false}
          error={error}
          pointerEvents="none"
        />
      </TouchableOpacity>
      {showPicker ? (
        <DateTimePicker
          value={parseDate(value)}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      ) : null}
      {Platform.OS === 'ios' && showPicker ? (
        <View style={styles.iosPickerContainer}>
          <TouchableOpacity
            style={styles.iosPickerButton}
            onPress={() => setShowPicker(false)}
          >
            <Text style={styles.iosPickerButtonText}>확인</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.gray700,
    marginBottom: 8,
  },
  iosPickerContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
    backgroundColor: colors.white,
  },
  iosPickerButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  iosPickerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
});

