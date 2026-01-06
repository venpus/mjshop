/**
 * Checkbox 컴포넌트
 */

import React from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { colors, spacing } from '../../constants';

export interface CheckboxProps {
  checked: boolean;
  onPress: () => void;
  size?: number;
  style?: ViewStyle;
  disabled?: boolean;
}

export function Checkbox({
  checked,
  onPress,
  size = 24,
  style,
  disabled = false,
}: CheckboxProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      style={[styles.container, style]}
    >
      <View
        style={[
          styles.checkbox,
          {
            width: size,
            height: size,
            borderRadius: size * 0.2,
            borderWidth: 2,
            borderColor: checked ? colors.primary : colors.gray400,
            backgroundColor: checked ? colors.primary : 'transparent',
          },
        ]}
      >
        {checked && (
          <View style={styles.checkmark}>
            <Text style={[styles.checkmarkText, { fontSize: size * 0.6 }]}>✓</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkbox: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  checkmarkText: {
    color: colors.white,
    fontWeight: 'bold',
  },
});

