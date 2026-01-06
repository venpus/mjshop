/**
 * Card 컴포넌트
 * React Native용 카드 컴포넌트
 */

import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';

export interface CardProps {
  children: ReactNode;
  style?: ViewStyle;
  padding?: boolean;
}

export function Card({ children, style, padding = true }: CardProps) {
  return (
    <View style={[styles.card, padding && styles.cardPadding, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardPadding: {
    padding: 16,
  },
});

