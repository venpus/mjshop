/**
 * 드로어 메뉴 컴포넌트
 * 전체 메뉴를 표시하는 사이드 드로어
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { colors, spacing } from '../constants';

export type MenuItem = {
  key: string;
  label: string;
  icon?: string;
  onPress: () => void;
  level?: 'A-SuperAdmin' | 'S: Admin' | 'B0: 중국Admin' | 'C0: 한국Admin' | 'all';
};

interface MenuDrawerProps {
  visible: boolean;
  onClose: () => void;
  onNavigate: (screen: string) => void;
}

export function MenuDrawer({ visible, onClose, onNavigate }: MenuDrawerProps) {
  const { user, logout } = useAuth();
  const { t } = useLanguage();

  // A, S, B 등급 관리자만 표시
  const isAdminLevelA =
    user?.level === 'A-SuperAdmin' ||
    user?.level === 'S: Admin' ||
    user?.level === 'B0: 중국Admin';

  const handleMenuPress = (screen: string) => {
    onNavigate(screen);
    onClose();
  };

  const handleLogout = async () => {
    await logout();
    onClose();
  };

  // 중국협업 메뉴
  const chinaCooperationMenus: MenuItem[] = [
    {
      key: 'purchase-orders',
      label: t('menu.purchaseOrders') || '발주 관리',
      icon: '📄',
      onPress: () => handleMenuPress('PurchaseOrders'),
      level: isAdminLevelA ? 'all' : undefined,
    },
    {
      key: 'packing-list',
      label: t('menu.packingList') || '패킹리스트',
      icon: '📦',
      onPress: () => handleMenuPress('PackingList'),
    },
    {
      key: 'materials',
      label: t('menu.materials') || '악세사리',
      icon: '📦',
      onPress: () => handleMenuPress('Materials'),
    },
    {
      key: 'projects',
      label: t('menu.projects') || '프로젝트 관리',
      icon: '📁',
      onPress: () => handleMenuPress('Projects'),
    },
    {
      key: 'china-payment',
      label: t('menu.chinaPayment') || '결제 내역',
      icon: '💰',
      onPress: () => handleMenuPress('ChinaPayment'),
    },
    {
      key: 'gallery',
      label: t('menu.gallery') || '갤러리',
      icon: '🖼️',
      onPress: () => handleMenuPress('Gallery'),
    },
    {
      key: 'china-warehouse',
      label: t('menu.chinaWarehouse') || '중국 입출고 현황',
      icon: '📋',
      onPress: () => handleMenuPress('ChinaWarehouse'),
    },
    {
      key: 'invoice',
      label: t('menu.invoice') || '정상 인보이스',
      icon: '📄',
      onPress: () => handleMenuPress('Invoice'),
    },
    {
      key: 'packaging-work',
      label: t('menu.packagingWork') || '포장작업 관리',
      icon: '🔨',
      onPress: () => handleMenuPress('PackagingWork'),
    },
  ];

  // 쇼핑몰 관리 메뉴
  const shopManagementMenus: MenuItem[] = [
    {
      key: 'orders',
      label: t('menu.orders') || '주문 관리',
      icon: '🛒',
      onPress: () => handleMenuPress('Orders'),
    },
    {
      key: 'shipping',
      label: t('menu.shipping') || '배송 관리',
      icon: '🚚',
      onPress: () => handleMenuPress('Shipping'),
    },
    {
      key: 'payment',
      label: t('menu.payment') || '결제 관리',
      icon: '💳',
      onPress: () => handleMenuPress('Payment'),
    },
    {
      key: 'inventory',
      label: t('menu.inventory') || '재고 관리',
      icon: '📦',
      onPress: () => handleMenuPress('Inventory'),
    },
  ];

  // 필터링된 메뉴 (권한에 따라)
  const filteredChinaMenus = chinaCooperationMenus.filter(
    (menu) => menu.level === 'all' || menu.level === undefined
  );

  const renderMenuItem = (item: MenuItem) => (
    <TouchableOpacity
      key={item.key}
      style={styles.menuItem}
      onPress={item.onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.menuIcon}>{item.icon || '•'}</Text>
      <Text style={styles.menuLabel}>{item.label}</Text>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.drawer}>
          <SafeAreaView style={styles.safeArea}>
            {/* 헤더 */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>
                {t('menu.adminTitle') || '쇼핑몰 관리자'}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {/* 대시보드 */}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => handleMenuPress('Dashboard')}
                activeOpacity={0.7}
              >
                <Text style={styles.menuIcon}>📊</Text>
                <Text style={styles.menuLabel}>
                  {t('menu.dashboard') || '대시보드'}
                </Text>
              </TouchableOpacity>

              {/* 중국협업 섹션 */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {t('menu.chinaCooperation') || '중국협업'}
                </Text>
                {filteredChinaMenus.map(renderMenuItem)}
              </View>

              {/* 쇼핑몰 관리 섹션 */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {t('menu.shopManagement') || '쇼핑몰 관리'}
                </Text>
                {shopManagementMenus.map(renderMenuItem)}
              </View>

              {/* 회원 관리 */}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => handleMenuPress('Members')}
                activeOpacity={0.7}
              >
                <Text style={styles.menuIcon}>👥</Text>
                <Text style={styles.menuLabel}>
                  {t('menu.members') || '회원 관리'}
                </Text>
              </TouchableOpacity>

              {/* 관리자 계정 관리 */}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => handleMenuPress('AdminAccount')}
                activeOpacity={0.7}
              >
                <Text style={styles.menuIcon}>⚙️</Text>
                <Text style={styles.menuLabel}>
                  {t('menu.adminAccount') || '관리자 계정 관리'}
                </Text>
              </TouchableOpacity>
            </ScrollView>

            {/* 로그아웃 버튼 */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.logoutButton}
                onPress={handleLogout}
                activeOpacity={0.7}
              >
                <Text style={styles.logoutButtonText}>
                  {t('common.logout') || '로그아웃'}
                </Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  drawer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '80%',
    maxWidth: 320,
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: {
      width: -2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray900,
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: colors.gray600,
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.gray500,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.xs,
  },
  menuIcon: {
    fontSize: 20,
    marginRight: spacing.md,
    width: 24,
  },
  menuLabel: {
    fontSize: 16,
    color: colors.gray700,
    flex: 1,
  },
  footer: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
  logoutButton: {
    backgroundColor: colors.danger,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

