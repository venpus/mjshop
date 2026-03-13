import { useState, useEffect, ReactNode } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';
import { Menu, X, Globe, LogOut, User, Sparkles } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Products } from './components/Products';
import { Orders } from './components/Orders';
import { Shipping } from './components/Shipping';
import { Payment } from './components/Payment';
import { PaymentHistory } from './components/payment/PaymentHistory';
import { Inventory } from './components/Inventory';
import { StockManagement } from './components/inventory/StockManagement';
import { StockDetail } from './components/inventory/StockDetail';
import { PurchaseOrders } from './components/PurchaseOrders';
import { PurchaseOrderDetail } from './components/PurchaseOrderDetail';
import { NotArrivedAnalysis } from './components/NotArrivedAnalysis';
import { CostAnalysis } from './components/cost-analysis/CostAnalysis';
import { ShippingHistory } from './components/ShippingHistory';
import { ChinaPayment } from './components/ChinaPayment';
import { Members } from './components/Members';
import { Gallery } from './components/Gallery';
import { ChinaWarehouse } from './components/ChinaWarehouse';
import { Invoice } from './components/Invoice';
import { AdminAccount } from './components/AdminAccount';
import { PermissionManagement } from './components/PermissionManagement';
import { Settings } from './components/Settings';
import { Materials } from './components/Materials';
import { MaterialDetail } from './components/materials/MaterialDetail';
import { PackagingWork } from './components/PackagingWork';
import { Projects } from './components/Projects';
import { ProjectDetail } from './components/ProjectDetail';
import { AiSearch } from './components/AiSearch';
import { ProductCollabRoutes } from './components/product-collab/routes';
import { Login } from './components/Login';
import { useAuth } from './contexts/AuthContext';
import { usePermission } from './contexts/PermissionContext';
import { LanguageProvider, useLanguage, Language } from './contexts/LanguageContext';
import { PackingListUnsavedProvider, usePackingListUnsaved } from './contexts/PackingListUnsavedContext';
import { useForceMobileLayout } from './hooks/useForceMobileLayout';

/** 권한 체크 래퍼 — 반드시 모듈 레벨에 두어 매 렌더마다 새 참조가 되지 않게 함. 그렇지 않으면 Route 자식(ShippingHistory 등)이 매번 리마운트되어 state가 초기화됨. */
function PermissionCheckWrapper({
  resource,
  permissionType,
  children,
}: {
  resource: string;
  permissionType: 'read' | 'write' | 'delete';
  children: ReactNode;
}) {
  const { hasPermission, isLoading: isPermissionLoading } = usePermission();
  if (isPermissionLoading) {
    return <>{children}</>;
  }
  if (hasPermission(resource, permissionType)) {
    return <>{children}</>;
  }
  return <Navigate to="/admin/product-collab" replace />;
}

