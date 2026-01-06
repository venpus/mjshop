/**
 * 더보기 탭 화면
 * 드로어 메뉴를 여는 화면
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Container, Header } from '../components/common';
import { MenuDrawer } from '../components/MenuDrawer';
import { useLanguage } from '../contexts/LanguageContext';
import { colors, spacing } from '../constants';
import type { MainTabParamList } from '../navigation/types';

type MoreTabScreenNavigationProp = BottomTabNavigationProp<MainTabParamList, 'MoreTab'>;

export function MoreTabScreen() {
  const { t } = useLanguage();
  const navigation = useNavigation<MoreTabScreenNavigationProp>();
  const [drawerVisible, setDrawerVisible] = useState(false);

  const handleNavigate = (screen: string) => {
    // 탭 네비게이션으로 이동
    switch (screen) {
      case 'Dashboard':
        navigation.navigate('DashboardTab');
        break;
      case 'PurchaseOrders':
        navigation.navigate('PurchaseOrdersTab');
        break;
      case 'PackingList':
        navigation.navigate('PackingListTab');
        break;
      default:
        // 나머지 화면들은 아직 구현되지 않음
        console.log('Navigate to:', screen, '(not implemented yet)');
        break;
    }
  };

  return (
    <Container safeArea padding={false}>
      <Header
        title="더보기"
        leftButton={{
          label: '☰',
          onPress: () => setDrawerVisible(true),
        }}
      />
      <View style={styles.content}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setDrawerVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.menuButtonText}>☰ 메뉴 열기</Text>
        </TouchableOpacity>
      </View>

      <MenuDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        onNavigate={handleNavigate}
      />
    </Container>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  menuButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 8,
  },
  menuButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

