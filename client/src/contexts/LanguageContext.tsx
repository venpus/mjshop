import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'ko' | 'zh' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// 기본 번역 데이터 (추후 별도 파일로 분리 가능)
const translations: Record<Language, Record<string, string>> = {
  ko: {
    // 공통
    'common.logout': '로그아웃',
    'common.save': '저장',
    'common.cancel': '취소',
    'common.delete': '삭제',
    'common.edit': '수정',
    'common.add': '추가',
    'common.search': '검색',
    'common.close': '닫기',
    'common.confirm': '확인',
    'common.loading': '로딩 중...',
    'common.error': '오류',
    'common.success': '성공',
    
    // 메뉴
    'menu.adminTitle': '쇼핑몰 관리자',
    'menu.sidebarExpand': '사이드바 펼치기',
    'menu.sidebarCollapse': '사이드바 접기',
    'menu.dashboard': '대시보드',
    'menu.chinaCooperation': '중국협업',
    'menu.products': '상품 관리',
    'menu.purchaseOrders': '발주 관리',
    'menu.packingList': '패킹리스트',
    'menu.materials': '악세사리',
    'menu.projects': '프로젝트 관리',
    'menu.chinaPayment': '결제 내역(구현중)',
    'menu.gallery': '갤러리(구현중)',
    'menu.chinaWarehouse': '중국 입출고 현황(구현중)',
    'menu.invoice': '정상 인보이스(구현중)',
    'menu.packagingWork': '포장작업 관리(구현중)',
    'menu.shopManagement': '쇼핑몰 관리',
    'menu.orders': '주문 관리',
    'menu.shipping': '배송 관리',
    'menu.payment': '결제 관리',
    'menu.inventory': '재고 관리',
    'menu.members': '회원 관리',
    'menu.adminAccount': '관리자 계정 관리',
    
    // 로그인
    'login.title': '관리자 로그인',
    'login.subtitle': '시스템에 접근하려면 로그인하세요',
    'login.id': 'ID',
    'login.password': '비밀번호',
    'login.submit': '로그인',
    'login.signup': '가입 신청',
    'login.signupSuccess': '가입 신청이 완료되었습니다.',
    'login.signupSuccessDetail': '관리자 승인 후 이용 가능합니다.',
  },
  zh: {
    // 공통
    'common.logout': '登出',
    'common.save': '保存',
    'common.cancel': '取消',
    'common.delete': '删除',
    'common.edit': '编辑',
    'common.add': '添加',
    'common.search': '搜索',
    'common.close': '关闭',
    'common.confirm': '确认',
    'common.loading': '加载中...',
    'common.error': '错误',
    'common.success': '成功',
    
    // 메뉴
    'menu.adminTitle': '购物中心管理员',
    'menu.sidebarExpand': '展开侧边栏',
    'menu.sidebarCollapse': '折叠侧边栏',
    'menu.dashboard': '仪表板',
    'menu.chinaCooperation': '中国协作',
    'menu.products': '商品管理',
    'menu.purchaseOrders': '订单管理',
    'menu.packingList': '装箱单',
    'menu.materials': '配件',
    'menu.projects': '项目管理',
    'menu.chinaPayment': '付款记录(开发中)',
    'menu.gallery': '画廊(开发中)',
    'menu.chinaWarehouse': '中国出入库状态(开发中)',
    'menu.invoice': '正式发票(开发中)',
    'menu.packagingWork': '包装作业管理(开发中)',
    'menu.shopManagement': '购物中心管理',
    'menu.orders': '订单管理',
    'menu.shipping': '配送管理',
    'menu.payment': '支付管理',
    'menu.inventory': '库存管理',
    'menu.members': '会员管理',
    'menu.adminAccount': '管理员账户管理',
    
    // 로그인
    'login.title': '管理员登录',
    'login.subtitle': '请登录以访问系统',
    'login.id': 'ID',
    'login.password': '密码',
    'login.submit': '登录',
    'login.signup': '申请注册',
    'login.signupSuccess': '注册申请已完成。',
    'login.signupSuccessDetail': '管理员批准后即可使用。',
  },
  en: {
    // 공통
    'common.logout': 'Logout',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.add': 'Add',
    'common.search': 'Search',
    'common.close': 'Close',
    'common.confirm': 'Confirm',
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    
    // 메뉴
    'menu.adminTitle': 'Shopping Mall Admin',
    'menu.sidebarExpand': 'Expand Sidebar',
    'menu.sidebarCollapse': 'Collapse Sidebar',
    'menu.dashboard': 'Dashboard',
    'menu.chinaCooperation': 'China Cooperation',
    'menu.products': 'Products',
    'menu.purchaseOrders': 'Purchase Orders',
    'menu.packingList': 'Packing List',
    'menu.materials': 'Accessories',
    'menu.projects': 'Project Management',
    'menu.chinaPayment': 'Payment History (In Progress)',
    'menu.gallery': 'Gallery (In Progress)',
    'menu.chinaWarehouse': 'China Warehouse Status (In Progress)',
    'menu.invoice': 'Invoice (In Progress)',
    'menu.packagingWork': 'Packaging Work Management (In Progress)',
    'menu.shopManagement': 'Shop Management',
    'menu.orders': 'Orders',
    'menu.shipping': 'Shipping',
    'menu.payment': 'Payment',
    'menu.inventory': 'Inventory',
    'menu.members': 'Members',
    'menu.adminAccount': 'Admin Account Management',
    
    // 로그인
    'login.title': 'Admin Login',
    'login.subtitle': 'Please login to access the system',
    'login.id': 'ID',
    'login.password': 'Password',
    'login.submit': 'Login',
    'login.signup': 'Sign Up',
    'login.signupSuccess': 'Signup request has been completed.',
    'login.signupSuccessDetail': 'You can use it after admin approval.',
  },
};

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  // localStorage에서 언어 설정 불러오기 (기본값: 'ko')
  const [language, setLanguageState] = useState<Language>(() => {
    const savedLanguage = localStorage.getItem('language') as Language;
    return savedLanguage && ['ko', 'zh', 'en'].includes(savedLanguage) ? savedLanguage : 'ko';
  });

  // 언어 변경 시 localStorage에 저장
  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  };

  // 번역 함수
  const t = (key: string): string => {
    return translations[language]?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