// 메인 레이아웃 컴포넌트
function AdminLayout() {
  const { logout, user } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
  
  // 사이드바를 접힌 상태로 표시할 페이지 확인 (패킹리스트, 발주관리, 발주상세)
  const isCollapsedPage = location.pathname.includes('/admin/shipping-history') || 
                          location.pathname === '/admin/purchase-orders' ||
                          location.pathname.startsWith('/admin/purchase-orders/');
  
  // 사이드바 접힘 상태 (패킹리스트와 발주관리는 기본 접힘, 나머지는 기본 펼침)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(isCollapsedPage);

  const languages: Record<Language, { name: string; flag: string }> = {
    ko: { name: '한국어', flag: '🇰🇷' },
    zh: { name: '中文', flag: '🇨🇳' },
  };

  // 현재 페이지 경로를 PageType으로 변환
  const getCurrentPage = (): string => {
    const path = location.pathname;
    // /admin 접두사 제거
    const adminPath = path.replace(/^\/admin\/?/, '') || 'product-collab';
    
    // purchase-orders 상세 페이지인 경우
    if (adminPath.startsWith('purchase-orders/') && adminPath !== 'purchase-orders') {
      return 'purchase-order-detail';
    }
    // product-collab 하위 경로
    if (adminPath.startsWith('product-collab')) {
      return 'product-collab';
    }
    
    // 루트 경로는 product-collab(제품 개발 협업 첫 탭)
    if (adminPath === '' || adminPath === '/') {
      return 'product-collab';
    }
    
    // 그 외의 경우 경로 그대로 반환
    return adminPath;
  };

  const currentPage = getCurrentPage();
  const { hasUnsavedChanges: packingListHasUnsaved } = usePackingListUnsaved();

  const useMobileLayout = useForceMobileLayout();

  // 경로가 변경될 때 패킹리스트 또는 발주관리면 사이드바 접기, 아니면 펼치기
  useEffect(() => {
    setIsSidebarCollapsed(isCollapsedPage);
  }, [isCollapsedPage]);

  const handleViewOrderDetail = (orderId: string, tab?: 'cost' | 'factory' | 'work' | 'delivery', autoSave?: boolean) => {
    let url = `/admin/purchase-orders/${orderId}`;
    const params = new URLSearchParams();
    if (tab) {
      params.append('tab', tab);
    }
    if (autoSave) {
      params.append('autoSave', 'true');
    }
    const queryString = params.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
    navigate(url);
  };

  const handleBackToPurchaseOrders = () => {
    navigate('/admin/purchase-orders');
  };

  return (
    <div className="flex h-screen min-h-0 lg:min-h-[1080px] bg-gray-50">
      {/* Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - 앱/모바일일 때는 닫혀 있으면 화면 밖으로 밀어서 완전히 숨김 */}
      <div
        className={`fixed inset-y-0 left-0 z-30 transform transition-transform duration-300 ${
          useMobileLayout ? '' : 'lg:static lg:translate-x-0'
        } ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={
          useMobileLayout && !isSidebarOpen
            ? { transform: 'translateX(-100%)' }
            : undefined
        }
      >
        <Sidebar 
          currentPage={currentPage as any} 
          isCollapsed={isSidebarOpen ? false : isSidebarCollapsed}
          onToggleCollapse={isSidebarOpen ? undefined : () => setIsSidebarCollapsed(!isSidebarCollapsed)}
          onPageChange={(page) => {
            if (page === 'purchase-order-detail') {
              // purchase-order-detail은 직접 이동할 수 없음
              return;
            }
            // 패킹리스트에서 저장하지 않은 변경이 있으면 확인 후 이동
            if (location.pathname.includes('shipping-history') && packingListHasUnsaved) {
              const confirmed = window.confirm(t('app.unsavedConfirm'));
              if (!confirmed) return;
            }
            navigate(`/admin/${page}`);
            setIsSidebarOpen(false);
          }} 
        />
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0 min-w-0">
        {/* Header */}
        <div className="shrink-0 bg-white border-b border-gray-200 px-2 py-2 sm:px-4 sm:py-3 lg:px-8 lg:py-4 flex items-center gap-1 sm:gap-2 min-w-0">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`shrink-0 p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 transition-colors ${useMobileLayout ? '' : 'lg:hidden'}`}
          >
            {isSidebarOpen ? (
              <X className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700" />
            ) : (
              <Menu className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700" />
            )}
          </button>

          <div className="flex-1 min-w-0" />

          {/* User Info, AI 업무 비서, Logout */}
          <div className="flex items-center gap-1 sm:gap-2 lg:gap-4 shrink-0 min-w-0">
            {user && (
              <div className="flex items-center gap-1 sm:gap-2 px-2 py-1 sm:px-3 sm:py-1.5 bg-gray-100 rounded-lg min-w-0 max-w-[40vw] sm:max-w-none">
                <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-600 shrink-0" />
                <span className="text-xs sm:text-sm text-gray-700 font-medium truncate" title={user.name}>{user.name}</span>
                <span className="text-[10px] sm:text-xs text-gray-500 truncate shrink-0" title={user.id}>({user.id})</span>
              </div>
            )}
            <button
              type="button"
              onClick={() => navigate('/admin/product-collab')}
              className="flex items-center gap-1 sm:gap-2 px-2 py-1 sm:px-3 sm:py-1.5 text-white rounded-lg shrink-0 shadow-sm border border-[#2563EB]/30 animate-sparkle bg-[#2563EB] hover:bg-[#1D4ED8] hover:animate-none"
              title={t('productCollab.aiWorkAssistant')}
            >
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm font-medium whitespace-nowrap sm:hidden">{t('productCollab.aiWorkAssistantShort')}</span>
              <span className="text-xs sm:text-sm font-medium whitespace-nowrap hidden sm:inline">{t('productCollab.aiWorkAssistant')}</span>
            </button>
            <button
              onClick={logout}
              className="flex items-center gap-1 sm:gap-2 px-2 py-1 sm:px-3 sm:py-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
              title={t('common.logout')}
            >
              <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm font-medium whitespace-nowrap hidden sm:inline">{t('common.logout')}</span>
            </button>
          </div>

          {/* Language Dropdown */}
          <div className="relative shrink-0">
            <button
              onClick={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
              className="flex items-center gap-1 sm:gap-2 px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700 shrink-0 hidden sm:block" />
              <span className="text-base sm:text-sm text-gray-700 whitespace-nowrap">{languages[language].flag}<span className="hidden sm:inline"> {languages[language].name}</span></span>
            </button>

            {isLanguageDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setIsLanguageDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                  {(Object.keys(languages) as Language[]).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => {
                        setLanguage(lang);
                        setIsLanguageDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 transition-colors flex items-center gap-2 rounded-lg ${
                        language === lang ? 'bg-purple-50 text-purple-700' : 'text-gray-700'
                      }`}
                    >
                      <span className="text-base">{languages[lang].flag}</span>
                      <span>{languages[lang].name}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Routes: content area fills remaining height and scrolls when needed */}
        <div className="flex-1 min-h-0 overflow-y-auto min-w-0">
          <Routes>
          {/* D0 레벨 관리자는 패킹리스트 관련 페이지만 접근 가능 */}
          {user?.level === 'D0: 비전 담당자' ? (
            <>
              <Route path="/shipping-history" element={
                <PermissionCheckWrapper resource="shipping-history" permissionType="read">
                  <ShippingHistory />
                </PermissionCheckWrapper>
              } />
              <Route path="*" element={<Navigate to="/admin/shipping-history" replace />} />
            </>
          ) : (
            <>
              <Route index element={<Navigate to="/admin/product-collab" replace />} />
              <Route path="/dashboard" element={<Navigate to="/admin/product-collab" replace />} />
              <Route path="/ai-search" element={
                <PermissionCheckWrapper resource="dashboard" permissionType="read">
                  <AiSearch />
                </PermissionCheckWrapper>
              } />
              <Route path="/product-collab/*" element={<ProductCollabRoutes />} />
              <Route path="/products" element={
                (user?.level === 'A-SuperAdmin' || user?.level === 'S: Admin') ? (
                  <Products onNavigateToPurchaseOrder={handleViewOrderDetail} />
                ) : (
                  <Navigate to="/admin/product-collab" replace />
                )
              } />
              <Route path="/orders" element={<Orders />} />
              <Route path="/shipping" element={<Shipping />} />
              <Route path="/payment" element={<Payment />} />
              <Route path="/payment-history" element={
                <PermissionCheckWrapper resource="payment-history" permissionType="read">
                  <PaymentHistory />
                </PermissionCheckWrapper>
              } />
              <Route path="/inventory" element={<StockManagement />} />
              <Route path="/inventory/:groupKey" element={<StockDetail />} />
              <Route path="/purchase-orders" element={
                <PermissionCheckWrapper resource="purchase-orders" permissionType="read">
                  <PurchaseOrders onViewDetail={handleViewOrderDetail} />
                </PermissionCheckWrapper>
              } />
              <Route path="/purchase-orders/:id" element={
                <PermissionCheckWrapper resource="purchase-orders" permissionType="read">
                  <PurchaseOrderDetailWrapper onBack={handleBackToPurchaseOrders} />
                </PermissionCheckWrapper>
              } />
              <Route path="/not-arrived-analysis" element={
                <PermissionCheckWrapper resource="purchase-orders" permissionType="read">
                  <NotArrivedAnalysis />
                </PermissionCheckWrapper>
              } />
              <Route path="/cost-analysis" element={
                user?.id === 'venpus' ? (
                  <CostAnalysis />
                ) : (
                  <Navigate to="/admin/product-collab" replace />
                )
              } />
              <Route path="/shipping-history" element={
                <PermissionCheckWrapper resource="shipping-history" permissionType="read">
                  <ShippingHistory />
                </PermissionCheckWrapper>
              } />
              <Route path="/china-payment" element={<ChinaPayment />} />
              <Route path="/members" element={<Members />} />
              <Route path="/gallery" element={
                <PermissionCheckWrapper resource="gallery" permissionType="read">
                  <Gallery />
                </PermissionCheckWrapper>
              } />
              <Route path="/china-warehouse" element={
                <PermissionCheckWrapper resource="china-warehouse" permissionType="read">
                  <ChinaWarehouse />
                </PermissionCheckWrapper>
              } />
              <Route path="/invoice" element={
                <PermissionCheckWrapper resource="invoice" permissionType="read">
                  <Invoice />
                </PermissionCheckWrapper>
              } />
              <Route path="/materials" element={
                <PermissionCheckWrapper resource="materials" permissionType="read">
                  <Materials />
                </PermissionCheckWrapper>
              } />
              <Route path="/materials/:id" element={
                <PermissionCheckWrapper resource="materials" permissionType="read">
                  <MaterialDetailWrapper />
                </PermissionCheckWrapper>
              } />
              <Route path="/packaging-work" element={
                <PermissionCheckWrapper resource="packaging-work" permissionType="read">
                  <PackagingWork />
                </PermissionCheckWrapper>
              } />
              <Route path="/projects" element={
                <PermissionCheckWrapper resource="projects" permissionType="read">
                  <Projects />
                </PermissionCheckWrapper>
              } />
              <Route path="/projects/:id" element={
                <PermissionCheckWrapper resource="projects" permissionType="read">
                  <ProjectDetailWrapper />
                </PermissionCheckWrapper>
              } />
              <Route path="/admin-account" element={<AdminAccount />} />
              <Route path="/permissions" element={
                (user?.level === 'A-SuperAdmin') ? (
                  <PermissionManagement />
                ) : (
                  <Navigate to="/admin/product-collab" replace />
                )
              } />
              <Route path="/settings" element={<Settings />} />
            </>
          )}
          </Routes>
        </div>
      </main>
    </div>
  );
}

