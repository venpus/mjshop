export interface DocumentTitleParts {
  /** 현재 페이지(하위 메뉴) 번역 키 */
  pageKey: string;
  /** 상위 메뉴 그룹 번역 키 */
  parentKey?: string;
  /** 탭·상세 등 추가 구분 번역 키 (가장 앞에 표시) */
  sectionKey?: string;
}

const SHOP_MANAGEMENT_ROUTES: Record<string, string> = {
  orders: 'menu.orders',
  'shop-statements': 'menu.shopStatements',
  'shop-payment': 'menu.shopPayment',
  'sales-settlement': 'menu.salesSettlement',
  shipping: 'menu.shipping',
  'shop-buyers': 'menu.shopBuyers',
  inventory: 'menu.inventory',
};

const CHINA_COOPERATION_ROUTES: Record<string, string> = {
  products: 'menu.products',
  'purchase-orders': 'menu.purchaseOrders',
  'not-arrived-analysis': 'menu.notArrivedAnalysis',
  'cost-analysis': 'menu.costAnalysis',
  'shipping-history': 'menu.packingList',
  'sweet-tracker-test': 'menu.sweetTrackerTest',
  'payment-history': 'menu.paymentHistory',
  gallery: 'menu.gallery',
  materials: 'menu.materials',
  projects: 'menu.projects',
  'china-warehouse': 'menu.chinaWarehouse',
  invoice: 'menu.invoice',
  'packaging-work': 'menu.packagingWork',
  manufacturing: 'menu.manufacturing',
};

const ADMIN_MENU_ROUTES: Record<string, string> = {
  members: 'menu.members',
  'admin-account': 'menu.adminAccount',
  permissions: 'menu.permissions',
  'access-log': 'menu.accessLog',
};

function withShopManagement(pageKey: string, sectionKey?: string): DocumentTitleParts {
  return { pageKey, parentKey: 'menu.shopManagement', sectionKey };
}

function withChinaCooperation(pageKey: string, sectionKey?: string): DocumentTitleParts {
  return { pageKey, parentKey: 'menu.chinaCooperation', sectionKey };
}

function withAdminMenu(pageKey: string): DocumentTitleParts {
  return { pageKey, parentKey: 'menu.adminMenu' };
}

function resolveProductCollabTitle(subPath: string): DocumentTitleParts {
  const parentKey = 'menu.productCollab';

  if (!subPath) {
    return { pageKey: 'productCollab.dashboard', parentKey };
  }
  if (subPath === 'list') {
    return { pageKey: 'productCollab.productList', parentKey };
  }
  if (subPath === 'archive') {
    return { pageKey: 'productCollab.archive', parentKey };
  }
  if (subPath === 'cancelled') {
    return { pageKey: 'productCollab.cancelledList', parentKey };
  }
  if (subPath === 'unread') {
    return { pageKey: 'productCollab.threadUnreadListTitle', parentKey };
  }
  if (subPath.startsWith('thread/')) {
    return { pageKey: 'pageTitle.thread', parentKey };
  }
  if (subPath.startsWith('dashboard/more/')) {
    return { pageKey: 'pageTitle.dashboardSection', parentKey };
  }

  return { pageKey: 'menu.productCollab' };
}

export function resolveDocumentTitleParts(pathname: string, search = ''): DocumentTitleParts {
  const adminPath = pathname.replace(/^\/admin\/?/, '').replace(/\/$/, '');
  const params = new URLSearchParams(search);

  if (!adminPath) {
    return { pageKey: 'productCollab.dashboard', parentKey: 'menu.productCollab' };
  }

  if (adminPath === 'product-collab' || adminPath.startsWith('product-collab/')) {
    const subPath =
      adminPath === 'product-collab' ? '' : adminPath.slice('product-collab/'.length);
    return resolveProductCollabTitle(subPath);
  }

  if (adminPath === 'orders') {
    const tab = params.get('tab');
    if (tab === 'lines') {
      return withShopManagement('menu.orders', 'pageTitle.orderLinesTab');
    }
    if (tab === 'reservations') {
      return withShopManagement('menu.orders', 'pageTitle.orderReservationsTab');
    }
    return withShopManagement('menu.orders');
  }

  if (adminPath.startsWith('orders/')) {
    return withShopManagement('pageTitle.orderDetail', 'menu.orders');
  }

  if (adminPath.startsWith('inventory/')) {
    return withShopManagement('pageTitle.stockDetail', 'menu.inventory');
  }

  if (adminPath.startsWith('purchase-orders/')) {
    return withChinaCooperation('pageTitle.purchaseOrderDetail', 'menu.purchaseOrders');
  }

  if (adminPath.startsWith('materials/')) {
    return withChinaCooperation('pageTitle.materialDetail', 'menu.materials');
  }

  if (adminPath.startsWith('projects/')) {
    return withChinaCooperation('pageTitle.projectDetail', 'menu.projects');
  }

  if (adminPath === 'manufacturing/new') {
    return withChinaCooperation('pageTitle.manufacturingNew', 'menu.manufacturing');
  }

  if (adminPath.startsWith('manufacturing/purchase-order/')) {
    return withChinaCooperation('pageTitle.manufacturingPurchaseOrder', 'menu.manufacturing');
  }

  if (adminPath.startsWith('manufacturing/')) {
    return withChinaCooperation('pageTitle.manufacturingDetail', 'menu.manufacturing');
  }

  const shopRoute = SHOP_MANAGEMENT_ROUTES[adminPath];
  if (shopRoute) {
    return withShopManagement(shopRoute);
  }

  const chinaRoute = CHINA_COOPERATION_ROUTES[adminPath];
  if (chinaRoute) {
    return withChinaCooperation(chinaRoute);
  }

  const adminRoute = ADMIN_MENU_ROUTES[adminPath];
  if (adminRoute) {
    return withAdminMenu(adminRoute);
  }

  const topLevelRoutes: Record<string, string> = {
    dashboard: 'menu.dashboard',
    'ai-search': 'menu.aiSearch',
    schedule: 'menu.schedule',
    settings: 'menu.settings',
    payment: 'menu.payment',
    'china-payment': 'menu.chinaPayment',
  };

  const topLevel = topLevelRoutes[adminPath];
  if (topLevel) {
    return { pageKey: topLevel };
  }

  return { pageKey: 'menu.adminTitle' };
}

export function formatDocumentTitle(
  t: (key: string) => string,
  parts: DocumentTitleParts
): string {
  const siteName = t('menu.adminTitle');
  const segments: string[] = [];

  if (parts.sectionKey) {
    segments.push(t(parts.sectionKey));
  }
  if (parts.pageKey) {
    segments.push(t(parts.pageKey));
  }
  if (parts.parentKey) {
    segments.push(t(parts.parentKey));
  }

  if (segments.length === 0) {
    return siteName;
  }

  return `${segments.join(' · ')} | ${siteName}`;
}
