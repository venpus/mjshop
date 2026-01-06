/**
 * 메뉴 카드 컴포넌트
 * 대시보드에서 사용하는 메뉴 아이콘 카드
 */

import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, spacing } from '../../constants';

export interface MenuCardProps {
  icon: string;
  title: string;
  onPress: () => void;
  style?: ViewStyle;
  backgroundColor?: string;
  iconColor?: string;
}

export function MenuCard({
  icon,
  title,
  onPress,
  style,
  backgroundColor = colors.primary,
  iconColor = colors.white,
}: MenuCardProps) {
  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor }]}>
        <Text style={[styles.icon, { color: iconColor }]}>{icon}</Text>
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 120,
    width: '48%',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  icon: {
    fontSize: 32,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray900,
    textAlign: 'center',
  },
});