// PurchaseOrderDetail 래퍼 (URL 파라미터 처리)
function PurchaseOrderDetailWrapper({ onBack }: { onBack: () => void }) {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const tabParam = searchParams.get('tab') as 'cost' | 'factory' | 'work' | 'delivery' | undefined;
  const autoSaveParam = searchParams.get('autoSave') === 'true';
  
  // returnPage, returnItemsPerPage, returnSearch 파라미터 가져오기
  const returnPage = searchParams.get('returnPage');
  const returnItemsPerPage = searchParams.get('returnItemsPerPage');
  const returnSearch = searchParams.get('returnSearch');
  const returnPath = searchParams.get('returnPath'); // 결제내역 등 다른 페이지에서 온 경우

  // 목록으로 돌아가기 핸들러 (페이지 정보 및 검색어 포함)
  const handleBackWithPage = () => {
    // returnPath가 있으면 해당 경로로 이동 (결제내역 등)
    if (returnPath) {
      navigate(decodeURIComponent(returnPath));
      return;
    }

    // 기본: 발주관리 목록으로 이동
    let url = '/admin/purchase-orders';
    const params = new URLSearchParams();
    if (returnPage) {
      params.set('page', returnPage);
    }
    if (returnItemsPerPage) {
      params.set('itemsPerPage', returnItemsPerPage);
    }
    if (returnSearch) {
      params.set('search', returnSearch);
    }
    const queryString = params.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
    navigate(url);
  };

  if (!id) {
    return <Navigate to="/admin/purchase-orders" replace />;
  }

  return <PurchaseOrderDetail orderId={id} onBack={handleBackWithPage} initialTab={tabParam} autoSave={autoSaveParam} />;
}

