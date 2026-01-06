/**
 * Loading 컴포넌트
 * 로딩 인디케이터 컴포넌트
 */

import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';

export interface LoadingProps {
  message?: string;
  size?: 'small' | 'large';
  fullScreen?: boolean;
}

export function Loading({
  message,
  size = 'large',
  fullScreen = false,
}: LoadingProps) {
  const containerStyle = fullScreen ? styles.fullScreen : styles.container;

  return (
    <View style={containerStyle}>
      <ActivityIndicator size={size} color="#6366f1" />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  message: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
});

