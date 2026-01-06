/**
 * SaveStatusBar 컴포넌트
 * 저장 상태를 표시하는 바
 */

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, spacing } from '../../constants';

export interface SaveStatusBarProps {
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: Date | null;
}

export function SaveStatusBar({ isDirty, isSaving, lastSavedAt }: SaveStatusBarProps) {
  if (!isDirty && !isSaving && !lastSavedAt) {
    return null;
  }

  const formatTime = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  return (
    <View style={[styles.container, isDirty && styles.containerDirty]}>
      {isSaving ? (
        <View style={styles.content}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.text}>저장 중...</Text>
        </View>
      ) : isDirty ? (
        <Text style={[styles.text, styles.textDirty]}>변경사항이 있습니다</Text>
      ) : lastSavedAt ? (
        <Text style={styles.text}>마지막 저장: {formatTime(lastSavedAt)}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.gray50,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  containerDirty: {
    backgroundColor: '#FEF3C7', // 노란색 배경
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  text: {
    fontSize: 12,
    color: colors.gray600,
  },
  textDirty: {
    color: colors.warning,
    fontWeight: '600',
  },
});