// MaterialDetail 래퍼 (URL 파라미터 처리)
function MaterialDetailWrapper() {
  try {
    return <MaterialDetail />;
  } catch (error) {
    return <div>Error loading material detail</div>;
  }
}

// ProjectDetail 래퍼 (URL 파라미터 처리)
function ProjectDetailWrapper() {
  try {
    return <ProjectDetail />;
  } catch (error) {
    console.error('Error in ProjectDetailWrapper:', error);
    return <div>Error loading project detail</div>;
  }
}

// 로그인 후 리다이렉트 컴포넌트
function LoginRedirect() {
  const { user } = useAuth();
  // D0 레벨 관리자는 패킹리스트 페이지로 리다이렉트
  if (user?.level === 'D0: 비전 담당자') {
    return <Navigate to="/admin/shipping-history" replace />;
  }
  return <Navigate to="/admin/product-collab" replace />;
}

// 루트 경로 리다이렉트 컴포넌트
function RootRedirect() {
  const { user } = useAuth();
  // D0 레벨 관리자는 패킹리스트 페이지로 리다이렉트
  if (user?.level === 'D0: 비전 담당자') {
    return <Navigate to="/admin/shipping-history" replace />;
  }
  return <Navigate to="/admin/product-collab" replace />;
}

// Protected Route 컴포넌트
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">{t('app.loading')}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppContent() {
  const { isAuthenticated, isLoading, login } = useAuth();
  const { t } = useLanguage();
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const location = useLocation();

  const handleLogin = async (id: string, password: string) => {
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      await login(id, password);
    } catch (error: any) {
      setLoginError(error.message || t('app.loginFailed'));
      throw error;
    } finally {
      setIsLoggingIn(false);
    }
  };

  // 로딩 중
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">{t('app.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* 로그인 페이지 */}
      <Route
        path="/login"
        element={
          isAuthenticated ? (
            <LoginRedirect />
          ) : (
            <Login onLogin={handleLogin} isLoading={isLoggingIn} error={loginError} />
          )
        }
      />

      {/* 관리자 영역 */}
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute>
            <PackingListUnsavedProvider>
              <AdminLayout />
            </PackingListUnsavedProvider>
          </ProtectedRoute>
        }
      />

      {/* 루트 경로 리다이렉트 */}
      <Route path="/" element={<RootRedirect />} />

      {/* 404 - 존재하지 않는 경로 */}
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}
