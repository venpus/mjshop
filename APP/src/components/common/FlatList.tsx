/**
 * FlatList 래퍼 컴포넌트 (필요시 확장)
 * React Native의 FlatList를 래핑하여 공통 기능 제공
 */

import React from 'react';
import { FlatList as RNFlatList, FlatListProps as RNFlatListProps, StyleSheet, View } from 'react-native';
import { Loading } from './Loading';
import { ErrorDisplay } from './ErrorDisplay';

export interface FlatListProps<T> extends RNFlatListProps<T> {
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  onRetry?: () => void;
}

export function FlatList<T>({
  loading,
  error,
  emptyMessage = '데이터가 없습니다.',
  onRetry,
  data,
  renderItem,
  ListEmptyComponent,
  ...props
}: FlatListProps<T>) {
  if (loading) {
    return <Loading message="로딩 중..." />;
  }

  if (error) {
    return <ErrorDisplay message={error} onRetry={onRetry} />;
  }

  return (
    <RNFlatList
      data={data}
      renderItem={renderItem}
      ListEmptyComponent={
        ListEmptyComponent || (
          <View style={styles.emptyContainer}>
            {/* <Text style={styles.emptyText}>{emptyMessage}</Text> */}
          </View>
        )
      }
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
  },
});

