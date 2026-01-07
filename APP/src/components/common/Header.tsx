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
  ActivityIndicator,
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
  // SaveStatusBar 통합 옵션
  saveStatus?: {
    isDirty?: boolean;
    isSaving?: boolean;
    lastSavedAt?: Date | null;
  };
}

export function Header({
  title,
  leftButton,
  rightButton,
  showMenuButton = false,
  onMenuPress,
  style,
  saveStatus,
}: HeaderProps) {
  const formatTime = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const showSaveStatus = saveStatus && (saveStatus.isDirty || saveStatus.isSaving || saveStatus.lastSavedAt);

  return (
    <View style={[styles.headerContainer, style]}>
      <View style={styles.header}>
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
      {showSaveStatus && (
        <View style={[styles.saveStatusBar, saveStatus.isDirty && styles.saveStatusBarDirty]}>
          {saveStatus.isSaving ? (
            <View style={styles.saveStatusContent}>
              <ActivityIndicator size="small" color="#6366f1" />
              <Text style={styles.saveStatusText}>저장 중...</Text>
            </View>
          ) : saveStatus.isDirty ? (
            <Text style={[styles.saveStatusText, styles.saveStatusTextDirty]}>변경사항이 있습니다</Text>
          ) : saveStatus.lastSavedAt ? (
            <Text style={styles.saveStatusText}>마지막 저장: {formatTime(saveStatus.lastSavedAt)}</Text>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: 16,
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
  saveStatusBar: {
    backgroundColor: '#f9fafb',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  saveStatusBarDirty: {
    backgroundColor: '#FEF3C7',
  },
  saveStatusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  saveStatusText: {
    fontSize: 11,
    color: '#6b7280',
  },
  saveStatusTextDirty: {
    color: '#f59e0b',
    fontWeight: '600',
  },
});

