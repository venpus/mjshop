/**
 * 루트 네비게이션 컴포넌트
 * 인증 상태에 따라 AuthNavigator 또는 MainNavigator 표시
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';

/**
 * 로딩 화면 컴포넌트
 */
function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#6366f1" />
      <Text style={styles.loadingText}>로딩 중...</Text>
    </View>
  );
}

export function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  // 로딩 중일 때는 로딩 화면 표시
  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
});

