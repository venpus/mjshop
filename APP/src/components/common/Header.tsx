/**
 * Header 컴포넌트
 * 화면 헤더 컴포넌트
 */

import React, { ReactNode } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';

export interface HeaderProps {
  title: string;
  leftButton?: {
    icon?: ReactNode | string;
    label?: string;
    onPress: () => void;
  };
  rightButton?: {
    icon?: ReactNode | string;
    label?: string;
    onPress: () => void;
  };
  showMenuButton?: boolean;
  onMenuPress?: () => void;
  style?: ViewStyle;
}

export function Header({
  title,
  leftButton,
  rightButton,
  showMenuButton = false,
  onMenuPress,
  style,
}: HeaderProps) {
  return (
    <View style={[styles.header, style]}>
      <View style={styles.left}>
        {leftButton && (
          <TouchableOpacity
            style={styles.button}
            onPress={leftButton.onPress}
            activeOpacity={0.7}
          >
            {leftButton.icon ? (
              typeof leftButton.icon === 'string' ? (
                <Text style={styles.buttonText}>{leftButton.icon}</Text>
              ) : (
                leftButton.icon
              )
            ) : (
              <Text style={styles.buttonText}>{leftButton.label || '←'}</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.right}>
        {showMenuButton && onMenuPress && (
          <TouchableOpacity
            style={styles.button}
            onPress={onMenuPress}
            activeOpacity={0.7}
          >
            <Text style={styles.buttonText}>☰</Text>
          </TouchableOpacity>
        )}
        {rightButton && (
          <TouchableOpacity
            style={styles.button}
            onPress={rightButton.onPress}
            activeOpacity={0.7}
          >
            {rightButton.icon ? (
              typeof rightButton.icon === 'string' ? (
                <Text style={styles.buttonText}>{rightButton.icon}</Text>
              ) : (
                rightButton.icon
              )
            ) : (
              <Text style={styles.buttonText}>{rightButton.label || '...'}</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  left: {
    width: 80,
    alignItems: 'flex-start',
  },
  right: {
    width: 80,
    alignItems: 'flex-end',
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  button: {
    padding: 8,
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    color: '#6366f1',
    fontWeight: '500',
  },
});

