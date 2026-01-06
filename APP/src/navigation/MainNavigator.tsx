/**
 * 인증 후 메인 네비게이션
 * 스택 네비게이션 사용 (하단 탭 제거)
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { AdminStackParamList } from './types';
import { DashboardScreen } from '../screens/DashboardScreen';
import PurchaseOrdersScreen from '../screens/PurchaseOrdersScreen';
import CreatePurchaseOrderScreen from '../screens/CreatePurchaseOrderScreen';
import PurchaseOrderDetailScreen from '../screens/PurchaseOrderDetailScreen';
import PaymentScreen from '../screens/PaymentScreen';
import PackingListScreen from '../screens/PackingListScreen';
import { MenuDrawerProvider } from '../contexts/MenuDrawerContext';
import { MenuDrawerWrapper } from '../components/MenuDrawerWrapper';

const Stack = createNativeStackNavigator<AdminStackParamList>();

export function MainNavigator() {
  return (
    <MenuDrawerProvider>
      <MenuDrawerWrapper>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="Dashboard" component={DashboardScreen} />
          <Stack.Screen name="PurchaseOrders" component={PurchaseOrdersScreen} />
          <Stack.Screen name="CreatePurchaseOrder" component={CreatePurchaseOrderScreen} />
          <Stack.Screen name="PurchaseOrderDetail" component={PurchaseOrderDetailScreen} />
          <Stack.Screen name="PackingList" component={PackingListScreen} />
          <Stack.Screen name="Payment" component={PaymentScreen} />
          {/* 나머지 화면들은 나중에 추가 */}
        </Stack.Navigator>
      </MenuDrawerWrapper>
    </MenuDrawerProvider>
  );
}

