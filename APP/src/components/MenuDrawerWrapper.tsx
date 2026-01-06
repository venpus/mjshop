/**
 * 드로어 메뉴 래퍼 컴포넌트
 * 모든 화면에서 드로어 메뉴를 사용할 수 있도록 함
 */

import React from 'react';
import { MenuDrawer } from './MenuDrawer';
import { useMenuDrawer } from '../contexts/MenuDrawerContext';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AdminStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<AdminStackParamList>;

interface MenuDrawerWrapperProps {
  children: React.ReactNode;
}

export function MenuDrawerWrapper({ children }: MenuDrawerWrapperProps) {
  const { isOpen, closeDrawer } = useMenuDrawer();
  const navigation = useNavigation<NavigationProp>();

  const handleNavigate = (screen: string) => {
    // 네비게이션 처리
    switch (screen) {
      case 'Dashboard':
        navigation.navigate('Dashboard');
        break;
      case 'PurchaseOrders':
        navigation.navigate('PurchaseOrders');
        break;
      case 'PackingList':
        // 나중에 구현
        console.log('PackingList not implemented yet');
        break;
      case 'Materials':
        // 나중에 구현
        console.log('Materials not implemented yet');
        break;
      case 'Projects':
        // 나중에 구현
        console.log('Projects not implemented yet');
        break;
      case 'ChinaPayment':
        // 나중에 구현
        console.log('ChinaPayment not implemented yet');
        break;
      case 'Gallery':
        // 나중에 구현
        console.log('Gallery not implemented yet');
        break;
      case 'ChinaWarehouse':
        // 나중에 구현
        console.log('ChinaWarehouse not implemented yet');
        break;
      case 'Invoice':
        // 나중에 구현
        console.log('Invoice not implemented yet');
        break;
      case 'PackagingWork':
        // 나중에 구현
        console.log('PackagingWork not implemented yet');
        break;
      case 'Orders':
        // 나중에 구현
        console.log('Orders not implemented yet');
        break;
      case 'Shipping':
        // 나중에 구현
        console.log('Shipping not implemented yet');
        break;
      case 'Payment':
        navigation.navigate('Payment');
        break;
      case 'Inventory':
        // 나중에 구현
        console.log('Inventory not implemented yet');
        break;
      case 'Members':
        // 나중에 구현
        console.log('Members not implemented yet');
        break;
      case 'AdminAccount':
        // 나중에 구현
        console.log('AdminAccount not implemented yet');
        break;
      default:
        console.log('Navigate to:', screen, '(not implemented yet)');
        break;
    }
  };

  return (
    <>
      {children}
      <MenuDrawer visible={isOpen} onClose={closeDrawer} onNavigate={handleNavigate} />
    </>
  );
}
