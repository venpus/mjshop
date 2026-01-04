import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation, useParams } from 'react-router-dom';
import { Menu, X, Globe, LogOut, User } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Products } from './components/Products';
import { Orders } from './components/Orders';
import { Shipping } from './components/Shipping';
import { Payment } from './components/Payment';
import { PaymentHistory } from './components/payment/PaymentHistory';
import { Inventory } from './components/Inventory';
import { StockManagement } from './components/inventory/StockManagement';
import { PurchaseOrders } from './components/PurchaseOrders';
import { PurchaseOrderDetail } from './components/PurchaseOrderDetail';
import { ShippingHistory } from './components/ShippingHistory';
import { ChinaPayment } from './components/ChinaPayment';
import { Members } from './components/Members';
import { Gallery } from './components/Gallery';
import { ChinaWarehouse } from './components/ChinaWarehouse';
import { Invoice } from './components/Invoice';
import { AdminAccount } from './components/AdminAccount';
import { Materials } from './components/Materials';
import { MaterialDetail } from './components/materials/MaterialDetail';
import { PackagingWork } from './components/PackagingWork';
import { Projects } from './components/Projects';
import { ProjectDetail } from './components/ProjectDetail';
import { Login } from './components/Login';
import { useAuth } from './contexts/AuthContext';
import { LanguageProvider, useLanguage, Language } from './contexts/LanguageContext';

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

  const languages = {
    ko: { name: '한국어', flag: '🇰🇷' },
    en: { name: 'English', flag: '🇺🇸' },
    zh: { name: '中文', flag: '🇨🇳' },
  };

  // 현재 페이지 경로를 PageType으로 변환
  const getCurrentPage = (): string => {
    const path = location.pathname;
    // /admin 접두사 제거
    const adminPath = path.replace(/^\/admin\/?/, '') || 'dashboard';
    
    // purchase-orders 상세 페이지인 경우
    if (adminPath.startsWith('purchase-orders/') && adminPath !== 'purchase-orders') {
      return 'purchase-order-detail';
    }
    
    // 루트 경로는 dashboard
    if (adminPath === '' || adminPath === '/') {
      return 'dashboard';
    }
    
    // 그 외의 경우 경로 그대로 반환
    return adminPath;
  };

  const currentPage = getCurrentPage();

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
    <div className="flex h-screen min-h-[1080px] bg-gray-50">
      {/* Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed lg:static inset-y-0 left-0 z-30 transform transition-transform duration-300 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <Sidebar 
          currentPage={currentPage as any} 
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          onPageChange={(page) => {
            if (page === 'purchase-order-detail') {
              // purchase-order-detail은 직접 이동할 수 없음
              return;
            }
            navigate(`/admin/${page}`);
          }} 
        />
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto min-h-[1080px]">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 lg:px-8 lg:py-4 flex items-center justify-between">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors lg:hidden"
          >
            {isSidebarOpen ? (
              <X className="w-6 h-6 text-gray-700" />
            ) : (
              <Menu className="w-6 h-6 text-gray-700" />
            )}
          </button>

          <div className="flex-1"></div>

          {/* User Info and Logout */}
          <div className="flex items-center gap-4 mr-4">
            {user && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg">
                <User className="w-4 h-4 text-gray-600" />
                <span className="text-sm text-gray-700 font-medium">{user.name}</span>
                <span className="text-xs text-gray-500">({user.id})</span>
              </div>
            )}
            <button
              onClick={logout}
              className="flex items-center gap-2 px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title={t('common.logout')}
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-medium">{t('common.logout')}</span>
            </button>
          </div>

          {/* Language Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Globe className="w-5 h-5 text-gray-700" />
              <span className="text-sm text-gray-700">{languages[language].flag} {languages[language].name}</span>
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
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 transition-colors flex items-center gap-2 ${
                        language === lang ? 'bg-purple-50 text-purple-700' : 'text-gray-700'
                      } ${
                        lang === 'ko' ? 'rounded-t-lg' : lang === 'zh' ? 'rounded-b-lg' : ''
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

        {/* Routes */}
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/products" element={
            (user?.level === 'A-SuperAdmin' || user?.level === 'S: Admin') ? (
              <Products onNavigateToPurchaseOrder={handleViewOrderDetail} />
            ) : (
              <Navigate to="/admin/dashboard" replace />
            )
          } />
          <Route path="/orders" element={<Orders />} />
          <Route path="/shipping" element={<Shipping />} />
          <Route path="/payment" element={<Payment />} />
          <Route path="/payment-history" element={
            (user?.level === 'A-SuperAdmin') ? (
              <PaymentHistory />
            ) : (
              <Navigate to="/admin/dashboard" replace />
            )
          } />
          <Route path="/inventory" element={<StockManagement />} />
          <Route path="/purchase-orders" element={
            (user?.level === 'A-SuperAdmin' || user?.level === 'S: Admin' || user?.level === 'B0: 중국Admin') ? (
              <PurchaseOrders onViewDetail={handleViewOrderDetail} />
            ) : (
              <Navigate to="/admin/dashboard" replace />
            )
          } />
          <Route path="/purchase-orders/:id" element={<PurchaseOrderDetailWrapper onBack={handleBackToPurchaseOrders} />} />
          <Route path="/shipping-history" element={<ShippingHistory />} />
          <Route path="/china-payment" element={<ChinaPayment />} />
          <Route path="/members" element={<Members />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/china-warehouse" element={<ChinaWarehouse />} />
          <Route path="/invoice" element={<Invoice />} />
          <Route path="/materials" element={<Materials />} />
          <Route path="/materials/:id" element={<MaterialDetailWrapper />} />
          <Route path="/packaging-work" element={<PackagingWork />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:id" element={<ProjectDetailWrapper />} />
          <Route path="/admin-account" element={<AdminAccount />} />
        </Routes>
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
  console.log('MaterialDetailWrapper is rendering');
  try {
    return <MaterialDetail />;
  } catch (error) {
    console.error('Error in MaterialDetailWrapper:', error);
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

// Protected Route 컴포넌트
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
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
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async (id: string, password: string) => {
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      await login(id, password);
    } catch (error: any) {
      setLoginError(error.message || '로그인에 실패했습니다.');
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
          <p className="text-gray-600">로딩 중...</p>
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
            <Navigate to="/admin/dashboard" replace />
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
            <AdminLayout />
          </ProtectedRoute>
        }
      />

      {/* 루트 경로 리다이렉트 */}
      <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />

      {/* 404 - 존재하지 않는 경로 */}
      <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
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
