/**
 * NumberInput 컴포넌트
 * 숫자 입력을 위한 컴포넌트
 */

import React from 'react';
import { Input, InputProps } from '../../common';

export interface NumberInputProps extends Omit<InputProps, 'value' | 'onChangeText' | 'keyboardType'> {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  allowDecimals?: boolean;
}

export function NumberInput({
  value,
  onChange,
  min,
  max,
  allowDecimals = true,
  ...inputProps
}: NumberInputProps) {
  const handleChangeText = (text: string) => {
    // 빈 문자열이면 0으로 처리
    if (text === '') {
      onChange(0);
      return;
    }

    // 숫자만 허용 (소수점 포함 여부에 따라)
    const regex = allowDecimals ? /^-?\d*\.?\d*$/ : /^-?\d*$/;
    if (!regex.test(text)) {
      return; // 유효하지 않은 입력은 무시
    }

    const numValue = parseFloat(text);
    
    // NaN 체크
    if (isNaN(numValue)) {
      onChange(0);
      return;
    }

    // min/max 제한 적용
    let finalValue = numValue;
    if (min !== undefined && finalValue < min) {
      finalValue = min;
    }
    if (max !== undefined && finalValue > max) {
      finalValue = max;
    }

    onChange(finalValue);
  };

  // value를 문자열로 변환
  const displayValue = value.toString();

  return (
    <Input
      {...inputProps}
      value={displayValue}
      onChangeText={handleChangeText}
      keyboardType="numeric"
    />
  );
}

