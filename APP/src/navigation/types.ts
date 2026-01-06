/**
 * React Navigation 타입 정의
 */

import { NavigatorScreenParams } from '@react-navigation/native';

// Auth Stack Navigator
export type AuthStackParamList = {
  Login: undefined;
  // Signup: undefined; // 필요시 추가
};

// Main Tab Navigator
export type MainTabParamList = {
  DashboardTab: undefined;
  PurchaseOrdersTab: undefined;
  PackingListTab: undefined;
  MoreTab: undefined;
};

// Drawer Menu Navigator
export type DrawerParamList = {
  Dashboard: undefined;
  PurchaseOrders: undefined;
  PackingList: undefined;
  Materials: undefined;
  Projects: undefined;
  ChinaPayment: undefined;
  Gallery: undefined;
  ChinaWarehouse: undefined;
  Invoice: undefined;
  PackagingWork: undefined;
  Orders: undefined;
  Shipping: undefined;
  Payment: undefined;
  Inventory: undefined;
  Members: undefined;
  AdminAccount: undefined;
};

// Admin Stack Navigator (각 탭 내의 스택)
export type AdminStackParamList = {
  Dashboard: undefined;
  PurchaseOrders: undefined;
  CreatePurchaseOrder: undefined;
  PurchaseOrderDetail: {
    id: string;
    returnPage?: number;
    returnItemsPerPage?: number;
    returnSearch?: string;
    tab?: 'cost' | 'factory' | 'work' | 'delivery';
    autoSave?: boolean;
    shouldRefreshList?: boolean;
  };
  Products: undefined;
  PackingList: undefined;
  Projects: undefined;
  ProjectDetail: {
    id: number;
  };
  Materials: undefined;
  MaterialDetail: {
    id: number;
  };
  Payment: undefined;
  AdminAccount: undefined;
};

// Root Stack Navigator
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
};

// 네비게이션 타입을 위한 헬퍼 타입
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
