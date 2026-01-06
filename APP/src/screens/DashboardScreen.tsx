/**
 * 대시보드 화면
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Container, Header, MenuCard } from '../components/common';
import { useMenuDrawer } from '../contexts/MenuDrawerContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AdminStackParamList } from '../navigation/types';
import { colors, spacing } from '../constants';

type NavigationProp = NativeStackNavigationProp<AdminStackParamList>;

export function DashboardScreen() {
  const { openDrawer } = useMenuDrawer();
  const { t } = useLanguage();
  const navigation = useNavigation<NavigationProp>();

  const handleMenuPress = (screen: keyof AdminStackParamList) => {
    navigation.navigate(screen);
  };

  return (
    <Container safeArea padding={false}>
      <Header
        title={t('menu.dashboard') || '대시보드'}
        showMenuButton={true}
        onMenuPress={openDrawer}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <Text style={styles.sectionTitle}>주요 메뉴</Text>
          <View style={styles.menuGrid}>
            <MenuCard
              icon="📄"
              title={t('menu.purchaseOrders') || '발주 관리'}
              onPress={() => handleMenuPress('PurchaseOrders')}
              backgroundColor={colors.primary}
            />
            <MenuCard
              icon="📦"
              title={t('menu.packingList') || '패킹리스트'}
              onPress={() => handleMenuPress('PackingList')}
              backgroundColor={colors.success}
            />
          </View>
        </View>
      </ScrollView>
    </Container>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
  },
  container: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.gray900,
    marginBottom: spacing.lg,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
});

