import { useState } from 'react';
import { Menu, X, Globe, LogOut, User } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Products } from './components/Products';
import { Orders } from './components/Orders';
import { Shipping } from './components/Shipping';
import { Payment } from './components/Payment';
import { Inventory } from './components/Inventory';
import { PurchaseOrders } from './components/PurchaseOrders';
import { PurchaseOrderDetail } from './components/PurchaseOrderDetail';
import { ShippingHistory } from './components/ShippingHistory';
import { ChinaPayment } from './components/ChinaPayment';
import { Members } from './components/Members';
import { Gallery } from './components/Gallery';
import { ChinaWarehouse } from './components/ChinaWarehouse';
import { Invoice } from './components/Invoice';
import { AdminAccount } from './components/AdminAccount';
import { Login } from './components/Login';
import { useAuth } from './contexts/AuthContext';

type PageType = 'dashboard' | 'products' | 'orders' | 'shipping' | 'payment' | 'inventory' | 'purchase-orders' | 'purchase-order-detail' | 'shipping-history' | 'china-payment' | 'members' | 'gallery' | 'china-warehouse' | 'invoice' | 'admin-account';

type Language = 'ko' | 'en' | 'zh';

export default function App() {
  const { isAuthenticated, isLoading, login, logout, user } = useAuth();
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'cost' | 'factory' | 'work' | 'delivery' | undefined>(undefined);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [language, setLanguage] = useState<Language>('ko');
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);

  const languages = {
    ko: { name: '한국어', flag: '🇰🇷' },
    en: { name: 'English', flag: '🇺🇸' },
    zh: { name: '中文', flag: '🇨🇳' },
  };

  const handleViewOrderDetail = (orderId: string, tab?: 'cost' | 'factory' | 'work' | 'delivery') => {
    setSelectedOrderId(orderId);
    setSelectedTab(tab);
    setCurrentPage('purchase-order-detail');
  };

  const handleBackToPurchaseOrders = () => {
    setSelectedOrderId(null);
    setSelectedTab(undefined);
    setCurrentPage('purchase-orders');
  };

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

  // 로그인하지 않은 경우 로그인 페이지 표시
  if (!isAuthenticated) {
    return (
      <Login 
        onLogin={handleLogin} 
        isLoading={isLoggingIn}
        error={loginError}
      />
    );
  }

  // 로그인된 경우 메인 애플리케이션 표시
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
        <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto min-h-[1080px]">
        {/* Header with Menu Toggle */}
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
              title="로그아웃"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-medium">로그아웃</span>
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

        {currentPage === 'dashboard' && <Dashboard />}
        {currentPage === 'products' && user?.level === 'A-SuperAdmin' && <Products />}
        {currentPage === 'orders' && <Orders />}
        {currentPage === 'shipping' && <Shipping />}
        {currentPage === 'payment' && <Payment />}
        {currentPage === 'inventory' && <Inventory />}
        {currentPage === 'purchase-orders' && <PurchaseOrders onViewDetail={handleViewOrderDetail} />}
        {currentPage === 'purchase-order-detail' && selectedOrderId && <PurchaseOrderDetail orderId={selectedOrderId} onBack={handleBackToPurchaseOrders} initialTab={selectedTab} />}
        {currentPage === 'shipping-history' && <ShippingHistory />}
        {currentPage === 'china-payment' && <ChinaPayment />}
        {currentPage === 'members' && <Members />}
        {currentPage === 'gallery' && <Gallery />}
        {currentPage === 'china-warehouse' && <ChinaWarehouse />}
        {currentPage === 'invoice' && <Invoice />}
        {currentPage === 'admin-account' && <AdminAccount />}
      </main>
    </div>
  );
}