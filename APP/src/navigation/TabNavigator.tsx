/**
 * 하단 탭 네비게이션
 * Dashboard, PurchaseOrders, PackingList, More 탭
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, StyleSheet } from 'react-native';
import type { MainTabParamList } from './types';
import { DashboardScreen } from '../screens/DashboardScreen';
import { PurchaseOrdersStack } from './PurchaseOrdersStack';
import { colors, spacing } from '../constants';
import { useLanguage } from '../contexts/LanguageContext';
import { MoreTabScreen } from '../screens/MoreTabScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

export function TabNavigator() {
  const { t } = useLanguage();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.gray500,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tab.Screen
        name="DashboardTab"
        component={DashboardScreen}
        options={{
          tabBarLabel: t('menu.dashboard') || '대시보드',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>📊</Text>
          ),
        }}
      />
      <Tab.Screen
        name="PurchaseOrdersTab"
        component={PurchaseOrdersStack}
        options={{
          tabBarLabel: t('menu.purchaseOrders') || '발주',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>📄</Text>
          ),
        }}
      />
      <Tab.Screen
        name="PackingListTab"
        component={DashboardScreen} // 임시 - 나중에 PackingListScreen으로 교체
        options={{
          tabBarLabel: t('menu.packingList') || '패킹',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>📦</Text>
          ),
        }}
      />
      <Tab.Screen
        name="MoreTab"
        component={MoreTabScreen}
        options={{
          tabBarLabel: '더보기',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>☰</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 60,
    paddingBottom: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
    backgroundColor: colors.white,
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: spacing.xs,
  },
});

