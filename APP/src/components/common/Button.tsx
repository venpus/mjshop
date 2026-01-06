/**
 * Button 컴포넌트
 * React Native용 버튼 컴포넌트
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  style,
  textStyle,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const buttonStyles = [
    styles.button,
    styles[`button_${variant}`],
    styles[`button_${size}`],
    isDisabled && styles.buttonDisabled,
    style,
  ];

  const textStyles = [
    styles.text,
    styles[`text_${variant}`],
    styles[`text_${size}`],
    isDisabled && styles.textDisabled,
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? '#fff' : '#6366f1'}
        />
      ) : (
        <Text style={textStyles}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  // Variant styles
  button_primary: {
    backgroundColor: '#6366f1',
  },
  button_secondary: {
    backgroundColor: '#64748b',
  },
  button_danger: {
    backgroundColor: '#ef4444',
  },
  button_outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#6366f1',
  },
  button_ghost: {
    backgroundColor: 'transparent',
  },
  // Size styles
  button_sm: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 32,
  },
  button_md: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 40,
  },
  button_lg: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    minHeight: 48,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  // Text styles
  text: {
    fontWeight: '500',
  },
  text_primary: {
    color: '#fff',
  },
  text_secondary: {
    color: '#fff',
  },
  text_danger: {
    color: '#fff',
  },
  text_outline: {
    color: '#6366f1',
  },
  text_ghost: {
    color: '#6366f1',
  },
  text_sm: {
    fontSize: 14,
  },
  text_md: {
    fontSize: 16,
  },
  text_lg: {
    fontSize: 18,
  },
  textDisabled: {
    opacity: 0.7,
  },
});

