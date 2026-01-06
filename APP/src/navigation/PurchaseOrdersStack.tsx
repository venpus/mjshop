/**
 * 발주 관리 스택 네비게이션
 * 탭 내에서 발주 목록과 상세 화면을 관리
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { AdminStackParamList } from './types';
import PurchaseOrdersScreen from '../screens/PurchaseOrdersScreen';
// import { PurchaseOrderDetailScreen } from '../screens/PurchaseOrderDetailScreen'; // 나중에 구현

const Stack = createNativeStackNavigator<AdminStackParamList>();

export function PurchaseOrdersStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="PurchaseOrders" component={PurchaseOrdersScreen} />
      {/* <Stack.Screen name="PurchaseOrderDetail" component={PurchaseOrderDetailScreen} /> */}
    </Stack.Navigator>
  );
}

