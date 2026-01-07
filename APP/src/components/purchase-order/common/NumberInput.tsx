/**
 * NumberInput 컴포넌트
 * 숫자 입력을 위한 컴포넌트
 */

import React, { useState, useEffect } from 'react';
import { Input, InputProps } from '../../common';

export interface NumberInputProps extends Omit<InputProps, 'value' | 'onChangeText' | 'keyboardType'> {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  allowDecimals?: boolean;
  decimalPlaces?: number; // 소수점 자리수 (기본값: 2)
}

export function NumberInput({
  value,
  onChange,
  min,
  max,
  allowDecimals = true,
  decimalPlaces = 2,
  ...inputProps
}: NumberInputProps) {
  // 입력 중인 텍스트를 추적하는 state
  const [inputText, setInputText] = useState<string>('');

  // value가 외부에서 변경되면 inputText 업데이트
  useEffect(() => {
    if (value === 0) {
      setInputText('');
    } else if (allowDecimals && decimalPlaces !== undefined) {
      // 소수점이 있으면 그대로, 없으면 소수점 두자리까지 표시하되 불필요한 0 제거
      const str = value.toString();
      if (str.includes('.')) {
        setInputText(str);
      } else {
        setInputText(value.toFixed(decimalPlaces).replace(/\.?0+$/, ''));
      }
    } else {
      setInputText(value.toString());
    }
  }, [value, allowDecimals, decimalPlaces]);

  const handleChangeText = (text: string) => {
    // 빈 문자열 처리
    if (text === '') {
      setInputText('');
      onChange(0);
      return;
    }

    // 숫자만 허용 (소수점 포함 여부에 따라)
    if (allowDecimals) {
      // 소수점 두자리까지 허용하는 정규식
      const regex = new RegExp(`^-?\\d*\\.?\\d{0,${decimalPlaces}}$`);
      if (!regex.test(text)) {
        return; // 유효하지 않은 입력은 무시
      }
    } else {
      // 정수만 허용
      const regex = /^-?\d*$/;
      if (!regex.test(text)) {
        return; // 유효하지 않은 입력은 무시
      }
    }

    // 입력 텍스트 업데이트
    setInputText(text);

    // 숫자로 변환
    const numValue = parseFloat(text);
    
    // NaN 체크
    if (isNaN(numValue)) {
      onChange(0);
      return;
    }

    // 소수점 자리수 제한 적용
    let finalValue = numValue;
    if (allowDecimals && decimalPlaces !== undefined) {
      // 소수점 자리수로 반올림
      finalValue = Math.round(numValue * Math.pow(10, decimalPlaces)) / Math.pow(10, decimalPlaces);
    }

    // min/max 제한 적용
    if (min !== undefined && finalValue < min) {
      finalValue = min;
    }
    if (max !== undefined && finalValue > max) {
      finalValue = max;
    }

    onChange(finalValue);
  };

  return (
    <Input
      {...inputProps}
      value={inputText}
      onChangeText={handleChangeText}
      keyboardType="numeric"
    />
  );
}
