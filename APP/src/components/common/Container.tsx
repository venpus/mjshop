/**
 * Container 컴포넌트
 * 화면 컨테이너 컴포넌트
 */

import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export interface ContainerProps {
  children: ReactNode;
  style?: ViewStyle;
  safeArea?: boolean;
  padding?: boolean;
}

export function Container({
  children,
  style,
  safeArea = true,
  padding = true,
}: ContainerProps) {
  const containerStyle = [
    styles.container,
    padding && styles.containerPadding,
    style,
  ];

  if (safeArea) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={containerStyle}>{children}</View>
      </SafeAreaView>
    );
  }

  return <View style={containerStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  containerPadding: {
    padding: 16,
  },
});

