/**
 * DateInput 컴포넌트
 * 날짜 입력을 위한 컴포넌트 (React Native DateTimePicker 사용)
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform, StyleSheet, ViewStyle, Modal } from 'react-native';
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
  displayFormat?: 'default' | 'korean'; // 'default': YYYY-MM-DD, 'korean': YYYY년 MM월 DD일
  containerStyle?: ViewStyle;
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
  displayFormat = 'default',
  containerStyle,
}: DateInputProps) {
  const [showPicker, setShowPicker] = useState(false);
  // iOS에서 선택 중인 날짜를 임시로 저장 (확인 버튼을 눌러야 최종 저장)
  const [tempDate, setTempDate] = useState<Date | null>(null);

  const formatDate = (date: Date): string => {
    // 로컬 타임존 기준으로 년/월/일 추출 (타임존 변환 없이)
    // DateTimePicker는 항상 로컬 타임존 기준으로 Date 객체를 반환하므로
    // getFullYear(), getMonth(), getDate()를 사용하면 로컬 타임존 기준 값이 나옵니다
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDisplayDate = (dateString: string): string => {
    if (!dateString) return '';
    if (displayFormat === 'korean') {
      const [year, month, day] = dateString.split('-');
      return `${year}년 ${parseInt(month)}월 ${parseInt(day)}일`;
    }
    return dateString;
  };

  const parseDate = (dateString: string): Date => {
    if (!dateString) {
      // 오늘 날짜를 로컬 타임존 기준으로 반환
      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);
    }
    const [year, month, day] = dateString.split('-').map(Number);
    // 로컬 타임존으로 날짜 생성 (타임존 변환 없이)
    // new Date(year, month - 1, day)는 로컬 타임존 기준으로 생성되므로
    // 타임존 변환 없이 정확한 날짜를 생성합니다
    const date = new Date(year, month - 1, day, 12, 0, 0, 0);
    return date;
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
      if (selectedDate) {
        // Android는 즉시 저장
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const day = String(selectedDate.getDate()).padStart(2, '0');
        const dateString = `${year}-${month}-${day}`;
        onChange(dateString);
      }
    } else if (Platform.OS === 'ios') {
      // iOS는 임시로 저장하고, 확인 버튼을 눌러야 최종 저장
      if (selectedDate) {
        setTempDate(selectedDate);
      }
    }
  };

  const handleConfirm = () => {
    if (Platform.OS === 'ios' && tempDate) {
      // iOS에서 확인 버튼을 눌렀을 때 최종 저장
      const year = tempDate.getFullYear();
      const month = String(tempDate.getMonth() + 1).padStart(2, '0');
      const day = String(tempDate.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      onChange(dateString);
      setTempDate(null);
    }
    setShowPicker(false);
  };

  const handleCancel = () => {
    setTempDate(null);
    setShowPicker(false);
  };

  const displayValue = displayFormat === 'korean' ? formatDisplayDate(value) : (value || '');

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
    <View style={containerStyle}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TouchableOpacity
        onPress={() => {
          setTempDate(parseDate(value));
          setShowPicker(true);
        }}
        activeOpacity={0.7}
      >
        <Input
          value={displayValue}
          placeholder={displayFormat === 'korean' ? 'YYYY년 MM월 DD일' : placeholder}
          editable={false}
          error={error}
          pointerEvents="none"
        />
      </TouchableOpacity>
      
      {/* iOS의 경우 Modal로 감싸서 최상위 레벨에서 표시 */}
      {Platform.OS === 'ios' && showPicker ? (
        <Modal
          visible={showPicker}
          transparent
          animationType="slide"
          onRequestClose={handleCancel}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity
                  onPress={handleCancel}
                  style={styles.modalCancelButton}
                >
                  <Text style={styles.modalCancelText}>취소</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>날짜 선택</Text>
                <TouchableOpacity
                  onPress={handleConfirm}
                  style={styles.modalConfirmButton}
                >
                  <Text style={styles.modalConfirmText}>확인</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.pickerContainer}>
                <DateTimePicker
                  value={tempDate || parseDate(value)}
                  mode="date"
                  display="spinner"
                  onChange={handleDateChange}
                  minimumDate={minimumDate}
                  maximumDate={maximumDate}
                  textColor={colors.gray900}
                  accentColor={colors.primary}
                  themeVariant="light"
                />
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
      
      {/* Android의 경우 기본 날짜 선택기 사용 */}
      {Platform.OS === 'android' && showPicker ? (
        <DateTimePicker
          value={parseDate(value)}
          mode="date"
          display="default"
          onChange={handleDateChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.gray700,
    marginBottom: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : spacing.md, // iOS 하단 safe area
    maxHeight: '80%', // 최대 높이 제한
  },
  pickerContainer: {
    width: '100%',
    height: 216, // iOS DateTimePicker spinner의 표준 높이
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
    overflow: 'visible',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray900,
  },
  modalCancelButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  modalCancelText: {
    fontSize: 16,
    color: colors.gray600,
  },
  modalConfirmButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  modalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
});

