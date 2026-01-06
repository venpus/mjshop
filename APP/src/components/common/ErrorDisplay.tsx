/**
 * ErrorDisplay 컴포넌트
 * 에러 메시지 표시 컴포넌트
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export interface ErrorDisplayProps {
  message: string;
  onRetry?: () => void;
  retryText?: string;
}

export function ErrorDisplay({
  message,
  onRetry,
  retryText = '다시 시도',
}: ErrorDisplayProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>⚠️</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Text style={styles.retryButtonText}>{retryText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#6366f1',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});

