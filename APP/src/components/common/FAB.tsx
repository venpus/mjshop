/**
 * FAB (Floating Action Button) 컴포넌트
 * 화면 우하단에 떠있는 원형 버튼
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

export interface FABProps {
  onPress: () => void;
  icon?: string | React.ReactNode;
  label?: string;
  style?: ViewStyle;
  size?: 'small' | 'medium' | 'large';
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

export function FAB({
  onPress,
  icon = '+',
  label,
  style,
  size = 'large',
  position = 'bottom-right',
}: FABProps) {
  const sizeStyles = {
    small: { width: 40, height: 40, fontSize: 18 },
    medium: { width: 48, height: 48, fontSize: 20 },
    large: { width: 56, height: 56, fontSize: 24 },
  };

  const positionStyles = {
    'bottom-right': { bottom: spacing.lg, right: spacing.lg },
    'bottom-left': { bottom: spacing.lg, left: spacing.lg },
    'top-right': { top: spacing.lg, right: spacing.lg },
    'top-left': { top: spacing.lg, left: spacing.lg },
  };

  const currentSize = sizeStyles[size];
  const currentPosition = positionStyles[position];

  return (
    <TouchableOpacity
      style={[
        styles.fab,
        {
          width: currentSize.width,
          height: currentSize.height,
          ...currentPosition,
        },
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.content}>
        {typeof icon === 'string' ? (
          <Text style={[styles.icon, { fontSize: currentSize.fontSize }]}>
            {icon}
          </Text>
        ) : (
          icon
        )}
        {label && <Text style={styles.label}>{label}</Text>}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    backgroundColor: colors.primary,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
    zIndex: 1000,
  },
  content: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    color: colors.white,
    fontWeight: '300',
  },
  label: {
    color: colors.white,
    fontSize: 12,
    marginTop: 2,
  },
});

